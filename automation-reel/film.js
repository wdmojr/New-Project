// Marketing Automation service reel. Copy from wdmorgan.com/service/marketing-automation.
import * as M from './lib/motion.js';
import { C, S, CX, DISPLAY, UI, bg, headline, pill, timeline, label, rise, run } from './lib/kit.js';

const { E, prog, lerp, springU, SPRING, wobble, font, text, TAU } = M;

function hook(ctx, u) {
  bg(ctx);
  const hl = headline(ctx, u, [
    [['Still', C.white, 0], ['sending', C.white, 0.5]],
    [['follow-ups', C.white, 1.25]],
    [['by', C.white, 2], ['hand?', C.green, 2.5]],
  ], { y0: 800 });
  pill(ctx, u, 4.5, 'MARKETING AUTOMATION', S.x, hl.y + 150, { align: 'left', size: 46, out: 7.5 });
}

const NODES = ['New lead', 'Lead scoring', 'Nurture sequence', 'Sales-ready'];
const NY = (i) => 420 + i * 270, NX = S.x + 100;

function flow(ctx, u) {
  const out = E.inBack(prog(u, 17.5, 18), 1.5);
  if (out >= 1) return;
  ctx.save(); ctx.translate(0, -out * 1500);
  NODES.forEach((n, i) => {
    const at = 8 + i * 2;
    // connector draws down to the next node, then pulses travel along it
    if (i < NODES.length - 1) {
      const p = E.inOutCubic(prog(u, at + 0.4, at + 1.9));
      if (p > 0) {
        ctx.strokeStyle = C.line; ctx.lineWidth = 10; ctx.lineCap = 'round';
        ctx.beginPath(); ctx.moveTo(NX, NY(i) + 80); ctx.lineTo(NX, lerp(NY(i) + 80, NY(i + 1) - 80, p)); ctx.stroke();
        if (p >= 1) for (let d = 0; d < 2; d++) {
          const ph = ((u - at - 1.9) * 0.9 + d * 0.5) % 1;
          ctx.fillStyle = C.green; ctx.beginPath(); ctx.arc(NX, lerp(NY(i) + 80, NY(i + 1) - 80, ph), 13, 0, TAU); ctx.fill();
        }
      }
    }
    const k = springU(u, at - 0.3, SPRING.bouncy);
    if (k <= 0) return;
    const q = 0.06 * wobble(u - at, 2.4, 5);
    ctx.save(); ctx.translate(NX, NY(i)); ctx.scale(k * (1 + q), k * (1 - q));
    ctx.fillStyle = i === NODES.length - 1 ? C.green : C.panel; ctx.beginPath(); ctx.arc(0, 0, 76, 0, TAU); ctx.fill();
    ctx.strokeStyle = C.green; ctx.lineWidth = 8; ctx.stroke();
    text(ctx, String(i + 1), 0, 30, font(84, 800, DISPLAY), i === NODES.length - 1 ? C.navy : C.white, 'center');
    ctx.restore();
    rise(ctx, u, at + 0.15, n, NX + 130, NY(i) + 24, font(64, 800, DISPLAY), C.white, 'left', 110);
  });
  ctx.restore();
}

const PLATFORMS = ['HubSpot', 'Salesforce', 'ActiveCampaign', 'Marketo'];

function body(ctx, u) {
  bg(ctx);
  label(ctx, u, 8, 'YOUR FUNNEL, ON AUTOPILOT', S.y + 44, 17.6);
  flow(ctx, u);
  label(ctx, u, 18, 'WE BUILD ON', S.y + 44, 22.6);
  PLATFORMS.forEach((p, i) => pill(ctx, u, 18 + i * 0.75, p, CX, 560 + i * 190, { size: 70, bgc: i % 2 ? C.white : C.panel, fg: i % 2 ? C.navy : C.white, out: 22.4 + i * 0.05, rot: (i % 2 ? 1 : -1) * 0.03 }));
  timeline(ctx, u, 22.9, 'Up and running in', '4–8 weeks', 900);
  rise(ctx, u, 25.5, 'We track opens, clicks,', CX, 1190, font(56, 600, UI), C.white, 'center', 90);
  rise(ctx, u, 25.9, 'conversions and ROI', CX, 1265, font(56, 600, UI), C.green, 'center', 90);
}

run({
  service: 'Marketing Automation',
  hook, body,
  hits: [
    [0, 'Still', 'impact'], [0.5, 'sending', 'pop', { pitch: 'E6' }], [1.25, 'follow-ups', 'pop', { pitch: 'G6' }],
    [2, 'by', 'pop', { pitch: 'C6' }], [2.5, 'hand', 'thud'], [4.5, 'pill', 'pop', { pitch: 'C7' }], [8, 'drop', 'riser', { len: 1.6 }],
    [8, 'node 1', 'impact'], [10, 'node 2', 'tok', { pitch: 'E6' }], [12, 'node 3', 'tok', { pitch: 'G6' }], [14, 'node 4', 'bell', { pitch: 'C7' }],
    [17.7, 'flow out', 'whoosh', { len: 0.4 }], [18, 'HubSpot', 'click'], [18.75, 'Salesforce', 'click'], [19.5, 'ActiveCampaign', 'click'], [20.25, 'Marketo', 'click'],
    [22.5, 'out', 'whoosh', { len: 0.4 }], [23, 'timeline', 'thud'], [23.3, 'bar', 'whoosh', { len: 1.2, from: 400, to: 3000 }], [25.5, 'metrics', 'tick'],
  ],
});
