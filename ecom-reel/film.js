// e-Commerce service reel. Hook 0-8, body 8-28, end card 28-32 (lib/kit.js). Copy from wdmorgan.com/service/e-commerce.
import * as M from './lib/motion.js';
import { C, S, CX, bg, headline, pill, phone, stat, timeline, label, run } from './lib/kit.js';

const { E, prog, springU, SPRING } = M;

function hook(ctx, u) {
  bg(ctx);
  const hl = headline(ctx, u, [
    [['Your', C.white, 0], ['store', C.white, 0.5]],
    [['should', C.white, 1], ['sell', C.green, 1.5]],
    [['while', C.white, 2], ['you', C.white, 2.5]],
    [['sleep.', C.green, 3]],
  ], { y0: 760 });
  pill(ctx, u, 4.5, 'CUSTOM eCOMMERCE', S.x, hl.y + 150, { align: 'left', size: 48, out: 7.5 });
}

function body(ctx, u, IMG) {
  bg(ctx);
  label(ctx, u, 8, "STORES WE'VE BUILT", S.y + 44, 19.7);
  const out = E.inBack(prog(u, 19.5, 20), 1.5);
  if (out < 1) {
    const sc = (k) => (1 - k) * 1300 + out * 1500;
    const k1 = springU(u, 7.8, SPRING.gentle), k2 = springU(u, 8.15, SPRING.gentle);
    const p = E.inOutSine(prog(u, 8.5, 19.5));
    phone(ctx, IMG.naw, S.x + 40, 340 + sc(k1), 360, 700, p, -0.05);
    phone(ctx, IMG.allcases, S.x + S.w - 400, 340 + sc(k2), 360, 700, p, 0.05);
    ctx.save(); ctx.translate(0, out * 1500);
    ['Mobile-first design', 'Secure checkout', 'Inventory tracking', 'SEO-ready product pages'].forEach((t, i) =>
      pill(ctx, u, 10 + i * 2, t, S.x, 1120 + i * 100, { align: 'left', size: 46, bgc: i % 2 ? C.white : C.green }));
    ctx.restore();
  }
  stat(ctx, u, 20, '60%+', 'of eCommerce traffic is mobile', 960, { out: 23.4 });
  timeline(ctx, u, 23.85, 'Launch in', '8–12 weeks', 1000);
}

run({
  service: 'e-Commerce',
  images: { naw: 'assets/shots/naw-scaled.webp', allcases: 'assets/shots/allcases.webp' },
  hook, body,
  hits: [
    [0, 'Your', 'impact'], [0.5, 'store', 'pop', { pitch: 'A5' }], [1, 'should', 'pop', { pitch: 'C6' }],
    [1.5, 'sell', 'thud'], [2, 'while', 'pop', { pitch: 'A5' }], [2.5, 'you', 'pop', { pitch: 'C6' }],
    [3, 'sleep', 'thud'], [4.5, 'pill', 'pop', { pitch: 'E6' }], [8, 'drop', 'riser', { len: 1.6 }],
    [8, 'phones', 'impact'], [10, 'chip 1', 'click'], [12, 'chip 2', 'click'], [14, 'chip 3', 'click'], [16, 'chip 4', 'click'],
    [19.6, 'phones out', 'whoosh', { len: 0.4 }], [20, '60%', 'impact'], [23.75, 'timeline', 'thud'], [24.15, 'bar', 'whoosh', { len: 1.2, from: 400, to: 3000 }],
  ],
});
