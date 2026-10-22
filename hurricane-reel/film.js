// Operation Hurricane sizzle: pure function of time. window.seek(t) paints frame t (see lib/motion.js).
// Timing is in beats (u) on the measured grid (100 bpm). docs/shotlist.md is the plan this file follows.
// Every picture is a real capture of the game (assets/shots) or a real gameplay clip (assets/clips).
import * as M from './lib/motion.js';

const { W, H, E, prog, lerp, clamp, springU, SPRING, font, layout, glyph, text, fill, rrect, zoomAbout, mulberry32 } = M;

// Grey Bull palette: red, white, blue and grey (no yellow); Triad colors red / yellow / green on the end card only
const C = { ink: '#070C12', white: '#F3F6F9', mist: '#A9B6C3', accent: '#E5484D', red: '#B3262B', mono: '#5FD09A' };
const DISPLAY = 'Display', UI = 'UI';

// Every accent: [beat, label, sfx, opts]. sfx.mjs voices them; the score carries the music hits.
const HITS = [
  [1.6, 'ANSWER', 'click'],
  [2, 'punch to Olivia', 'whoosh', { len: 0.4, from: 400, to: 2600 }],
  [2.3, 'super OLIVIA', 'pop', { pitch: 'D5' }],
  [7.4, 'to Bryan', 'whoosh', { len: 0.4, from: 2400, to: 500 }],
  [7.8, 'super BRYAN', 'pop', { pitch: 'D5' }],
  [11, 'the choice', 'tick'],
  [12.75, "I'M IN", 'click'],
  [13, 'DROP: you deploy', 'impact'],
  [16.3, 'title', 'whoosh', { len: 0.4, from: 600, to: 3000 }],
  [19.5, 'whip to spotted', 'whoosh', { len: 0.4, from: 3000, to: 600, pan: 0.3 }],
  [21, 'to the hoist', 'whoosh', { len: 0.4, from: 500, to: 2800 }],
  [21.4, 'super LOWER THE BASKET', 'pop', { pitch: 'F5' }],
  [28, 'the surge', 'thud', { pitch: 'D2' }],
  [28.3, 'super BEAT THE WATER', 'pop', { pitch: 'D5' }],
  [31, 'whip home', 'whoosh', { len: 0.4, from: 2800, to: 500, pan: -0.3 }],
  [31.3, 'super BRING THEM HOME', 'pop', { pitch: 'A4' }],
  [34.5, 'SUCCESSFUL LANDING', 'click'],
  [36.5, 'debrief', 'whoosh', { len: 0.45, from: 500, to: 2800 }],
  [40.5, 'LIVE THE MISSION', 'thud', { pitch: 'D2' }],
  [45, 'end card', 'thud', { pitch: 'D2' }],
];

// ---------------------------------------------------------------- assets
const SHOTS = ['ops_call', 'ops_sarah', 'ops_choice', 'fly_spotted', 'debrief'];
const CLIPS = { liftoff: 54, flight: 36, hoist2: 132, surge: 36, landing: 96 };
const images = {};
for (const s of SHOTS) images[s] = `assets/shots/${s}.png`;
// clip frames load as ImageBitmaps in init(): ~350 large <img> decodes at once exceed the browser's decode budget
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


// The Grey Bull Rescue lockup, rebuilt as vectors from the supplied logo and reversed for a dark ground
// (white mark and wordmark, brand-red stripes). Same art as the game's title screen. Units: 990 x 260.
function logoArt(g, t) {
  const W = C.white, R = '#D42A3A', NAVY = '#1F3A5C', k = (a, b) => clamp((t - a) / (b - a), 0, 1);
  const eOut = x => 1 - Math.pow(1 - x, 3), eBack = x => { const c = 1.7; return 1 + (c + 1) * Math.pow(x - 1, 3) + c * Math.pow(x - 1, 2); };
  const kh = k(0.05, 0.55);
  g.save(); g.globalAlpha = kh; g.translate(135, 40); g.scale(0.6 + 0.4 * eBack(kh), 1); g.translate(-135, -40);
  g.fillStyle = W; g.beginPath();
  g.moveTo(0, 0); g.quadraticCurveTo(30, 50, 80, 50); g.lineTo(190, 50); g.quadraticCurveTo(240, 50, 270, 0);
  g.quadraticCurveTo(270, 35, 250, 60); g.quadraticCurveTo(230, 80, 190, 80); g.lineTo(80, 80); g.quadraticCurveTo(40, 80, 20, 60); g.quadraticCurveTo(2, 40, 0, 0);
  g.closePath(); g.fill(); g.restore();
  const kv = eOut(k(0.35, 0.8));
  if (kv > 0) { g.save(); g.beginPath(); g.rect(0, 96, 270, 164 * kv + 2); g.clip(); g.fillStyle = W; g.beginPath(); g.moveTo(45, 100); g.lineTo(173, 100); g.lineTo(110, 257); g.closePath(); g.fill(); g.restore(); }
  [[181, 203, 0.6], [212, 235, 0.72]].forEach(([x0, x1, a]) => {
    const ks = eOut(k(a, a + 0.35)); if (ks <= 0) return;
    const off = (1 - ks) * 60;
    g.save(); g.globalAlpha = ks; g.translate(off * 0.4, -off); g.fillStyle = R; g.beginPath();
    g.moveTo(x0, 100); g.lineTo(x1, 100); g.lineTo(x1 - 63, 257); g.lineTo(x0 - 63, 257); g.closePath(); g.fill(); g.restore();
  });
  const kst = k(0.95, 1.3);
  if (kst > 0) { g.save(); g.translate(141, 132); g.rotate((1 - kst) * -2.4); g.scale(eBack(kst), eBack(kst)); g.fillStyle = NAVY; g.beginPath();
    for (let i = 0; i < 10; i++) { const an = -Math.PI / 2 + i * Math.PI / 5, rad = i % 2 ? 6 : 15; g.lineTo(Math.cos(an) * rad, Math.sin(an) * rad); } g.closePath(); g.fill(); g.restore(); }
  const kw = eOut(k(0.8, 1.45));
  if (kw > 0) { g.save(); g.beginPath(); g.rect(315, 0, 680 * kw, 205); g.clip(); g.font = '800 196px Stencil'; g.textAlign = 'left'; g.fillStyle = W;
    g.letterSpacing = '6px'; const fit = 670 / g.measureText('GREY BULL').width; g.translate(318, 182); g.scale(fit, 1); g.fillText('GREY BULL', 0, 0); g.restore(); }
  const kr = eOut(k(1.3, 1.8));
  if (kr > 0) { g.save(); g.globalAlpha = kr; g.font = `700 64px ${UI}`; g.textAlign = 'center'; g.fillStyle = W; g.letterSpacing = `${18 + 12 * kr}px`; g.fillText('RESCUE', 655, 255); g.restore(); }
}
function drawLogo(ctx, x, y, h, t) { ctx.save(); ctx.translate(x, y); ctx.scale(h / 260, h / 260); logoArt(ctx, t); ctx.restore(); }

// ---------------------------------------------------------------- scenes
// A kinetic super over a left scrim, in at u0, out at exitU.
function superOver(ctx, u, u0, exitU, lines) {
  const k = clamp(springU(u, u0 - 0.1, SPRING.gentle)) * (1 - E.inCubic(prog(u, exitU + 0.1, exitU + 0.6)));
  if (k > 0) { ctx.globalAlpha = k; scrim(ctx, 'left', 0.9); ctx.globalAlpha = 1; }
  lines.forEach(([words, base, size]) => superLine(ctx, words, 120, base, size, u, exitU));
}
// Act 1: Olivia receives the call                                       b0-7.4
function sceneCall(ctx, u, IMG) {
  if (u < 2) {
    const punch = E.inExpo(prog(u, 1.6, 2));
    const pulse = 1 + 0.012 * Math.sin(u * Math.PI * 2 * 1.6) * (u < 1.6 ? 1 : 0);
    plate(ctx, IMG.ops_call, logZoom(1.15, 1.3, prog(u, 0, 1.6)) * logZoom(1, 3.2, punch) * pulse, 960, lerp(600, 732, punch));
    if (u >= 1.6) { ctx.fillStyle = `rgba(92,214,138,${0.35 * Math.exp(-(u - 1.6) * 4)})`; ctx.fillRect(0, 0, W, H); }
    return;
  }
  // Olivia on the ops floor, then the camera drifts down to Sarah's line in the dialogue box
  const p = E.inOutSine(prog(u, 2, 7.4));
  plate(ctx, IMG.ops_sarah, logZoom(1.7, 1.3, p), lerp(960, 900, p), lerp(560, 820, p));
  flash(ctx, u, 2, 6, 0.25);
  superOver(ctx, u, 2.3, 6.8, [[[['OLIVIA', 2.3, true]], 300, 150], [[['RECEIVES', 2.6], ['THE', 2.72], ['CALL.', 2.84]], 450, 120]]);
}
// Act 2: Bryan gives the order                                          b7.4-13
function sceneOrder(ctx, u, IMG) {
  // Bryan's own line ("You in, operator?") is the one on screen: hold on him, then push to I'M IN
  const settle = E.inOutCubic(prog(u, 10.2, 11));
  const dx = (1 - E.outCubic(prog(u, 7.4, 8))) * 220;
  if (u < 11) {
    const z = lerp(logZoom(1.45, 1.6, prog(u, 7.4, 10.2)), 1.2, settle);
    plate(ctx, IMG.ops_choice, z, lerp(1240, 1060, settle), lerp(640, 700, settle), dx);
    superOver(ctx, u, 7.8, 10.1, [[[['BRYAN', 7.8, true]], 300, 150], [[['GIVES', 8.1], ['THE', 8.22], ['ORDER.', 8.34]], 450, 120]]);
    return;
  }
  const p = prog(u, 11, 13);
  const z = logZoom(1.2, 1.8, E.inQuad(p));
  plate(ctx, IMG.ops_choice, z, 1060, 700);
  ctx.save(); zoomAbout(ctx, z, 1060, 700);
  if (u >= 12.75) {
    const r = prog(u, 12.75, 13.3);
    ctx.strokeStyle = `rgba(246,162,60,${1 - r})`; ctx.lineWidth = 10 * (1 - r) + 2;
    rrect(ctx, 560 - r * 40, 652 - r * 40, 380 + r * 80, 104 + r * 80, 22 + r * 20); ctx.stroke();
    ctx.fillStyle = 'rgba(0,0,0,0.3)'; rrect(ctx, 560, 652, 380, 104, 18); ctx.fill();
  }
  ctx.restore();
  const v = E.inCubic(prog(u, 11, 13));
  if (v > 0) { const g = ctx.createRadialGradient(W / 2, H * 0.62, H * (0.9 - v * 0.6), W / 2, H * 0.62, H * 1.2); g.addColorStop(0, 'rgba(0,0,0,0)'); g.addColorStop(1, `rgba(0,0,0,${0.85 * v})`); ctx.fillStyle = g; ctx.fillRect(0, 0, W, H); }
}
// Act 3: you deploy as an operator                                     b13-16.3
function sceneDeploy(ctx, u, IMG) {
  const f = (u - 13) / 3.3 * 53;
  ctx.save(); M.shake(ctx, u, 13, 22, 7, 0.3);
  plate(ctx, clipFrame(IMG, 'liftoff', f), logZoom(1.45, 1.25, E.outCubic(prog(u, 13, 16.3))), 640, 560);
  ctx.restore();
  ctx.globalAlpha = clamp(springU(u, 13, SPRING.snappy)); scrim(ctx, 'bottom', 0.85); ctx.globalAlpha = 1;
  const s = M.FORMAT.safe;
  superLine(ctx, [['YOU', 13.05], ['DEPLOY', 13.2]], s.x, H - s.y - 200, 200, u, 15.9);
  superLine(ctx, [['AS', 13.6, true], ['AN', 13.7, true], ['OPERATOR.', 13.8, true]], s.x, H - s.y - 70, 110, u, 15.95);
  flash(ctx, u, 13, 4.5, 0.95);
}
function sceneTitle(ctx, u, IMG) {                                     // b16.3-19.5
  const f = (u - 16.3) / 3.2 * 35;
  plate(ctx, clipFrame(IMG, 'flight', f), logZoom(1.14, 1.04, prog(u, 16.3, 19.5)), 700, 420);
  ctx.globalAlpha = clamp(springU(u, 16.3, SPRING.snappy)); scrim(ctx, 'bottom', 0.8); ctx.globalAlpha = 1;
  const s = M.FORMAT.safe, exitU = 18.9;
  [['OPERATION', 16.35, C.accent, 150], ['HURRICANE', 16.5, C.white, 230]].forEach(([w, u0, col, size], i) => {
    const fnt = font(size, 800, DISPLAY), L = layout(ctx, w, fnt, size * 0.012);
    const base = H - s.y - 70 - (i === 0 ? 210 : 0);
    L.glyphs.forEach((g, j) => {
      const k = springU(u, u0 + j * 0.03, SPRING.bouncy);
      if (k <= 0) return;
      const out = E.inBack(prog(u, exitU + j * 0.02, exitU + 0.45 + j * 0.02), 1.3);
      glyph(ctx, g.ch, s.x + g.cx - out * (W * 0.9), base + (1 - k) * 180, fnt, col, 1, clamp(k, 0, 1.2));
    });
  });
}
function whipPair(ctx, u, u0, drawA, drawB) {                           // pan with both shots on screen
  const p = E.inOutCubic(prog(u, u0 - 0.3, u0 + 0.3));
  ctx.save(); ctx.translate(-p * W, 0); drawA(ctx); ctx.restore();
  ctx.save(); ctx.translate((1 - p) * W, 0); drawB(ctx); ctx.restore();
}
function spotted(ctx, u, IMG) { plate(ctx, IMG.fly_spotted, logZoom(1.15, 1.45, prog(u, 19.2, 21.3)), 1400, 600); }
// the basket: approach, lower, Tom climbs in, winch up, JACKPOT on b24.5   b21-28
function hoistFrame(u) {
  if (u < 24.5) return (u - 21) / 3.5 * 37;
  return 37 + (u - 24.5) / 3.5 * 23;
}
function sceneHoist(ctx, u, IMG) {
  const zIn = E.inOutCubic(prog(u, 24.2, 25));
  const z = lerp(logZoom(1.55, 1.75, prog(u, 21, 24.2)), 1.18, zIn);
  plate(ctx, clipFrame(IMG, 'hoist2', hoistFrame(u)), z, lerp(1440, 1000, zIn), lerp(640, 520, zIn));
  superOver(ctx, u, 21.4, 23.9, [[[['LOWER', 21.4], ['THE', 21.52], ['BASKET.', 21.64, true]], 300, 130]]);
}
function sceneSurge(ctx, u, IMG) {                                      // b28-31
  const f = (u - 28) / 3 * 35;
  ctx.save(); M.shake(ctx, u, 28, 14, 5, 0.3);
  plate(ctx, clipFrame(IMG, 'surge', f), logZoom(1.6, 1.9, E.inOutSine(prog(u, 28, 31))), 1140, 760);
  ctx.restore();
  superOver(ctx, u, 28.3, 30.5, [[[['BEAT', 28.3], ['THE', 28.42], ['WATER.', 28.54, true]], 300, 130]]);
}
function sceneHome(ctx, u, IMG) {                                       // b31-36.5
  const f = (u - 31) / 5.5 * 95;
  const p = E.inOutSine(prog(u, 31, 36.5));
  plate(ctx, clipFrame(IMG, 'landing', f), logZoom(1.5, 1.22, p), lerp(1300, 820, p), lerp(560, 520, p));
  superOver(ctx, u, 31.3, 33.9, [[[['BRING', 31.3], ['THEM', 31.42], ['HOME.', 31.54, true]], 300, 130]]);
}
function sceneDebrief(ctx, u, IMG) {                                    // b36.5-40.5
  const p = E.inOutSine(prog(u, 36.5, 40.5));
  const z = logZoom(1.05, 1.4, p);
  const dy = (1 - E.outCubic(prog(u, 36.5, 37.1))) * 160;
  ctx.save(); ctx.translate(0, dy); plate(ctx, IMG.debrief, z, lerp(1300, 1400, p), lerp(380, 320, p)); ctx.restore();
}
function sceneLive(ctx, u, IMG) {                                       // b40.5-45: the helo flies on through the storm
  const p = prog(u, 40.5, 45);
  plate(ctx, clipFrame(IMG, 'flight', p * 35), logZoom(1.25, 1.45, p), 700, 380);
  flash(ctx, u, 40.5, 5, 0.35);
  const k = clamp(springU(u, 40.5, SPRING.gentle));
  ctx.globalAlpha = k; scrim(ctx, 'bottom', 0.9); ctx.globalAlpha = 1;
  const s = M.FORMAT.safe;
  superLine(ctx, [['LIVE', 40.6], ['THE', 40.75], ['MISSION.', 40.9, true]], s.x, H - s.y - 60, 230, u, 44.4);
  const out = E.inCubic(prog(u, 44.6, 45));
  if (out > 0) { ctx.fillStyle = `rgba(7,12,18,${out})`; ctx.fillRect(0, H * (1 - out), W, H * out); }
}
function sceneEnd(ctx, u, IMG) {                                        // b45-50
  fill(ctx, C.ink);
  const glowG = ctx.createRadialGradient(W * 0.22, H * 0.55, 0, W * 0.22, H * 0.55, W * 0.6);
  glowG.addColorStop(0, 'rgba(246,162,60,0.10)'); glowG.addColorStop(1, 'rgba(246,162,60,0)');
  ctx.fillStyle = glowG; ctx.fillRect(0, 0, W, H);
  const s = M.FORMAT.safe, x = s.x + 24, u0 = 45.4;
  drawLogo(ctx, W - s.x - 440, 110, 116, (u - u0 + 0.2) * 0.6 * 1.4);
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
  if (t2 > 0) text(ctx, 'Fly as a Grey Bull Rescue operator · a mission concept', x + 6, 712 + (1 - t2) * 30, font(44, 500, UI), `rgba(169,182,195,${t2})`);
  const k3 = springU(u, u0 + 0.55, SPRING.snappy);
  if (k3 > 0) {
    ctx.save(); ctx.translate(x, 780); ctx.scale(clamp(k3, 0, 1.05), clamp(k3, 0, 1.05));
    rrect(ctx, 0, 0, 560, 96, 6); ctx.fillStyle = C.red; ctx.fill();
    text(ctx, 'FUND THE NEXT RESCUE', 280, 64, font(60, 800, DISPLAY), C.white, 'center', 1);
    ctx.restore();
  }
  // the Triad: the team (who), Americans in trouble (why), the funding (how) -- the last one is the viewer
  [['THE TEAM', '#D7282F'], ['AMERICANS IN TROUBLE', '#F2D21B'], ['THE FUNDING: YOU', '#8CC63F']].reduce((tx, [w, col], i) => {
    const k = E.outQuint(prog(u, u0 + 0.9 + i * 0.25, u0 + 1.4 + i * 0.25));
    const f = font(46, 800, DISPLAY), L = layout(ctx, w, f, 46 * 0.04);
    if (k > 0) {
      ctx.globalAlpha = k; ctx.fillStyle = col; ctx.fillRect(tx, 922, 7, 56);
      text(ctx, w, tx + 22, 968 + (1 - k) * 16, f, i === 2 ? col : C.white, 'left', 1); ctx.globalAlpha = 1;
    }
    return tx + L.width + 76;
  }, x);
  const t4 = E.outQuint(prog(u, u0 + 0.75, u0 + 1.2));
  if (t4 > 0) {
    text(ctx, 'greybullrescue.org', x + 620, 845, font(46, 700, UI), `rgba(243,246,249,${t4})`);
    text(ctx, 'Concept prototype · not an official Grey Bull Rescue product · voices are synthesized', x + 4, H - s.y - 6, font(24, 500, UI), `rgba(120,134,148,${t4})`);
  }
}

// ---------------------------------------------------------------- film
let grainCv = null;
M.film({
  fonts: [font(100, 800, DISPLAY), font(40, 500, UI), font(40, 700, UI), '800 100px Stencil'],
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
    if (u < 7.1) sceneCall(ctx, u, IMG);
    else if (u < 7.7) whipPair(ctx, u, 7.4, (c) => sceneCall(c, u, IMG), (c) => sceneOrder(c, u, IMG));
    else if (u < 13) sceneOrder(ctx, u, IMG);
    else if (u < 16.3) sceneDeploy(ctx, u, IMG);
    else if (u < 19.2) sceneTitle(ctx, u, IMG);
    else if (u < 19.8) whipPair(ctx, u, 19.5, (c) => sceneTitle(c, u, IMG), (c) => spotted(c, u, IMG));
    else if (u < 21) spotted(ctx, u, IMG);
    else if (u < 28) sceneHoist(ctx, u, IMG);
    else if (u < 30.7) sceneSurge(ctx, u, IMG);
    else if (u < 31.3) whipPair(ctx, u, 31, (c) => sceneSurge(c, u, IMG), (c) => sceneHome(c, u, IMG));
    else if (u < 36.5) sceneHome(ctx, u, IMG);
    else if (u < 40.5) sceneDebrief(ctx, u, IMG);
    else if (u < 45) sceneLive(ctx, u, IMG);
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
