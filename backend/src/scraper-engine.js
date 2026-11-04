/**
 * ARACHNEMIND - INDUSTRIAL WEB SCRAPING & INTELLIGENCE ENGINE (scraper-engine.js)
 *
 * Motor híbrido de 4 camadas para extração de dados estruturados:
 * 1. Hydration State (__NEXT_DATA__ / Window State)
 * 2. Schema.org JSON-LD (application/ld+json) & OpenGraph Metadata
 * 3. Adaptadores Especializados (Buscapé, Amazon BR, KaBuM!, Zoom, Mercado Livre)
 * 4. Heurística Visual Geométrica de Cards + Extrator Semântico de Artigos e Tabelas HTML
 *
 * Inclui filtragem estatística de outliers (Mediana/IQR), desambiguação de acessórios/bundles
 * e verificação estrita de modelos numéricos.
 */

const STOP_WORDS = new Set([
  'para', 'como', 'onde', 'qual', 'quais', 'sobre', 'buscar', 'encontrar',
  'pesquisar', 'dados', 'informacoes', 'com', 'dos', 'das', 'nos', 'nas',
  'uma', 'uns', 'umas', 'por', 'pelo', 'pela', 'menor', 'melhor', 'preco',
  'precos', 'procure', 'comprar', 'loja', 'lojas', 'oferta', 'ofertas',
  'the', 'and', 'for', 'with', 'from', 'that', 'this'
]);

const ACCESSORY_KEYWORDS = [
  'capinha', 'pelicula', 'cabo ', 'adaptador', 'suporte para', 'adesivo',
  'caixa vazia', 'manual ', 'peca de reposicao', 'case para', 'estojo',
  'capa protetora', 'backplate avulso', 'parafuso', 'espuma', 'almofada de reposicao',
  'protecao de lente', 'alca de', 'pulseira para'
];

const BUNDLE_KEYWORDS = [
  'notebook ', 'pc gamer completo', 'computador completo', 'kit upgrade',
  'desktop completo', 'all in one'
];

/**
 * Normaliza texto removendo acentos e convertendo para minúsculas
 */
function normalizeText(str = '') {
  return String(str || '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .trim();
}

/**
 * Tokeniza o objetivo separando termos gerais e tokens de modelo/especificação (ex: 4060, 144hz, 14700f, ddr5)
 */
function analyzeObjective(objective = '') {
  const norm = normalizeText(objective);
  const rawTokens = norm
    .split(/[^a-z0-9.]+/)
    .filter((w) => w.length >= 2 && !STOP_WORDS.has(w));

  // Tokens que contêm dígitos (ex: 4060, 144hz, 14700f, 512gb, s24, ps5, 15, m3) ou siglas técnicas críticas (ti, xt, xtx, pro, max, ultra, oled, qhd, 4k)
  const SPEC_MODIFIERS = new Set(['ti', 'super', 'xt', 'xtx', 'pro', 'max', 'ultra', 'plus', 'fe', 'oled', 'qhd', '4k']);
  const modelTokens = rawTokens.filter(
    (t) => /\d/.test(t) || SPEC_MODIFIERS.has(t)
  );
  const wordTokens = rawTokens.filter((t) => !modelTokens.includes(t) && t.length >= 3);

  const asksForAccessory = ACCESSORY_KEYWORDS.some((acc) => norm.includes(acc.trim()));
  const asksForBundle = BUNDLE_KEYWORDS.some((bnd) => norm.includes(bnd.trim()));

  return {
    rawObjective: objective,
    normalizedObjective: norm,
    allTokens: rawTokens,
    modelTokens,
    wordTokens,
    asksForAccessory,
    asksForBundle
  };
}

/**
 * Converte strings monetárias (BRL / USD / EUR) ou números para float limpo
 */
function parsePriceToNumber(rawInput) {
  if (typeof rawInput === 'number') {
    return rawInput > 0 && isFinite(rawInput) ? Math.round(rawInput * 100) / 100 : null;
  }
  if (!rawInput) return null;
  const str = String(rawInput).replace(/\u00A0/g, ' ').trim();
  const match = str.match(
    /(?:R\$|\$|US\$|€|£)?\s*([0-9]{1,3}(?:[.,][0-9]{3})*(?:[.,][0-9]{2})|[0-9]+(?:[.,][0-9]{2})?)/
  );
  if (!match) return null;
  let numStr = match[1];
  if (numStr.includes(',') && numStr.includes('.')) {
    // Determina qual é o separador decimal pela última ocorrência
    if (numStr.lastIndexOf(',') > numStr.lastIndexOf('.')) {
      numStr = numStr.replace(/\./g, '').replace(',', '.');
    } else {
      numStr = numStr.replace(/,/g, '');
    }
  } else if (numStr.includes(',')) {
    const parts = numStr.split(',');
    if (parts[parts.length - 1].length === 2) {
      numStr = numStr.replace(',', '.');
    } else {
      numStr = numStr.replace(/,/g, '');
    }
  }
  const val = parseFloat(numStr);
  return isNaN(val) || val <= 0 ? null : Math.round(val * 100) / 100;
}

/**
 * Formata um número float para string BRL "R$ 1.234,56"
 */
function formatBRL(num) {
  if (typeof num !== 'number' || isNaN(num)) return 'Preço sob consulta';
  return `R$ ${num.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

/**
 * Constrói a fila inicial de URLs conforme o modo de operação.
 * No modo 'price_finder' sem URL fixa, agenda múltiplos motores de busca de e-commerce
 * para comparação cruzada real entre lojas (Buscapé, Amazon Brasil, KaBuM!, Zoom).
 */
function buildInitialCrawlQueue({ startUrl, objective, crawlMode = 'price_finder', parentNodeId, maxPages = 4 }) {
  const cleanObj = (objective || '').trim() || 'Hardware';
  const encodedQuery = encodeURIComponent(cleanObj);
  const kabumSlug = encodeURIComponent(
    normalizeText(cleanObj).replace(/\s+/g, '-')
  );

  // Se o usuário informou uma URL específica
  if (startUrl && startUrl.trim().length > 0) {
    let cleanUrl = startUrl.trim();
    if (!/^https?:\/\//i.test(cleanUrl)) cleanUrl = `https://${cleanUrl}`;

    const queue = [{ url: cleanUrl, parentId: parentNodeId, depth: 1, sourceLabel: 'URL Direta' }];

    // Se for Price Finder e o usuário permitiu mais de 1 página, adiciona fontes comparativas complementares
    if (crawlMode === 'price_finder' && maxPages > 1 && objective && objective.trim().length >= 3) {
      const complementary = [
        { url: `https://www.buscape.com.br/search?q=${encodedQuery}`, sourceLabel: 'Buscapé Comparador' },
        { url: `https://www.amazon.com.br/s?k=${encodedQuery}`, sourceLabel: 'Amazon Brasil' },
        { url: `https://www.kabum.com.br/busca/${kabumSlug}`, sourceLabel: 'KaBuM!' }
      ];
      for (const comp of complementary) {
        if (!cleanUrl.includes(new URL(comp.url).hostname)) {
          queue.push({ url: comp.url, parentId: parentNodeId, depth: 1, sourceLabel: comp.sourceLabel });
        }
      }
    }
    return queue.slice(0, Math.max(1, maxPages));
  }

  // Sem URL inicial: constrói fila multi-fonte automática
  if (crawlMode === 'price_finder') {
    const multiStoreSeeds = [
      {
        url: `https://www.buscape.com.br/search?q=${encodedQuery}`,
        parentId: parentNodeId,
        depth: 1,
        sourceLabel: 'Buscapé (Multi-Lojas)'
      },
      {
        url: `https://www.amazon.com.br/s?k=${encodedQuery}`,
        parentId: parentNodeId,
        depth: 1,
        sourceLabel: 'Amazon Brasil'
      },
      {
        url: `https://www.kabum.com.br/busca/${kabumSlug}`,
        parentId: parentNodeId,
        depth: 1,
        sourceLabel: 'KaBuM! Oficial'
      },
      {
        url: `https://www.zoom.com.br/search?q=${encodedQuery}`,
        parentId: parentNodeId,
        depth: 1,
        sourceLabel: 'Zoom Comparador'
      }
    ];
    return multiStoreSeeds.slice(0, Math.max(1, maxPages));
  }

  // Modo Mapeamento Mental: Wikipédia + busca enciclopédica
  return [
    {
      url: `https://pt.wikipedia.org/w/index.php?search=${encodedQuery}&title=Especial:Pesquisar&profile=advanced&fulltext=1`,
      parentId: parentNodeId,
      depth: 1,
      sourceLabel: 'Wikipédia Lusófona'
    }
  ];
}

/**
 * Prepara a página antes da extração:
 * 1. Fecha banners de cookies / LGPD que obstruem elementos
 * 2. Faz scroll progressivo para disparar lazy-loading de preços e imagens
 */
async function preparePageForScraping(page) {
  try {
    await page.evaluate(async () => {
      // 1. Fechar modais/banners de cookies comuns
      const cookieSelectors = [
        '#onetrust-accept-btn-handler',
        '#sp-cc-accept',
        '[data-testid="cookie-banner-accept"]',
        'button[id*="cookie"][id*="accept"]',
        'button[class*="cookie"][class*="accept"]'
      ];
      for (const sel of cookieSelectors) {
        const btn = document.querySelector(sel);
        if (btn && typeof btn.click === 'function') {
          try { btn.click(); } catch {}
        }
      }

      // 2. Scroll suave para ativar IntersectionObservers (lazy load)
      const step = Math.max(450, Math.floor(window.innerHeight * 0.75));
      for (let i = 0; i < 3; i++) {
        window.scrollBy({ top: step, behavior: 'instant' });
        await new Promise((r) => setTimeout(r, 180));
      }
      window.scrollTo({ top: 0, behavior: 'instant' });
    });
    await page.waitForTimeout(350);
  } catch {
    // Ignora falhas de pré-scroll em páginas restritas
  }
}

/**
 * Executa a extração híbrida de 4 camadas para E-Commerce dentro da página
 */
async function extractRawEcommerceOffersFromPage(page) {
  return page.evaluate(() => {
    const extracted = [];
    let selectorCounter = 0;

    function tagElementForSpider(el) {
      if (!el || !el.setAttribute) return null;
      const existing = el.getAttribute('data-arachne-target');
      if (existing) return `[data-arachne-target="${existing}"]`;
      const id = `target-offer-${selectorCounter++}`;
      el.setAttribute('data-arachne-target', id);
      return `[data-arachne-target="${id}"]`;
    }

    const hostname = window.location.hostname.replace(/^(?:www\.|lista\.)/, '');

    // ========================================================================
    // CAMADA 1: NEXT.JS HYDRATION (__NEXT_DATA__) - Ex: KaBuM!, lojas VTEX/Next
    // ========================================================================
    const nextScript = document.getElementById('__NEXT_DATA__');
    if (nextScript) {
      try {
        const nextJson = JSON.parse(nextScript.textContent || '{}');
        const rawPageData = nextJson.props?.pageProps?.data;
        const pageData = typeof rawPageData === 'string' ? JSON.parse(rawPageData) : rawPageData;

        // Catálogo KaBuM!
        const kabumCatalog = pageData?.catalogServer?.data;
        if (Array.isArray(kabumCatalog) && kabumCatalog.length > 0) {
          for (const item of kabumCatalog.slice(0, 14)) {
            if (!item || !item.name) continue;
            const cashVal = Number(item.priceWithDiscount || item.price || 0);
            const cardVal = Number(item.price || cashVal);
            if (cashVal <= 0) continue;

            // Tenta localizar o card correspondente no DOM para a aranha caminhar até ele
            const domLink =
              document.querySelector(`a[href*="/produto/${item.code}"]`) ||
              document.querySelector('article.productCard, main article');
            const cardEl = domLink ? (domLink.closest('article') || domLink) : document.body;

            const discountPct =
              cardVal > cashVal ? Math.round(((cardVal - cashVal) / cardVal) * 100) : 0;

            extracted.push({
              uniqueSelector: tagElementForSpider(cardEl) || 'body',
              title: String(item.name).trim(),
              rawPrice: `R$ ${cashVal.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`,
              numericPrice: cashVal,
              originalCardPrice: cardVal,
              installmentStr: item.maxInstallment || (cardVal ? `Cartão: R$ ${cardVal.toFixed(2)}` : 'À vista no PIX'),
              shippingStr: item.freeShipping ? 'Frete Grátis' : 'Frete a calcular',
              seller: item.sellerName || 'KaBuM!',
              rating: item.rating ? `${item.rating}/5 (${item.ratingCount || 1} aval.)` : null,
              thumbnail: item.image || null,
              cashback: discountPct > 0 ? `${discountPct}% OFF no PIX` : null,
              href: item.friendlyName
                ? `https://www.kabum.com.br/produto/${item.code}/${item.friendlyName}`
                : `https://www.kabum.com.br/produto/${item.code}`,
              extractionMethod: 'Next.js Hydration (__NEXT_DATA__)'
            });
          }
        }
      } catch {
        // Prossegue para as próximas camadas se o JSON diferir
      }
    }

    // ========================================================================
    // CAMADA 2: ADAPTADOR ESPECIALIZADO BUSCAPÉ & ZOOM ([data-testid="product-card"])
    // ========================================================================
    const buscapeCards = Array.from(document.querySelectorAll('[data-testid="product-card"]'));
    if (buscapeCards.length > 0) {
      for (const card of buscapeCards.slice(0, 14)) {
        const titleEl = card.querySelector('[data-testid="product-card::name"], h2, h3');
        const priceEl = card.querySelector('[data-testid="product-card::price"]');
        if (!titleEl || !priceEl) continue;

        const title = titleEl.innerText.trim();
        const rawPrice = priceEl.innerText.trim();
        const instEl = card.querySelector('[data-testid="product-card::installment"]');
        const ratingEl = card.querySelector('[data-testid="product-card::rating"]');
        const cashbackEl = card.querySelector('[data-testid="product-card::cashback"]');
        const linkEl = card.querySelector('a[data-testid="product-card::card"], a[href]');
        const imgEl = card.querySelector('img[src^="http"]');

        // Extração limpa do nome real da Loja no Buscapé/Zoom sem confundir com cashback
        let seller = hostname.includes('zoom') ? 'Zoom Ofertas' : 'Buscapé Ofertas';
        const cardTextLines = (card.innerText || '')
          .split(/\r?\n/)
          .map((l) => l.trim())
          .filter(Boolean);

        for (const line of cardTextLines) {
          const viaMatch = line.match(/^Via\s+(.+)$/i);
          if (viaMatch) {
            seller = viaMatch[1].trim();
            break;
          }
        }

        if (seller.includes('Ofertas') && cardTextLines.length > 0) {
          // No Buscapé, quando não tem "Via X", a última linha costuma ser o nome da loja (ex: "Magazine Luiza", "KaBuM!", "Mercado Livre")
          const candidateLastLine = cardTextLines[cardTextLines.length - 1];
          if (
            candidateLastLine &&
            candidateLastLine.length >= 3 &&
            candidateLastLine.length <= 28 &&
            !/R\$|[0-9]+\s*loja|volta|juros|frete/i.test(candidateLastLine) &&
            candidateLastLine !== title
          ) {
            seller = candidateLastLine;
          }
        }

        const fullCardText = cardTextLines.join(' ');
        const hasFreeShipping = /frete gr[aá]tis/i.test(fullCardText);

        extracted.push({
          uniqueSelector: tagElementForSpider(card),
          title,
          rawPrice,
          numericPrice: null,
          installmentStr: instEl ? instEl.innerText.trim() : 'À vista',
          shippingStr: hasFreeShipping ? 'Frete Grátis' : 'Consultar na loja',
          seller,
          rating: ratingEl ? ratingEl.innerText.trim() : null,
          thumbnail: imgEl ? imgEl.src : null,
          cashback: cashbackEl ? cashbackEl.innerText.trim() : null,
          href: linkEl ? linkEl.href : window.location.href,
          extractionMethod: 'Adapter Buscapé/Zoom DOM'
        });
      }
    }

    // ========================================================================
    // CAMADA 3: ADAPTADOR ESPECIALIZADO AMAZON BRASIL (div.s-result-item)
    // ========================================================================
    const amazonCards = Array.from(
      document.querySelectorAll('div.s-result-item[data-component-type="s-search-result"]')
    );
    if (amazonCards.length > 0) {
      for (const card of amazonCards.slice(0, 15)) {
        const titleEl = card.querySelector('h2 span, h2 a span');
        const offscreenPrice = card.querySelector('.a-price .a-offscreen');
        const priceWhole = card.querySelector('.a-price-whole');
        const priceFraction = card.querySelector('.a-price-fraction');

        if (!titleEl) continue;
        let rawPrice = offscreenPrice ? offscreenPrice.innerText.trim() : null;
        if (!rawPrice && priceWhole) {
          const w = priceWhole.innerText.replace(/[^\d.]/g, '');
          const f = priceFraction ? priceFraction.innerText.replace(/[^\d]/g, '') : '00';
          if (w) rawPrice = `R$ ${w},${f}`;
        }
        if (!rawPrice) continue;

        const cardText = (card.innerText || '').replace(/\s+/g, ' ');
        const instMatch = cardText.match(/em at[eé]\s+[0-9]{1,2}x\s+de\s+R\$\s*[0-9.,]+(?:\s+sem juros)?/i);
        const freeShip = /frete gr[aá]tis|prime/i.test(cardText);
        const ratingEl = card.querySelector('.a-icon-alt');
        const imgEl = card.querySelector('img.s-image');
        const linkEl = card.querySelector('h2 a, a.a-link-normal[href*="/dp/"]');

        extracted.push({
          uniqueSelector: tagElementForSpider(card),
          title: titleEl.innerText.trim(),
          rawPrice,
          numericPrice: null,
          installmentStr: instMatch ? instMatch[0] : 'À vista na Amazon',
          shippingStr: freeShip ? 'Frete Grátis / Prime' : 'Frete Amazon',
          seller: 'Amazon Brasil',
          rating: ratingEl ? ratingEl.innerText.trim() : null,
          thumbnail: imgEl ? imgEl.src : null,
          cashback: null,
          href: linkEl ? linkEl.href : window.location.href,
          extractionMethod: 'Adapter Amazon S-Result'
        });
      }
    }

    // ========================================================================
    // CAMADA 4: ADAPTADOR MERCADO LIVRE & JSON-LD SCHEMA.ORG + FALLBACK VISUAL
    // ========================================================================
    if (extracted.length === 0) {
      // 4A. Tenta extrair de scripts application/ld+json (Schema.org Product / ItemList)
      const ldScripts = Array.from(document.querySelectorAll('script[type="application/ld+json"]'));
      for (const script of ldScripts) {
        try {
          const data = JSON.parse(script.textContent || '{}');
          const items = Array.isArray(data)
            ? data
            : data['@type'] === 'ItemList' && Array.isArray(data.itemListElement)
            ? data.itemListElement.map((el) => el.item || el)
            : [data];

          for (const item of items) {
            if (!item || (item['@type'] !== 'Product' && !item.offers)) continue;
            const offersObj = Array.isArray(item.offers) ? item.offers[0] : item.offers?.offers?.[0] || item.offers;
            const priceVal = Number(offersObj?.lowPrice || offersObj?.price || 0);
            if (!priceVal || priceVal <= 0) continue;

            extracted.push({
              uniqueSelector: 'body',
              title: String(item.name || document.title).trim(),
              rawPrice: `R$ ${priceVal.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`,
              numericPrice: priceVal,
              installmentStr: 'Consultar parcelamento',
              shippingStr: 'Ver na loja',
              seller: offersObj?.seller?.name || item.brand?.name || hostname.split('.')[0].toUpperCase(),
              rating: item.aggregateRating?.ratingValue ? `${item.aggregateRating.ratingValue}/5` : null,
              thumbnail: Array.isArray(item.image) ? item.image[0] : item.image || null,
              cashback: null,
              href: offersObj?.url || item.url || window.location.href,
              extractionMethod: 'Schema.org JSON-LD'
            });
          }
        } catch {}
      }

      // 4B. Cards genéricos de e-commerce (Mercado Livre, Pichau, Terabyte, VTEX, Shopify)
      const genericCards = Array.from(
        document.querySelectorAll(
          '.ui-search-layout__item, .poly-card, .ui-search-result, [class*="product-card"], [class*="ProductCard"], [class*="product-item"], article'
        )
      );
      for (const card of genericCards) {
        const rect = card.getBoundingClientRect();
        if (rect.width < 110 || rect.height < 120 || rect.top + window.scrollY > 5500) continue;

        const text = (card.innerText || '').replace(/\s+/g, ' ').trim();
        const priceMatch = text.match(
          /(?:R\$|\$|US\$|€)\s*([0-9]{1,3}(?:[.,][0-9]{3})*(?:[.,][0-9]{2})|[0-9]+(?:[.,][0-9]{2})?)/
        );
        if (!priceMatch) continue;

        const titleEl = card.querySelector(
          'h2, h3, .poly-component__title, .ui-search-item__title, [class*="title"], [class*="name"], a[title]'
        );
        const title = titleEl
          ? (titleEl.innerText || titleEl.getAttribute('title') || '').trim()
          : text.slice(0, 72);
        if (!title || title.length < 5) continue;

        const linkEl = card.querySelector('a[href^="http"], a[href^="/"]');
        const imgEl = card.querySelector('img[src^="http"], img[data-src^="http"]');
        const instMatch = text.match(/\b([0-9]{1,2}x\s*(?:de\s*)?(?:R\$|\$)?\s*[0-9.,]+(?:\s*sem juros)?)/i);
        const freeShip = /frete gr[aá]tis|envio gr[aá]tis/i.test(text);

        extracted.push({
          uniqueSelector: tagElementForSpider(card),
          title: title.slice(0, 90),
          rawPrice: priceMatch[0],
          numericPrice: null,
          installmentStr: instMatch ? instMatch[1].trim() : 'À vista',
          shippingStr: freeShip ? 'Frete Grátis' : 'Frete a calcular',
          seller: hostname.split('.')[0].toUpperCase(),
          rating: null,
          thumbnail: imgEl ? (imgEl.src || imgEl.getAttribute('data-src')) : null,
          cashback: null,
          href: linkEl ? linkEl.href : window.location.href,
          extractionMethod: 'Heuristic Product Card'
        });

        if (extracted.length >= 14) break;
      }
    }

    return extracted;
  });
}

/**
 * Avalia a relevância de cada oferta em relação ao objetivo do usuário,
 * filtra anúncios patrocinados de outros produtos, acessórios indesejados e
 * marca outliers estatísticos de preço.
 */
function filterAndScoreEcommerceOffers(rawOffers, objective) {
  const analysis = analyzeObjective(objective);
  const scored = [];
  const seenKeys = new Set();

  for (const raw of rawOffers) {
    const numPrice = raw.numericPrice ?? parsePriceToNumber(raw.rawPrice);
    if (!numPrice || numPrice <= 0) continue;

    const cleanTitle = String(raw.title || '').replace(/\s+/g, ' ').trim();
    if (cleanTitle.length < 4) continue;

    const normTitle = normalizeText(cleanTitle);

    // Deduplicação por (loja + título normalizado curto + preço arredondado)
    const dedupKey = `${normalizeText(raw.seller)}::${normTitle.slice(0, 45)}::${Math.round(numPrice)}`;
    if (seenKeys.has(dedupKey)) continue;
    seenKeys.add(dedupKey);

    // 1. Verifica se é acessório (capinha, cabo, suporte, película) não solicitado
    const isAccessory =
      !analysis.asksForAccessory &&
      ACCESSORY_KEYWORDS.some((kw) => normTitle.includes(kw.trim()));

    // 2. Verifica se é um PC/Notebook completo quando o usuário buscou apenas uma peça (ex: RTX 4060, i7 14700f)
    const isBundle =
      !analysis.asksForBundle &&
      analysis.allTokens.length > 0 &&
      BUNDLE_KEYWORDS.some((kw) => normTitle.includes(kw.trim()));

    // 3. Verificação de match dos tokens de modelo (ex: "4060", "144hz", "14700f")
    let matchedModelTokens = 0;
    for (const mt of analysis.modelTokens) {
      // Verifica se o token de modelo aparece no título
      if (normTitle.includes(mt)) {
        matchedModelTokens++;
      }
    }

    let matchedWordTokens = 0;
    for (const wt of analysis.wordTokens) {
      if (normTitle.includes(wt)) {
        matchedWordTokens++;
      }
    }

    // Se o usuário especificou números de modelo (ex: "4060") e o produto NÃO tem nenhum deles (ex: patrocinado "RX 7600" ou "RTX 5060"), descarta!
    if (analysis.modelTokens.length > 0 && matchedModelTokens === 0) {
      continue;
    }

    // Se o usuário não especificou números, mas especificou palavras e nenhuma bateu, descarta
    if (
      analysis.modelTokens.length === 0 &&
      analysis.wordTokens.length > 0 &&
      matchedWordTokens === 0
    ) {
      continue;
    }

    // Calcula score de relevância (0 a 100)
    let relevanceScore = 60;
    if (analysis.modelTokens.length > 0) {
      relevanceScore += Math.round((matchedModelTokens / analysis.modelTokens.length) * 30);
    }
    if (analysis.wordTokens.length > 0) {
      relevanceScore += Math.round((matchedWordTokens / analysis.wordTokens.length) * 15);
    }
    if (isAccessory) relevanceScore -= 55;
    if (isBundle) relevanceScore -= 35;

    relevanceScore = Math.max(5, Math.min(100, relevanceScore));

    // Ignora acessórios claros quando não solicitados
    if (isAccessory) continue;

    scored.push({
      ...raw,
      title: cleanTitle,
      numericPrice: numPrice,
      rawPrice: formatBRL(numPrice),
      isAccessory,
      isBundle,
      relevanceScore
    });
  }

  // Separa ofertas de produto puro vs bundles para cálculo da Mediana estatística
  const coreOffers = scored.filter((o) => !o.isBundle);
  const referencePool = coreOffers.length >= 2 ? coreOffers : scored;

  const sortedPrices = referencePool
    .map((o) => o.numericPrice)
    .sort((a, b) => a - b);

  let medianPrice = 0;
  if (sortedPrices.length > 0) {
    const mid = Math.floor(sortedPrices.length / 2);
    medianPrice =
      sortedPrices.length % 2 !== 0
        ? sortedPrices[mid]
        : (sortedPrices[mid - 1] + sortedPrices[mid]) / 2;
  }

  // Filtra outliers extremos (ex: peça avulsa custando < 28% da mediana ou bundle custando > 250% da mediana)
  const finalOffers = scored
    .map((offer) => {
      const isTooCheapOutlier = medianPrice > 0 && offer.numericPrice < medianPrice * 0.28;
      const isTooExpensiveBundle =
        (offer.isBundle && coreOffers.length >= 2) ||
        (medianPrice > 0 && offer.numericPrice > medianPrice * 2.6);

      return {
        ...offer,
        medianReference: Math.round(medianPrice * 100) / 100,
        isPriceOutlier: isTooCheapOutlier || isTooExpensiveBundle
      };
    })
    .filter((offer) => !offer.isPriceOutlier)
    .sort((a, b) => a.numericPrice - b.numericPrice);

  // Se todos foram filtrados como outlier por lista muito pequena, retorna scored ordenado
  const resultList = finalOffers.length > 0 ? finalOffers : scored.sort((a, b) => a.numericPrice - b.numericPrice);
  const accepted = resultList.slice(0, 10);

  return {
    accepted,
    rejectedCount: Math.max(0, rawOffers.length - accepted.length),
    medianPrice: Math.round(medianPrice * 100) / 100
  };
}

/**
 * MODO MAPEAMENTO MENTAL:
 * Extrator semântico profundo de artigos, metadados OpenGraph/JSON-LD,
 * tabelas HTML estruturadas (<table>) e hierarquia de seções (H1/H2/H3 -> Fatos & Links).
 */
async function extractDeepKnowledgeFromPage(page, objectiveKeywords = []) {
  return page.evaluate((keywords) => {
    let selectorIdx = 0;
    function tagForSpider(el) {
      if (!el || !el.setAttribute) return 'body';
      const id = `target-know-${selectorIdx++}`;
      el.setAttribute('data-arachne-target', id);
      return `[data-arachne-target="${id}"]`;
    }

    function getCleanCssPath(el) {
      if (!el || !el.tagName) return 'document';
      const tag = el.tagName.toLowerCase();
      const id = el.id ? `#${el.id}` : '';
      const cls =
        el.className && typeof el.className === 'string'
          ? '.' +
            el.className
              .trim()
              .split(/\s+/)
              .filter((c) => !c.startsWith('target-'))
              .slice(0, 2)
              .join('.')
          : '';
      return `${tag}${id}${cls}`;
    }

    // 1. Metadados ricos da página (OpenGraph, Author, Canonical, Tempo de leitura)
    const getMeta = (selector) =>
      document.querySelector(selector)?.getAttribute('content')?.trim() || null;

    const mainContainer =
      document.querySelector(
        '#mw-content-text .mw-parser-output, article, [role="main"], main, .post-content, .article-body, #content'
      ) || document.body;

    const fullBodyText = (mainContainer.innerText || '').replace(/\s+/g, ' ').trim();
    const wordCount = fullBodyText ? fullBodyText.split(/\s+/).length : 0;
    const readingTimeMinutes = Math.max(1, Math.ceil(wordCount / 210));

    const metadata = {
      title: (document.title || 'Página Web').trim(),
      description:
        getMeta('meta[name="description"]') ||
        getMeta('meta[property="og:description"]') ||
        '',
      siteName:
        getMeta('meta[property="og:site_name"]') ||
        window.location.hostname.replace(/^www\./, ''),
      author:
        getMeta('meta[name="author"]') ||
        getMeta('meta[property="article:author"]') ||
        null,
      publishedTime:
        getMeta('meta[property="article:published_time"]') ||
        document.querySelector('time[datetime]')?.getAttribute('datetime') ||
        null,
      canonicalUrl:
        document.querySelector('link[rel="canonical"]')?.getAttribute('href') ||
        window.location.href,
      wordCount,
      readingTimeMinutes: `${readingTimeMinutes} min`
    };

    // 2. Extração de Tabelas de Dados HTML (<table>)
    const extractedTables = [];
    const tableEls = Array.from(mainContainer.querySelectorAll('table'));
    for (const tbl of tableEls) {
      // Ignora caixas de navegação ou infoboxes vazias da Wikipédia
      if (tbl.closest('.navbox, .ambox, .sistersitebox, .mbox-small, nav, footer')) continue;
      const rect = tbl.getBoundingClientRect();
      if (rect.width < 120 || rect.height < 60) continue;

      const rows = Array.from(tbl.querySelectorAll('tr'));
      if (rows.length < 2) continue;

      const parsedRows = [];
      for (const r of rows.slice(0, 12)) {
        const cells = Array.from(r.querySelectorAll('th, td')).map((c) =>
          (c.innerText || '').replace(/\s+/g, ' ').trim()
        );
        if (cells.filter(Boolean).length >= 2) {
          parsedRows.push(cells.slice(0, 6));
        }
      }

      if (parsedRows.length < 2) continue;

      const headers = parsedRows[0];
      let caption = tbl.querySelector('caption')?.innerText?.trim() || '';
      if (!caption) {
        let prev = tbl.previousElementSibling;
        while (prev && ['STYLE', 'SCRIPT', 'LINK', 'NOSCRIPT'].includes(prev.tagName)) {
          prev = prev.previousElementSibling;
        }
        if (prev && /^H[1-4]$/.test(prev.tagName)) {
          caption = prev.innerText?.replace(/\[editar.*?\]/gi, '').trim() || '';
        }
      }
      if (!caption || caption.startsWith('.') || caption.includes('{')) {
        caption = headers.filter(Boolean).slice(0, 3).join(' × ') || `Tabela de Dados (${parsedRows.length} linhas)`;
      }

      // Converte para tabela Markdown legível
      const mdHeader = `| ${headers.join(' | ')} |`;
      const mdSep = `| ${headers.map(() => '---').join(' | ')} |`;
      const mdBody = parsedRows
        .slice(1, 9)
        .map((row) => `| ${headers.map((_, i) => (row[i] || '-').replace(/\|/g, '/')).join(' | ')} |`)
        .join('\n');

      extractedTables.push({
        uniqueSelector: tagForSpider(tbl),
        formalSelector: getCleanCssPath(tbl),
        caption: caption.replace(/\s+/g, ' ').slice(0, 68),
        rowCount: parsedRows.length,
        colCount: headers.length,
        headers,
        rows: parsedRows.slice(1, 7),
        sampleRows: parsedRows.slice(1, 7),
        markdownPreview: `${mdHeader}\n${mdSep}\n${mdBody}`
      });

      if (extractedTables.length >= 3) break;
    }

    // 3. Extração Semântica de Seções, Fatos Analíticos e Links Relevantes
    const NoiseSelector =
      'nav, header, footer, aside, .navbox, .reflist, .mw-editsection, .toc, .sidebar, .cookie-banner, script, style, noscript';

    const elements = Array.from(
      mainContainer.querySelectorAll('h1, h2, h3, p, li, blockquote, a[href^="http"]')
    );

    const candidates = [];
    let activeSectionHeading = metadata.title.slice(0, 55);

    for (const el of elements) {
      if (el.id === 'arachnemind-canvas-overlay') continue;
      if (el.closest(NoiseSelector)) continue;

      const rect = el.getBoundingClientRect();
      if (rect.width < 25 || rect.height < 12) continue;
      if (rect.top + window.scrollY > 6500) continue;

      const tag = el.tagName.toLowerCase();
      const rawText = (el.innerText || el.textContent || '')
        .replace(/\[editar[^\]]*\]/gi, '')
        .replace(/\[\d+\]/g, '')
        .replace(/\s+/g, ' ')
        .trim();

      if (['h1', 'h2', 'h3'].includes(tag)) {
        if (rawText.length >= 4 && rawText.length <= 110) {
          activeSectionHeading = rawText;
          candidates.push({
            uniqueSelector: tagForSpider(el),
            formalSelector: getCleanCssPath(el),
            tag,
            kind: 'section_heading',
            section: activeSectionHeading,
            text: rawText,
            href: null,
            score: 14
          });
        }
        continue;
      }

      if (rawText.length < 28 || rawText.length > 520) continue;

      const lowerText = rawText.toLowerCase();
      let score = 2;

      // Pontuação por densidade de dados fatuais (números, datas, moedas, percentuais)
      if (/\d/.test(rawText)) score += 3;
      if (/(?:R\$|\$|€|%|\b(?:19|20)\d{2}\b|\b\d+(?:[.,]\d+)?\s*(?:mil|milhoes|bilhoes|gb|mb|ghz|hz|km|kg)\b)/i.test(rawText)) {
        score += 5;
      }

      // Pontuação por aderência às palavras-chave do objetivo
      for (const kw of keywords) {
        if (lowerText.includes(kw)) score += 7;
      }

      let href = null;
      if (tag === 'a' && el.href && /^https?:\/\//i.test(el.href)) {
        if (/login|signin|cadastro|privacy|termos|cart|checkout|facebook|twitter|instagram|whatsapp/i.test(el.href)) {
          continue;
        }
        href = el.href;
        score += 3;
      } else {
        const innerLink = el.querySelector('a[href^="http"]');
        if (
          innerLink &&
          innerLink.href &&
          !/cite_note|login|signup|editar/i.test(innerLink.href)
        ) {
          href = innerLink.href;
        }
      }

      candidates.push({
        uniqueSelector: tagForSpider(el),
        formalSelector: getCleanCssPath(el),
        tag,
        kind: href && tag === 'a' ? 'reference_link' : 'analytical_fact',
        section: activeSectionHeading,
        text: rawText,
        href,
        score
      });
    }

    // Deduplicação de fragmentos similares e seleção balanceada
    const seenPrefixes = new Set();
    const filteredCandidates = [];
    for (const item of candidates.sort((a, b) => b.score - a.score)) {
      const prefix = item.text.slice(0, 55).toLowerCase();
      if (seenPrefixes.has(prefix)) continue;
      seenPrefixes.add(prefix);
      filteredCandidates.push(item);
      if (filteredCandidates.length >= 12) break;
    }

    return {
      metadata,
      tables: extractedTables,
      items: filteredCandidates
    };
  }, objectiveKeywords);
}

module.exports = {
  analyzeObjective,
  parsePriceToNumber,
  formatBRL,
  buildInitialCrawlQueue,
  preparePageForScraping,
  extractRawEcommerceOffersFromPage,
  filterAndScoreEcommerceOffers,
  extractDeepKnowledgeFromPage
};
