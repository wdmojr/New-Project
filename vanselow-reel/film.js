// Van Selow Design Build: site film. Pure function of time: window.seek(t) paints frame t.
// Timing is in beats (u, 120 bpm) on beats.json; docs/shotlist.md is the plan.
// All screen footage is live capture of vanselowdesign.com (capture/record.cjs -> assets/clips),
// played frame-exactly inside devices drawn in code. Photos are the client's own, from the site.
import * as M from './lib/motion.js';

const { W, H, FORMAT, E, prog, lerp, clamp, springU, SPRING, font, layout, glyph, fill } = M;

const C = {
  coal: '#121111', mute: '#a39d95', red: '#e2232f', white: '#ffffff', wdm: '#00c375',
};
const DISPLAY = 'Display', UI = 'UI';
const P = FORMAT.portrait;
const S = FORMAT.safe;
const deg = Math.PI / 180;
const logLerp = (a, b, t) => a * (b / a) ** t;

const HITS = [
  [0, 'open: pool', 'sub', { len: 1.4 }],
  [6, 'cut: kitchen', 'click'],
  [7.5, 'cut: cellar', 'click'],
  [9, 'cut: beachfront', 'click'],
  [10, 'pull back into laptop', 'whoosh', { len: 1.2, from: 2200, to: 400 }],
  [15, 'every detail', 'tick'],
  [19, 'macro: logo', 'click'],
  [23, 'scroll: sticky header', 'whoosh', { len: 0.6, from: 600, to: 1800 }],
  [31, 'menu', 'thud'],
  [38, 'form', 'thud'],
  [45, 'map', 'thud'],
  [51.5, 'speed: devices', 'impact'],
  [56, 'craft: cellar', 'sub', { len: 1.2 }],
  [57, 'The same care.', 'tick'],
  [59.5, 'The same precision.', 'tick'],
  [63.5, 'end panel', 'whoosh', { len: 0.5 }],
  [64, 'WD Morgan logo', 'impact'],
  [67, 'url', 'bell', { pitch: 'F6' }],
];

// ---------------------------------------------------------------- live clips (frame sequences)
const CLIP = {
  scroll: { n: 180, w: 2160, h: 1350, k: 1.5 },
  menu: { n: 150, w: 2160, h: 1350, k: 1.5 },
  form: { n: 225, w: 2160, h: 1350, k: 1.5 },
  map: { n: 210, w: 2160, h: 1350, k: 1.5 },
  mobile: { n: 180, w: 975, h: 2110, k: 2.5 },
  logo: { n: 120, w: 2000, h: 1250, k: 4 },
};
const META = {};
const cache = new Map();
let DRY = null;   // during prepare(): collects the frames a draw would need
const key = (name, i) => `${name}/${String(i).padStart(4, '0')}`;
function frame(name, ct) {
  const c = CLIP[name];
  const i = clamp(Math.round(ct * 30), 0, c.n - 1);
  const k = key(name, i);
  if (DRY) { DRY.add(k); return null; }
  return cache.get(k) || null;
}
async function load(k) {
  if (cache.has(k)) { const v = cache.get(k); cache.delete(k); cache.set(k, v); return; }
  const im = new Image(); im.src = `assets/clips/${k}.jpg`;
  try { await im.decode(); } catch { console.error('missing frame', k); return; }
  cache.set(k, im);
  while (cache.size > 160) cache.delete(cache.keys().next().value);
}
const cursorAt = (name, ct) => {
  const m = META[name]; if (!m) return null;
  const i = clamp(Math.round(ct * 30), 0, m.length - 1);
  return m[i] && m[i].x != null ? m[i] : null;
};

// Screen texture: the clip frame plus the recorded cursor, so the cursor follows the perspective.
const TEX = document.createElement('canvas');
const tctx = TEX.getContext('2d');
function screenTex(name, ct, withCursor = true) {
  const im = frame(name, ct);
  if (!im) return null;
  const c = CLIP[name];
  if (TEX.width !== c.w || TEX.height !== c.h) { TEX.width = c.w; TEX.height = c.h; }
  tctx.drawImage(im, 0, 0);
  const cur = withCursor && cursorAt(name, ct);
  if (cur) drawCursor(tctx, cur.x * c.k, cur.y * c.k, c.k * 1.15, cur.down);
  return TEX;
}
function drawCursor(ctx, x, y, s, down) {
  ctx.save(); ctx.translate(x, y); ctx.scale(s * (down ? 0.88 : 1), s * (down ? 0.88 : 1));
  ctx.beginPath();
  ctx.moveTo(0, 0); ctx.lineTo(0, 17); ctx.lineTo(4, 13.2); ctx.lineTo(7, 19.6); ctx.lineTo(9.6, 18.5);
  ctx.lineTo(6.8, 12.3); ctx.lineTo(12, 12.3); ctx.closePath();
  ctx.shadowColor = 'rgba(0,0,0,0.35)'; ctx.shadowBlur = 4; ctx.shadowOffsetY = 1.5;
  ctx.fillStyle = '#111'; ctx.fill(); ctx.shadowColor = 'transparent';
  ctx.lineWidth = 1.4; ctx.strokeStyle = '#fff'; ctx.stroke();
  ctx.restore();
}

// ---------------------------------------------------------------- 3-D devices (canvas 2-D, true perspective)
// Object rotated by ry (yaw) then rx (pitch, positive looks down on it), perspective distance f.
function makeProj(cx, cy, ry, rx, f) {
  const cY = Math.cos(ry), sY = Math.sin(ry), cX = Math.cos(rx), sX = Math.sin(rx);
  return (x, y, z) => {
    const X = x * cY + z * sY, Z1 = -x * sY + z * cY;
    const Y = y * cX - Z1 * sX, Z = y * sX + Z1 * cX;
    const s = f / (f - Z);
    return [cx + X * s, cy + Y * s, Z];
  };
}
// Map an image rect onto a plane quad corner(u, v) with thin affine strips.
function texQuad(ctx, img, src, corner, N = 48) {
  const [sx, sy, sw, sh] = src;
  for (let i = 0; i < N; i++) {
    const u0 = i / N, u1 = (i + 1) / N;
    const a = corner(u0, 0), b = corner(u1, 0), c = corner(u0, 1), d = corner(u1, 1);
    const cx = (c[0] + d[0] - (b[0] - a[0])) / 2, cy = (c[1] + d[1] - (b[1] - a[1])) / 2;
    ctx.save();
    ctx.transform(b[0] - a[0], b[1] - a[1], cx - a[0], cy - a[1], a[0], a[1]);
    // overlap each strip by ~2 px (in source and destination alike) so no seam shows between them
    const ov = Math.min(0.5, 2 / Math.max(1, Math.hypot(b[0] - a[0], b[1] - a[1])));
    const ws = Math.min(sw / N * (1 + ov), sx + sw - (sx + sw * u0));
    ctx.drawImage(img, sx + sw * u0, sy, ws, sh, 0, 0, ws / (sw / N), 1);
    ctx.restore();
  }
}
function pathPts(ctx, pts) { ctx.beginPath(); pts.forEach(([x, y], i) => (i ? ctx.lineTo(x, y) : ctx.moveTo(x, y))); ctx.closePath(); }
function roundRectPts(w, h, r, seg = 6) {
  const pts = [];
  const arc = (cx, cy, a0) => { for (let i = 0; i <= seg; i++) { const a = a0 + (i / seg) * Math.PI / 2; pts.push([cx + Math.cos(a) * r, cy + Math.sin(a) * r]); } };
  arc(w - r, r, -Math.PI / 2); arc(w - r, h - r, 0); arc(r, h - r, Math.PI / 2); arc(r, r, Math.PI);
  return pts;
}

// Laptop. (cx, cy) = hinge centre; w = display width (16:10 panel).
function laptop(ctx, tex, { cx, cy, w, ry = 0, rx = 0.12, src }) {
  const pr = makeProj(cx, cy, ry, rx, w * 2.6);
  const bw = w * 1.045, bh = bw / 1.55;
  const dw = w, dh = w / 1.6;
  const lx = -bw / 2, ly = -bh;
  // base slab lies flat toward the viewer
  const D = bw * 0.66, T = bw * 0.018, BW = bw * 0.98;
  const quad = (pts) => pts.map(([x, y, z]) => pr(x, y, z));
  const base = quad([[-BW / 2, 0, 0], [BW / 2, 0, 0], [BW / 2, 0, D], [-BW / 2, 0, D]]);
  const lip = quad([[-BW / 2, 0, D], [BW / 2, 0, D], [BW / 2, T, D], [-BW / 2, T, D]]);
  // floor shadow
  ctx.save();
  const sc = pr(0, T, D * 0.5);
  ctx.translate(sc[0], sc[1] + w * 0.03); ctx.scale(1, 0.14);
  const g = ctx.createRadialGradient(0, 0, 0, 0, 0, w * 0.75);
  g.addColorStop(0, 'rgba(0,0,0,0.65)'); g.addColorStop(1, 'rgba(0,0,0,0)');
  ctx.fillStyle = g; ctx.beginPath(); ctx.arc(0, 0, w * 0.75, 0, M.TAU); ctx.fill();
  ctx.restore();
  if (rx > 0.02) {
    pathPts(ctx, base);
    const bg = ctx.createLinearGradient(0, base[0][1], 0, base[2][1]);
    bg.addColorStop(0, '#55575b'); bg.addColorStop(1, '#a2a4a8');
    ctx.fillStyle = bg; ctx.fill();
    pathPts(ctx, quad([[-bw * 0.43, 0, D * 0.08], [bw * 0.43, 0, D * 0.08], [bw * 0.43, 0, D * 0.46], [-bw * 0.43, 0, D * 0.46]]));
    ctx.fillStyle = 'rgba(10,10,12,0.55)'; ctx.fill();
    pathPts(ctx, quad([[-bw * 0.2, 0, D * 0.55], [bw * 0.2, 0, D * 0.55], [bw * 0.2, 0, D * 0.93], [-bw * 0.2, 0, D * 0.93]]));
    ctx.fillStyle = 'rgba(255,255,255,0.10)'; ctx.fill();
  }
  pathPts(ctx, lip); ctx.fillStyle = '#3a3b3e'; ctx.fill();
  // lid: tilted back a little about the hinge
  const lean = 0.06, cl = Math.cos(lean), sl = Math.sin(lean);
  const lid = (x, y) => pr(x, y * cl, y * sl);
  pathPts(ctx, roundRectPts(bw, bh, bw * 0.03).map(([x, y]) => lid(lx + x, ly + y)));
  ctx.fillStyle = '#0b0b0c'; ctx.fill();
  ctx.lineWidth = Math.max(1, w * 0.0025); ctx.strokeStyle = '#4a4b4f'; ctx.stroke();
  const ox = -dw / 2, oy = -bh + (bh - dh) * 0.42;
  if (tex) {
    ctx.save();
    pathPts(ctx, roundRectPts(dw, dh, dw * 0.008).map(([x, y]) => lid(ox + x, oy + y))); ctx.clip();
    texQuad(ctx, tex, src || [0, 0, tex.width, tex.height], (u, v) => lid(ox + u * dw, oy + v * dh));
    const a = lid(ox, oy), b = lid(ox + dw, oy + dh);
    const sh = ctx.createLinearGradient(a[0], a[1], b[0], b[1]);
    sh.addColorStop(0, 'rgba(255,255,255,0.08)'); sh.addColorStop(0.4, 'rgba(255,255,255,0)');
    ctx.fillStyle = sh; ctx.fillRect(Math.min(a[0], b[0]) - 60, Math.min(a[1], b[1]) - 60, Math.abs(b[0] - a[0]) + 120, Math.abs(b[1] - a[1]) + 120);
    ctx.restore();
  }
  // camera notch
  pathPts(ctx, [[-bw * 0.045, -bh], [bw * 0.045, -bh], [bw * 0.045, oy + w * 0.004], [-bw * 0.045, oy + w * 0.004]].map(([x, y]) => lid(x, y)));
  ctx.fillStyle = '#0b0b0c'; ctx.fill();
}

// Phone. (x, y) top-left, w width.
function phone(ctx, tex, { x, y, w, ry = 0, src }) {
  const h = w * 2.06, r = w * 0.16, bz = w * 0.035;
  const pr = makeProj(x + w / 2, y + h / 2, ry, 0, w * 6);
  const p2 = (px, py) => pr(px - w / 2, py - h / 2, 0);
  const body = roundRectPts(w, h, r).map(([a, b]) => p2(a, b));
  ctx.save();
  ctx.shadowColor = 'rgba(0,0,0,0.55)'; ctx.shadowBlur = w * 0.2; ctx.shadowOffsetY = w * 0.06;
  pathPts(ctx, body); ctx.fillStyle = '#1a1a1c'; ctx.fill();
  ctx.restore();
  pathPts(ctx, body); ctx.lineWidth = Math.max(1.5, w * 0.012); ctx.strokeStyle = '#6d6e72'; ctx.stroke();
  const sw = w - 2 * bz, shh = h - 2 * bz;
  if (tex) {
    ctx.save();
    pathPts(ctx, roundRectPts(sw, shh, r - bz).map(([a, b]) => p2(bz + a, bz + b))); ctx.clip();
    texQuad(ctx, tex, src || [0, 0, tex.width, Math.min(tex.height, tex.width * shh / sw)], (u, v) => p2(bz + u * sw, bz + v * shh), 24);
    ctx.restore();
  }
  pathPts(ctx, roundRectPts(w * 0.3, w * 0.085, w * 0.0425).map(([a, b]) => p2(w * 0.35 + a, bz + w * 0.03 + b)));
  ctx.fillStyle = '#000'; ctx.fill();
}

// ---------------------------------------------------------------- type
function riseLine(ctx, u, u0, str, x, y, f, color, { track = 0, align = 'left', out = 1e9, stagger = 0.02 } = {}) {
  const L = layout(ctx, str, f, track);
  const x0 = align === 'left' ? x : align === 'right' ? x - L.width : x - L.width / 2;
  const hgt = L.asc + L.desc + 8;
  ctx.save(); ctx.beginPath(); ctx.rect(x0 - 40, y - L.asc - 8, L.width + 80, hgt + 6); ctx.clip();
  L.glyphs.forEach((g, j) => {
    if (u < u0 + j * stagger) return;
    const k = springU(u, u0 + j * stagger, SPRING.gentle);
    const ex = E.inCubic(prog(u, out + j * 0.008, out + 0.4 + j * 0.008));
    glyph(ctx, g.ch, x0 + g.cx, y + (1 - k) * hgt * 1.1 - ex * hgt * 1.1, f, color);
  });
  ctx.restore();
  return L;
}
function superBlock(ctx, u, u0, eyebrow, lines, x, y, o = {}) {
  const size = o.size || FORMAT.pick({ '16x9': 104, '9x16': 100 });
  const eb = FORMAT.pick({ '16x9': 26, '9x16': 30 });
  const align = o.align || 'left';
  const out = o.out ?? 1e9;
  if (eyebrow) riseLine(ctx, u, u0, eyebrow, x, y, font(eb, 600, UI), o.accent || C.red, { track: eb * 0.3, out, stagger: 0.006, align });
  lines.forEach((ln, i) => riseLine(ctx, u, u0 + 0.2 + i * 0.22, ln, x, y + (eyebrow ? eb * 0.7 : -size * 0.9) + size * (1.08 + i * 1.04),
    font(size, 400, DISPLAY), o.color || C.white, { out: out + i * 0.05, align }));
}
function scrim(ctx, from = 0.5, a = 0.85) {
  const g = ctx.createLinearGradient(0, H * from, 0, H);
  g.addColorStop(0, 'rgba(12,11,11,0)'); g.addColorStop(1, `rgba(12,11,11,${a})`);
  ctx.fillStyle = g; ctx.fillRect(0, H * from, W, H * (1 - from));
}
const TS = (u) => M.TS(u);

// ---------------------------------------------------------------- A. their work   (u 0..10)
const PH = [[0, 'pPool', 0.5, 0.62], [6, 'pKitchen', 0.45, 0.5], [7.5, 'pCellar', 0.5, 0.45], [9, 'pBeach', 0.45, 0.5]];
function photoAt(ctx, u, IMG, list) {
  let cur = list[0], nxt = null;
  list.forEach((p, i) => { if (u >= p[0]) { cur = p; nxt = list[i + 1]; } });
  const end = nxt ? nxt[0] : cur[0] + 4;
  M.cover(ctx, IMG[cur[1]], 0, 0, W, H, { fx: cur[2], fy: cur[3], zoom: logLerp(1.0, 1.1, prog(u, cur[0] - 0.5, end + 0.5)) });
}
function sceneWork(ctx, u, IMG) {
  photoAt(ctx, u, IMG, PH);
  if (u < 6) {
    scrim(ctx, 0.45, 0.8);
    superBlock(ctx, u, 0.6, '', ['Your work is', 'world class.'], S.x, P ? H * 0.62 : H - 300, { size: FORMAT.pick({ '16x9': 128, '9x16': 118 }), out: 5.4 });
  }
}

// ---------------------------------------------------------------- B. the website, pulled back into a laptop   (u 10..19)
function sceneSite(ctx, u) {
  fill(ctx, C.coal);
  const tex = screenTex('scroll', (TS(u) - TS(10)) * 0.2, false);   // hero at rest, logo shimmer running
  const pb = E.inOutCubic(prog(u, 10, 12.4));
  const orbit = lerp(-14, 12, E.inOutSine(prog(u, 11, 19))) * deg;
  const w = logLerp(W * 1.04, P ? 900 : 1060, pb);
  const cy = lerp(H * 0.5 + (w / 1.6) * 0.57, P ? H * 0.52 : H * 0.8, pb);
  const cx = lerp(W / 2, P ? W / 2 : W * 0.63, pb);
  laptop(ctx, tex, { cx, cy, w, ry: lerp(0, orbit, pb), rx: lerp(0, 0.12, pb) });
  const ty = P ? H * 0.1 : H * 0.34;
  if (u < 15) superBlock(ctx, u, 11.9, '', P ? ['Your website', 'should be too.'] : ['Your website', 'should be too.'], S.x, ty,
    { size: FORMAT.pick({ '16x9': 84, '9x16': 92 }), out: 14.4 });
  else superBlock(ctx, u, 15.2, 'VAN SELOW DESIGN BUILD', ['Every detail,', 'considered.'], S.x, ty,
    { size: FORMAT.pick({ '16x9': 84, '9x16': 96 }), out: 18.5 });
}

// ---------------------------------------------------------------- C. macro on the logo, then the scroll   (u 19..31)
function sceneLogoScroll(ctx, u) {
  fill(ctx, C.coal);
  if (u < 23) {
    // macro: the header logo filling the frame, crimson shimmer moving (page at rest)
    const tex = frame('logo', (TS(u) - TS(19)) * 1.4);
    if (!tex) return;
    const z = logLerp(1, 1.15, prog(u, 19, 23));
    const lw = (P ? 640 : 1500) / z, lh = lw * H / W;
    M.crop(ctx, tex, [1000 - lw / 2, 470 - lh / 2, lw, lh], 0, 0, W, H);
    const v = ctx.createRadialGradient(W / 2, H / 2, H * 0.3, W / 2, H / 2, H * 0.95);
    v.addColorStop(0, 'rgba(0,0,0,0)'); v.addColorStop(1, 'rgba(0,0,0,0.5)');
    ctx.fillStyle = v; ctx.fillRect(0, 0, W, H);
    superBlock(ctx, u, 19.6, 'SIGNATURE LOGO', [], S.x, P ? H * 0.86 : H - 90, { out: 22.6 });
    return;
  }
  // the scroll: big logo hands off to the slim sticky bar; camera starts close on the header, pulls out
  const tex = screenTex('scroll', 0.7 + (TS(u) - TS(23)) * 1.15, false);
  const k = E.inOutCubic(prog(u, 23.5, 28));
  const w = logLerp(P ? 2400 : 2700, P ? 980 : 1060, k);
  const cy = lerp(H * 0.5 + (w / 1.6) * 0.86, P ? H * 0.6 : H * 0.8, k);
  laptop(ctx, tex, { cx: lerp(W / 2, P ? W / 2 : W * 0.63, k), cy, w, ry: lerp(0, -10 * deg, k), rx: lerp(0, 0.1, k) });
  superBlock(ctx, u, 26, 'STICKY HEADER', ['The logo glides', 'into a slim bar.'], S.x, P ? H * 0.74 : H * 0.36,
    { size: FORMAT.pick({ '16x9': 76, '9x16': 84 }), out: 30.5 });
}

// ---------------------------------------------------------------- D/E/F. menu, form, map   (u 31..51.5)
function sceneClip(ctx, u, name, u0, u1, ct0, ct1, focus, eyebrow, lines, side) {
  fill(ctx, C.coal);
  const tex = screenTex(name, lerp(ct0, ct1, prog(u, u0, u1)), true);
  const t = E.inOutSine(prog(u, u0, u1));
  const enter = springU(u, u0, SPRING.gentle);
  const w = (P ? 940 : 1060) * logLerp(1, P ? 1.12 : 1.1, t);
  const dir = side === 'left' ? 1 : -1;
  const ry = -dir * lerp(16, 9, t) * deg * (P ? 0.4 : 1);
  const cx = (P ? W / 2 : W / 2 + dir * 250) - (focus[0] - 0.5) * w * (P ? 0.3 : 0.12) * t + (1 - enter) * dir * 120;
  const cy = (P ? H * 0.6 : H * 0.8) - (focus[1] - 0.5) * (w / 1.6) * 0.2 * t;
  laptop(ctx, tex, { cx, cy, w, ry, rx: 0.1, src: name === 'map' ? [300, 115, 1560, 975] : undefined });
  const al = P ? 'left' : side === 'left' ? 'left' : 'right';
  superBlock(ctx, u, u0 + 0.4, eyebrow, lines, P ? S.x : al === 'left' ? S.x : W - S.x, P ? H * 0.72 : H * 0.36,
    { size: FORMAT.pick({ '16x9': 76, '9x16': 88 }), out: u1 - 0.6, align: al });
}

// ---------------------------------------------------------------- G. speed: laptop + phone   (u 51.5..56)
function sceneSpeed(ctx, u) {
  fill(ctx, C.coal);
  const k1 = springU(u, 51.2, SPRING.gentle), k2 = springU(u, 51.7, SPRING.gentle);
  const lt = screenTex('scroll', 5.9, false);
  laptop(ctx, lt, P ? { cx: W * 0.44, cy: H * 0.5 + (1 - k1) * 300, w: 860, ry: 12 * deg, rx: 0.1 }
    : { cx: W * 0.42 - (1 - k1) * 300, cy: H * 0.86, w: 1000, ry: 14 * deg, rx: 0.1 });
  const pw = P ? 400 : 340;
  phone(ctx, screenTex2('mobile', 0.3 + (TS(u) - TS(51.5)) * 1.6), { x: P ? W * 0.55 : W * 0.66, y: (P ? H * 0.3 : H * 0.17) + (1 - k2) * H * 0.8, w: pw, ry: -10 * deg });
  superBlock(ctx, u, 51.9, 'PERFORMANCE', ['Built for speed.'], S.x, P ? H * 0.74 : 70,
    { size: FORMAT.pick({ '16x9': 88, '9x16': 100 }), out: 55.5 });
}
// a second texture so the phone and laptop can show different clips in one frame
const TEX2 = document.createElement('canvas');
function screenTex2(name, ct) {
  const im = frame(name, ct); if (!im) return null;
  if (TEX2.width !== im.width) { TEX2.width = im.width; TEX2.height = im.height; }
  TEX2.getContext('2d').drawImage(im, 0, 0);
  return TEX2;
}

// ---------------------------------------------------------------- H. care and precision   (u 56..63.5)
const CRAFT = [[56, 'pCellar', 0.5, 0.35], [60, 'pKitchen', 0.62, 0.42]];
function sceneCraft(ctx, u, IMG) {
  photoAt(ctx, u, IMG, CRAFT);
  scrim(ctx, 0.3, 0.9);
  const y = P ? H * 0.56 : H * 0.5;
  const big = FORMAT.pick({ '16x9': 120, '9x16': 108 });
  superBlock(ctx, u, 57, '', ['The same care.'], S.x, y + 40, { size: big, out: 63.05 });
  superBlock(ctx, u, 59.5, '', ['The same precision.'], S.x, y + 40 + big * 1.08, { size: big, out: 63.1 });
}

// ---------------------------------------------------------------- I. end card   (u 63.5..76)
function sceneEnd(ctx, u, IMG) {
  const wp = E.inOutCubic(prog(u, 63.5, 64));
  if (wp < 1) sceneCraft(ctx, u, IMG);
  const top = H * (1 - wp);
  ctx.fillStyle = C.coal; ctx.fillRect(0, top, W, H - top);
  if (u < 63.9) return;
  ctx.save(); M.zoomAbout(ctx, logLerp(1, 1.035, prog(u, 64, 76)), P ? S.x : 160, H * 0.5);
  const lg = IMG.wdm, lw = FORMAT.pick({ '16x9': 700, '9x16': 820 }), lh = lw * lg.height / lg.width;
  const k = springU(u, 64, SPRING.gentle);
  const lx = P ? S.x : 160, ly = P ? H * 0.3 : 250;
  ctx.save(); ctx.globalAlpha = clamp(k * 1.4); ctx.drawImage(lg, lx, ly + (1 - k) * 50, lw, lh); ctx.restore();
  superBlock(ctx, u, 65, 'WEBSITES FOR LUXURY BRANDS', ['World-class websites', 'for world-class work.'], lx, ly + lh + FORMAT.pick({ '16x9': 110, '9x16': 130 }),
    { size: FORMAT.pick({ '16x9': 96, '9x16': 84 }), accent: C.wdm });
  const uy = ly + lh + FORMAT.pick({ '16x9': 430, '9x16': 470 });
  const L = riseLine(ctx, u, 66.8, 'wdmorgan.com', lx, uy, font(FORMAT.pick({ '16x9': 46, '9x16': 54 }), 500, UI), C.white);
  ctx.fillStyle = C.wdm; ctx.fillRect(lx, uy + 16, L.width * E.outCubic(prog(u, 67, 67.8)), 4);
  ctx.restore();
}

// ---------------------------------------------------------------- film
function draw(ctx, u, t, IMG) {
  if (u < 10) sceneWork(ctx, u, IMG);
  else if (u < 19) sceneSite(ctx, u);
  else if (u < 31) sceneLogoScroll(ctx, u);
  else if (u < 38) sceneClip(ctx, u, 'menu', 31, 38, 0.2, 5.0, [0.35, 0.3], 'MEGA MENU', P ? ['Their whole world,', 'one hover away.'] : ['Their whole', 'world, one', 'hover away.'], 'right');
  else if (u < 45) sceneClip(ctx, u, 'form', 38, 45, 1.3, 7.4, [0.6, 0.45], 'CUSTOM QUOTE FORM', ['Qualifies', 'every lead.'], 'left');
  else if (u < 51.5) sceneClip(ctx, u, 'map', 45, 51.5, 1.4, 7.0, [0.35, 0.6], 'INTERACTIVE MAP', P ? ['Every community', 'they serve.'] : ['Every', 'community', 'they serve.'], 'right');
  else if (u < 56) sceneSpeed(ctx, u);
  else if (u < 63.5) sceneCraft(ctx, u, IMG);
  else sceneEnd(ctx, u, IMG);
}

const dry = document.createElement('canvas').getContext('2d');
let IMGS = null;
M.film({
  fonts: [font(100, 400, DISPLAY), font(40, 500, UI), font(40, 600, UI), font(40, 400, UI)],
  images: {
    pPool: 'assets/photos/waterfront-pool-home-lounge-chairs-van-selow.jpg',
    pKitchen: 'assets/photos/dunedin-whole-home-remodel-kitchen-van-selow.jpg',
    pCellar: 'assets/photos/tierra-verde-image-6.jpg',
    pBeach: 'assets/photos/bellair-beach-luxury-outdoor-remodel-van-selow.jpg',
    wdm: 'assets/wdm-logo.png',
  },
  async init(ctx, IMG) {
    IMGS = IMG;
    await Promise.all(Object.keys(CLIP).map(async (n) => {
      try { const m = await fetch(`assets/clips/${n}/meta.json`).then((r) => r.json()); META[n] = m.meta; CLIP[n].n = m.frames; } catch { /* clip not recorded yet */ }
    }));
  },
  async prepare(times) {
    const need = new Set(); DRY = need;
    for (const t of times) { dry.save(); try { draw(dry, M.U(t), t, IMGS); } catch { /* dry pass */ } dry.restore(); }
    DRY = null;
    await Promise.all([...need].map(load));
  },
  samples: 8,
  hits: HITS,
  draw,
});
