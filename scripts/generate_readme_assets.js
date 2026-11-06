const { chromium } = require('../backend/node_modules/playwright');
const fs = require('fs');
const path = require('path');

const ASSETS_DIR = path.join(__dirname, '..', 'docs', 'assets');
if (!fs.existsSync(ASSETS_DIR)) {
  fs.mkdirSync(ASSETS_DIR, { recursive: true });
}

async function captureScreenshots() {
  console.log('[Assets] Launching Chromium to capture screenshots...');
  const browser = await chromium.launch({
    headless: true,
    args: ['--disable-web-security', '--allow-running-insecure-content']
  });

  const context = await browser.newContext({
    viewport: { width: 1920, height: 1080 },
    deviceScaleFactor: 1.5
  });

  const page = await context.newPage();

  // 1. Scene: Price Finder Workspace Overview
  console.log('[Assets] Navigating to ArachneMind UI on http://localhost:5173 ...');
  await page.goto('http://localhost:5173', { waitUntil: 'networkidle' });
  await page.waitForTimeout(3000);

  // Select the tree "monitor rog strix 280 hz oled" or "Monitor Gamer 144Hz"
  await page.evaluate(() => {
    const treeCards = Array.from(document.querySelectorAll('div.group.relative.rounded-lg'));
    const target = treeCards.find(c => c.innerText.includes('monitor rog strix') || c.innerText.includes('144Hz')) || treeCards[0];
    if (target) target.click();
  });

  await page.waitForTimeout(2500);

  const overviewPath = path.join(ASSETS_DIR, 'arachnemind-workspace-overview.png');
  await page.screenshot({ path: overviewPath, fullPage: false });
  console.log('[Assets] Saved:', overviewPath);

  // 2. Scene: Quotation Drawer Detail
  const drawerEl = await page.$('aside:last-child');
  if (drawerEl) {
    const drawerPath = path.join(ASSETS_DIR, 'price-finder-quotation-drawer.png');
    await drawerEl.screenshot({ path: drawerPath });
    console.log('[Assets] Saved drawer detail:', drawerPath);
  }

  // 3. Scene: Mind Map Mode
  console.log('[Assets] Switching to Mind Map workspace...');
  await page.evaluate(() => {
    const treeCards = Array.from(document.querySelectorAll('div.group.relative.rounded-lg'));
    const mindTree = treeCards.find(c => c.innerText.includes('Intelig') || c.innerText.includes('Neurais'));
    if (mindTree) mindTree.click();
  });

  await page.waitForTimeout(2500);

  // Switch to "Dados Formais" tab on the inspector if available
  await page.evaluate(() => {
    const tabs = Array.from(document.querySelectorAll('button'));
    const formalTab = tabs.find(b => b.innerText.includes('Dados Formais'));
    if (formalTab) formalTab.click();
  });

  await page.waitForTimeout(1500);
  const mindMapPath = path.join(ASSETS_DIR, 'mind-map-knowledge-graph.png');
  await page.screenshot({ path: mindMapPath, fullPage: false });
  console.log('[Assets] Saved:', mindMapPath);

  // 4. Scene: Spider Overlay in Action
  console.log('[Assets] Rendering Spider Overlay simulation on mock e-commerce page...');
  const spiderPage = await context.newPage();
  const spiderScript = fs.readFileSync(
    path.join(__dirname, '..', 'backend', 'src', 'spider-overlay.js'),
    'utf-8'
  );

  const mockHtml = `
  <!DOCTYPE html>
  <html lang="pt-BR">
  <head>
    <meta charset="UTF-8">
    <title>KaBuM! | Placa de Vídeo RTX 4060 - Hardware e Games</title>
    <style>
      * { box-sizing: border-box; margin: 0; padding: 0; }
      body {
        background: #0f172a;
        color: #f8fafc;
        font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
        padding: 40px;
        min-height: 100vh;
      }
      header {
        display: flex;
        justify-content: space-between;
        align-items: center;
        border-bottom: 1px solid #1e293b;
        padding-bottom: 20px;
        margin-bottom: 30px;
      }
      .logo {
        font-size: 24px;
        font-weight: 800;
        color: #f97316;
        letter-spacing: -0.5px;
      }
      .logo span { color: #0284c7; }
      .search-bar {
        background: #1e293b;
        border: 1px solid #334155;
        border-radius: 8px;
        padding: 10px 18px;
        width: 500px;
        color: #cbd5e1;
        font-size: 14px;
      }
      .grid {
        display: grid;
        grid-template-columns: repeat(3, 1fr);
        gap: 24px;
        max-width: 1400px;
        margin: 0 auto;
      }
      .card {
        background: #1e293b;
        border: 1px solid #334155;
        border-radius: 12px;
        padding: 24px;
        position: relative;
        transition: transform 0.2s;
      }
      .card.active-target {
        border-color: #00f3ff;
        box-shadow: 0 0 30px rgba(0, 243, 255, 0.25);
      }
      .badge-offer {
        position: absolute;
        top: 16px;
        right: 16px;
        background: #10b981;
        color: #022c22;
        font-weight: 700;
        font-size: 11px;
        padding: 4px 8px;
        border-radius: 6px;
      }
      .img-placeholder {
        width: 100%;
        height: 220px;
        background: linear-gradient(135deg, #090d16 0%, #1e293b 100%);
        border-radius: 8px;
        display: flex;
        align-items: center;
        justify-content: center;
        font-size: 50px;
        margin-bottom: 16px;
        border: 1px solid #334155;
      }
      h3 {
        font-size: 16px;
        line-height: 1.4;
        margin-bottom: 12px;
        color: #f1f5f9;
      }
      .original-price {
        font-size: 13px;
        color: #94a3b8;
        text-decoration: line-through;
      }
      .current-price {
        font-size: 28px;
        font-weight: 800;
        color: #10b981;
        margin: 4px 0;
      }
      .installments {
        font-size: 12px;
        color: #cbd5e1;
        margin-bottom: 16px;
      }
      .btn {
        display: block;
        width: 100%;
        background: #f97316;
        color: #ffffff;
        text-align: center;
        padding: 12px;
        border-radius: 8px;
        font-weight: 700;
        text-decoration: none;
      }
      .footer-hud {
        position: fixed;
        bottom: 20px;
        left: 50%;
        transform: translateX(-50%);
        background: rgba(12, 18, 32, 0.9);
        border: 1px solid rgba(0, 243, 255, 0.4);
        border-radius: 30px;
        padding: 10px 24px;
        display: flex;
        align-items: center;
        gap: 16px;
        font-family: monospace;
        font-size: 12px;
        box-shadow: 0 0 25px rgba(0, 243, 255, 0.3);
        z-index: 9999999;
      }
      .indicator {
        width: 8px;
        height: 8px;
        border-radius: 50%;
        background: #00f3ff;
        box-shadow: 0 0 10px #00f3ff;
        animation: pulse 1.5s infinite;
      }
      @keyframes pulse {
        0%, 100% { opacity: 1; transform: scale(1); }
        50% { opacity: 0.4; transform: scale(1.3); }
      }
    </style>
  </head>
  <body>
    <header>
      <div class="logo">KaBuM! <span>Tech & Games</span></div>
      <input class="search-bar" type="text" value="Placa de Vídeo RTX 4060 8GB GDDR6" readonly />
      <div style="font-size: 13px; color: #94a3b8;">Sessão Inspecionada pelo Playwright</div>
    </header>

    <div class="grid">
      <div class="card" id="card-1">
        <span class="badge-offer">15% OFF</span>
        <div class="img-placeholder">🖥️</div>
        <h3>Placa de Vídeo Galax NVIDIA GeForce RTX 4060 1-Click OC 2X 8GB</h3>
        <div class="original-price">R$ 2.499,00</div>
        <div class="current-price">R$ 2.124,99</div>
        <div class="installments">10x de R$ 249,99 sem juros no cartão</div>
        <a href="#" class="btn">Comprar</a>
      </div>

      <div class="card active-target" id="card-target">
        <span class="badge-offer" style="background: #facc15; color: #022c22;">🏆 MENOR PREÇO</span>
        <div class="img-placeholder" style="border-color: #00f3ff;">⚡</div>
        <h3>Placa de Vídeo ASUS Dual NVIDIA GeForce RTX 4060 EVO OC Edition 8GB</h3>
        <div class="original-price">R$ 2.399,00</div>
        <div class="current-price" id="target-price">R$ 2.089,90</div>
        <div class="installments">À vista no PIX com 15% de desconto</div>
        <a href="#" class="btn" style="background: #10b981;">Melhor Oferta Validada</a>
      </div>

      <div class="card" id="card-3">
        <span class="badge-offer">10% OFF</span>
        <div class="img-placeholder">🎮</div>
        <h3>Placa de Vídeo Gigabyte NVIDIA GeForce RTX 4060 Eagle OC 8GB</h3>
        <div class="original-price">R$ 2.549,00</div>
        <div class="current-price">R$ 2.299,00</div>
        <div class="installments">12x de R$ 225,39 sem juros</div>
        <a href="#" class="btn">Comprar</a>
      </div>
    </div>

    <div class="footer-hud">
      <div class="indicator"></div>
      <span style="color: #00f3ff; font-weight: 700;">ARACHNEMIND IK SPIDER SCANNER</span>
      <span style="color: #64748b;">|</span>
      <span style="color: #f1f5f9;">TARGET: #card-target .current-price</span>
      <span style="color: #64748b;">|</span>
      <span style="color: #10b981; font-weight: 700;">VALIDATED: R$ 2.089,90</span>
    </div>
  </body>
  </html>
  `;

  await spiderPage.setContent(mockHtml, { waitUntil: 'load' });
  await spiderPage.evaluate(spiderScript);
  await spiderPage.waitForTimeout(500);

  // Position the spider targeting the middle card's price
  await spiderPage.evaluate(async () => {
    if (typeof window.moveSpiderToElement === 'function') {
      await window.moveSpiderToElement({
        selector: '#target-price',
        mode: 'price',
        header: 'OFERTA VERIFICADA // ARACHNEMIND',
        text: 'R$ 2.089,90 (KaBuM! Oficial) - PIX Validado'
      });
    }
  });

  await spiderPage.waitForTimeout(1200);

  const spiderPath = path.join(ASSETS_DIR, 'spider-inspection-overlay.png');
  await spiderPage.screenshot({ path: spiderPath, fullPage: false });
  console.log('[Assets] Saved spider overlay:', spiderPath);

  await browser.close();
  console.log('[Assets] Static screenshot captures completed successfully!');
}

captureScreenshots().catch(err => {
  console.error('[Assets] Error capturing screenshots:', err);
  process.exit(1);
});
