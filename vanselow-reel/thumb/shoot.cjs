// Renders the thumbnail card (16:9 and 9:16) to PNG. Run from vanselow-reel/.
const { chromium } = require('../../node_modules/playwright');
const path = require('path');
(async () => {
  const b = await chromium.launch();
  for (const [name, w, h, q] of [['thumb_16x9', 1920, 1080, ''], ['thumb_9x16', 1080, 1920, '?v']]) {
    const p = await b.newPage({ viewport: { width: w, height: h } });
    await p.goto('file://' + path.resolve('thumb/thumb.html') + q);
    await p.evaluate(() => document.fonts.ready); await p.waitForTimeout(400);
    await p.screenshot({ path: `thumb/${name}.png` });
  }
  await b.close();
})();
