// Operation Hurricane sizzle: pure function of time. window.seek(t) paints frame t (see lib/motion.js).
// Timing is in beats (u) on the measured grid (100 bpm). docs/shotlist.md is the plan this file follows.
// Every picture is a real capture of the game (assets/shots) or a real gameplay clip (assets/clips).
import * as M from './lib/motion.js';

const { W, H, E, prog, lerp, clamp, springU, SPRING, font, layout, glyph, text, fill, rrect, zoomAbout, mulberry32 } = M;

const C = { ink: '#070C12', white: '#F3F6F9', mist: '#A9B6C3', accent: '#F6A23C' };
const DISPLAY = 'Display', UI = 'UI';

// Every accent: [beat, label, sfx, opts]. sfx.mjs voices them; the score carries the music hits.
const HITS = [
  [2, 'punch line lands', 'thud', { pitch: 'D2' }],
  [6, 'stamp line 1', 'tick'],
  [6.75, 'stamp line 2', 'tick'],
  [7.5, 'stamp line 3', 'tick'],
  [9, 'whip to the call', 'whoosh', { len: 0.45, from: 400, to: 2600 }],
  [11.5, 'ANSWER', 'click'],
  [16, 'super 911', 'pop', { pitch: 'D5' }],
  [16.5, "super CAN'T REACH THEM", 'pop', { pitch: 'A4' }],
  [21, 'to Bryan', 'whoosh', { len: 0.4, from: 2400, to: 500 }],
  [26, 'the choice', 'tick'],
  [31, "I'M IN", 'click'],
  [32, 'DROP: title', 'impact'],
  [34, 'title wipes', 'whoosh', { len: 0.4, from: 600, to: 3000 }],
  [36, 'whip to cruise', 'whoosh', { len: 0.4, from: 3000, to: 600, pan: 0.3 }],
  [36.2, '15 SOULS', 'pop', { pitch: 'D5' }],
  [36.75, '7 MINUTES', 'pop', { pitch: 'F5' }],
  [38.4, 'the surge', 'thud', { pitch: 'D2' }],
  [41, 'hoist', 'click'],
  [44, 'debrief', 'whoosh', { len: 0.45, from: 500, to: 2800 }],
  [46.2, 'end card', 'thud', { pitch: 'D2' }],
];

// ---------------------------------------------------------------- assets
const SHOTS = ['intro1_lines', 'intro1_full', 'intro_stamp', 'ops_call', 'ops_sarah', 'ops_bryan', 'ops_choice',
  'fly_spotted', 'fly_cruise', 'debrief', 'title'];
const CLIPS = { flight: 36, hoist: 48, surge: 36 };
const images = {};
for (const s of SHOTS) images[s] = `assets/shots/${s}.png`;
// clip frames load as ImageBitmaps in init(): ~120 large <img> decodes at once exceed the browser's decode budget
const FRAMES = {};

// ---------------------------------------------------------------- helpers
const logZoom = (a, b, p) => a * (b / a) ** p;
// A full-frame plate: the capture zoomed about a focal point (image px). z >= 1 always covers the frame.
function plate(ctx, img, z, px, py, dx = 0) {
  if (!img) return;
  ctx.save(); ctx.translate(dx, 0); zoomAbout(ctx, z, px, py);
  ctx.drawImage(img, 0, 0, W, H);
  ctx.restore();
}
function clipFrame(IMG, name, f) {
  const n = CLIPS[name];
  return FRAMES[`${name}${clamp(Math.floor(f), 0, n - 1)}`];
}
// Kinetic super: words spring up from below a mask line, one per entry [word, beat, accent?].
function superLine(ctx, words, x, base, size, u, exitU = 1e9) {
  const f = font(size, 800, DISPLAY);
  let cx = x;
  for (const [w, u0, acc] of words) {
    const L = layout(ctx, w, f, size * 0.01);
    const k = springU(u, u0, SPRING.snappy);
    const ex = E.inBack(prog(u, exitU, exitU + 0.5), 1.4);
    if (k > 0) {
      ctx.save(); ctx.beginPath(); ctx.rect(cx - 10, base - L.asc - 30, L.width + 40, L.asc + L.desc + 50); ctx.clip();
      L.glyphs.forEach((g, j) => {
        const kj = springU(u, u0 + j * 0.025, SPRING.snappy);
        glyph(ctx, g.ch, cx + g.cx, base + (1 - kj) * (L.asc + 30) + ex * (L.asc + 40), f, acc ? C.accent : C.white);
      });
      ctx.restore();
    }
    cx += L.width + size * 0.28;
  }
}
function scrim(ctx, side = 'left', a = 0.75) {
  const g = side === 'left' ? ctx.createLinearGradient(0, 0, W * 0.7, 0) : ctx.createLinearGradient(0, H, 0, H * 0.35);
  g.addColorStop(0, `rgba(7,12,18,${a})`); g.addColorStop(1, 'rgba(7,12,18,0)');
  ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);
}
function flash(ctx, u, u0, k = 3.2, a = 0.85) {
  if (u < u0) return;
  const v = a * Math.exp(-(u - u0) * k);
  if (v > 0.01) { ctx.fillStyle = `rgba(235,242,255,${v})`; ctx.fillRect(0, 0, W, H); }
}

// ---------------------------------------------------------------- scenes
function sceneHook(ctx, u, IMG) {                                       // b0-6
  // b0-2: the camera reads along the first line; b2: cut wide to the punch line, then push through it
  const pull = E.inExpo(prog(u, 5.3, 6));
  ctx.save(); M.shake(ctx, u, 2, 18, 4, 0.25);
  if (u < 2) plate(ctx, IMG.intro1_lines, 1.75, lerp(350, 1570, E.inOutSine(prog(u, 0, 2))), 390);
  else plate(ctx, IMG.intro1_full, logZoom(1.2, 1.55, E.outCubic(prog(u, 2, 5.3))) * logZoom(1, 2.4, pull), 960, 600);
  ctx.restore();
  flash(ctx, u, 2, 3.4, 0.9);
}
function sceneStamp(ctx, u, IMG) {                                      // b6-9
  const z = logZoom(1.62, 1.72, prog(u, 6, 9.4));
  const px = lerp(130, 170, prog(u, 6, 9.4));
  plate(ctx, IMG.intro_stamp, z, px, 830);
  // the three stamp lines type on: mask each line until its beat
  ctx.save(); zoomAbout(ctx, z, px, 830);
  [[6, 735, 790], [6.75, 795, 832], [7.5, 860, 896]].forEach(([u0, y0, y1]) => {
    const r = E.outCubic(prog(u, u0, u0 + 0.5));
    ctx.fillStyle = '#0b1016'; ctx.fillRect(130 + r * 760, y0, 900, y1 - y0 + 6);
  });
  ctx.restore();
}
function sceneCall(ctx, u, IMG) {                                       // b9-12
  const p = prog(u, 9, 11.5);
  let z = logZoom(1.12, 1.32, E.outCubic(p));
  const punch = E.inExpo(prog(u, 11.5, 12));
  z *= logZoom(1, 3.2, punch);
  const pulse = 1 + 0.012 * Math.sin((u - 9) * Math.PI * 2 * 1.6) * (u < 11.5 ? 1 : 0);
  plate(ctx, IMG.ops_call, z * pulse, 960, lerp(560, 732, punch));
  if (u >= 11.5) { ctx.fillStyle = `rgba(92,214,138,${0.35 * Math.exp(-(u - 11.5) * 4)})`; ctx.fillRect(0, 0, W, H); }
}
function sceneSarah(ctx, u, IMG) {                                      // b12-21
  const p = E.inOutSine(prog(u, 12, 21));
  const z = logZoom(1.42, 1.22, p);
  plate(ctx, IMG.ops_sarah, z, lerp(360, 1560, p), lerp(420, 860, p));
  const sIn = springU(u, 15.6, SPRING.gentle), sOut = E.inCubic(prog(u, 20.3, 21));
  if (sIn > 0) { ctx.globalAlpha = sIn * (1 - sOut); scrim(ctx, 'left', 0.82); ctx.globalAlpha = 1; }
  superLine(ctx, [['911', 16, true], ["CAN'T", 16.5], ['REACH', 16.62], ['THEM.', 16.74]], 120, 330, 150, u, 20.3);
  if (u > 17) text(ctx, 'Sarah M. · calling about her parents on Siesta Key', 124, 400, font(34, 500, UI), `rgba(243,246,249,${clamp((u - 17) * 2) * (1 - sOut)})`);
}
function sceneBryan(ctx, u, IMG) {                                      // b21-26
  const p = E.inOutSine(prog(u, 21, 26));
  const z = logZoom(1.18, 1.42, p);
  const dx = (1 - E.outCubic(prog(u, 21, 21.6))) * 220;
  plate(ctx, IMG.ops_bryan, z, 1270, 720, dx);
  const k = springU(u, 21.8, SPRING.gentle);
  if (k > 0) {
    ctx.globalAlpha = k; scrim(ctx, 'left', 0.7); ctx.globalAlpha = 1;
    superLine(ctx, [['THE', 22], ['LAST', 22.15], ['RESORT.', 22.3, true]], 120, 300, 130, u, 25.4);
  }
}
function sceneChoice(ctx, u, IMG) {                                     // b26-32
  const p = prog(u, 26, 32);
  const z = logZoom(1.08, 1.75, E.inQuad(p));
  plate(ctx, IMG.ops_choice, z, 1060, 700);
  // I'M IN press at b31: the real button dips and a ring blooms from it
  ctx.save(); zoomAbout(ctx, z, 1060, 700);
  if (u >= 31) {
    const r = prog(u, 31, 31.8);
    ctx.strokeStyle = `rgba(246,162,60,${1 - r})`; ctx.lineWidth = 10 * (1 - r) + 2;
    rrect(ctx, 560 - r * 40, 652 - r * 40, 380 + r * 80, 104 + r * 80, 22 + r * 20); ctx.stroke();
    ctx.fillStyle = `rgba(0,0,0,${0.3 * Math.exp(-(u - 31) * 6)})`; rrect(ctx, 560, 652, 380, 104, 18); ctx.fill();
  }
  ctx.restore();
  // riser vignette closing in
  const v = E.inCubic(prog(u, 29, 32));
  if (v > 0) { const g = ctx.createRadialGradient(W / 2, H * 0.62, H * (0.9 - v * 0.6), W / 2, H * 0.62, H * 1.2); g.addColorStop(0, 'rgba(0,0,0,0)'); g.addColorStop(1, `rgba(0,0,0,${0.85 * v})`); ctx.fillStyle = g; ctx.fillRect(0, 0, W, H); }
}
function sceneDrop(ctx, u, IMG) {                                       // b32-34.4
  const f = (u - 32) / 2.4 * 33;
  ctx.save(); M.shake(ctx, u, 32, 22, 7, 0.3);
  plate(ctx, clipFrame(IMG, 'flight', f), logZoom(1.12, 1.04, prog(u, 32, 34.4)), 700, 420);
  ctx.restore();
  ctx.globalAlpha = clamp(springU(u, 32, SPRING.snappy)); scrim(ctx, 'bottom', 0.85); ctx.globalAlpha = 1;
  const s = M.FORMAT.safe;
  const exitU = 33.9;
  [['OPERATION', 32.05, C.accent, 150], ['HURRICANE', 32.2, C.white, 230]].forEach(([w, u0, col, size], i) => {
    const fnt = font(size, 800, DISPLAY), L = layout(ctx, w, fnt, size * 0.012);
    const base = H - s.y - 70 - (i === 0 ? 210 : 0);
    L.glyphs.forEach((g, j) => {
      const k = springU(u, u0 + j * 0.03, SPRING.bouncy);
      if (k <= 0) return;
      const out = E.inBack(prog(u, exitU + j * 0.02, exitU + 0.45 + j * 0.02), 1.3);
      glyph(ctx, g.ch, s.x + g.cx - out * (W * 0.9), base + (1 - k) * 180, fnt, col, 1, clamp(k, 0, 1.2));
    });
  });
  flash(ctx, u, 32, 4.5, 0.95);
}
function whipPair(ctx, u, u0, drawA, drawB) {                           // pan with both shots on screen
  const p = E.inOutCubic(prog(u, u0 - 0.3, u0 + 0.3));
  ctx.save(); ctx.translate(-p * W, 0); drawA(ctx); ctx.restore();
  ctx.save(); ctx.translate((1 - p) * W, 0); drawB(ctx); ctx.restore();
}
function spotted(ctx, u, IMG) { plate(ctx, IMG.fly_spotted, logZoom(1.15, 1.4, prog(u, 34.4, 36.3)), 1400, 600); }
function cruise(ctx, u, IMG) {
  plate(ctx, IMG.fly_cruise, logZoom(1.25, 1.1, prog(u, 35.7, 38.4)), 1300, 520);
}
function sceneSouls(ctx, u, IMG) {                                      // b36-38 (supers over the cruise)
  cruise(ctx, u, IMG);
  ctx.globalAlpha = clamp(springU(u, 36.3, SPRING.gentle)); scrim(ctx, 'left', 0.8); ctx.globalAlpha = 1;
  superLine(ctx, [['15', 36.2, true], ['SOULS.', 36.32]], 120, 420, 210, u);
  superLine(ctx, [['7', 36.75, true], ['MINUTES.', 36.87]], 120, 640, 210, u);
}
function sceneSurge(ctx, u, IMG) {                                      // b38-41
  const f = (u - 38.4) / 2.6 * 35;
  plate(ctx, clipFrame(IMG, 'surge', f), logZoom(1.6, 1.9, E.inOutSine(prog(u, 38.4, 41))), 1140, 760);
  ctx.globalAlpha = clamp(springU(u, 38.5, SPRING.gentle)); scrim(ctx, 'left', 0.7); ctx.globalAlpha = 1;
  superLine(ctx, [['THE', 38.6], ['WATER', 38.72], ['KEEPS', 38.84], ['RISING.', 38.96, true]], 120, 300, 130, u, 40.6);
}
function sceneJackpot(ctx, u, IMG) {                                    // b41-44
  const f = (u - 41) / 2.9 * 47;
  const zIn = E.outCubic(prog(u, 42.1, 43));
  const z = logZoom(1.15, 1.5, zIn) * logZoom(1, 2.2, E.inExpo(prog(u, 43.6, 44)));
  plate(ctx, clipFrame(IMG, 'hoist', f), z, lerp(1300, 960, zIn), lerp(600, 450, zIn));
}
function sceneDebrief(ctx, u, IMG) {                                    // b44-47
  const p = E.inOutSine(prog(u, 44, 46.2));
  const z = logZoom(1.02, 1.32, p);
  const dy = (1 - E.outCubic(prog(u, 44, 44.6))) * 160;
  ctx.save(); ctx.translate(0, dy); plate(ctx, IMG.debrief, z, lerp(600, 420, p), lerp(560, 960, p)); ctx.restore();
  const out = E.inCubic(prog(u, 45.8, 46.2));
  if (out > 0) { ctx.fillStyle = `rgba(7,12,18,${out})`; ctx.fillRect(0, H * (1 - out), W, H * out); }
}
function sceneEnd(ctx, u, IMG) {                                        // b46.4-50
  fill(ctx, C.ink);
  const glowG = ctx.createRadialGradient(W * 0.22, H * 0.55, 0, W * 0.22, H * 0.55, W * 0.6);
  glowG.addColorStop(0, 'rgba(246,162,60,0.10)'); glowG.addColorStop(1, 'rgba(246,162,60,0)');
  ctx.fillStyle = glowG; ctx.fillRect(0, 0, W, H);
  const s = M.FORMAT.safe, x = s.x + 24, u0 = 46.2;
  const rows = [["DON'T BE A SPECTATOR.", C.accent, 76, 250, 0], ['OPERATION', C.white, 150, 420, 0.1], ['HURRICANE', C.white, 230, 630, 0.18]];
  rows.forEach(([w, col, size, base, d]) => {
    const fnt = font(size, 800, DISPLAY), L = layout(ctx, w, fnt, size * 0.012);
    L.glyphs.forEach((gl, j) => {
      const k = springU(u, u0 + d + j * 0.012, SPRING.snappy);
      if (k <= 0) return;
      ctx.save(); ctx.beginPath(); ctx.rect(0, base - L.asc - 20, W, L.asc + L.desc + 40); ctx.clip();
      glyph(ctx, gl.ch, x + gl.cx, base + (1 - k) * (L.asc + 40), fnt, col);
      ctx.restore();
    });
  });
  const t2 = E.outQuint(prog(u, u0 + 0.35, u0 + 0.9));
  if (t2 > 0) text(ctx, 'A Grey Bull Rescue mission concept', x + 6, 712 + (1 - t2) * 30, font(44, 500, UI), `rgba(169,182,195,${t2})`);
  const k3 = springU(u, u0 + 0.55, SPRING.bouncy);
  if (k3 > 0) {
    ctx.save(); ctx.translate(x, 780); ctx.scale(clamp(k3, 0, 1.2), clamp(k3, 0, 1.2));
    rrect(ctx, 0, 0, 560, 96, 48); ctx.fillStyle = C.accent; ctx.fill();
    text(ctx, 'FUND THE NEXT RESCUE', 280, 64, font(60, 800, DISPLAY), C.ink, 'center', 1);
    ctx.restore();
  }
  const t4 = E.outQuint(prog(u, u0 + 0.75, u0 + 1.2));
  if (t4 > 0) {
    text(ctx, 'greybullrescue.org', x + 600, 845, font(46, 700, UI), `rgba(243,246,249,${t4})`);
    text(ctx, 'Concept prototype · not an official Grey Bull Rescue product · voices are synthesized', x + 4, H - s.y - 6, font(24, 500, UI), `rgba(120,134,148,${t4})`);
  }
}

// ---------------------------------------------------------------- film
let grainCv = null;
M.film({
  fonts: [font(100, 800, DISPLAY), font(40, 500, UI), font(40, 700, UI)],
  images,
  hits: HITS,
  samples: (t) => 10,
  async init() {
    await Promise.all(Object.entries(CLIPS).flatMap(([c, n]) => Array.from({ length: n }, async (_, i) => {
      const src = `assets/clips/${c}/f${String(i).padStart(3, '0')}.jpg`;
      try { FRAMES[`${c}${i}`] = await createImageBitmap(await (await fetch(src)).blob()); } catch (e) { console.error(`clip frame failed: ${src}`); }
    })));
    grainCv = document.createElement('canvas'); grainCv.width = grainCv.height = 256;
    const g = grainCv.getContext('2d'), im = g.createImageData(256, 256), r = mulberry32(7);
    for (let i = 0; i < im.data.length; i += 4) { const v = r() * 255; im.data[i] = im.data[i + 1] = im.data[i + 2] = v; im.data[i + 3] = 255; }
    g.putImageData(im, 0, 0);
  },
  draw(ctx, u, t, IMG) {
    fill(ctx, C.ink);
    if (u < 6) sceneHook(ctx, u, IMG);
    else if (u < 8.7) sceneStamp(ctx, u, IMG);
    else if (u < 9.3) whipPair(ctx, u, 9, (c) => sceneStamp(c, u, IMG), (c) => sceneCall(c, u, IMG));
    else if (u < 12) sceneCall(ctx, u, IMG);
    else if (u < 21) sceneSarah(ctx, u, IMG);
    else if (u < 26) sceneBryan(ctx, u, IMG);
    else if (u < 32) sceneChoice(ctx, u, IMG);
    else if (u < 34.4) sceneDrop(ctx, u, IMG);
    else if (u < 35.7) spotted(ctx, u, IMG);
    else if (u < 36.3) whipPair(ctx, u, 36, (c) => spotted(c, u, IMG), (c) => sceneSouls(c, u, IMG));
    else if (u < 38.4) sceneSouls(ctx, u, IMG);
    else if (u < 41) sceneSurge(ctx, u, IMG);
    else if (u < 44) sceneJackpot(ctx, u, IMG);
    else if (u < 46.2) sceneDebrief(ctx, u, IMG);
    else sceneEnd(ctx, u, IMG);
  },
  post(ctx, u, t) {
    const g = ctx.createRadialGradient(W / 2, H / 2, H * 0.45, W / 2, H / 2, W * 0.7);
    g.addColorStop(0, 'rgba(0,0,0,0)'); g.addColorStop(1, 'rgba(0,0,0,0.45)');
    ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);
    if (!grainCv) return;
    const r = mulberry32(Math.floor(t * 60) + 11);
    ctx.globalAlpha = 0.045; ctx.fillStyle = ctx.createPattern(grainCv, 'repeat');
    ctx.save(); ctx.translate(-r() * 256, -r() * 256); ctx.fillRect(0, 0, W + 256, H + 256); ctx.restore();
    ctx.globalAlpha = 1;
  },
});
