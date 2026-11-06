const { chromium } = require('../backend/node_modules/playwright');
const fs = require('fs');
const path = require('path');

const FRAMES_DIR = path.join(__dirname, '..', 'docs', 'assets', 'graph_frames');
if (!fs.existsSync(FRAMES_DIR)) {
  fs.mkdirSync(FRAMES_DIR, { recursive: true });
} else {
  fs.readdirSync(FRAMES_DIR).forEach(f => fs.unlinkSync(path.join(FRAMES_DIR, f)));
}

async function captureGraphFrames() {
  console.log('[Graph GIF] Launching browser to capture graph animation...');
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({
    viewport: { width: 1280, height: 720 },
    deviceScaleFactor: 1
  });

  const page = await context.newPage();
  await page.goto('http://localhost:5173', { waitUntil: 'networkidle' });
  await page.waitForTimeout(2000);

  // Focus on the central graph canvas
  console.log('[Graph GIF] Capturing 24 frames of the live knowledge graph...');
  for (let i = 0; i < 24; i++) {
    const framePath = path.join(FRAMES_DIR, `frame_${String(i).padStart(3, '0')}.png`);
    await page.screenshot({ path: framePath, fullPage: false });
    await page.waitForTimeout(90);
  }

  await browser.close();
  console.log('[Graph GIF] Frames captured successfully!');
}

captureGraphFrames().catch(err => {
  console.error('[Graph GIF] Error:', err);
  process.exit(1);
});
