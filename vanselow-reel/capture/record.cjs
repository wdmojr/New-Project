// Records real interactions on vanselowdesign.com as 30 fps frame sequences.
// CSS animations/transitions are slowed 20x (CDP Animation.setPlaybackRate) and frames are taken on a
// virtual clock, so the site's own transitions (sticky header, menus, reveals) play back at true speed.
// Usage: node capture/record.cjs <clip|all>   (run from vanselow-reel/)
const { chromium } = require('../../node_modules/playwright');
const fs = require('fs');
const FPS = 30, RATE = 0.05;
const ease = (t) => (t < 0.5 ? 4 * t * t * t : 1 - (-2 * t + 2) ** 3 / 2);
const lerp = (a, b, t) => a + (b - a) * t;

async function session(viewport, dsf, mobile = false) {
  const b = await chromium.launch();
  const c = await b.newContext({ viewport, deviceScaleFactor: dsf, isMobile: mobile, hasTouch: mobile });
  const p = await c.newPage();
  await p.goto('https://vanselowdesign.com', { waitUntil: 'load', timeout: 60000 });
  await p.waitForTimeout(2500);
  // stop the hero slider from auto-advancing mid-shot
  await p.evaluate(() => { document.querySelectorAll('.swiper').forEach((s) => s.swiper && s.swiper.autoplay && s.swiper.autoplay.stop()); });
  const cdp = await c.newCDPSession(p);
  await cdp.send('Animation.enable');
  return { b, p, cdp };
}

// Run a timeline: steps(t, frame) is called before each frame with t in seconds of film time.
async function record(name, { p, cdp }, dur, step, clip) {
  const dir = `assets/clips/${name}`; fs.mkdirSync(dir, { recursive: true });
  const n = Math.round(dur * FPS), meta = [];
  await cdp.send('Animation.setPlaybackRate', { playbackRate: RATE });
  const t0 = Date.now();
  for (let i = 0; i < n; i++) {
    const t = i / FPS;
    // wait until virtual time t has elapsed on the slowed clock
    const due = t0 + (t / RATE) * 1000;
    const wait = due - Date.now(); if (wait > 0) await p.waitForTimeout(wait);
    const m = (await step(t, i)) || {};
    // the logo's SMIL shimmer runs on its own clock: drive it from film time
    await p.evaluate((tt) => document.querySelectorAll('svg').forEach((s) => { try { if (s.pauseAnimations) { s.pauseAnimations(); s.setCurrentTime(tt); } } catch (e) {} }), t + 2);
    await p.screenshot({ path: `${dir}/${String(i).padStart(4, '0')}.jpg`, type: 'jpeg', quality: 86, clip });
    meta.push(m);
  }
  await cdp.send('Animation.setPlaybackRate', { playbackRate: 1 });
  fs.writeFileSync(`${dir}/meta.json`, JSON.stringify({ fps: FPS, frames: n, meta }));
  console.log(name, n, 'frames', ((Date.now() - t0) / 1000).toFixed(0) + 's');
}

const CLIPS = {
  // the page settling, then a slow scroll: the big VS logo hands off to the slim sticky bar
  async scroll(S) {
    await S.p.evaluate(() => scrollTo(0, 0));
    await record('scroll', S, 6, async (t) => {
      const y = lerp(0, 1500, ease(Math.min(1, Math.max(0, (t - 0.8) / 4.6))));
      await S.p.evaluate((y) => scrollTo(0, y), y);
      return { y };
    });
  },
  // cursor glides to Services, the mega menu drops; then across to Service Areas
  async menu(S) {
    await S.p.evaluate(() => scrollTo(0, 0)); await S.p.mouse.move(700, 620);
    const pos = await S.p.evaluate(() => {
      const f = (txt) => { const a = [...document.querySelectorAll('header a')].find((e) => e.offsetParent && e.textContent.trim() === txt); const r = a.getBoundingClientRect(); return [r.x + r.width / 2, r.y + r.height / 2]; };
      return { svc: f('Services'), areas: f('Service Areas') };
    });
    const path = [[0, [700, 620]], [0.9, pos.svc], [2.6, pos.svc], [3.3, pos.areas], [5, pos.areas]];
    await record('menu', S, 5, async (t) => {
      let k = path.findIndex(([tt]) => tt > t); if (k < 0) k = path.length; const A = path[Math.max(0, k - 1)], B = path[Math.min(path.length - 1, k)];
      const u = B[0] === A[0] ? 1 : ease(Math.min(1, (t - A[0]) / (B[0] - A[0])));
      const x = lerp(A[1][0], B[1][0], u), y = lerp(A[1][1], B[1][1], u);
      await S.p.mouse.move(x, y);
      return { x, y };
    });
  },
  // scroll into the quote section, click the ZIP field, type 33772, the area check passes, Next -> step 2
  async form(S) {
    const fy = await S.p.evaluate(() => { const f = document.querySelector('form.forminator-custom-form'); return f.getBoundingClientRect().top + scrollY; });
    await S.p.evaluate((y) => scrollTo(0, y - 900), fy); await S.p.waitForTimeout(800);
    await S.p.mouse.move(400, 700);
    let zipPos = null, nextPos = null;
    const keys = '33772'; let typed = 0, clicked = false, nexted = false;
    await record('form', S, 7.5, async (t) => {
      const y = lerp(fy - 900, fy - 260, ease(Math.min(1, t / 1.6)));
      await S.p.evaluate((y) => scrollTo(0, y), y);
      if (t >= 1.6 && !zipPos) {
        zipPos = await S.p.evaluate(() => { const i = document.querySelector('form.forminator-custom-form input:not([type=hidden])'); const r = i.getBoundingClientRect(); return [r.x + r.width * 0.3, r.y + r.height / 2]; });
      }
      let cx = 400, cy = 700;
      if (zipPos) { const u = ease(Math.min(1, (t - 1.6) / 0.8)); cx = lerp(400, zipPos[0], u); cy = lerp(700, zipPos[1], u); }
      if (t >= 2.5 && !clicked) { clicked = true; await S.p.mouse.click(cx, cy); }
      while (clicked && typed < 5 && t >= 2.8 + typed * 0.22) { await S.p.keyboard.type(keys[typed]); typed++; }
      if (t >= 4.4 && !nextPos) {
        nextPos = await S.p.evaluate(() => { const b = [...document.querySelectorAll('form.forminator-custom-form button, form.forminator-custom-form .forminator-button')].find((e) => e.offsetParent && /next/i.test(e.textContent)); const r = b.getBoundingClientRect(); return [r.x + r.width / 2, r.y + r.height / 2]; });
      }
      if (nextPos) { const u = ease(Math.min(1, (t - 4.4) / 0.9)); cx = lerp(zipPos[0], nextPos[0], u); cy = lerp(zipPos[1], nextPos[1], u); }
      await S.p.mouse.move(cx, cy);
      if (t >= 5.5 && !nexted) { nexted = true; await S.p.mouse.click(cx, cy); }
      return { x: cx, y: cy, down: (t >= 2.5 && t < 2.6) || (t >= 5.5 && t < 5.6) };
    });
  },
  // scroll into the service-area map (its reveal plays), then hover three towns in the list
  async map(S) {
    const my = await S.p.evaluate(() => { const h = [...document.querySelectorAll('h2')].find((e) => /Where We Build/.test(e.textContent)); return h.getBoundingClientRect().top + scrollY; });
    await S.p.evaluate((y) => scrollTo(0, y - 1100), my); await S.p.waitForTimeout(600);
    await S.p.mouse.move(1300, 850);
    let pts = null;
    await record('map', S, 7, async (t) => {
      const y = lerp(my - 1100, my + 210, ease(Math.min(1, t / 1.8)));
      await S.p.evaluate((y) => scrollTo(0, y), y);
      if (t >= 1.8 && !pts) {
        pts = await S.p.evaluate(() => ['St. Petersburg', 'Seminole', 'Treasure Island'].map((n) => { const e = [...document.querySelectorAll('*')].filter((x) => x.children.length === 0 && x.textContent.trim() === n && x.offsetParent).pop(); const r = e.getBoundingClientRect(); return [r.x + 40, r.y + r.height / 2]; }));
      }
      let cx = 1300, cy = 850;
      if (pts) {
        const keys = [[1.9, [1300, 850]], [2.6, pts[0]], [3.6, pts[0]], [4.2, pts[1]], [5.1, pts[1]], [5.7, pts[2]], [7, pts[2]]];
        let k = keys.findIndex(([tt]) => tt > t); if (k < 0) k = keys.length; const A = keys[Math.max(0, k - 1)], B = keys[Math.min(keys.length - 1, k)];
        const u = B[0] === A[0] ? 1 : ease(Math.min(1, (t - A[0]) / (B[0] - A[0])));
        cx = lerp(A[1][0], B[1][0], u); cy = lerp(A[1][1], B[1][1], u);
      }
      await S.p.mouse.move(cx, cy);
      return { x: cx, y: cy };
    });
  },
  // phone: hero, a thumb-scroll, back up, open the drawer menu
  async mobile(S) {
    await S.p.evaluate(() => scrollTo(0, 0));
    let opened = false;
    await record('mobile', S, 6, async (t) => {
      const y = t < 3 ? 900 * Math.sin(Math.PI * Math.min(1, Math.max(0, (t - 0.5) / 2.4))) ** 2 * (t < 1.7 ? 1 : 1) : 0;
      await S.p.evaluate((y) => scrollTo(0, y), t < 1.7 ? lerp(0, 900, ease(Math.max(0, (t - 0.5) / 1.2))) : lerp(900, 0, ease(Math.min(1, (t - 1.9) / 1.0))));
      if (t >= 3.4 && !opened) { opened = true; await S.p.locator('a[aria-label="Menu"]:visible, button.e-n-menu-toggle:visible').first().click(); }
      return {};
    });
  },
};

(async () => {
  const which = process.argv[2] || 'all';
  const names = which === 'all' ? Object.keys(CLIPS) : which.split(',');
  for (const n of names) {
    const S = n === 'mobile' ? await session({ width: 390, height: 844 }, 2.5, true) : await session({ width: 1440, height: 900 }, 1.5);
    try { await CLIPS[n](S); } catch (e) { console.error(n, 'FAILED', e.message); }
    await S.b.close();
  }
})();
