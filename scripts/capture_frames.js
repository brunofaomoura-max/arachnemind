const { chromium } = require('../backend/node_modules/playwright');
const fs = require('fs');
const path = require('path');

const FRAMES_DIR = path.join(__dirname, '..', 'docs', 'assets', 'frames');
if (!fs.existsSync(FRAMES_DIR)) {
  fs.mkdirSync(FRAMES_DIR, { recursive: true });
} else {
  // Clear old frames
  fs.readdirSync(FRAMES_DIR).forEach(f => fs.unlinkSync(path.join(FRAMES_DIR, f)));
}

async function captureAnimationFrames() {
  console.log('[Frames] Launching browser for animation frame capture...');
  const browser = await chromium.launch({
    headless: true,
    args: ['--disable-web-security']
  });

  const context = await browser.newContext({
    viewport: { width: 1280, height: 720 },
    deviceScaleFactor: 1
  });

  const page = await context.newPage();
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
        background: #090d16;
        color: #f8fafc;
        font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
        padding: 30px 40px;
        min-height: 100vh;
        overflow: hidden;
      }
      header {
        display: flex;
        justify-content: space-between;
        align-items: center;
        border-bottom: 1px solid #1e293b;
        padding-bottom: 16px;
        margin-bottom: 24px;
      }
      .logo { font-size: 20px; font-weight: 800; color: #f97316; }
      .logo span { color: #00f3ff; }
      .search-bar {
        background: #111827;
        border: 1px solid #334155;
        border-radius: 6px;
        padding: 8px 16px;
        width: 420px;
        color: #94a3b8;
        font-size: 13px;
        font-family: monospace;
      }
      .grid {
        display: grid;
        grid-template-columns: repeat(3, 1fr);
        gap: 20px;
        max-width: 1200px;
        margin: 0 auto;
      }
      .card {
        background: #111827;
        border: 1px solid #1f2937;
        border-radius: 10px;
        padding: 18px;
        position: relative;
      }
      .badge {
        position: absolute;
        top: 14px;
        right: 14px;
        background: #10b981;
        color: #022c22;
        font-weight: 700;
        font-size: 10px;
        padding: 3px 7px;
        border-radius: 4px;
      }
      .img-ph {
        width: 100%;
        height: 140px;
        background: #090d16;
        border-radius: 6px;
        display: flex;
        align-items: center;
        justify-content: center;
        font-size: 40px;
        margin-bottom: 12px;
        border: 1px solid #1f2937;
      }
      h3 { font-size: 13px; font-weight: 600; line-height: 1.4; margin-bottom: 8px; color: #f1f5f9; }
      .old-price { font-size: 11px; color: #64748b; text-decoration: line-through; }
      .price { font-size: 22px; font-weight: 800; color: #10b981; margin: 2px 0; font-family: monospace; }
      .terms { font-size: 11px; color: #94a3b8; margin-bottom: 12px; }
      .hud-pill {
        position: fixed;
        bottom: 16px;
        left: 50%;
        transform: translateX(-50%);
        background: rgba(8, 12, 22, 0.95);
        border: 1px solid rgba(0, 243, 255, 0.5);
        border-radius: 20px;
        padding: 8px 20px;
        display: flex;
        align-items: center;
        gap: 12px;
        font-family: monospace;
        font-size: 11px;
        box-shadow: 0 0 20px rgba(0, 243, 255, 0.25);
        z-index: 9999999;
      }
    </style>
  </head>
  <body>
    <header>
      <div class="logo">KaBuM! <span>Hardware E-Commerce</span></div>
      <input class="search-bar" type="text" value="GeForce RTX 4060 8GB GDDR6" readonly />
      <div style="font-size: 11px; color: #00f3ff; font-family: monospace;">ARACHNEMIND ACTIVE SESSION</div>
    </header>

    <div class="grid">
      <div class="card" id="card-1">
        <span class="badge">12% OFF</span>
        <div class="img-ph">🎮</div>
        <h3>Galax GeForce RTX 4060 1-Click OC 2X 8GB</h3>
        <div class="old-price">R$ 2.399,00</div>
        <div class="price" id="p1">R$ 2.149,00</div>
        <div class="terms">10x R$ 214,90 sem juros</div>
      </div>

      <div class="card" id="card-2" style="border-color: #00f3ff; box-shadow: 0 0 20px rgba(0,243,255,0.2);">
        <span class="badge" style="background: #facc15; color: #000;">MELHOR PREÇO</span>
        <div class="img-ph" style="border-color: #00f3ff;">⚡</div>
        <h3>ASUS Dual GeForce RTX 4060 EVO OC 8GB</h3>
        <div class="old-price">R$ 2.399,00</div>
        <div class="price" id="p2" style="color: #38bdf8;">R$ 2.089,90</div>
        <div class="terms">À vista com desconto no PIX</div>
      </div>

      <div class="card" id="card-3">
        <span class="badge">8% OFF</span>
        <div class="img-ph">🖥️</div>
        <h3>Gigabyte GeForce RTX 4060 Eagle OC 8GB</h3>
        <div class="old-price">R$ 2.499,00</div>
        <div class="price" id="p3">R$ 2.299,00</div>
        <div class="terms">12x R$ 225,39 sem juros</div>
      </div>
    </div>

    <div class="hud-pill">
      <span style="color: #00f3ff; font-weight: 700;">AUTONOMOUS SPIDER</span>
      <span style="color: #475569;">|</span>
      <span style="color: #facc15;">SCANNING: ASUS Dual RTX 4060</span>
      <span style="color: #475569;">|</span>
      <span style="color: #10b981; font-weight: 700;">PIX: R$ 2.089,90</span>
    </div>
  </body>
  </html>
  `;

  await page.setContent(mockHtml, { waitUntil: 'load' });
  await page.evaluate(spiderScript);
  await page.waitForTimeout(400);

  // Trigger spider movement to #p2
  await page.evaluate(() => {
    if (typeof window.moveSpiderToElement === 'function') {
      window.moveSpiderToElement({
        selector: '#p2',
        mode: 'price',
        header: 'OFERTA VERIFICADA // ARACHNEMIND',
        text: 'R$ 2.089,90 (KaBuM!) - Menor Preço'
      });
    }
  });

  console.log('[Frames] Capturing 24 animation frames...');
  for (let i = 0; i < 24; i++) {
    const framePath = path.join(FRAMES_DIR, `frame_${String(i).padStart(3, '0')}.png`);
    await page.screenshot({ path: framePath, fullPage: false });
    await page.waitForTimeout(80);
  }

  await browser.close();
  console.log('[Frames] 24 frames captured successfully!');
}

captureAnimationFrames().catch(err => {
  console.error('[Frames] Error capturing frames:', err);
  process.exit(1);
});
