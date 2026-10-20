// SEO Progress: pure function of time. window.seek(t) paints frame t (see lib/motion.js).
// Timing is in beats (u) on the measured grid; docs/shotlist.md is the plan this file follows.
import * as M from './lib/motion.js';

const { W, H, FORMAT, E, prog, lerp, clamp, springU, SPRING, wobble, shake, font, layout, glyph, text, fill, rrect, fitSize, mix, TAU } = M;

// Brand tokens: wdmorgan.com navy + green. Badge colours are Search Console's own.
const C = {
  navy: '#0b1a3a', panel: '#213c7a', line: '#2b4a92', green: '#00c375', white: '#ffffff', mute: '#b8c1ce',
  disc: '#fdf1bf', hex: '#e59c39', check: '#4caf50',
};
const DISPLAY = 'Display', UI = 'UI';

// The real milestones from the Search Console badges: [beat, clicks, date, day index from Sep 1].
const MS = [
  [8, 5, 'Sep 1', 0], [10, 10, 'Sep 13', 12], [11, 20, 'Sep 16', 15], [12, 30, 'Sep 17', 16],
  [12.5, 40, 'Sep 19', 18], [13, 50, 'Sep 20', 19], [13.5, 60, 'Sep 21', 20], [14, 90, 'Sep 22', 21],
  [15, 100, 'Sep 23', 22], [17, 120, 'Sep 24', 23], [18, 150, 'Sep 26', 25], [19, 180, 'Sep 29', 28],
  [20, 200, 'Sep 30', 29], [21, 250, 'Oct 2', 31], [22, 300, 'Oct 7', 36], [23, 350, 'Oct 12', 41],
  [24, 400, 'Oct 16', 45],
];
const BIG = new Set([100, 400]);
const NOTES = ['F5', 'G5', 'A5', 'C6', 'D6', 'F6', 'G6'];

const HITS = [
  [0, '5 lands', 'impact'],
  [1, 'arrow', 'whoosh', { len: 0.35, from: 800, to: 3000 }],
  [2, '400 lands', 'thud'],
  [2.5, 'subtitle', 'tick'],
  [4, 'screens rise', 'whoosh', { len: 0.5, from: 2400, to: 600 }],
  [4.5, 'in 45 days', 'pop', { pitch: 'C6' }],
  [8, 'riser end', 'riser', { len: 1.6 }],
  ...MS.map(([b, v], i) => (i === 0 ? [b, 'badge 5', 'impact']
    : BIG.has(v) ? [b, `badge ${v}`, 'thud'] : [b, `badge ${v}`, 'pop', { pitch: NOTES[(i - 1) % NOTES.length] }])),
  [15, '100 bell', 'bell', { pitch: 'C6' }],
  [24, '400 impact', 'impact'],
  [24.25, '400 bell', 'bell', { pitch: 'F6' }],
  [26, '80x', 'impact'],
  [28, 'cut to end', 'sub', { len: 0.6 }],
  [28.5, 'logo', 'bell', { pitch: 'F6' }],
  [29.5, 'url', 'pop', { pitch: 'C6' }],
];

const S = FORMAT.safe;
const CX = S.x + S.w / 2;

function bg(ctx) {
  fill(ctx, C.navy);
  // faint dot grid: texture so the navy isn't a flat slab
  ctx.fillStyle = 'rgba(255,255,255,0.05)';
  for (let y = 30; y < H; y += 60) for (let x = 30; x < W; x += 60) { ctx.beginPath(); ctx.arc(x, y, 2.2, 0, TAU); ctx.fill(); }
}

// ---------------------------------------------------------------- S1+S2 hook   (u 0..8)
const SHOTS = ['s1', 's2', 's3', 's4', 's5'];
function screenColumn(ctx, u, IMG) {
  const k = springU(u, 3.85, SPRING.gentle);
  if (k <= 0) return;
  const cw = S.w * 0.92, x0 = CX - cw / 2;
  const hs = SHOTS.map((n) => (IMG[n] ? IMG[n].height * cw / IMG[n].width : 0));
  const total = hs.reduce((a, b) => a + b, 0);
  // scroll from the oldest badge (5, bottom) up to the newest (400, top): content moves down
  const p = E.inOutCubic(prog(u, 4, 7.9));
  const viewTop = 900;
  const off = lerp(-(total - (H - viewTop)), 0, p);
  const y0 = viewTop + off + (1 - k) * 900;
  ctx.save();
  ctx.translate(CX, (viewTop + H) / 2); ctx.rotate(-0.06); ctx.translate(-CX, -(viewTop + H) / 2);
  rrect(ctx, x0, Math.max(y0, viewTop - 400), cw, H * 2, 36); ctx.clip();
  let y = y0;
  SHOTS.forEach((n, i) => { if (IMG[n]) ctx.drawImage(IMG[n], x0, y, cw, hs[i]); y += hs[i]; });
  ctx.restore();
  // navy falloff at the top edge so the type above stays clean
  const g = ctx.createLinearGradient(0, viewTop - 120, 0, viewTop + 140);
  g.addColorStop(0, C.navy); g.addColorStop(1, 'rgba(11,26,58,0)');
  ctx.fillStyle = g; ctx.fillRect(0, 0, W, viewTop + 140);
}

function sceneHook(ctx, u, IMG) {
  bg(ctx);
  screenColumn(ctx, u, IMG);
  const parts = [['5', C.white, 0], [' ', C.white, 0], ['→', C.green, 1], [' ', C.white, 0], ['4', C.green, 2], ['0', C.green, 2.08], ['0', C.green, 2.16]];
  const str = parts.map((p) => p[0]).join('');
  const size = fitSize(ctx, str, 800, DISPLAY, S.w, 330, -0.03);
  const f = font(size, 800, DISPLAY);
  const L = layout(ctx, str, f, -0.03 * size);
  // the line rises and shrinks a touch when the screens arrive at beat 4
  const lift = springU(u, 3.55, SPRING.snappy);
  const base = lerp(H * 0.5 + 60, S.y + 300, lift);
  const sc = lerp(1, 0.86, lift);
  ctx.save(); ctx.translate(S.x, base); ctx.scale(sc, sc);
  L.glyphs.forEach((g, i) => {
    const [ch, col, at] = parts[i];
    if (ch === ' ') return;
    const k = springU(u, at - (at === 0 ? 0.3 : 0.12), SPRING.bouncy);
    if (k <= 0) return;
    if (ch === '→') {   // the arrow whips in from the left
      // shoots out from behind the 5: clipped to its own cell so it never crosses the digit
      const kk = springU(u, at - 0.15, SPRING.snappy);
      ctx.save(); ctx.beginPath(); ctx.rect(g.x - size * 0.12, -size * 1.2, W, size * 1.6); ctx.clip();
      glyph(ctx, ch, g.cx - (1 - kk) * size * 0.9, 0, f, col, 1 + (1 - kk) * 0.6, 1);
      ctx.restore();
      return;
    }
    glyph(ctx, ch, g.cx, (1 - k) * -260, f, col, lerp(0.6, 1, k) * (1 + 0.08 * wobble(u - at, 2.4, 6)), lerp(1.5, 1, k) * (1 - 0.08 * wobble(u - at, 2.4, 6)));
  });
  ctx.restore();
  // kicker: carries frame 0, leaves when the screens rise
  const kk = springU(u, -0.3, SPRING.snappy), kx = E.inBack(prog(u, 3.6, 4));
  if (kk > 0 && kx < 1) {
    const f = font(46, 800, DISPLAY);
    ctx.font = f; const w = ctx.measureText('OUR SEO RESULTS').width + 60;
    ctx.save(); ctx.translate(S.x + w / 2, base - size - 40 - kx * 900); ctx.scale(kk, kk);
    rrect(ctx, -w / 2, -40, w, 80, 40); ctx.fillStyle = C.green; ctx.fill();
    text(ctx, 'OUR SEO RESULTS', 0, 16, f, C.navy, 'center');
    ctx.restore();
  }
  // subtitle
  const tp = springU(u, 2.4, SPRING.snappy);
  if (tp > 0) {
    ctx.save(); ctx.beginPath(); ctx.rect(0, base + 20, W, 120); ctx.clip();
    text(ctx, 'clicks from Google', S.x + 8, base + 95 + (1 - tp) * 90, font(60, 600, UI), C.white);
    ctx.restore();
  }
  // "in 45 days" lands at beat 4.5
  const dp = springU(u, 4.35, SPRING.bouncy);
  if (dp > 0) {
    const f2 = font(104, 800, DISPLAY);
    const y = base + 230;
    ctx.save(); ctx.translate(S.x + 8, y); ctx.rotate((1 - dp) * -0.2); ctx.scale(dp, dp);
    text(ctx, 'in ', 0, 0, f2, C.white);
    ctx.font = f2; const w = ctx.measureText('in ').width;
    // green highlight block behind "45 days"
    const hw = ctx.measureText('45 days').width;
    const hp = E.outCubic(prog(u, 4.6, 5.1));
    ctx.fillStyle = C.green; ctx.fillRect(w - 12, -84, (hw + 24) * hp, 104);
    text(ctx, '45 days', w, 0, f2, hp > 0.5 ? C.navy : C.white);
    ctx.restore();
  }
}

// ---------------------------------------------------------------- S3 badge climb   (u 8..28)
function msIndex(u) { let i = -1; MS.forEach((m, j) => { if (u >= m[0] - 0.12) i = j; }); return i; }

function hexPath(ctx, x, y, r, round) {
  ctx.beginPath();
  for (let i = 0; i < 6; i++) {
    const a0 = -Math.PI / 2 + (i * TAU) / 6, a1 = a0 + TAU / 6;
    const p0 = [x + r * Math.cos(a0), y + r * Math.sin(a0)], p1 = [x + r * Math.cos(a1), y + r * Math.sin(a1)];
    if (i === 0) ctx.moveTo((p0[0] + p1[0]) / 2, (p0[1] + p1[1]) / 2);
    const p2 = [x + r * Math.cos(a1 + TAU / 6), y + r * Math.sin(a1 + TAU / 6)];
    ctx.arcTo(p1[0], p1[1], (p1[0] + p2[0]) / 2, (p1[1] + p2[1]) / 2, round);
  }
  ctx.closePath();
}

function badge(ctx, u, cx, cy, R) {
  const i = msIndex(u);
  if (i < 0) return;
  const [mb, val] = MS[i];
  const prev = i > 0 ? MS[i - 1][1] : 0;
  const big = BIG.has(val);
  // stamp: squash on each milestone, bigger on 100/400
  const st = u - mb;
  const q = (big ? 0.14 : 0.07) * wobble(st, 2.2, 5);
  const enter = springU(u, 7.8, SPRING.bouncy);
  ctx.save(); ctx.translate(cx, cy); ctx.scale(enter * (1 + q), enter * (1 - q));
  // shockwave ring from the disc on each milestone
  const rp = prog(st, 0, 1.2);
  if (rp > 0 && rp < 1) {
    ctx.strokeStyle = big ? C.green : C.disc; ctx.globalAlpha = (1 - rp) * (big ? 0.9 : 0.5);
    ctx.lineWidth = (big ? 18 : 8) * (1 - rp);
    ctx.beginPath(); ctx.arc(0, 0, R * (1 + E.outCubic(rp) * (big ? 0.7 : 0.35)), 0, TAU); ctx.stroke();
    ctx.globalAlpha = 1;
  }
  ctx.fillStyle = C.disc; ctx.beginPath(); ctx.arc(0, 0, R, 0, TAU); ctx.fill();
  const hr = R * 0.7;
  hexPath(ctx, 0, 0, hr, hr * 0.12); ctx.fillStyle = C.hex; ctx.fill();
  // number rolls from the previous milestone
  const np = E.outCubic(prog(u, mb - 0.12, mb + 0.35));
  const shown = Math.round(lerp(prev, val, np));
  const nf = font(fitSize(ctx, '400', 800, DISPLAY, hr * 1.3, 240), 800, DISPLAY);
  ctx.font = nf; ctx.fillStyle = C.white; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
  ctx.fillText(String(shown), 0, hr * 0.06);
  ctx.textBaseline = 'alphabetic';
  // green check pops at the top-right of the disc
  const ck = springU(u, mb - 0.05, SPRING.bouncy);
  const ca = -Math.PI / 4, cr = R * 0.2;
  const ccx = Math.cos(ca) * R * 0.86, ccy = Math.sin(ca) * R * 0.86;
  ctx.save(); ctx.translate(ccx, ccy); ctx.scale(lerp(0.5, 1, ck), lerp(0.5, 1, ck));
  ctx.fillStyle = C.white; ctx.beginPath(); ctx.arc(0, 0, cr * 1.18, 0, TAU); ctx.fill();
  ctx.fillStyle = C.check; ctx.beginPath(); ctx.arc(0, 0, cr, 0, TAU); ctx.fill();
  ctx.strokeStyle = C.white; ctx.lineWidth = cr * 0.24; ctx.lineCap = 'round'; ctx.lineJoin = 'round';
  ctx.beginPath(); ctx.moveTo(-cr * 0.45, cr * 0.02); ctx.lineTo(-cr * 0.12, cr * 0.34); ctx.lineTo(cr * 0.48, -cr * 0.3); ctx.stroke();
  ctx.restore();
  ctx.restore();
}

function dateLine(ctx, u, y) {
  const i = msIndex(u);
  if (i < 0) return;
  const f = font(64, 600, UI);
  ctx.save(); ctx.beginPath(); ctx.rect(0, y - 70, W, 96); ctx.clip();
  const roll = E.outCubic(prog(u, MS[i][0] - 0.12, MS[i][0] + 0.2));
  if (i > 0 && roll < 1) text(ctx, `${MS[i - 1][2]}, 2026`, CX, y - roll * 140, f, C.mute, 'center');
  text(ctx, `${MS[i][2]}, 2026`, CX, y + (1 - roll) * 110, f, C.white, 'center');
  ctx.restore();
}

function chip(ctx, u, at, label, x, y) {
  const k = springU(u, at, SPRING.bouncy);
  if (k <= 0) return;
  const out = E.inBack(prog(u, at + 3, at + 3.4));
  if (out >= 1) return;
  const f = font(54, 800, DISPLAY);
  ctx.font = f; const w = ctx.measureText(label).width + 64;
  ctx.save(); ctx.translate(x, y); ctx.rotate(-0.08 * (1 - k) - 0.05); ctx.scale(k * (1 - out), k * (1 - out));
  rrect(ctx, -w / 2, -48, w, 96, 48); ctx.fillStyle = C.green; ctx.fill();
  text(ctx, label, 0, 20, f, C.navy, 'center');
  ctx.restore();
}

function chart(ctx, u, x, y, w, h) {
  const k = springU(u, 8.3, SPRING.gentle);
  const out = E.inBack(prog(u, 25.4, 26), 1.6);
  if (k <= 0 || out >= 1) return;
  ctx.save(); ctx.translate(0, (1 - k) * 600 + out * 900);
  const X = (d) => x + (d / 45) * w, Y = (v) => y + h - (v / 400) * h;
  // gridlines
  ctx.strokeStyle = 'rgba(255,255,255,0.12)'; ctx.lineWidth = 2;
  [100, 200, 300, 400].forEach((v) => {
    ctx.beginPath(); ctx.moveTo(x, Y(v)); ctx.lineTo(x + w, Y(v)); ctx.stroke();
    text(ctx, String(v), x + w + 14, Y(v) + 12, font(36, 600, UI), C.mute);
  });
  ctx.beginPath(); ctx.moveTo(x, y + h); ctx.lineTo(x + w, y + h); ctx.strokeStyle = 'rgba(255,255,255,0.35)'; ctx.stroke();
  text(ctx, 'Sep 1', x, y + h + 46, font(36, 600, UI), C.mute);
  text(ctx, 'Oct 16', x + w, y + h + 46, font(36, 600, UI), C.mute, 'right');
  // the line draws milestone to milestone, finishing each segment as its badge lands
  const pts = [];
  MS.forEach(([b, v, , d], i) => {
    if (i === 0) { if (u >= b - 0.3) pts.push([X(d), Y(v)]); return; }
    const [pb, pv, , pd] = MS[i - 1];
    const p = E.outCubic(prog(u, b - 0.45, b));
    if (p <= 0) return;
    pts.push([X(lerp(pd, d, p)), Y(lerp(pv, v, p))]);
  });
  if (pts.length) {
    const g = ctx.createLinearGradient(0, y, 0, y + h);
    g.addColorStop(0, 'rgba(0,195,117,0.45)'); g.addColorStop(1, 'rgba(0,195,117,0)');
    ctx.beginPath(); ctx.moveTo(pts[0][0], y + h); pts.forEach((p) => ctx.lineTo(p[0], p[1]));
    ctx.lineTo(pts[pts.length - 1][0], y + h); ctx.closePath(); ctx.fillStyle = g; ctx.fill();
    ctx.beginPath(); pts.forEach((p, i) => (i ? ctx.lineTo(p[0], p[1]) : ctx.moveTo(p[0], p[1])));
    ctx.strokeStyle = C.green; ctx.lineWidth = 8; ctx.lineJoin = 'round'; ctx.lineCap = 'round'; ctx.stroke();
    const [hx, hy] = pts[pts.length - 1];
    ctx.fillStyle = C.white; ctx.beginPath(); ctx.arc(hx, hy, 14, 0, TAU); ctx.fill();
    ctx.fillStyle = C.green; ctx.beginPath(); ctx.arc(hx, hy, 8, 0, TAU); ctx.fill();
  }
  ctx.restore();
}

function eighty(ctx, u, y) {
  const k = springU(u, 25.85, SPRING.bouncy);
  if (k <= 0) return;
  const f = font(300, 800, DISPLAY);
  ctx.save(); ctx.translate(CX, y); ctx.scale(lerp(0.3, 1, k), lerp(0.3, 1, k)); ctx.rotate((1 - k) * 0.15);
  text(ctx, '80×', 0, 0, f, C.green, 'center', -9);
  ctx.restore();
  const tp = springU(u, 26.4, SPRING.snappy);
  if (tp > 0) {
    ctx.save(); ctx.beginPath(); ctx.rect(0, y + 10, W, 110); ctx.clip();
    text(ctx, 'more clicks in 45 days', CX, y + 90 + (1 - tp) * 100, font(58, 600, UI), C.white, 'center');
    ctx.restore();
  }
}

function sceneClimb(ctx, u) {
  bg(ctx);
  ctx.save();
  if (u > 24 && u < 25.5) shake(ctx, u, 24, 18);
  else if (u > 15 && u < 16) shake(ctx, u, 15, 10);
  // slow push-in, log-space
  const z = 1 * (1.07 / 1) ** E.inOutSine(prog(u, 8, 28));
  M.zoomAbout(ctx, z, CX, 640);
  const lp = springU(u, 8.2, SPRING.snappy);
  if (lp > 0) {
    ctx.globalAlpha = 1;
    ctx.save(); ctx.beginPath(); ctx.rect(0, S.y - 20, W, 80); ctx.clip();
    text(ctx, 'GOOGLE SEARCH CLICKS · PAST 28 DAYS', CX, S.y + 44 + (1 - lp) * 70, font(42, 600, UI), C.mute, 'center', 3);
    ctx.restore();
  }
  badge(ctx, u, CX, 640, 290);
  dateLine(ctx, u, 1030);
  chip(ctx, u, 14.9, 'TRIPLE DIGITS', CX - 230, 380);
  chip(ctx, u, 23.9, 'NEW HIGH', CX - 250, 380);
  ctx.restore();
  chart(ctx, u, S.x + 10, 1150, S.w - 90, 290);
  eighty(ctx, u, 1390);
}

// ---------------------------------------------------------------- S4 end card   (u 28..)
function sceneEnd(ctx, u, IMG) {
  bg(ctx);
  const logo = IMG.logo;
  if (logo) {
    const lw = S.w, lh = lw * logo.height / logo.width;
    const lx = CX - lw / 2, ly = 700;
    const p = E.outQuint(prog(u, 27.8, 28.6));
    ctx.save(); ctx.beginPath(); ctx.rect(lx - 10, ly - 20, (lw + 20) * p, lh + 40); ctx.clip();
    ctx.drawImage(logo, lx + (1 - p) * -60, ly, lw, lh);
    ctx.restore();
    // green bar leads the wipe
    if (p > 0 && p < 0.97) { ctx.fillStyle = C.green; ctx.fillRect(lx - 10 + (lw + 20) * p - 8, ly - 20, 16, lh + 40); }
  }
  const tp = springU(u, 28.9, SPRING.snappy);
  if (tp > 0) {
    ctx.save(); ctx.beginPath(); ctx.rect(0, 900, W, 140); ctx.clip();
    text(ctx, 'St. Petersburg SEO', CX, 1010 + (1 - tp) * 130, font(88, 800, DISPLAY), C.white, 'center', -1);
    ctx.restore();
  }
  const up = springU(u, 29.4, SPRING.bouncy);
  if (up > 0) {
    ctx.save(); ctx.translate(CX, 1170); ctx.scale(up, up);
    text(ctx, 'wdmorgan.com', 0, 0, font(80, 600, UI), C.green, 'center');
    ctx.restore();
    const lp = E.outCubic(prog(u, 29.7, 30.4));
    ctx.font = font(80, 600, UI); const w = ctx.measureText('wdmorgan.com').width;
    ctx.fillStyle = C.green; ctx.fillRect(CX - w / 2, 1205, w * lp, 10);
  }
}

M.film({
  fonts: [font(100, 800, DISPLAY), font(40, 600, UI)],
  images: {
    s1: 'assets/shots/gsc_1_400.jpg', s2: 'assets/shots/gsc_2_350-200.jpg', s3: 'assets/shots/gsc_3_180-100.jpg',
    s4: 'assets/shots/gsc_4_90-40.jpg', s5: 'assets/shots/gsc_5_30-5.jpg', logo: 'assets/logo.png',
  },
  hits: HITS,
  draw(ctx, u, t, IMG) {
    if (u < 8) { sceneHook(ctx, u, IMG); return; }
    // hard cut on the downbeat; the logo wipe is already moving on the cut frame
    if (u < 28) sceneClimb(ctx, u); else sceneEnd(ctx, u, IMG);
  },
});
