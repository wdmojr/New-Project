// Shopify Development service reel. Copy from wdmorgan.com/service/shopify-development.
import * as M from './lib/motion.js';
import { C, S, CX, DISPLAY, UI, bg, headline, pill, check, stat, timeline, label, rise, run } from './lib/kit.js';

const { E, prog, lerp, springU, springKeys, SPRING, wobble, font, text, fitSize } = M;

function hook(ctx, u) {
  bg(ctx);
  const hl = headline(ctx, u, [
    [['Moving', C.white, 0], ['to', C.white, 0.5]],
    [['Shopify?', C.green, 1.25]],
    [['Keep', C.white, 2.5], ['your', C.white, 3]],
    [['rankings.', C.green, 3.5]],
  ], { y0: 760 });
  pill(ctx, u, 4.75, 'SHOPIFY MIGRATIONS', S.x, hl.y + 150, { align: 'left', size: 48, out: 7.5 });
}

const FROM = [['WooCommerce', 0.3, 520, -0.08], ['Magento', 0.72, 700, 0.06], ['BigCommerce', 0.32, 880, 0.05], ['Custom platforms', 0.62, 1060, -0.05]];

function body(ctx, u) {
  bg(ctx);
  label(ctx, u, 8, 'WE MIGRATE FROM', S.y + 44, 11.9);
  // platform pills arrive, then get pulled into the Shopify wordmark
  const pull = E.inBack(prog(u, 11.8, 12.4), 1.2);
  if (pull < 1) FROM.forEach(([name, fx, y, rot], i) => {
    const x = lerp(S.x + S.w * fx, CX, pull), yy = lerp(y, 800, pull);
    ctx.save(); ctx.translate(x, yy); ctx.scale(1 - pull, 1 - pull); ctx.translate(-x, -yy);
    pill(ctx, u, 8 + i, name, x, yy, { size: 52, bgc: i % 2 ? C.white : C.panel, fg: i % 2 ? C.navy : C.white, rot });
    ctx.restore();
  });
  // Shopify wordmark slams, then rides up to head the checklist
  const out = E.inBack(prog(u, 20.6, 21.1), 1.5);
  const ks = springU(u, 12.2, SPRING.bouncy);
  if (ks > 0 && out < 1) {
    ctx.save(); ctx.translate(0, -out * 1500);
    const [y, sc] = springKeys(u, [[0, [800, 1]], [13.6, [440, 0.62]]], SPRING.gentle);
    const q = 0.06 * wobble(u - 12.5, 2.2, 5);
    ctx.save(); ctx.translate(CX, y); ctx.scale(ks * sc * (1 + q), ks * sc * (1 - q));
    const f = font(fitSize(ctx, 'Shopify', 800, DISPLAY, S.w, 260), 800, DISPLAY);
    text(ctx, 'Shopify', 0, 0, f, C.green, 'center');
    ctx.restore();
    ['Products', 'Customers', 'Orders', 'SEO rankings'].forEach((t, i) => {
      const at = 14 + i, yy = 640 + i * 150;
      check(ctx, S.x + 70, yy - 22, 46, springU(u, at - 0.25, SPRING.bouncy));
      rise(ctx, u, at, t, S.x + 150, yy, font(72, 800, DISPLAY), C.white, 'left', 120);
    });
    pill(ctx, u, 18.5, 'ZERO DATA LOSS', CX, 1300, { size: 54 });
    ctx.restore();
  }
  stat(ctx, u, 20.9, '70%+', 'of eCommerce visits are mobile', 960, { out: 24.4 });
  timeline(ctx, u, 24.85, 'Most stores live in', '4–8 weeks', 1000);
}

run({
  service: 'Shopify Development',
  hook, body,
  hits: [
    [0, 'Moving', 'impact'], [0.5, 'to', 'pop', { pitch: 'A5' }], [1.25, 'Shopify', 'thud'],
    [2.5, 'Keep', 'pop', { pitch: 'D6' }], [3, 'your', 'pop', { pitch: 'E6' }], [3.5, 'rankings', 'thud'],
    [4.75, 'pill', 'pop', { pitch: 'A6' }], [8, 'drop', 'riser', { len: 1.6 }],
    [8, 'Woo', 'impact'], [9, 'Magento', 'click'], [10, 'Big', 'click'], [11, 'Custom', 'click'],
    [12.3, 'pull', 'whoosh', { len: 0.5 }], [12.5, 'Shopify', 'impact'],
    [14, 'check 1', 'bell', { pitch: 'D6' }], [15, 'check 2', 'bell', { pitch: 'E6' }], [16, 'check 3', 'bell', { pitch: 'F#6' }], [17, 'check 4', 'bell', { pitch: 'A6' }],
    [18.5, 'zero loss', 'thud'], [21, '70%', 'impact'], [24.75, 'timeline', 'thud'], [25.15, 'bar', 'whoosh', { len: 1.2, from: 400, to: 3000 }],
  ],
});
