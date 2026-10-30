// Van Selow Design Build: site sizzle. Pure function of time: window.seek(t) paints frame t.
// Timing is in beats (u) on the measured grid (112 bpm); docs/shotlist.md is the plan.
// Every screen is a real capture of vanselowdesign.com (assets/shots), every photo is from the site.
import * as M from './lib/motion.js';

const { W, H, FORMAT, E, prog, lerp, clamp, springU, SPRING, wobble, font, layout, glyph, text, fill, rrect, mix } = M;

// Brand tokens (assets/brand.json): charcoal + warm paper, one accent = Van Selow crimson.
const C = {
  coal: '#1d1c1b', coal2: '#2b2a29', paper: '#f7f5f2', ink: '#2b2a29', mute: '#9a948c',
  crimson: '#620000', red: '#e2232f', white: '#ffffff', wdm: '#00c375',
};
const DISPLAY = 'Display', UI = 'UI';
const P = FORMAT.portrait;

const HITS = [
  [0, 'hook: Luxury', 'sub', { len: 1.2 }],
  [1, "hook: isn't", 'tick'],
  [2, 'hook: loud.', 'thud'],
  [3.75, 'hook exits', 'whoosh', { len: 0.35 }],
  [4, 'detail: headline', 'click'],
  [5, 'detail: badges', 'click'],
  [6, 'detail: plaque', 'click'],
  [7.6, 'pull back to hero', 'whoosh', { len: 0.9, from: 2400, to: 500 }],
  [8.5, 'client super', 'tick'],
  [14, 'push into logo', 'riser', { len: 1.0 }],
  [14, 'logo match cut', 'sub', { len: 1.0 }],
  [15, 'logo super', 'bell', { pitch: 'F6' }],
  [18.75, 'whip to menu', 'whoosh', { len: 0.4 }],
  [19, 'menu lands', 'thud'],
  [20, 'menu super', 'tick'],
  [22.5, 'whip to service areas', 'whoosh', { len: 0.35, from: 2400, to: 700 }],
  [25.5, 'form lands', 'thud'],
  [26.5, 'zip typed', 'type', { n: 5, len: 1.1 }],
  [29, 'zip verified', 'pop', { pitch: 'C6' }],
  [31.5, 'map lands', 'thud'],
  [33, 'pin St. Petersburg', 'blip', { pitch: 'F6' }],
  [35, 'pin Seminole', 'blip', { pitch: 'G6' }],
  [36.5, 'pin Treasure Island', 'blip', { pitch: 'C7' }],
  [38, 'speed: desktop', 'thud'],
  [38.5, 'speed: phone', 'click'],
  [38.75, 'load bar full', 'blip', { pitch: 'C7' }],
  [39, 'Built for speed', 'tick'],
  [42, 'luxury: pool', 'sub', { len: 0.8 }],
  [43, 'luxury: kitchen', 'click'],
  [44, 'luxury: cellar', 'click'],
  [45, 'luxury: beachfront', 'click'],
  [46.5, 'end panel wipe', 'whoosh', { len: 0.45 }],
  [46.75, 'WD Morgan logo', 'impact'],
  [49.5, 'url', 'bell', { pitch: 'F6' }],
];

// ---------------------------------------------------------------- helpers
const PER = () => M.GRID.period;
const logLerp = (a, b, t) => a * (b / a) ** t;

// Draw an image so that the source window V (image px: x, y, w, h) fills the box.
function view(ctx, img, V, x, y, w, h, radius = 0) {
  ctx.save();
  if (radius) { rrect(ctx, x, y, w, h, radius); ctx.clip(); } else { ctx.beginPath(); ctx.rect(x, y, w, h); ctx.clip(); }
  const s = w / V.w;
  ctx.drawImage(img, x - V.x * s, y - V.y * s, img.width * s, img.height * s);
  ctx.restore();
}
// A window of aspect a (w/h) on the image, centred on fractions (fx, fy), width = fw * img.width, clamped inside.
function win(img, fx, fy, fw, a) {
  const w = Math.min(img.width, fw * img.width), h = Math.min(img.height, w / a);
  const w2 = h * a;
  return { x: clamp(fx * img.width - w2 / 2, 0, img.width - w2), y: clamp(fy * img.height - h / 2, 0, img.height - h), w: w2, h };
}
const lerpV = (A, B, t) => {
  // centre moves linearly, size moves in log space: a constant-rate dolly
  const w = logLerp(A.w, B.w, t), h = logLerp(A.h, B.h, t);
  const cx = lerp(A.x + A.w / 2, B.x + B.w / 2, t), cy = lerp(A.y + A.h / 2, B.y + B.h / 2, t);
  return { x: cx - w / 2, y: cy - h / 2, w, h };
};
function shadowCard(ctx, x, y, w, h, r, k = 1) {
  ctx.save();
  ctx.shadowColor = `rgba(0,0,0,${0.45 * k})`; ctx.shadowBlur = 60; ctx.shadowOffsetY = 24;
  rrect(ctx, x, y, w, h, r); ctx.fillStyle = '#000'; ctx.fill();
  ctx.restore();
}

// Masked line of type that rises out of its own baseline (directional entrance, masked exit).
function riseLine(ctx, u, u0, str, x, y, f, color, { track = 0, align = 'left', out = 1e9, stagger = 0.025 } = {}) {
  const L = layout(ctx, str, f, track);
  const x0 = align === 'left' ? x : align === 'right' ? x - L.width : x - L.width / 2;
  const hgt = L.asc + L.desc + 8;
  ctx.save(); ctx.beginPath(); ctx.rect(x0 - 40, y - L.asc - 6, L.width + 80, hgt + 4); ctx.clip();
  L.glyphs.forEach((g, j) => {
    const k = springU(u, u0 + j * stagger, SPRING.gentle);
    const ex = E.inCubic(prog(u, out + j * 0.01, out + 0.35 + j * 0.01));
    if (k <= 0.001) return;
    const dy = (1 - k) * hgt * 1.05 - ex * hgt * 1.1;
    glyph(ctx, g.ch, x0 + g.cx, y + dy, f, color);
  });
  ctx.restore();
  return L;
}
// Eyebrow (tracked caps, accent) + serif lines, the site's own section-heading pattern.
function superBlock(ctx, u, u0, eyebrow, lines, x, y, o = {}) {
  const size = o.size || FORMAT.pick({ '16x9': 84, '9x16': 92 });
  const eb = FORMAT.pick({ '16x9': 28, '9x16': 30 });
  const col = o.color || C.white, acc = o.accent || C.red;
  const out = o.out ?? 1e9;
  // short accent rule draws first, then the eyebrow, then each line
  const rl = E.outCubic(prog(u, u0, u0 + 0.5)) * (1 - E.inCubic(prog(u, out, out + 0.35)));
  if (rl > 0) { ctx.fillStyle = acc; ctx.fillRect(x, y - eb * 0.38, 44 * rl, 3); }
  riseLine(ctx, u, u0 + 0.1, eyebrow, x + 62, y, font(eb, 600, UI), acc, { track: eb * 0.28, out, stagger: 0.008 });
  lines.forEach((ln, i) => riseLine(ctx, u, u0 + 0.25 + i * 0.18, ln, x, y + eb * 0.6 + size * (1.05 + i * 1.04), font(size, 400, DISPLAY), col, { out: out + i * 0.04 }));
  if (o.note) {
    const nf = font(FORMAT.pick({ '16x9': 36, '9x16': 38 }), 400, UI);
    o.note.forEach((n, i) => riseLine(ctx, u, u0 + 0.6 + lines.length * 0.18 + i * 0.12, n, x, y + eb * 0.6 + size * (1.05 + (lines.length - 1) * 1.04) + 64 + i * FORMAT.pick({ '16x9': 44, '9x16': 50 }), nf, o.noteColor || C.mute, { out }));
  }
}

// ---------------------------------------------------------------- layout per format
const S = FORMAT.safe;
const LAY = FORMAT.pick({
  '16x9': {
    hero: { x: 96, y: 165, w: 1100, h: 688 },               // the homepage card (top_view, 1.6:1)
    side: { x: 1270, y: 400 },                               // super column to the right of a card
    card: { x: 96, y: 150, w: 1100, h: 780 },                // menu / map card
    form: { x: 1824 - 836, y: 120, w: 836, h: 800 },         // form card sits right; super left
    formSide: { x: 96, y: 440 },
  },
  '9x16': {
    hero: { x: 72, y: 250, w: 560, h: 1212 },               // mobile homepage (m_top, 0.46:1)
    side: { x: 670, y: 560 },
    card: { x: 72, y: 250, w: 936, h: 820 },
    form: { x: 72, y: 250, w: 936, h: 895 },
    formSide: { x: 72, y: 1250 },
  },
});

// ---------------------------------------------------------------- S1 hook   (u 0..4)
function sceneHook(ctx, u) {
  fill(ctx, C.coal);
  const size = FORMAT.pick({ '16x9': 196, '9x16': 168 });
  const f = font(size, 400, DISPLAY);
  const push = 1 + 0.035 * prog(u, 0, 4);
  ctx.save(); M.zoomAbout(ctx, push, W / 2, H / 2);
  const words = ["Luxury", "isn't", "loud."];
  if (!P) {
    let x = S.x + 40; const y = H * 0.56;
    words.forEach((w, i) => {
      const L = riseLine(ctx, u, [-0.7, 0.85, 1.85][i], w, x, y, f, i === 2 ? C.red : C.white, { out: 3.6 + i * 0.05, stagger: 0.03 });
      x += L.width + size * 0.28;
    });
  } else {
    words.forEach((w, i) => riseLine(ctx, u, [-0.7, 0.85, 1.85][i], w, S.x + 20, H * 0.40 + i * size * 1.08, f, i === 2 ? C.red : C.white, { out: 3.6 + i * 0.05, stagger: 0.03 }));
  }
  ctx.restore();
  // the site's own crimson slider-progress bar, filling across the hook
  const bw = W * E.inOutSine(prog(u, 0, 3.9));
  ctx.fillStyle = C.crimson; ctx.fillRect(0, H - 10, bw, 10);
}

// ---------------------------------------------------------------- S2+S3 details -> hero -> logo  (u 4..14)
// One continuous world: the homepage card. Details are macro windows on it, cut per beat; then the
// camera pulls back to the whole card, holds, and pushes into the header logo (match cut to S4).
const LOGO_PX = P ? { cx: 0.255 * 1170, cy: 0.198 * 2532, h: 0.17 * 2532 } : { cx: 1473, cy: 245, h: 288 };
const LOGO_AT = P ? { x: W / 2, y: H * 0.40, h: 760 } : { x: W * 0.34, y: H * 0.5, h: 620 };
function sceneHero(ctx, u, IMG) {
  fill(ctx, C.coal);
  const img = P ? IMG.mTop : IMG.top;
  const R = LAY.hero, k = R.w / img.width;              // image px -> world px
  const a = W / H;
  // detail windows (image fractions) for beats 4, 5, 6
  const D = P
    ? [win(img, 0.5, 0.62, 0.55, a), win(img, 0.5, 0.86, 0.5, a), win(img, 0.5, 0.965, 0.42, a)]
    : [win(img, 0.25, 0.37, 0.34, a), win(img, 0.24, 0.72, 0.3, a), win(img, 0.91, 0.66, 0.16, a)];
  const toWorld = (V) => ({ x: R.x + V.x * k, y: R.y + V.y * k, w: V.w * k, h: V.h * k });
  const SCREEN = { x: 0, y: 0, w: W, h: H };
  const s2 = LOGO_AT.h / LOGO_PX.h;                     // screen px per image px at the logo match
  const VL = { x: R.x + LOGO_PX.cx * k - LOGO_AT.x * k / s2, y: R.y + LOGO_PX.cy * k - LOGO_AT.y * k / s2, w: W * k / s2, h: H * k / s2 };
  let V;
  if (u < 7) {
    const i = Math.min(2, Math.floor(u - 4));
    const Dw = toWorld(D[i]);
    const z = 1 - 0.06 * prog(u, 4 + i, 5 + i);          // slow push inside each macro
    V = { x: Dw.x + Dw.w * (1 - z) / 2, y: Dw.y + Dw.h * (1 - z) / 2, w: Dw.w * z, h: Dw.h * z };
  } else if (u < 12) {
    const Dw = toWorld(D[2]);
    const z = 1 - 0.06;
    const Dz = { x: Dw.x + Dw.w * (1 - z) / 2, y: Dw.y + Dw.h * (1 - z) / 2, w: Dw.w * z, h: Dw.h * z };
    const t = E.inOutCubic(prog(u, 7, 8.6));
    V = lerpV(Dz, SCREEN, t);
    const drift = 0.015 * prog(u, 8.6, 12);              // breathe in slightly on the hold
    V = { x: V.x + V.w * drift / 2, y: V.y + V.h * drift / 2, w: V.w * (1 - drift), h: V.h * (1 - drift) };
  } else {
    const d = 0.015;
    const V0 = { x: W * d / 2, y: H * d / 2, w: W * (1 - d), h: H * (1 - d) };
    V = lerpV(V0, VL, E.inCubic(prog(u, 12, 14)));
  }
  const s = W / V.w;
  ctx.save();
  ctx.scale(s, s); ctx.translate(-V.x, -V.y);
  shadowCard(ctx, R.x, R.y, R.w, R.h, 18 / 1);
  view(ctx, img, { x: 0, y: 0, w: img.width, h: img.height }, R.x, R.y, R.w, img.height * k, 18);
  ctx.restore();
  // client super beside the card, only while the whole card is in view
  if (u >= 8 && u < 13) {
    const o = 1 - E.inCubic(prog(u, 11.6, 12.4));
    ctx.save(); ctx.globalAlpha = o;
    superBlock(ctx, u, 8.4, 'NEW WEBSITE', P ? ['Van', 'Selow', 'Design', 'Build'] : ['Van Selow', 'Design Build'], LAY.side.x, LAY.side.y,
      { size: FORMAT.pick({ '16x9': 96, '9x16': 70 }), note: ['vanselowdesign.com'] });
    ctx.restore();
  }
}

// ---------------------------------------------------------------- S4 logo   (u 14..19)
function drawLogo(ctx, u, IMG, cx, cy, h, alpha = 1) {
  // the site's own SVG gradient sweep (7 s loop), played at 2.4x so a full sweep reads in the shot
  const tt = Math.max(0, u - 14) * PER() * 2.4;
  const n = IMG.shimmer.length, fr = IMG.shimmer[Math.floor(((tt / 7) % 1) * n) % n];
  const s = h / 858, w = 797 * s;
  ctx.save(); ctx.globalAlpha = alpha;
  ctx.drawImage(fr, cx - 395 * s, cy - 455 * s, w, 920 * s);
  ctx.restore();
}
function sceneLogo(ctx, u, IMG) {
  fill(ctx, C.coal);
  const whip = E.inOutCubic(prog(u, 18.5, 19));
  ctx.save(); ctx.translate(-whip * W, 0);
  const k = springU(u, 14, SPRING.gentle);
  const sc = lerp(1, 0.9, E.outCubic(prog(u, 14, 16.5))) * (1 + 0.02 * wobble(u - 14, 1.4, 3));
  drawLogo(ctx, u, IMG, LOGO_AT.x, LOGO_AT.y, LOGO_AT.h * sc);
  const sx = P ? S.x + 40 : W * 0.6, sy = P ? H * 0.74 : H * 0.44;
  superBlock(ctx, u, 15, 'SIGNATURE', ['Logo', 'animation'], sx, sy, { size: FORMAT.pick({ '16x9': 96, '9x16': 92 }), note: P ? ['The crimson S catches the light,', 'just like on their site.'] : ['The crimson S catches', 'the light, just like', 'on their site.'] });
  ctx.restore();
  if (whip > 0) { ctx.save(); ctx.translate(W - whip * W, 0); sceneMenuBody(ctx, 19, IMG, false); ctx.restore(); }
}

// ---------------------------------------------------------------- S5 menu   (u 19..25.5)
function sceneMenuBody(ctx, u, IMG, withSuper = true) {
  fill(ctx, C.coal);
  const R = LAY.card;
  const pan = E.inOutCubic(prog(u, 22.25, 22.75));
  const imgs = P ? [IMG.mMenu, IMG.mMenu] : [IMG.menuServices, IMG.menuAreas];
  // inside the card: push toward the dropdown (desktop) / down the drawer (mobile)
  const t = E.inOutSine(prog(u, 19.3, 25.5));
  imgs.forEach((img, i) => {
    if (P && i === 1) return;
    const off = (i - pan) * (W);
    if (Math.abs(off) >= W) return;
    const a = R.w / R.h;
    const V = P ? lerpV(win(img, 0.5, 0.2, 1, a), win(img, 0.5, 0.5, 1, a), t)
      : lerpV(win(img, 0.5, 0.38, 1, a), win(img, i ? 0.45 : 0.38, 0.33, 0.66, a), i ? E.inOutSine(prog(u, 22.5, 25.5)) : t);
    shadowCard(ctx, R.x + off, R.y, R.w, R.h, 18);
    view(ctx, img, V, R.x + off, R.y, R.w, R.h, 18);
  });
  if (withSuper) {
    const sx = P ? S.x : LAY.side.x, sy = P ? R.y + R.h + 110 : LAY.side.y - 40;
    superBlock(ctx, u, 20, 'MEGA MENU', P ? ['Their whole world,', 'one tap away.'] : ['Their whole', 'world, one', 'hover away.'], sx, sy,
      { size: FORMAT.pick({ '16x9': 96, '9x16': 80 }), out: 25.1, note: P ? ['Services · Areas · Gallery · Quote'] : ['Services, service areas,', 'gallery and a quote CTA.'] });
  }
}
function sceneMenu(ctx, u, IMG) {
  const k = springU(u, 19, SPRING.snappy || SPRING.gentle);
  sceneMenuBody(ctx, u, IMG);
}

// ---------------------------------------------------------------- S6 form   (u 25.5..31.5)
// form_step2 holds the real typed + verified state; form_view holds the real empty field.
const FCARD = { x: 1241, y: 427, w: 1158, h: 1108 };       // form card in form_step2.png (px)
const FIELD = { x: 1385, y: 938, w: 870, h: 111 };         // ZIP field in form_step2.png
const FIELD0 = { x: 1387, y: 602, w: 867, h: 111 };        // same field, empty, in form_view.png
function sceneForm(ctx, u, IMG) {
  fill(ctx, C.paper);
  const R = LAY.form;
  const rise = springU(u, 25.5, SPRING.gentle);
  const y = R.y + (1 - rise) * 260;
  const s = R.w / FCARD.w;
  const zoom = 1 + 0.06 * E.inOutSine(prog(u, 25.5, 31.5));
  ctx.save();
  M.zoomAbout(ctx, zoom, R.x + (FIELD.x + FIELD.w / 2 - FCARD.x) * s, y + (FIELD.y - FCARD.y) * s);
  ctx.save(); ctx.shadowColor = 'rgba(60,40,30,0.18)'; ctx.shadowBlur = 70; ctx.shadowOffsetY = 30;
  rrect(ctx, R.x, y, R.w, FCARD.h * s, 24); ctx.fillStyle = '#fff'; ctx.fill(); ctx.restore();
  ctx.save(); rrect(ctx, R.x, y, R.w, FCARD.h * s, 24); ctx.clip();
  ctx.drawImage(IMG.formDone, FCARD.x, FCARD.y, FCARD.w, FCARD.h, R.x, y, R.w, FCARD.h * s);
  const fx = R.x + (FIELD.x - FCARD.x) * s, fy = y + (FIELD.y - FCARD.y) * s;
  const typed = clamp(Math.floor((u - 26.5) / 0.5) + 1, 0, 5);
  const ok = u >= 29;
  if (typed === 0) {
    ctx.drawImage(IMG.formEmpty, FIELD0.x, FIELD0.y, FIELD0.w, FIELD0.h, fx, fy, FIELD.w * s, FIELD.h * s);
  } else if (!ok) {
    // reveal the real typed digits one by one (each ~23.6 px wide in the capture)
    const x0 = fx + (1411 - FIELD.x) * s + typed * 23.6 * s;
    ctx.fillStyle = 'rgb(250,248,245)';
    ctx.fillRect(x0, fy + 6 * s, (FIELD.x + FIELD.w - 60 - 1411 - typed * 23.6) * s, (FIELD.h - 12) * s);
    // caret
    if ((u * 2) % 1 < 0.6) { ctx.fillStyle = C.ink; ctx.fillRect(x0 + 2, fy + 34 * s, 2.5, 44 * s); }
  }
  if (!ok) {
    ctx.fillStyle = 'rgb(250,248,245)'; ctx.fillRect(fx + (FIELD.w - 64) * s, fy + 6 * s, 56 * s, (FIELD.h - 12) * s);   // hide the check
    ctx.fillStyle = '#fff'; ctx.fillRect(fx - 4, fy + (FIELD.h + 8) * s, 640 * s, 56 * s);                       // hide "Great news"
  } else {
    // the verified line wipes on left-to-right; the check pops
    const wp = E.outCubic(prog(u, 29, 29.6));
    ctx.fillStyle = '#fff'; ctx.fillRect(fx - 4 + 640 * s * wp, fy + (FIELD.h + 8) * s, 640 * s * (1 - wp) + 4, 56 * s);
    const ck = springU(u, 29, SPRING.bouncy || SPRING.gentle);
    if (ck < 0.999) {
      const cx = fx + (FIELD.w - 36) * s, cy = fy + FIELD.h * s / 2;
      ctx.fillStyle = 'rgb(250,248,245)'; ctx.fillRect(cx - 28 * s, cy - 26 * s, 56 * s, 52 * s);
      ctx.save(); ctx.translate(cx, cy); ctx.scale(ck, ck);
      ctx.drawImage(IMG.formDone, FIELD.x + FIELD.w - 64, FIELD.y + FIELD.h / 2 - 26, 56, 52, -28 * s, -26 * s, 56 * s, 52 * s);
      ctx.restore();
    }
  }
  ctx.restore();
  ctx.restore();
  superBlock(ctx, u, 26, 'CUSTOM QUOTE FORM', ['Qualifies', 'every lead.'], LAY.formSide.x, LAY.formSide.y,
    { size: FORMAT.pick({ '16x9': 100, '9x16': 92 }), color: C.ink, accent: C.crimson, noteColor: '#6b655e', out: 31.1,
      note: ['5 guided steps. The ZIP is checked', 'against their service area, live.'] });
}

// ---------------------------------------------------------------- S7 map   (u 31.5..38)
const MAPR = { x: 340, y: 360, w: 2203, h: 1440 };          // map card + area list in the captures
const PINS = [[33, 'mapStPete', 0.395, 0.78], [35, 'mapSeminole', 0.305, 0.703], [36.5, 'mapTreasure', 0.318, 0.785]];
function sceneMap(ctx, u, IMG) {
  fill(ctx, C.coal);
  const R = LAY.card;
  const rise = springU(u, 31.5, SPRING.gentle);
  const y = R.y + (1 - rise) * 240;
  let key = 'map', pin = null;
  PINS.forEach(([b, k, px, py]) => { if (u >= b) { key = k; pin = [b, px, py]; } });
  const img = IMG[key];
  const a = R.w / R.h;
  const z = logLerp(1, P ? 1.9 : 1.18, E.inOutSine(prog(u, 31.5, 38)));
  const base = P ? { x: 340, y: 380, w: 1080, h: 1080 / a } : { x: MAPR.x, y: MAPR.y, w: MAPR.w, h: MAPR.w / a };
  const fx = P ? 0.33 : 0.3, fy = 0.72;
  const tw = base.w / z, th = base.h / z;
  const V = { x: lerp(base.x, fx * img.width - tw / 2, prog(z, 1, 2)), y: clamp(fy * img.height - th / 2, base.y, img.height - th), w: tw, h: th };
  if (P) { V.x = clamp(fx * img.width - tw / 2, 0, img.width - tw); }
  shadowCard(ctx, R.x, y, R.w, R.h, 18);
  view(ctx, img, V, R.x, y, R.w, R.h, 18);
  // ping ring at the hovered pin, echoing the site's own pin halos
  if (pin) {
    const s = R.w / V.w;
    const px = R.x + (pin[1] * img.width - V.x) * s, py = y + (pin[2] * img.height - V.y) * s;
    const t = prog(u, pin[0], pin[0] + 1.4);
    if (t < 1) {
      ctx.save(); ctx.strokeStyle = C.red; ctx.globalAlpha = 1 - t; ctx.lineWidth = 3;
      ctx.beginPath(); ctx.arc(px, py, 12 + E.outCubic(t) * 70, 0, M.TAU); ctx.stroke(); ctx.restore();
    }
  }
  const sx = P ? S.x : LAY.side.x, sy = P ? R.y + R.h + 110 : LAY.side.y - 40;
  superBlock(ctx, u, 32, 'INTERACTIVE MAP', P ? ['Every community', 'they serve.'] : ['Every', 'community', 'they serve.'], sx, sy,
    { size: FORMAT.pick({ '16x9': 96, '9x16': 80 }), out: 37.6, note: P ? ['Hover a town, its pin lights up.'] : ['Hover a town and its', 'pin lights up.'] });
}

// ---------------------------------------------------------------- S8 speed   (u 38..42)
function sceneSpeed(ctx, u, IMG) {
  fill(ctx, C.coal);
  const d = P ? { x: 72, y: 250, w: 936, h: 585 } : { x: 96, y: 210, w: 1000, h: 625 };
  const ph = P ? { x: 690, y: 640, w: 300, h: 649 } : { x: 960, y: 330, w: 280, h: 606 };
  const k1 = springU(u, 37.6, SPRING.snappy), k2 = springU(u, 38.4, SPRING.bouncy);
  const dx = (1 - k1) * -W * 0.6;
  shadowCard(ctx, d.x + dx, d.y, d.w, d.h, 16);
  view(ctx, IMG.top, { x: 0, y: 0, w: IMG.top.width, h: IMG.top.width * d.h / d.w }, d.x + dx, d.y, d.w, d.h, 16);
  // the site's crimson progress line, here as a load bar that fills in half a beat
  const lb = E.outExpo(prog(u, 38.15, 38.75));
  ctx.fillStyle = 'rgba(255,255,255,0.12)'; ctx.fillRect(d.x + dx, d.y + d.h + 22, d.w, 6);
  ctx.fillStyle = C.red; ctx.fillRect(d.x + dx, d.y + d.h + 22, d.w * lb, 6);
  const py = ph.y + (1 - k2) * (H - ph.y + 40);
  ctx.save(); ctx.shadowColor = 'rgba(0,0,0,0.55)'; ctx.shadowBlur = 50; ctx.shadowOffsetY = 20;
  rrect(ctx, ph.x - 10, py - 10, ph.w + 20, ph.h + 20, 46); ctx.fillStyle = '#0d0d0d'; ctx.fill(); ctx.restore();
  view(ctx, IMG.mTop, { x: 0, y: 0, w: IMG.mTop.width, h: IMG.mTop.width * ph.h / ph.w }, ph.x, py, ph.w, ph.h, 38);
  const sx = P ? S.x : 1340, sy = P ? 1390 : 400;
  superBlock(ctx, u, 38.9, 'PERFORMANCE', P ? ['Built for speed.'] : ['Built for', 'speed.'], sx, sy,
    { size: FORMAT.pick({ '16x9': 120, '9x16': 100 }), out: 41.7, note: P ? ['Optimized images · shift-free layout'] : ['Optimized images.', 'Shift-free layout.', 'Fully responsive.'] });
}

// ---------------------------------------------------------------- S9 luxury montage   (u 42..46.5)
const PHOTOS = [[42, 'pPool', 0.5, 0.6], [43, 'pKitchen', 0.45, 0.5], [44, 'pCellar', 0.5, 0.5], [45, 'pBeach', 0.42, 0.45]];
function sceneLuxury(ctx, u, IMG) {
  let cur = PHOTOS[0];
  PHOTOS.forEach((p) => { if (u >= p[0]) cur = p; });
  const img = IMG[cur[1]];
  const z = logLerp(1.0, 1.08, prog(u, cur[0], cur[0] + 1.5));
  M.cover(ctx, img, 0, 0, W, H, { fx: cur[2], fy: cur[3], zoom: z });
  // scrim under the type only (bottom band), not a full gradient
  const g = ctx.createLinearGradient(0, H * 0.45, 0, H);
  g.addColorStop(0, 'rgba(20,19,18,0)'); g.addColorStop(1, 'rgba(20,19,18,0.82)');
  ctx.fillStyle = g; ctx.fillRect(0, H * 0.45, W, H * 0.55);
  const sx = S.x, sy = P ? 1180 : H - 330;
  superBlock(ctx, u, 42.2, 'FOR A LUXURY AUDIENCE', ['Designed to feel', 'like their homes.'], sx, sy, { size: FORMAT.pick({ '16x9': 100, '9x16': 92 }) });
}

// ---------------------------------------------------------------- S10 end card   (u 46.5..56)
function sceneEnd(ctx, u, IMG) {
  // a charcoal panel rises over the last photo, crimson leading edge
  const wp = E.inOutCubic(prog(u, 46.25, 46.75));
  if (wp < 1) sceneLuxury(ctx, u, IMG);
  const top = H * (1 - wp);
  ctx.fillStyle = C.coal; ctx.fillRect(0, top, W, H - top);
  if (wp < 1) { ctx.fillStyle = C.red; ctx.fillRect(0, top, W, 6); }
  if (u < 46.6) return;
  ctx.save(); M.zoomAbout(ctx, logLerp(1, 1.04, prog(u, 46.75, 56)), P ? S.x : 160, H * 0.5);
  const lg = IMG.wdm, lw = FORMAT.pick({ '16x9': 760, '9x16': 840 }), lh = lw * lg.height / lg.width;
  const k = springU(u, 46.75, SPRING.gentle);
  const cx = P ? S.x : 160, cy = P ? 560 : 330;
  ctx.save(); ctx.globalAlpha = clamp(k * 1.4);
  ctx.translate(0, (1 - k) * 60);
  ctx.drawImage(lg, cx, cy, lw, lh);
  ctx.restore();
  superBlock(ctx, u, 47.6, 'WEBSITES FOR LUXURY BRANDS', P ? ['Your clients', 'expect luxury.', 'We build it.'] : ['Your clients expect luxury.', 'We build it.'], P ? S.x : 160, P ? 800 : 560,
    { size: FORMAT.pick({ '16x9': 96, '9x16': 92 }), accent: C.wdm });
  const uf = font(FORMAT.pick({ '16x9': 44, '9x16': 52 }), 500, UI);
  const ux = P ? S.x : 160, uy = P ? 1340 : 900;
  const L = riseLine(ctx, u, 49.4, 'wdmorgan.com', ux, uy, uf, C.white);
  const ul = E.outCubic(prog(u, 49.6, 50.4));
  ctx.fillStyle = C.wdm; ctx.fillRect(ux, uy + 16, L.width * ul, 4);
  ctx.restore();
}

// ---------------------------------------------------------------- film
const shimmer = {};
for (let i = 0; i < 42; i++) shimmer['sh' + i] = `assets/logo/shimmer/${String(i).padStart(2, '0')}.png`;

M.film({
  fonts: [font(100, 400, DISPLAY), font(40, 500, UI), font(40, 600, UI), font(40, 400, UI)],
  images: {
    top: 'assets/shots/top_view.png', mTop: 'assets/shots/m_top.png', mMenu: 'assets/shots/m_menu.png',
    menuServices: 'assets/shots/menu_services.png', menuAreas: 'assets/shots/menu_areas.png',
    formDone: 'assets/shots/form_step2.png', formEmpty: 'assets/shots/form_view.png',
    map: 'assets/shots/map_view2.png', mapStPete: 'assets/shots/map_hover_StPetersburg.png',
    mapSeminole: 'assets/shots/map_hover_Seminole.png', mapTreasure: 'assets/shots/map_hover_TreasureIsland.png',
    pPool: 'assets/photos/waterfront-pool-home-lounge-chairs-van-selow.jpg',
    pKitchen: 'assets/photos/dunedin-whole-home-remodel-kitchen-van-selow.jpg',
    pCellar: 'assets/photos/tierra-verde-image-6.jpg',
    pBeach: 'assets/photos/bellair-beach-luxury-outdoor-remodel-van-selow.jpg',
    wdm: 'assets/wdm-logo.png',
    ...shimmer,
  },
  init(ctx, IMG) { IMG.shimmer = Array.from({ length: 42 }, (_, i) => IMG['sh' + i]); },
  hits: HITS,
  draw(ctx, u, t, IMG) {
    if (u < 4) sceneHook(ctx, u);
    else if (u < 14) sceneHero(ctx, u, IMG);
    else if (u < 19) sceneLogo(ctx, u, IMG);
    else if (u < 25.5) sceneMenu(ctx, u, IMG);
    else if (u < 31.5) sceneForm(ctx, u, IMG);
    else if (u < 38) sceneMap(ctx, u, IMG);
    else if (u < 42) sceneSpeed(ctx, u, IMG);
    else if (u < 46.25) sceneLuxury(ctx, u, IMG);
    else sceneEnd(ctx, u, IMG);
  },
});
