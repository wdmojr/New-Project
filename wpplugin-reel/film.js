// Custom WordPress Plugins service reel. Copy from wdmorgan.com/service/custom-wordpress-plugin-development.
import * as M from './lib/motion.js';
import { C, S, CX, DISPLAY, UI, bg, headline, pill, card, star, label, rise, run } from './lib/kit.js';

const { E, prog, lerp, springU, springKeys, SPRING, wobble, font, text, rrect } = M;

function hook(ctx, u) {
  bg(ctx);
  const hl = headline(ctx, u, [
    [['5', C.green, 0], ['plugins', C.white, 0.5]],
    [['faking', C.white, 1.25]],
    [['1', C.green, 2], ['feature?', C.white, 2.5]],
  ], { y0: 800 });
  pill(ctx, u, 4.5, 'CUSTOM WORDPRESS PLUGINS', S.x, hl.y + 150, { align: 'left', size: 42, out: 7.5 });
}

const TILES = ['Forms', 'CRM sync', 'Quotes', 'Emails', 'Reports'];
const POS = [[0.17, 560], [0.5, 560], [0.83, 560], [0.33, 830], [0.67, 830]];

function tiles(ctx, u) {
  const pull = E.inBack(prog(u, 11.6, 12.2), 1.3);
  if (pull >= 1) return;
  TILES.forEach((t, i) => {
    const k = springU(u, 8 + i * 0.5 - 0.3, SPRING.bouncy);
    if (k <= 0) return;
    const x = lerp(S.x + S.w * POS[i][0], CX, pull), y = lerp(POS[i][1], 700, pull);
    const s = k * (1 - pull) * (1 + 0.05 * wobble(u - 8 - i * 0.5, 2.6, 4));
    ctx.save(); ctx.translate(x, y); ctx.scale(s, s); ctx.rotate((i - 2) * 0.04);
    rrect(ctx, -125, -125, 250, 250, 36); ctx.fillStyle = C.panel; ctx.fill();
    ctx.strokeStyle = C.line; ctx.lineWidth = 4; ctx.stroke();
    rrect(ctx, -50, -80, 100, 70, 14); ctx.fillStyle = C.line; ctx.fill();
    text(ctx, t, 0, 70, font(40, 800, DISPLAY), C.white, 'center');
    ctx.restore();
  });
}

function merged(ctx, u) {
  const k = springU(u, 12.0, SPRING.bouncy);
  const out = E.inBack(prog(u, 13.6, 14.1), 1.5);
  if (k <= 0 || out >= 1) return;
  const q = 0.07 * wobble(u - 12.25, 2.2, 5);
  ctx.save(); ctx.translate(CX, 700 - out * 1400); ctx.scale(k * (1 + q), k * (1 - q));
  rrect(ctx, -230, -230, 460, 460, 56); ctx.fillStyle = C.green; ctx.fill();
  text(ctx, '1 custom', 0, -10, font(84, 800, DISPLAY), C.navy, 'center');
  text(ctx, 'plugin', 0, 90, font(84, 800, DISPLAY), C.navy, 'center');
  ctx.restore();
  rise(ctx, u, 12.75, 'Faster. Leaner. Yours.', CX, 1100, font(58, 600, UI), C.white, 'center', 100);
}

const BUILT = [
  ['Traffic Intelligence Hub', 'Ads, Analytics + sales in one dashboard'],
  ["Build the Customer's Cart", 'Build a cart, hand it to your team'],
  ['Review Request Follow-Up', 'Automated review emails after orders'],
  ['Mega Menu', 'Big, organized navigation menus'],
];

function body(ctx, u) {
  bg(ctx);
  label(ctx, u, 8, 'TOO MANY PLUGINS', S.y + 44, 12);
  tiles(ctx, u);
  if (u < 14.1) merged(ctx, u);
  label(ctx, u, 14.1, "PLUGINS WE'VE BUILT", S.y + 44, 21.4);
  BUILT.forEach(([t, s], i) => card(ctx, u, 14.5 + i * 1.5, S.x, 360 + i * 200, S.w, 170, t, s, { out: 21.2 + i * 0.1 }));
  // standards, then proof
  const o2 = E.inBack(prog(u, 24.6, 25), 1.5);
  if (o2 < 1) {
    ctx.save(); ctx.translate(0, -o2 * 1400);
    rise(ctx, u, 21.7, 'Update-safe.', CX, 800, font(130, 800, DISPLAY), C.green, 'center', 170);
    rise(ctx, u, 22.5, 'No core edits.', CX, 960, font(110, 800, DISPLAY), C.white, 'center', 150);
    rise(ctx, u, 23.25, 'Small plugins: 1–2 weeks', CX, 1110, font(56, 600, UI), C.mute, 'center', 100);
    ctx.restore();
  }
  if (u > 24.5) {
    for (let i = 0; i < 5; i++) {
      const k = springU(u, 24.55 + i * 0.2, SPRING.bouncy);
      if (k <= 0) continue;
      ctx.save(); ctx.translate(CX + (i - 2) * 150, 700); ctx.scale(k, k); star(ctx, 0, 0, 62); ctx.restore();
    }
    rise(ctx, u, 26, '5.0', CX, 1000, font(220, 800, DISPLAY), C.white, 'center', 260);
    rise(ctx, u, 26.5, 'from 32 client reviews', CX, 1110, font(56, 600, UI), C.mute, 'center', 100);
  }
}

run({
  service: 'Custom WordPress Plugins',
  hook, body,
  hits: [
    [0, '5', 'impact'], [0.5, 'plugins', 'pop', { pitch: 'D6' }], [1.25, 'faking', 'pop', { pitch: 'F6' }],
    [2, '1', 'thud'], [2.5, 'feature', 'pop', { pitch: 'A5' }], [4.5, 'pill', 'pop', { pitch: 'G6' }], [8, 'drop', 'riser', { len: 1.6 }],
    [8, 'tile 1', 'impact'], [8.5, 'tile 2', 'blip', { pitch: 'D6' }], [9, 'tile 3', 'blip', { pitch: 'F6' }], [9.5, 'tile 4', 'blip', { pitch: 'G6' }], [10, 'tile 5', 'blip', { pitch: 'A6' }],
    [11.9, 'pull', 'whoosh', { len: 0.5 }], [12.25, 'merge', 'impact'], [12.75, 'line', 'tick'],
    [13.8, 'out', 'whoosh', { len: 0.4 }], [14.5, 'card 1', 'whoosh', { len: 0.3 }], [16, 'card 2', 'whoosh', { len: 0.3 }], [17.5, 'card 3', 'whoosh', { len: 0.3 }], [19, 'card 4', 'whoosh', { len: 0.3 }],
    [21.3, 'cards out', 'whoosh', { len: 0.4 }], [21.7, 'update-safe', 'thud'], [22.5, 'no core', 'thud'], [23.25, 'weeks', 'tick'],
    [25.1, 'stars', 'coins'], [26, '5.0', 'bell', { pitch: 'D7' }], [26.5, 'reviews', 'tick'],
  ],
});
