/**
 * ARACHNEMIND - BACKEND & AUTONOMOUS PLAYWRIGHT ORCHESTRATOR (server.js)
 * Node.js + Express + Socket.io + Playwright (Headless: false)
 */
const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const cors = require('cors');
const fs = require('fs');
const path = require('path');
const { chromium } = require('playwright');
const { v4: uuidv4 } = require('uuid');
const {
  analyzeObjective,
  parsePriceToNumber,
  formatBRL,
  buildInitialCrawlQueue,
  preparePageForScraping,
  extractRawEcommerceOffersFromPage,
  filterAndScoreEcommerceOffers,
  extractDeepKnowledgeFromPage
} = require('./scraper-engine');

const PORT = process.env.PORT || 4000;
const DATA_DIR = path.join(__dirname, '..', 'data');
const DB_FILE = path.join(DATA_DIR, 'knowledge-base.json');
const SPIDER_OVERLAY_PATH = path.join(__dirname, 'spider-overlay.js');

if (!fs.existsSync(DATA_DIR)) {
  fs.mkdirSync(DATA_DIR, { recursive: true });
}

function loadDatabase() {
  if (!fs.existsSync(DB_FILE)) {
    const initial = { trees: [], nodes: [], edges: [] };
    fs.writeFileSync(DB_FILE, JSON.stringify(initial, null, 2), 'utf-8');
    return initial;
  }
  try {
    return JSON.parse(fs.readFileSync(DB_FILE, 'utf-8'));
  } catch (err) {
    console.error('[DB] Erro ao ler knowledge-base.json, recriando estrutura:', err.message);
    return { trees: [], nodes: [], edges: [] };
  }
}

const db = loadDatabase();

function saveDatabase() {
  fs.writeFileSync(DB_FILE, JSON.stringify(db, null, 2), 'utf-8');
}

// ============================================================================
// CONFIGURAÇÃO DO SERVIDOR EXPRESS & SOCKET.IO
// ============================================================================
const app = express();
app.use(cors());
app.use(express.json({ limit: '10mb' }));

const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: '*',
    methods: ['GET', 'POST', 'DELETE', 'PUT']
  }
});

// Registro de sessões ativas do Playwright para permitir parada segura
const activeCrawlers = new Map();

// ============================================================================
// FUNÇÕES DE GERENCIAMENTO DO GRAFO E ESTRUTURA FORMAL DE DADOS
// ============================================================================

/**
 * Cria e persiste um novo Nó Formal e sua Aresta conectada ao pai,
 * emitindo eventos em tempo real via WebSocket para o Frontend.
 */
function registerFormalNode({
  treeId,
  parentId = null,
  type,
  label,
  formalData,
  edgeLabel = 'CONTAINS',
  isBestPrice = false
}) {
  const node = {
    id: uuidv4(),
    treeId,
    parentId,
    type, // 'root_topic' | 'product_root' | 'domain' | 'webpage' | 'store_offer' | 'price_cash' | 'price_installment' | 'shipping_cost' | 'extracted_entity' | 'data_point'
    label: String(label || 'Sem Título').slice(0, 80),
    isBestPrice: Boolean(isBestPrice),
    formalData: {
      summary: formalData?.summary || '',
      attributes: formalData?.attributes || {},
      numericPrice: typeof formalData?.numericPrice === 'number' ? formalData.numericPrice : null,
      sourceUrl: formalData?.sourceUrl || '',
      domSelector: formalData?.domSelector || 'document',
      timestamp: formalData?.timestamp || new Date().toISOString()
    }
  };

  db.nodes.push(node);
  io.emit('NODE_ADDED', node);

  if (parentId) {
    const edge = {
      id: uuidv4(),
      treeId,
      source: parentId,
      target: node.id,
      label: edgeLabel,
      isCrossTree: false
    };
    db.edges.push(edge);
    io.emit('EDGE_ADDED', edge);
  }

  // Atualiza contador e timestamp da árvore
  const tree = db.trees.find((t) => t.id === treeId);
  if (tree) {
    tree.updatedAt = new Date().toISOString();
    tree.nodeCount = db.nodes.filter((n) => n.treeId === treeId).length;
    io.emit('TREE_UPDATED', tree);
  }

  saveDatabase();
  return node;
}

/**
 * Recalcula o menor preço (Best Deal) de toda a árvore e dispara alerta se atingir a meta
 */
function recalculateBestPriceForTree(treeId) {
  const treeNodes = db.nodes.filter((n) => n.treeId === treeId);
  const priceNodes = treeNodes.filter(
    (n) => n.type === 'price_cash' && typeof n.formalData?.numericPrice === 'number'
  );

  if (priceNodes.length === 0) return null;

  let minPrice = Infinity;
  let bestCashNode = null;

  for (const p of priceNodes) {
    if (p.formalData.numericPrice < minPrice && p.formalData.numericPrice > 0) {
      minPrice = p.formalData.numericPrice;
      bestCashNode = p;
    }
  }

  const bestStoreNodeId = bestCashNode ? bestCashNode.parentId : null;

  for (const n of treeNodes) {
    if (n.type === 'price_cash') {
      const isBest = bestCashNode && n.id === bestCashNode.id;
      if (n.isBestPrice !== isBest) {
        n.isBestPrice = isBest;
        io.emit('NODE_UPDATED', n);
      }
    } else if (n.type === 'store_offer') {
      const isBestStore = bestStoreNodeId && n.id === bestStoreNodeId;
      if (n.isBestPrice !== isBestStore) {
        n.isBestPrice = isBestStore;
        io.emit('NODE_UPDATED', n);
      }
    }
  }

  const tree = db.trees.find((t) => t.id === treeId);
  if (tree && bestCashNode) {
    const parentOffer = treeNodes.find((n) => n.id === bestCashNode.parentId);
    tree.bestPrice = {
      price: minPrice,
      nodeId: bestCashNode.id,
      storeNodeId: bestStoreNodeId,
      store: parentOffer?.formalData?.attributes?.storeName || bestCashNode.formalData?.attributes?.storeName || 'Melhor Oferta',
      installment: parentOffer?.formalData?.attributes?.installment || 'À vista',
      shipping: parentOffer?.formalData?.attributes?.shipping || 'Frete a calcular',
      url: bestCashNode.formalData?.sourceUrl
    };

    // Alerta do Sentinela
    if (tree.targetPrice && minPrice <= Number(tree.targetPrice)) {
      io.emit('PRICE_DROP_ALERT', {
        treeId,
        productTitle: tree.title,
        storeName: tree.bestPrice.store,
        price: minPrice,
        targetPrice: tree.targetPrice,
        url: tree.bestPrice.url
      });
    }

    io.emit('TREE_UPDATED', tree);
    saveDatabase();
  }

  return bestCashNode;
}

/**
 * Extrai atributos formais estruturados (chave-valor) de qualquer texto raspado
 * (Preços, moedas, porcentagens, datas, e-mails, métricas numéricas e palavras-chave).
 */
function extractFormalAttributes(rawText, elementMeta, objectiveKeywords) {
  const attributes = {
    tag: `<${elementMeta.tag}>`,
    charCount: rawText.length
  };

  if (elementMeta.href) {
    attributes.hyperlink = elementMeta.href;
  }

  // Detecção de valores monetários (R$, US$, €, £)
  const moneyMatch = rawText.match(/(?:R\$|\$|US\$|€|£)\s?\d{1,3}(?:[.,]\d{3})*(?:[.,]\d{2})?/g);
  if (moneyMatch) {
    attributes.monetaryValue = moneyMatch.slice(0, 3).join(' | ');
  }

  // Detecção de porcentagens / variações
  const percentMatch = rawText.match(/[+-]?\d+(?:[.,]\d+)?%/g);
  if (percentMatch) {
    attributes.percentage = percentMatch.slice(0, 3).join(' | ');
  }

  // Detecção de datas ou anos
  const dateMatch = rawText.match(/\b(?:\d{1,2}[/-]\d{1,2}[/-]\d{2,4}|20\d{2}|19\d{2})\b/g);
  if (dateMatch) {
    attributes.temporalRef = [...new Set(dateMatch)].slice(0, 3).join(', ');
  }

  // Detecção de e-mails
  const emailMatch = rawText.match(/[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g);
  if (emailMatch) {
    attributes.contactEmail = emailMatch[0];
  }

  // Termos do objetivo encontrados neste fragmento
  const lower = rawText.toLowerCase();
  const matchedKeywords = objectiveKeywords.filter((kw) => lower.includes(kw));
  if (matchedKeywords.length > 0) {
    attributes.matchedObjectiveTerms = matchedKeywords.join(', ');
  }

  return attributes;
}

/**
 * Tokeniza o objetivo em linguagem natural do usuário para guiar a aranha
 */
function tokenizeObjective(objective = '') {
  const stopWords = new Set([
    'para', 'como', 'onde', 'qual', 'quais', 'sobre', 'buscar', 'encontrar',
    'pesquisar', 'dados', 'informacoes', 'com', 'dos', 'das', 'nos', 'nas',
    'uma', 'uns', 'umas', 'the', 'and', 'for', 'with', 'from', 'that', 'this'
  ]);
  return objective
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .split(/[^a-z0-9]+/)
    .filter((w) => w.length >= 3 && !stopWords.has(w));
}

/**
 * Resolve a URL inicial conforme o modo:
 * - 'price_finder': Mercado Livre / Shopping com listagem comparativa de ofertas
 * - 'mind_map': Wikipédia ou URL informada pelo usuário
 */
function resolveStartingUrl(startUrl, objective, crawlMode = 'price_finder') {
  if (startUrl && startUrl.trim().length > 0) {
    const clean = startUrl.trim();
    if (/^https?:\/\//i.test(clean)) return clean;
    return `https://${clean}`;
  }
  const cleanObj = (objective || '').trim();
  const encodedQuery = encodeURIComponent(cleanObj || 'Smartphone');
  if (crawlMode === 'price_finder') {
    // Buscapé agrega todas as lojas do Brasil (Amazon, Magalu, Mercado Livre, KaBuM, etc.)
    return `https://www.buscape.com.br/search?q=${encodedQuery}`;
  }
  return `https://pt.wikipedia.org/w/index.php?search=${encodedQuery}&title=Especial:Pesquisar&profile=advanced&fulltext=1`;
}

// ============================================================================
// MOTOR DE CRAWLING AUTÔNOMO COM PLAYWRIGHT + SPIDER OVERLAY
// ============================================================================

async function runAutonomousSpider({
  treeId,
  parentNodeId,
  objective,
  startUrl,
  crawlMode = 'price_finder',
  targetPrice = null,
  maxDepth = 2,
  maxPages = 3
}) {
  const spiderCode = fs.readFileSync(SPIDER_OVERLAY_PATH, 'utf-8');
  const objectiveKeywords = tokenizeObjective(objective);
  const resolvedUrl = resolveStartingUrl(startUrl, objective, crawlMode);

  const tree = db.trees.find((t) => t.id === treeId);
  if (tree) {
    tree.status = 'crawling';
    io.emit('TREE_UPDATED', tree);
  }

  let browser = null;

  try {
    io.emit('SPIDER_ACTION', {
      treeId,
      status: 'LAUNCHING_BROWSER',
      message: `Iniciando navegador visível Chromium para: "${objective}"`,
      url: resolvedUrl
    });

    browser = await chromium.launch({
      headless: false,
      args: ['--start-maximized', '--disable-blink-features=AutomationControlled']
    });

    const context = await browser.newContext({
      viewport: null,
      userAgent:
        'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36'
    });

    // Injeção automática em todas as páginas e frames navegados
    await context.addInitScript({ content: spiderCode });

    const page = await context.newPage();
    activeCrawlers.set(treeId, { browser, stopRequested: false });

    const visitedUrls = new Set();
    const initialSources = buildInitialCrawlQueue({
      startUrl,
      objective,
      crawlMode,
      maxPages
    });

    const queue = initialSources.map((src) => ({
      url: src.url,
      sourceLabel: src.sourceLabel,
      parentId: parentNodeId,
      depth: 1
    }));

    const domainNodesMap = new Map();
    const seenOfferFingerprints = new Set();

    while (queue.length > 0 && visitedUrls.size < maxPages) {
      const sessionState = activeCrawlers.get(treeId);
      if (!sessionState || sessionState.stopRequested) break;

      const currentTask = queue.shift();
      if (!currentTask || visitedUrls.has(currentTask.url)) continue;
      visitedUrls.add(currentTask.url);

      let parsedUrl;
      try {
        parsedUrl = new URL(currentTask.url);
      } catch {
        continue;
      }

      const hostname = parsedUrl.hostname.replace(/^www\./, '');

      // Cria ou reutiliza o Nó de Domínio
      let domainNodeId = domainNodesMap.get(hostname);
      if (!domainNodeId) {
        const existingDomainNode = db.nodes.find(
          (n) => n.treeId === treeId && n.type === 'domain' && n.label === hostname
        );
        if (existingDomainNode) {
          domainNodeId = existingDomainNode.id;
        } else {
          const domainNode = registerFormalNode({
            treeId,
            parentId: currentTask.parentId,
            type: 'domain',
            label: hostname,
            edgeLabel: 'HOSTED_ON_DOMAIN',
            formalData: {
              summary: `Domínio raiz inspecionado (${currentTask.sourceLabel || hostname}) durante a busca por "${objective}".`,
              attributes: {
                protocol: parsedUrl.protocol.replace(':', ''),
                hostname,
                sourcePlatform: currentTask.sourceLabel || hostname,
                origin: parsedUrl.origin
              },
              sourceUrl: parsedUrl.origin,
              domSelector: 'window.location.hostname'
            }
          });
          domainNodeId = domainNode.id;
        }
        domainNodesMap.set(hostname, domainNodeId);
      }

      io.emit('SPIDER_ACTION', {
        treeId,
        status: 'NAVIGATING',
        message: `Navegando em ${currentTask.sourceLabel || hostname}: ${currentTask.url}`,
        url: currentTask.url
      });

      try {
        await page.goto(currentTask.url, {
          waitUntil: 'domcontentloaded',
          timeout: 28000
        });
      } catch (navErr) {
        console.warn(`[Crawler] Timeout parcial em ${currentTask.url}:`, navErr.message);
      }

      // Garante que o overlay está montado mesmo em páginas com CSP restritivo
      await page.evaluate(spiderCode).catch(() => {});

      // Prepara o DOM: remove banners LGPD/Cookies e faz scroll progressivo para hidratar lazy-loading
      await preparePageForScraping(page);

      const pageInfo = await page.evaluate(() => {
        const title = document.title || window.location.pathname || 'Página Web';
        const metaDesc =
          document.querySelector('meta[name="description"]')?.getAttribute('content') || '';
        return { title: title.trim(), metaDesc: metaDesc.trim() };
      });

      // Registra o Nó formal da Webpage
      const webpageNode = registerFormalNode({
        treeId,
        parentId: domainNodeId,
        type: 'webpage',
        label: pageInfo.title.slice(0, 62),
        edgeLabel: 'HAS_WEBPAGE',
        formalData: {
          summary:
            pageInfo.metaDesc ||
            `Página processada ativamente pela aranha: ${pageInfo.title}`,
          attributes: {
            pageTitle: pageInfo.title,
            sourcePlatform: currentTask.sourceLabel || hostname,
            depthLevel: currentTask.depth,
            urlPath: parsedUrl.pathname
          },
          sourceUrl: currentTask.url,
          domSelector: 'document > head > title'
        }
      });

      let discoveredLinks = [];

      if (crawlMode === 'price_finder') {
        // ====================================================================
        // MODO PRICE FINDER INDUSTRIAL: Extração Híbrida + Filtragem de Outliers
        // ====================================================================
        const rawOffers = await extractRawEcommerceOffersFromPage(page);
        const {
          accepted: filteredOffers,
          rejectedCount,
          medianPrice
        } = filterAndScoreEcommerceOffers(rawOffers, objective);

        io.emit('SPIDER_ACTION', {
          treeId,
          status: 'FILTERING_OFFERS',
          message: `[${currentTask.sourceLabel || hostname}] ${filteredOffers.length} ofertas reais validadas (${rejectedCount} anúncios irrelevantes/outliers descartados).`,
          url: currentTask.url
        });

        for (const offer of filteredOffers.slice(0, 7)) {
          const checkState = activeCrawlers.get(treeId);
          if (!checkState || checkState.stopRequested) break;

          // Deduplicação global entre múltiplas páginas/buscas da mesma árvore
          const fingerprint = `${offer.seller.toLowerCase()}|${offer.title.toLowerCase().slice(0, 38)}|${Math.round(offer.numericPrice)}`;
          if (seenOfferFingerprints.has(fingerprint)) continue;
          seenOfferFingerprints.add(fingerprint);

          const numPrice = offer.numericPrice;

          io.emit('SPIDER_ACTION', {
            treeId,
            status: 'SCANNING_PRICE',
            message: `[PRICE FINDER] ${offer.seller}: ${offer.title.slice(0, 48)} -> ${offer.rawPrice}`,
            selector: offer.uniqueSelector,
            url: offer.href || currentTask.url
          });

          // Aranha caminha até a oferta e dispara feixe de laser de preço
          await page
            .evaluate(
              async ({ selector, text }) => {
                if (typeof window.moveSpiderToElement === 'function') {
                  await window.moveSpiderToElement({
                    selector,
                    mode: 'price',
                    header: 'OFERTA VALIDADA',
                    text
                  });
                }
              },
              {
                selector: offer.uniqueSelector,
                text: `${offer.rawPrice} (${offer.seller}) - ${offer.title}`
              }
            )
            .catch(() => {});

          await page.waitForTimeout(480);

          const offerAttributes = {
            storeName: offer.seller,
            productTitle: offer.title,
            cashPrice: offer.rawPrice,
            shipping: offer.shippingStr,
            installment: offer.installmentStr || 'À vista',
            relevanceScore: `${offer.relevanceScore}%`,
            extractionMethod: offer.extractionMethod || offer.sourceType || 'DOM_ADAPTER'
          };

          if (offer.rating) offerAttributes.rating = `${offer.rating} / 5.0`;
          if (offer.cashback) offerAttributes.cashback = offer.cashback;
          if (offer.originalCardPrice && offer.originalCardPrice > numPrice) {
            offerAttributes.cardPrice = formatBRL(offer.originalCardPrice);
          }
          if (offer.thumbnail) offerAttributes.thumbnail = offer.thumbnail;
          if (medianPrice) offerAttributes.marketMedianRef = formatBRL(medianPrice);

          // 1. Nó de Oferta da Loja (store_offer)
          const storeNode = registerFormalNode({
            treeId,
            parentId: webpageNode.id,
            type: 'store_offer',
            label: `${offer.seller} - ${offer.title.slice(0, 40)}`,
            edgeLabel: 'OFFERS_PRODUCT',
            formalData: {
              summary: offer.title,
              attributes: offerAttributes,
              numericPrice: numPrice,
              sourceUrl: offer.href || currentTask.url,
              domSelector: offer.uniqueSelector
            }
          });

          // 2. Nó de Preço à Vista (price_cash)
          registerFormalNode({
            treeId,
            parentId: storeNode.id,
            type: 'price_cash',
            label: `${offer.rawPrice} (PIX / À Vista)`,
            edgeLabel: 'CASH_PRICE',
            formalData: {
              summary: `Preço à vista / PIX verificado em ${offer.seller}: ${offer.rawPrice}`,
              attributes: {
                storeName: offer.seller,
                productTitle: offer.title,
                cashPrice: offer.rawPrice,
                relevanceScore: `${offer.relevanceScore}%`
              },
              numericPrice: numPrice,
              sourceUrl: offer.href || currentTask.url,
              domSelector: offer.uniqueSelector
            }
          });

          // 3. Nó de Parcelamento (price_installment)
          if (offer.installmentStr) {
            registerFormalNode({
              treeId,
              parentId: storeNode.id,
              type: 'price_installment',
              label: offer.installmentStr,
              edgeLabel: 'INSTALLMENT_TERMS',
              formalData: {
                summary: `Condição de parcelamento em ${offer.seller}: ${offer.installmentStr}`,
                attributes: { installmentTerms: offer.installmentStr },
                sourceUrl: offer.href || currentTask.url,
                domSelector: offer.uniqueSelector
              }
            });
          }

          // 4. Nó de Frete / Cashback (shipping_cost)
          if (offer.shippingStr) {
            registerFormalNode({
              treeId,
              parentId: storeNode.id,
              type: 'shipping_cost',
              label: offer.cashback ? `${offer.shippingStr} • ${offer.cashback}` : offer.shippingStr,
              edgeLabel: 'SHIPPING_INFO',
              formalData: {
                summary: `Condições de entrega: ${offer.shippingStr}${offer.cashback ? ` (${offer.cashback})` : ''}`,
                attributes: {
                  shippingDetails: offer.shippingStr,
                  ...(offer.cashback ? { cashback: offer.cashback } : {})
                },
                sourceUrl: offer.href || currentTask.url,
                domSelector: offer.uniqueSelector
              }
            });
          }
        }

        // Recalcula o menor preço global da árvore entre todas as lojas mapeadas até agora
        recalculateBestPriceForTree(treeId);

      } else {
        // ====================================================================
        // MODO MAPEAMENTO MENTAL PROFUNDO: Metadados, Tabelas HTML e Entidades
        // ====================================================================
        const deepKnowledge = await extractDeepKnowledgeFromPage(page, objectiveKeywords);

        // Atualiza metadados ricos no nó da Webpage (tempo de leitura, autor, contagem de palavras)
        if (deepKnowledge.metadata) {
          webpageNode.formalData.attributes = {
            ...webpageNode.formalData.attributes,
            ...(deepKnowledge.metadata.siteName ? { siteName: deepKnowledge.metadata.siteName } : {}),
            ...(deepKnowledge.metadata.author ? { author: deepKnowledge.metadata.author } : {}),
            ...(deepKnowledge.metadata.publishedTime ? { publishedTime: deepKnowledge.metadata.publishedTime } : {}),
            wordCount: deepKnowledge.metadata.wordCount,
            readingTimeMinutes: `${deepKnowledge.metadata.readingTimeMinutes} min`
          };
          if (deepKnowledge.metadata.description && !pageInfo.metaDesc) {
            webpageNode.formalData.summary = deepKnowledge.metadata.description;
          }
          io.emit('NODE_UPDATED', webpageNode);
        }

        // 1. Registra Tabelas Estruturadas extraídas da página (nó data_table)
        if (Array.isArray(deepKnowledge.tables)) {
          for (const tbl of deepKnowledge.tables) {
            const checkState = activeCrawlers.get(treeId);
            if (!checkState || checkState.stopRequested) break;

            io.emit('SPIDER_ACTION', {
              treeId,
              status: 'EXTRACTING_TABLE',
              message: `Extraindo Tabela Estruturada: "${tbl.caption}" (${tbl.rowCount} linhas)`,
              selector: tbl.formalSelector,
              url: currentTask.url
            });

            await page
              .evaluate(
                async ({ selector, text }) => {
                  if (typeof window.moveSpiderToElement === 'function') {
                    await window.moveSpiderToElement({
                      selector,
                      mode: 'extract',
                      header: 'TABELA ESTRUTURADA',
                      text
                    });
                  }
                },
                {
                  selector: tbl.uniqueSelector,
                  text: `${tbl.caption} (${tbl.headers.slice(0, 4).join(' | ')})`
                }
              )
              .catch(() => {});

            await page.waitForTimeout(450);

            const tableAttributes = {
              tableCaption: tbl.caption,
              columns: tbl.headers.join(' | '),
              rowCount: tbl.rowCount
            };
            // Adiciona as primeiras linhas como atributos chave-valor legíveis no Inspetor
            tbl.rows.slice(0, 6).forEach((row, rIdx) => {
              const rowKey = row[0] ? String(row[0]).slice(0, 32) : `Linha ${rIdx + 1}`;
              const rowVals = row.slice(1).join(' | ') || row[0] || '';
              tableAttributes[rowKey] = rowVals.slice(0, 120);
            });

            registerFormalNode({
              treeId,
              parentId: webpageNode.id,
              type: 'data_table',
              label: `📊 Tabela: ${tbl.caption.slice(0, 46)}`,
              edgeLabel: 'HAS_DATA_TABLE',
              formalData: {
                summary: tbl.markdownPreview,
                attributes: tableAttributes,
                sourceUrl: currentTask.url,
                domSelector: tbl.formalSelector
              }
            });
          }
        }

        // 2. Registra Seções Hierárquicas, Fatos Analíticos e Referências
        let currentEntityNodeId = webpageNode.id;

        for (const item of deepKnowledge.items || []) {
          const checkState = activeCrawlers.get(treeId);
          if (!checkState || checkState.stopRequested) break;

          io.emit('SPIDER_ACTION', {
            treeId,
            status: 'SCANNING_ELEMENT',
            message: `Extraindo [${item.kind.toUpperCase()}] <${item.tag}>: "${item.text.slice(0, 56)}..."`,
            selector: item.formalSelector,
            url: currentTask.url
          });

          await page
            .evaluate(
              async ({ selector, mode, text, tag }) => {
                if (typeof window.moveSpiderToElement === 'function') {
                  await window.moveSpiderToElement({ selector, mode, text, tag });
                }
              },
              {
                selector: item.uniqueSelector,
                mode: item.href ? 'link' : 'extract',
                text: item.text,
                tag: item.tag
              }
            )
            .catch(() => {});

          await page.waitForTimeout(440);

          const attributes = {
            ...extractFormalAttributes(item.text, item, objectiveKeywords),
            sectionContext: item.section || 'Visão Geral',
            relevanceScore: item.score
          };

          const isSectionHeading = item.kind === 'section_heading';
          const nodeType =
            isSectionHeading || item.kind === 'reference_link'
              ? 'extracted_entity'
              : 'data_point';
          const parentForThisNode = isSectionHeading ? webpageNode.id : currentEntityNodeId;

          const createdNode = registerFormalNode({
            treeId,
            parentId: parentForThisNode,
            type: nodeType,
            label: item.text.slice(0, 56),
            edgeLabel: isSectionHeading
              ? 'HAS_SECTION_ENTITY'
              : item.href
              ? 'REFERENCES_LINK'
              : 'EXTRACTED_FACT',
            formalData: {
              summary: item.text,
              attributes,
              sourceUrl: item.href || currentTask.url,
              domSelector: item.formalSelector
            }
          });

          if (isSectionHeading) {
            currentEntityNodeId = createdNode.id;
          }

          if (
            item.href &&
            currentTask.depth < maxDepth &&
            !visitedUrls.has(item.href) &&
            !item.href.includes('javascript:')
          ) {
            discoveredLinks.push({
              url: item.href,
              sourceLabel: hostname,
              parentId: createdNode.id,
              depth: currentTask.depth + 1
            });
          }
        }
      }

      // Enfileira até 2 melhores links descobertos na página para ramificar a árvore
      for (const nextLink of discoveredLinks.slice(0, 2)) {
        if (queue.length + visitedUrls.size < maxPages) {
          queue.push(nextLink);
        }
      }
    }

    io.emit('SPIDER_ACTION', {
      treeId,
      status: 'COMPLETED',
      message: `Coleta concluída com sucesso (${visitedUrls.size} páginas mapeadas).`,
      url: resolvedUrl
    });
  } catch (err) {
    console.error('[Spider Orchestrator] Erro durante execução:', err);
    io.emit('SPIDER_ACTION', {
      treeId,
      status: 'ERROR',
      message: `Erro na coleta: ${err.message}`
    });
  } finally {
    if (browser) {
      await browser.close().catch(() => {});
    }
    activeCrawlers.delete(treeId);

    const updatedTree = db.trees.find((t) => t.id === treeId);
    if (updatedTree) {
      updatedTree.status = 'idle';
      updatedTree.updatedAt = new Date().toISOString();
      updatedTree.nodeCount = db.nodes.filter((n) => n.treeId === treeId).length;
      io.emit('TREE_UPDATED', updatedTree);
      saveDatabase();
    }
  }
}

// ============================================================================
// GERADOR DE CONEXÕES AUTOMÁTICAS DO "GLOBAL BRAIN" (MULTI-TREE SYNAPSES)
// ============================================================================

function computeGlobalBrainEdges() {
  const virtualEdges = [];
  const existingPairs = new Set();

  for (let i = 0; i < db.nodes.length; i++) {
    for (let j = i + 1; j < db.nodes.length; j++) {
      const a = db.nodes[i];
      const b = db.nodes[j];
      if (a.treeId === b.treeId) continue;

      const pairKey = [a.id, b.id].sort().join('--');
      if (existingPairs.has(pairKey)) continue;

      // 1. Mesmo domínio
      if (a.type === 'domain' && b.type === 'domain' && a.label === b.label) {
        virtualEdges.push({
          id: `synapse-domain-${pairKey}`,
          treeId: 'GLOBAL_BRAIN',
          source: a.id,
          target: b.id,
          label: 'SHARED_DOMAIN',
          isCrossTree: true
        });
        existingPairs.add(pairKey);
        continue;
      }

      // 2. Termos relevantes compartilhados no título
      const wordsA = tokenizeObjective(a.label);
      const wordsB = new Set(tokenizeObjective(b.label));
      const shared = wordsA.filter((w) => w.length >= 5 && wordsB.has(w));

      if (shared.length >= 1) {
        virtualEdges.push({
          id: `synapse-term-${pairKey}`,
          treeId: 'GLOBAL_BRAIN',
          source: a.id,
          target: b.id,
          label: `SYNAPSE: ${shared[0].toUpperCase()}`,
          isCrossTree: true
        });
        existingPairs.add(pairKey);
      }
    }
  }

  return virtualEdges;
}

// ============================================================================
// ROTAS REST API (CRUD DE ÁRVORES, PODA EM CASCATA, EXPANSÃO E EXPORTAÇÃO)
// ============================================================================

/**
 * 1. Listar todas as árvores e estado completo (incluindo sinapses do Global Brain)
 */
app.get('/api/state', (req, res) => {
  const globalSynapses = computeGlobalBrainEdges();
  res.json({
    trees: db.trees,
    nodes: db.nodes,
    edges: [...db.edges, ...globalSynapses]
  });
});

/**
 * 2. Criar uma nova Árvore de Pesquisa e iniciar a Aranha Autônoma
 */
app.post('/api/trees/crawl', async (req, res) => {
  const {
    objective,
    startUrl,
    crawlMode = 'price_finder',
    targetPrice = null,
    maxDepth = 2,
    maxPages = 4
  } = req.body;

  if (!objective && !startUrl) {
    return res.status(400).json({
      error: 'Informe ao menos um Objetivo de Busca ou uma URL inicial.'
    });
  }

  const treeId = uuidv4();
  const cleanObjective = (objective || `Exploração de ${startUrl}`).trim();
  const resolvedStartUrl = resolveStartingUrl(startUrl, cleanObjective, crawlMode);

  const isPriceMode = crawlMode === 'price_finder';
  const numericTarget = targetPrice ? Number(targetPrice) : null;

  const newTree = {
    id: treeId,
    title: cleanObjective.slice(0, 48),
    objective: cleanObjective,
    startUrl: resolvedStartUrl,
    crawlMode,
    targetPrice: numericTarget,
    status: 'crawling',
    nodeCount: 0,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  };

  db.trees.unshift(newTree);
  saveDatabase();
  io.emit('TREE_UPDATED', newTree);

  // Cria o Nó Raiz Formal (product_root se Price Finder, root_topic se Mapeamento Mental)
  const rootNode = registerFormalNode({
    treeId,
    parentId: null,
    type: isPriceMode ? 'product_root' : 'root_topic',
    label: (isPriceMode ? '🎯 ' : '🧠 ') + cleanObjective.slice(0, 56),
    formalData: {
      summary: isPriceMode
        ? `Radar Price Finder ativo para: "${cleanObjective}"`
        : `Raiz formal da árvore de pesquisa: "${cleanObjective}"`,
      attributes: {
        objective: cleanObjective,
        crawlMode,
        targetPrice: numericTarget,
        initialTargetUrl: resolvedStartUrl,
        maxDepth,
        maxPages
      },
      sourceUrl: resolvedStartUrl,
      domSelector: 'ROOT_SESSION'
    }
  });

  // Dispara o Crawler em background sem bloquear a resposta HTTP
  runAutonomousSpider({
    treeId,
    parentNodeId: rootNode.id,
    objective: cleanObjective,
    startUrl: resolvedStartUrl,
    crawlMode,
    targetPrice: numericTarget,
    maxDepth: Number(maxDepth) || 2,
    maxPages: Number(maxPages) || 4
  });

  res.status(201).json({
    message: 'Sessão iniciada com sucesso. A aranha está em execução.',
    tree: newTree,
    rootNode
  });
});

/**
 * 3. Interromper o Crawler ativo de uma Árvore específica
 */
app.post('/api/trees/:treeId/stop', (req, res) => {
  const { treeId } = req.params;
  const session = activeCrawlers.get(treeId);
  if (session) {
    session.stopRequested = true;
    return res.json({ message: 'Solicitação de parada enviada à aranha.' });
  }
  res.json({ message: 'Nenhum crawler ativo para esta árvore.' });
});

/**
 * 4. "🕷️ Aprofundar com a Aranha a partir daqui" (Expandir qualquer nó existente)
 */
app.post('/api/nodes/:nodeId/expand', async (req, res) => {
  const { nodeId } = req.params;
  const { customObjective, maxDepth = 2, maxPages = 3 } = req.body;

  const targetNode = db.nodes.find((n) => n.id === nodeId);
  if (!targetNode) {
    return res.status(404).json({ error: 'Nó não encontrado.' });
  }

  const parentTree = db.trees.find((t) => t.id === targetNode.treeId);
  const effectiveObjective =
    customObjective ||
    `${parentTree ? parentTree.objective : ''} ${targetNode.label}`.trim();
  const targetUrl =
    targetNode.formalData?.attributes?.hyperlink ||
    targetNode.formalData?.sourceUrl ||
    parentTree?.startUrl;

  runAutonomousSpider({
    treeId: targetNode.treeId,
    parentNodeId: targetNode.id,
    objective: effectiveObjective,
    startUrl: targetUrl,
    maxDepth: Number(maxDepth) || 2,
    maxPages: Number(maxPages) || 3
  });

  res.json({
    message: `Aranha acionada para aprofundar a partir do nó "${targetNode.label}".`,
    targetUrl
  });
});

/**
 * 5. Criar Nó Manual (Nota ou Dado Formal inserido pelo usuário preso a um nó pai)
 */
app.post('/api/nodes/manual', (req, res) => {
  const {
    treeId,
    parentId,
    type = 'data_point',
    label,
    summary,
    attributes = {},
    sourceUrl = ''
  } = req.body;

  if (!treeId || !label) {
    return res.status(400).json({ error: 'treeId e label são obrigatórios.' });
  }

  const parentNode = db.nodes.find((n) => n.id === parentId);
  const created = registerFormalNode({
    treeId,
    parentId: parentId || null,
    type,
    label,
    edgeLabel: 'MANUAL_ANNOTATION',
    formalData: {
      summary: summary || label,
      attributes: {
        originType: 'Nota Manual do Usuário',
        ...attributes
      },
      sourceUrl: sourceUrl || parentNode?.formalData?.sourceUrl || 'manual://user-note',
      domSelector: 'user.manual.entry'
    }
  });

  res.status(201).json(created);
});

/**
 * 6. Podar/Apagar Nó Único ou Sub-Árvore em Cascata (Cascade Delete)
 * Query param: ?cascade=true (padrão: true)
 */
app.delete('/api/nodes/:nodeId', (req, res) => {
  const { nodeId } = req.params;
  const cascade = req.query.cascade !== 'false';

  const targetNode = db.nodes.find((n) => n.id === nodeId);
  if (!targetNode) {
    return res.status(404).json({ error: 'Nó não encontrado.' });
  }

  const idsToDelete = new Set([nodeId]);

  if (cascade) {
    // Busca recursiva em largura (BFS) para coletar toda a ramificação descendente
    const queue = [nodeId];
    while (queue.length > 0) {
      const currentId = queue.shift();
      for (const n of db.nodes) {
        if (n.parentId === currentId && !idsToDelete.has(n.id)) {
          idsToDelete.add(n.id);
          queue.push(n.id);
        }
      }
      for (const e of db.edges) {
        if (e.source === currentId && !idsToDelete.has(e.target)) {
          idsToDelete.add(e.target);
          queue.push(e.target);
        }
      }
    }
  } else {
    // Se não for em cascata, reconecta os filhos órfãos ao pai do nó removido
    for (const n of db.nodes) {
      if (n.parentId === nodeId) {
        n.parentId = targetNode.parentId;
        if (targetNode.parentId) {
          db.edges.push({
            id: uuidv4(),
            treeId: n.treeId,
            source: targetNode.parentId,
            target: n.id,
            label: 'RECONNECTED',
            isCrossTree: false
          });
        }
      }
    }
  }

  db.nodes = db.nodes.filter((n) => !idsToDelete.has(n.id));
  db.edges = db.edges.filter(
    (e) => !idsToDelete.has(e.source) && !idsToDelete.has(e.target)
  );

  const tree = db.trees.find((t) => t.id === targetNode.treeId);
  if (tree) {
    tree.nodeCount = db.nodes.filter((n) => n.treeId === tree.id).length;
    tree.updatedAt = new Date().toISOString();
    io.emit('TREE_UPDATED', tree);
  }

  saveDatabase();

  io.emit('NODES_DELETED', {
    treeId: targetNode.treeId,
    deletedIds: Array.from(idsToDelete),
    cascade
  });

  res.json({
    message: cascade
      ? `Poda em cascata concluída (${idsToDelete.size} nós removidos).`
      : 'Nó removido individualmente.',
    deletedIds: Array.from(idsToDelete)
  });
});

/**
 * 7. Apagar Árvore Inteira
 */
app.delete('/api/trees/:treeId', (req, res) => {
  const { treeId } = req.params;

  const session = activeCrawlers.get(treeId);
  if (session) {
    session.stopRequested = true;
  }

  db.trees = db.trees.filter((t) => t.id !== treeId);
  db.nodes = db.nodes.filter((n) => n.treeId !== treeId);
  db.edges = db.edges.filter((e) => e.treeId !== treeId);

  saveDatabase();
  io.emit('TREE_DELETED', { treeId });

  res.json({ message: 'Árvore de pesquisa excluída permanentemente.' });
});

/**
 * Função utilitária para consolidar a Tabela de Cotação Comparativa
 */
function getTreeComparativeQuotes(treeId) {
  const tree = db.trees.find((t) => t.id === treeId);
  if (!tree) return null;

  const nodes = db.nodes.filter((n) => n.treeId === treeId);
  const storeNodes = nodes.filter((n) => n.type === 'store_offer');

  const quotes = [];

  for (const store of storeNodes) {
    const cashChild = nodes.find((n) => n.parentId === store.id && n.type === 'price_cash');
    const installmentChild = nodes.find((n) => n.parentId === store.id && n.type === 'price_installment');
    const shippingChild = nodes.find((n) => n.parentId === store.id && n.type === 'shipping_cost');

    const numPrice = cashChild?.formalData?.numericPrice ?? store.formalData?.numericPrice ?? null;
    const rawCash = cashChild?.label ?? store.formalData?.attributes?.cashPrice ?? 'Preço sob consulta';
    const storeName = store.formalData?.attributes?.storeName || 'Loja Online';
    const productTitle = store.formalData?.attributes?.productTitle || store.formalData?.summary || store.label;
    const installmentStr = installmentChild?.label ?? store.formalData?.attributes?.installment ?? 'À vista';
    const shippingStr = shippingChild?.label ?? store.formalData?.attributes?.shipping ?? 'Frete a calcular';
    const directUrl = store.formalData?.sourceUrl || cashChild?.formalData?.sourceUrl || '';
    const isBest = !!(store.isBestPrice || cashChild?.isBestPrice);
    const thumbnail = store.formalData?.attributes?.thumbnail || null;
    const rating = store.formalData?.attributes?.rating || null;
    const cashback = store.formalData?.attributes?.cashback || null;
    const relevanceScore = store.formalData?.attributes?.relevanceScore || null;
    const extractionMethod = store.formalData?.attributes?.extractionMethod || null;
    const cardPrice = store.formalData?.attributes?.cardPrice || null;

    quotes.push({
      storeNodeId: store.id,
      cashNodeId: cashChild?.id || null,
      storeName,
      productTitle,
      rawCash,
      numericPrice: numPrice,
      installmentStr,
      shippingStr,
      directUrl,
      thumbnail,
      rating,
      cashback,
      relevanceScore,
      extractionMethod,
      cardPrice,
      isBestPrice: isBest
    });
  }

  // Ordena por menor preço numérico (nulos ao final)
  quotes.sort((a, b) => {
    if (a.numericPrice === null) return 1;
    if (b.numericPrice === null) return -1;
    return a.numericPrice - b.numericPrice;
  });

  const validPrices = quotes
    .map((q) => q.numericPrice)
    .filter((p) => typeof p === 'number' && p > 0);
  const maxPrice = validPrices.length > 0 ? Math.max(...validPrices) : 0;
  const avgPrice =
    validPrices.length > 0
      ? validPrices.reduce((a, b) => a + b, 0) / validPrices.length
      : 0;
  const minPrice = validPrices.length > 0 ? Math.min(...validPrices) : 0;
  let medianPrice = 0;
  if (validPrices.length > 0) {
    const sorted = [...validPrices].sort((a, b) => a - b);
    const mid = Math.floor(sorted.length / 2);
    medianPrice =
      sorted.length % 2 === 0 ? (sorted[mid - 1] + sorted[mid]) / 2 : sorted[mid];
  }

  // Atribui ranking e calcula economia vs maior e vs média
  const ranked = quotes.map((q, idx) => {
    const savingsVsMax =
      q.numericPrice && maxPrice > q.numericPrice
        ? Math.round(((maxPrice - q.numericPrice) / maxPrice) * 100)
        : 0;
    const savingsVsAvg =
      q.numericPrice && avgPrice > q.numericPrice
        ? Math.round(((avgPrice - q.numericPrice) / avgPrice) * 100)
        : 0;

    return {
      rank: idx + 1,
      ...q,
      isBestPrice: idx === 0 && typeof q.numericPrice === 'number' && q.numericPrice > 0,
      savingsVsMax,
      savingsVsAvg
    };
  });

  return {
    treeId,
    treeTitle: tree.title,
    objective: tree.objective,
    targetPrice: tree.targetPrice,
    totalQuotes: quotes.length,
    minPrice,
    maxPrice,
    avgPrice: Math.round(avgPrice * 100) / 100,
    medianPrice: Math.round(medianPrice * 100) / 100,
    quotes: ranked
  };
}

/**
 * 8. Obter Tabela de Cotação Comparativa Estruturada (Gaveta de Cotação)
 */
app.get('/api/trees/:treeId/quotes', (req, res) => {
  const { treeId } = req.params;
  const comparison = getTreeComparativeQuotes(treeId);
  if (!comparison) {
    return res.status(404).json({ error: 'Árvore não encontrada.' });
  }
  res.json(comparison);
});

/**
 * 8B. Re-escanear / Atualizar Preços de uma Árvore Existente
 */
app.post('/api/trees/:treeId/refresh', (req, res) => {
  const { treeId } = req.params;
  const tree = db.trees.find((t) => t.id === treeId);
  if (!tree) {
    return res.status(404).json({ error: 'Árvore não encontrada.' });
  }

  if (activeCrawlers.has(treeId)) {
    return res.status(409).json({ error: 'A aranha já está em execução para esta árvore.' });
  }

  const rootNode = db.nodes.find(
    (n) => n.treeId === treeId && (!n.parentId || n.type === 'product_root' || n.type === 'root_topic')
  );

  runAutonomousSpider({
    treeId: tree.id,
    parentNodeId: rootNode ? rootNode.id : null,
    objective: tree.objective,
    startUrl: null,
    crawlMode: tree.crawlMode || 'price_finder',
    targetPrice: tree.targetPrice || null,
    maxDepth: 2,
    maxPages: 3
  });

  res.json({
    message: `Re-escaneamento multi-lojas iniciado para "${tree.title}".`,
    treeId: tree.id
  });
});

/**
 * 9. Configurar Sentinela de Preço (Target Price)
 */
app.post('/api/trees/:treeId/sentinel', (req, res) => {
  const { treeId } = req.params;
  const { targetPrice } = req.body;

  const tree = db.trees.find((t) => t.id === treeId);
  if (!tree) {
    return res.status(404).json({ error: 'Árvore não encontrada.' });
  }

  tree.targetPrice =
    targetPrice !== undefined && targetPrice !== null && targetPrice !== ''
      ? Number(targetPrice)
      : null;
  tree.updatedAt = new Date().toISOString();

  // Recalcula imediatamente o menor preço e verifica se o alerta deve disparar
  recalculateBestPriceForTree(treeId);
  saveDatabase();
  io.emit('TREE_UPDATED', tree);

  const comparison = getTreeComparativeQuotes(treeId);

  res.json({
    message: `Sentinela configurado com sucesso para R$ ${tree.targetPrice || 'Sem meta'}.`,
    tree,
    comparison
  });
});

/**
 * 10. Exportação Dedicada de Cotação Comparativa (CSV ou Markdown Obsidian)
 */
app.get('/api/trees/:treeId/quote-export', (req, res) => {
  const { treeId } = req.params;
  const format = (req.query.format || 'markdown').toLowerCase();

  const comparison = getTreeComparativeQuotes(treeId);
  if (!comparison) {
    return res.status(404).json({ error: 'Árvore não encontrada.' });
  }

  if (format === 'csv') {
    const escapeCsv = (val) =>
      `"${String(val ?? '').replace(/"/g, '""').replace(/\r?\n/g, ' ')}"`;
    const headers = [
      'Rank',
      'Status',
      'Loja / Vendedor',
      'Produto',
      'Preco a Vista',
      'Preco Numerico',
      'Parcelamento',
      'Frete',
      'Economia vs Maior (%)',
      'Economia vs Media (%)',
      'Link Direto'
    ];

    const rows = comparison.quotes.map((q) =>
      [
        q.rank,
        q.isBestPrice ? 'MELHOR PRECO' : 'OFERTA',
        q.storeName,
        q.productTitle,
        q.rawCash,
        q.numericPrice || '',
        q.installmentStr,
        q.shippingStr,
        `${q.savingsVsMax}%`,
        `${q.savingsVsAvg}%`,
        q.directUrl
      ]
        .map(escapeCsv)
        .join(',')
    );

    const csvContent = [headers.join(','), ...rows].join('\n');
    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader(
      'Content-Disposition',
      `attachment; filename="cotacao-${treeId.slice(0, 8)}.csv"`
    );
    return res.send(csvContent);
  }

  // Formato Markdown Obsidian
  const mdLines = [];
  mdLines.push(`# 🏆 Tabela Comparativa de Preços & Cotação: ${comparison.treeTitle}`);
  mdLines.push(`- **Produto Pesquisado:** ${comparison.objective}`);
  mdLines.push(`- **Total de Ofertas Mapeadas:** ${comparison.totalQuotes}`);
  if (comparison.minPrice > 0) {
    mdLines.push(`- **Menor Preço Encontrado (PIX/À Vista):** R$ ${comparison.minPrice.toFixed(2)}`);
    mdLines.push(`- **Preço Médio:** R$ ${comparison.avgPrice.toFixed(2)}`);
    mdLines.push(`- **Maior Preço:** R$ ${comparison.maxPrice.toFixed(2)}`);
  }
  if (comparison.targetPrice) {
    mdLines.push(`- **Meta Sentinela de Preço:** R$ ${comparison.targetPrice.toFixed(2)}`);
  }
  mdLines.push(`- **Data da Cotação:** ${new Date().toLocaleString('pt-BR')}`);
  mdLines.push('\n---\n');
  mdLines.push('## 📊 Ranking de Lojas (Menor para Maior Preço)');
  mdLines.push('| Rank | Destaque | Loja / Anúncio | Preço à Vista | Parcelamento | Frete | Economia vs Maior | Comprar |');
  mdLines.push('| :---: | :--- | :--- | :--- | :--- | :--- | :---: | :--- |');

  for (const q of comparison.quotes) {
    const badge = q.isBestPrice ? '🏆 **MELHOR PREÇO**' : '⚪ Oferta';
    const link = q.directUrl ? `[Acessar Oferta](${q.directUrl})` : 'N/A';
    mdLines.push(
      `| #${q.rank} | ${badge} | **${q.storeName}** - ${q.productTitle.slice(0, 42).replace(/\|/g, '-')} | ${q.rawCash} | ${q.installmentStr} | ${q.shippingStr} | **${q.savingsVsMax}%** | ${link} |`
    );
  }

  mdLines.push('\n---\n');
  mdLines.push('*Exportado automaticamente via ArachneMind Price Finder*');

  const mdContent = mdLines.join('\n');
  res.setHeader('Content-Type', 'text/markdown; charset=utf-8');
  res.setHeader(
    'Content-Disposition',
    `attachment; filename="cotacao-obsidian-${treeId.slice(0, 8)}.md"`
  );
  return res.send(mdContent);
});

/**
 * 11. Exportação Formal da Árvore Completa (JSON, CSV ou Markdown Obsidian com [[WikiLinks]])
 */
app.get('/api/trees/:treeId/export', (req, res) => {
  const { treeId } = req.params;
  const format = (req.query.format || 'json').toLowerCase();

  const isGlobal = treeId === 'GLOBAL_BRAIN';
  const tree = isGlobal
    ? {
        id: 'GLOBAL_BRAIN',
        title: 'Global Brain - Todas as Árvores',
        objective: 'Grafo Unificado Multi-Árvore'
      }
    : db.trees.find((t) => t.id === treeId);

  if (!tree) {
    return res.status(404).json({ error: 'Árvore não encontrada.' });
  }

  const nodes = isGlobal
    ? db.nodes
    : db.nodes.filter((n) => n.treeId === treeId);
  const edges = isGlobal
    ? [...db.edges, ...computeGlobalBrainEdges()]
    : db.edges.filter((e) => e.treeId === treeId);

  if (format === 'csv') {
    const escapeCsv = (val) =>
      `"${String(val ?? '').replace(/"/g, '""').replace(/\r?\n/g, ' ')}"`;
    const headers = [
      'id',
      'treeId',
      'parentId',
      'type',
      'label',
      'summary',
      'sourceUrl',
      'domSelector',
      'timestamp',
      'attributes_json'
    ];
    const rows = nodes.map((n) =>
      [
        n.id,
        n.treeId,
        n.parentId || '',
        n.type,
        n.label,
        n.formalData?.summary || '',
        n.formalData?.sourceUrl || '',
        n.formalData?.domSelector || '',
        n.formalData?.timestamp || '',
        JSON.stringify(n.formalData?.attributes || {})
      ]
        .map(escapeCsv)
        .join(',')
    );
    const csvContent = [headers.join(','), ...rows].join('\n');
    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader(
      'Content-Disposition',
      `attachment; filename="arachnemind-${treeId.slice(0, 8)}.csv"`
    );
    return res.send(csvContent);
  }

  if (format === 'markdown' || format === 'obsidian') {
    const sanitizeWikiLink = (str) =>
      String(str || 'Node')
        .replace(/[\[\]|#^:\\/]/g, '-')
        .trim();

    const mdSections = [];
    mdSections.push(`# 🧠 ArachneMind Vault Export: ${tree.title}`);
    mdSections.push(`- **Objetivo Formal:** ${tree.objective}`);
    mdSections.push(`- **Total de Nós:** ${nodes.length}`);
    mdSections.push(`- **Exportado em:** ${new Date().toISOString()}\n---\n`);

    for (const n of nodes) {
      const parentNode = nodes.find((p) => p.id === n.parentId);
      const childrenNodes = nodes.filter((c) => c.parentId === n.id);
      const attrs = n.formalData?.attributes || {};

      mdSections.push(`## [[${sanitizeWikiLink(n.label)}]]`);
      mdSections.push('```yaml');
      mdSections.push(`id: "${n.id}"`);
      mdSections.push(`type: "${n.type}"`);
      mdSections.push(`source_url: "${n.formalData?.sourceUrl || ''}"`);
      mdSections.push(`dom_selector: "${n.formalData?.domSelector || ''}"`);
      mdSections.push(`timestamp: "${n.formalData?.timestamp || ''}"`);
      mdSections.push('```\n');

      if (parentNode) {
        mdSections.push(`- **Nó Pai (Origem):** [[${sanitizeWikiLink(parentNode.label)}]]`);
      }
      mdSections.push(`- **Resumo Formal:** ${n.formalData?.summary || 'N/A'}`);

      if (Object.keys(attrs).length > 0) {
        mdSections.push('\n### Atributos Extraídos (Chave-Valor)');
        mdSections.push('| Atributo | Valor Formal |');
        mdSections.push('| :--- | :--- |');
        for (const [k, v] of Object.entries(attrs)) {
          mdSections.push(`| \`${k}\` | ${String(v).replace(/\|/g, '\\|')} |`);
        }
      }

      if (childrenNodes.length > 0) {
        mdSections.push('\n### Ramificações Conectadas (WikiLinks)');
        for (const child of childrenNodes) {
          mdSections.push(`- [[${sanitizeWikiLink(child.label)}]] *(${child.type})*`);
        }
      }

      mdSections.push('\n---\n');
    }

    const mdContent = mdSections.join('\n');
    res.setHeader('Content-Type', 'text/markdown; charset=utf-8');
    res.setHeader(
      'Content-Disposition',
      `attachment; filename="arachnemind-obsidian-${treeId.slice(0, 8)}.md"`
    );
    return res.send(mdContent);
  }

  // Padrão: JSON estruturado completo
  res.setHeader('Content-Type', 'application/json; charset=utf-8');
  res.setHeader(
    'Content-Disposition',
    `attachment; filename="arachnemind-${treeId.slice(0, 8)}.json"`
  );
  return res.send(
    JSON.stringify(
      {
        exportedAt: new Date().toISOString(),
        tree,
        nodes,
        edges
      },
      null,
      2
    )
  );
});

// ============================================================================
// WEBSOCKET CONNECTION HANDLER
// ============================================================================
io.on('connection', (socket) => {
  console.log(`[Socket.io] Cliente conectado ao Cérebro Digital: ${socket.id}`);

  socket.emit('INITIAL_STATE', {
    trees: db.trees,
    nodes: db.nodes,
    edges: [...db.edges, ...computeGlobalBrainEdges()]
  });

  socket.on('disconnect', () => {
    console.log(`[Socket.io] Cliente desconectado: ${socket.id}`);
  });
});

server.listen(PORT, () => {
  console.log(`==================================================================`);
  console.log(`🕷️  ARACHNEMIND BACKEND ORCHESTRATOR ONLINE NA PORTA ${PORT}`);
  console.log(`📡 WebSocket & REST API prontos em: http://localhost:${PORT}`);
  console.log(`==================================================================`);
});
