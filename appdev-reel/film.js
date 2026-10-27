// App Development service reel. Copy from wdmorgan.com/service/application-development.
import * as M from './lib/motion.js';
import { C, S, CX, DISPLAY, UI, bg, headline, pill, card, timeline, label, rise, run } from './lib/kit.js';

const { E, prog, lerp, springU, SPRING, shake, font, text, rrect, TAU } = M;

function hook(ctx, u) {
  bg(ctx);
  const hl = headline(ctx, u, [
    [['Legacy', C.white, 0]],
    [['software', C.white, 0.5]],
    [['holding', C.white, 1.25], ['you', C.white, 1.75]],
    [['back?', C.green, 2.25]],
  ], { y0: 720 });
  pill(ctx, u, 4.5, 'APP DEVELOPMENT', S.x, hl.y + 150, { align: 'left', size: 48, out: 7.5 });
}

// The old system: a gray block that rattles on beats 9-11 and breaks apart on 12.
function legacy(ctx, u) {
  const k = springU(u, 7.65, SPRING.bouncy);
  const br = E.inCubic(prog(u, 11.9, 12.5));
  if (k <= 0 || br >= 1) return;
  const w = 640, h = 460, x = CX - w / 2, y = 560;
  ctx.save(); ctx.translate(CX, y + h / 2); ctx.scale(k, k); ctx.translate(-CX, -(y + h / 2));
  if (u > 9 && u < 12) shake(ctx, u, Math.floor(u), 14);
  const pieces = [[0, 0], [1, 0], [0, 1], [1, 1]];
  pieces.forEach(([i, j]) => {
    const dx = (i ? 1 : -1) * br * 700, dy = (j ? 1 : -1) * br * 500 + br * br * 400, r = (i ? 1 : -1) * br * 0.6;
    const px = x + (i * w) / 2, py = y + (j * h) / 2;
    ctx.save(); ctx.translate(px + w / 4 + dx, py + h / 4 + dy); ctx.rotate(r); ctx.translate(-(px + w / 4), -(py + h / 4));
    ctx.beginPath(); ctx.rect(px, py, w / 2, h / 2); ctx.clip();
    rrect(ctx, x, y, w, h, 24); ctx.fillStyle = C.gray; ctx.fill();
    ctx.fillStyle = '#48526a'; ctx.fillRect(x, y, w, 70);
    [0, 1, 2].forEach((d) => { ctx.fillStyle = '#8a93a8'; ctx.beginPath(); ctx.arc(x + 44 + d * 40, y + 35, 12, 0, TAU); ctx.fill(); });
    text(ctx, 'LEGACY', CX, y + 250, font(110, 800, DISPLAY), '#8a93a8', 'center');
    text(ctx, 'SYSTEM', CX, y + 360, font(110, 800, DISPLAY), '#8a93a8', 'center');
    // cracks appear beat by beat
    ctx.strokeStyle = C.navy; ctx.lineWidth = 6;
    const cracks = [[[x + 300, y + 70], [x + 340, y + 200], [x + 290, y + 300]], [[x + 40, y + 260], [x + 200, y + 240], [x + 320, y + 300]], [[x + 600, y + 120], [x + 470, y + 230], [x + 520, y + 440]]];
    cracks.forEach((c, n) => { if (u < 9.1 + n) return; ctx.beginPath(); c.forEach((p, m) => (m ? ctx.lineTo(...p) : ctx.moveTo(...p))); ctx.stroke(); });
    ctx.restore();
  });
  ctx.restore();
}

const CARDS = [
  ['01', 'Native iOS & Android', 'Built for performance'],
  ['02', 'Cross-platform', 'React Native & Flutter'],
  ['03', 'Progressive Web Apps', 'Native feel, on the web'],
  ['04', 'Ongoing maintenance', 'Updates, security, support'],
];

function body(ctx, u) {
  bg(ctx);
  label(ctx, u, 8, 'TIME TO MODERNIZE', S.y + 44, 12.4);
  legacy(ctx, u);
  label(ctx, u, 12.6, 'WHAT WE BUILD', S.y + 44, 21.4);
  CARDS.forEach(([n, t, s], i) => card(ctx, u, 12.5 + i * 1.5, S.x, 360 + i * 200, S.w, 170, t, s, { num: n, out: 21.2 + i * 0.1 }));
  if (u < 21.4) {
    rise(ctx, u, 19, 'We handle App Store +', CX, 1250, font(54, 600, UI), C.white, 'center', 90);
    rise(ctx, u, 19.4, 'Google Play submission', CX, 1325, font(54, 600, UI), C.green, 'center', 90);
  }
  timeline(ctx, u, 21.85, 'A typical build takes', '3–6 months', 960);
  pill(ctx, u, 25, 'SECURITY BUILT IN', CX, 1230, { size: 54 });
}

run({
  service: 'App Development',
  hook, body,
  hits: [
    [0, 'Legacy', 'impact'], [0.5, 'software', 'pop', { pitch: 'G5' }], [1.25, 'holding', 'pop', { pitch: 'B5' }],
    [1.75, 'you', 'pop', { pitch: 'D6' }], [2.25, 'back', 'thud'], [4.5, 'pill', 'pop', { pitch: 'E6' }], [8, 'drop', 'riser', { len: 1.6 }],
    [8, 'legacy lands', 'impact'], [9, 'crack', 'thud', { pitch: 120, to: 50 }], [10, 'crack', 'thud', { pitch: 110, to: 45 }], [11, 'crack', 'thud', { pitch: 100, to: 40 }],
    [12, 'shatter', 'impact'], [12.5, 'card 1', 'whoosh', { len: 0.3 }], [14, 'card 2', 'whoosh', { len: 0.3 }], [15.5, 'card 3', 'whoosh', { len: 0.3 }], [17, 'card 4', 'whoosh', { len: 0.3 }],
    [19, 'stores', 'bell', { pitch: 'E6' }], [21.3, 'cards out', 'whoosh', { len: 0.4 }], [22, 'timeline', 'thud'], [22.3, 'bar', 'whoosh', { len: 1.2, from: 400, to: 3000 }], [25, 'security', 'pop', { pitch: 'B6' }],
  ],
});
