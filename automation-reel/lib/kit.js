// Shared WD Morgan service-reel kit. Copied into each film as lib/kit.js (imports ./motion.js).
// Everything is a pure function of beat u; callers pass the beat each element lands on.
import * as M from './motion.js';

const { W, H, FORMAT, E, prog, lerp, springU, SPRING, wobble, font, layout, glyph, text, fill, rrect, fitSize, TAU } = M;

export const C = {
  navy: '#0b1a3a', panel: '#213c7a', line: '#2b4a92', green: '#00c375', white: '#ffffff', mute: '#b8c1ce', gray: '#5b6680',
};
export const DISPLAY = 'Display', UI = 'UI';
export const S = FORMAT.safe;
export const CX = S.x + S.w / 2;
export const FONTS = [font(100, 800, DISPLAY), font(40, 600, UI)];

export function bg(ctx) {
  fill(ctx, C.navy);
  ctx.fillStyle = 'rgba(255,255,255,0.05)';
  for (let y = 30; y < H; y += 60) for (let x = 30; x < W; x += 60) { ctx.beginPath(); ctx.arc(x, y, 2.2, 0, TAU); ctx.fill(); }
}

// Slide-up reveal of one line of text inside its own mask.
export function rise(ctx, u, at, str, x, y, f, color, align = 'left', h = 130) {
  const k = springU(u, at - 0.25, SPRING.snappy);
  if (k <= 0) return;
  ctx.save(); ctx.beginPath(); ctx.rect(0, y - h * 0.85, W, h); ctx.clip();
  text(ctx, str, x, y + (1 - k) * h, f, color, align);
  ctx.restore();
}

// Hook headline: lines of words, each word dropping in with squash on its beat.
// lines: [[word, color, beat], ...] per line. Returns the baseline of the last line.
export function headline(ctx, u, lines, { size, y0, lineH = 1.02, exitAt = 7.55 } = {}) {
  const sz = size || Math.min(...lines.map((ln) => fitSize(ctx, ln.map((w) => w[0]).join(' '), 800, DISPLAY, S.w, 240, -0.03)));
  const f = font(sz, 800, DISPLAY);
  const ex = E.inBack(prog(u, exitAt, exitAt + 0.45), 1.6);
  let y = y0;
  lines.forEach((ln, li) => {
    const L = layout(ctx, ln.map((w) => w[0]).join(' '), f, -0.03 * sz);
    let gi = 0;
    ln.forEach(([word, color, at], wi) => {
      const k = springU(u, at - 0.3, SPRING.bouncy);
      const q = 0.08 * wobble(u - at, 2.4, 6);
      [...word].forEach(() => {
        const g = L.glyphs[gi++];
        if (k > 0) glyph(ctx, g.ch, S.x + g.cx, y + (1 - k) * 70 - ex * (H * 0.7 + li * 80), f, color, k * (1 + q), k * (1 - q));
      });
      gi++; // space
    });
    if (li < lines.length - 1) y += sz * lineH;
  });
  return { y, size: sz };
}

export function pill(ctx, u, at, label, x, y, { size = 46, bgc = C.green, fg = C.navy, align = 'center', out = Infinity, rot = -0.04 } = {}) {
  const k = springU(u, at - 0.3, SPRING.bouncy);
  if (k <= 0) return;
  const o = E.inBack(prog(u, out, out + 0.4));
  if (o >= 1) return;
  const f = font(size, 800, DISPLAY);
  ctx.font = f; const w = ctx.measureText(label).width + size * 1.2, h = size * 1.75;
  const cx = align === 'left' ? x + w / 2 : x;
  ctx.save(); ctx.translate(cx, y); ctx.rotate(rot * (1 - k) * 3 + rot * 0.3); ctx.scale(k * (1 - o), k * (1 - o));
  rrect(ctx, -w / 2, -h / 2, w, h, h / 2); ctx.fillStyle = bgc; ctx.fill();
  text(ctx, label, 0, size * 0.36, f, fg, 'center');
  ctx.restore();
}

export function check(ctx, x, y, r, k = 1, bgc = C.green) {
  if (k <= 0.05) return;
  ctx.save(); ctx.translate(x, y); ctx.scale(k, k);
  ctx.fillStyle = bgc; ctx.beginPath(); ctx.arc(0, 0, r, 0, TAU); ctx.fill();
  ctx.strokeStyle = C.white; ctx.lineWidth = r * 0.26; ctx.lineCap = 'round'; ctx.lineJoin = 'round';
  const p = Math.min(1, k * 1.2);
  ctx.beginPath(); ctx.moveTo(-r * 0.45, r * 0.02); ctx.lineTo(-r * 0.12, r * 0.34);
  if (p > 0.5) ctx.lineTo(lerp(-r * 0.12, r * 0.48, (p - 0.5) * 2), lerp(r * 0.34, -r * 0.3, (p - 0.5) * 2));
  ctx.stroke(); ctx.restore();
}

export function star(ctx, x, y, r, color = '#f5b400') {
  ctx.beginPath();
  for (let i = 0; i < 10; i++) {
    const a = -Math.PI / 2 + (i * Math.PI) / 5, rr = i % 2 ? r * 0.45 : r;
    i ? ctx.lineTo(x + rr * Math.cos(a), y + rr * Math.sin(a)) : ctx.moveTo(x + rr * Math.cos(a), y + rr * Math.sin(a));
  }
  ctx.closePath(); ctx.fillStyle = color; ctx.fill();
}

// A feature card: panel with green edge, title and an optional line, sliding in from the right.
export function card(ctx, u, at, x, y, w, h, title, sub, { out = Infinity, num } = {}) {
  const k = springU(u, at - 0.3, SPRING.snappy);
  if (k <= 0) return;
  const o = E.inBack(prog(u, out, out + 0.4));
  ctx.save(); ctx.translate((1 - k) * (W - x + 40) - o * (x + w + 60), 0);
  rrect(ctx, x, y, w, h, 28); ctx.fillStyle = C.panel; ctx.fill();
  ctx.fillStyle = C.green; rrect(ctx, x, y, 14, h, 7); ctx.fill();
  let tx = x + 50;
  if (num != null) { text(ctx, num, tx, y + h / 2 + 22, font(64, 800, DISPLAY), C.green); tx += 100; }
  const hasSub = !!sub;
  const ts = Math.min(50, fitSize(ctx, title, 800, DISPLAY, x + w - tx - 30, 50));
  text(ctx, title, tx, y + (hasSub ? h * 0.44 : h / 2 + 18), font(ts, 800, DISPLAY), C.white);
  if (hasSub) text(ctx, sub, tx, y + h * 0.44 + 58, font(36, 600, UI), C.mute);
  ctx.restore();
}

// A real screenshot scrolling inside a phone frame. p 0..1 scrolls top to bottom.
export function phone(ctx, img, x, y, w, h, p, rot = 0) {
  ctx.save(); ctx.translate(x + w / 2, y + h / 2); ctx.rotate(rot); ctx.translate(-(x + w / 2), -(y + h / 2));
  rrect(ctx, x - 16, y - 16, w + 32, h + 32, 64); ctx.fillStyle = '#05070d'; ctx.fill();
  ctx.strokeStyle = C.line; ctx.lineWidth = 4; ctx.stroke();
  if (img) {
    rrect(ctx, x, y, w, h, 48); ctx.save(); ctx.clip();
    const ih = img.height * w / img.width;
    ctx.drawImage(img, x, y - (ih - h) * p, w, ih);
    ctx.restore();
  }
  rrect(ctx, x + w / 2 - 60, y + 14, 120, 30, 15); ctx.fillStyle = '#05070d'; ctx.fill();
  ctx.restore();
}

// Big stat that slams in: value in green display, label under it.
export function stat(ctx, u, at, value, label, y, { size = 300, out = Infinity } = {}) {
  const k = springU(u, at - 0.3, SPRING.bouncy);
  if (k <= 0) return;
  const o = E.inBack(prog(u, out, out + 0.4));
  if (o >= 1) return;
  ctx.save(); ctx.translate(CX, y - o * 1400); ctx.scale(lerp(0.3, 1, k), lerp(0.3, 1, k)); ctx.rotate((1 - k) * 0.12);
  text(ctx, value, 0, 0, font(size, 800, DISPLAY), C.green, 'center', -size * 0.03);
  ctx.restore();
  ctx.save(); ctx.translate(0, -o * 1400);
  rise(ctx, u, at + 0.5, label, CX, y + 100, font(56, 600, UI), C.white, 'center');
  ctx.restore();
}

// A timeline bar that fills: "Launch in 8–12 weeks".
export function timeline(ctx, u, at, pre, value, y, { out = Infinity } = {}) {
  const o = E.inBack(prog(u, out, out + 0.4));
  if (o >= 1) return;
  ctx.save(); ctx.translate(0, -o * 1400);
  rise(ctx, u, at - 0.25, pre, CX, y - 190, font(64, 600, UI), C.mute, 'center', 100);
  rise(ctx, u, at, value, CX, y, font(fitSize(ctx, value, 800, DISPLAY, S.w, 190), 800, DISPLAY), C.green, 'center', 230);
  const p = E.outCubic(prog(u, at + 0.3, at + 1.6));
  if (p > 0) {
    const w = S.w * 0.84, x = CX - w / 2;
    rrect(ctx, x, y + 80, w, 36, 18); ctx.fillStyle = C.panel; ctx.fill();
    rrect(ctx, x, y + 80, w * p, 36, 18); ctx.fillStyle = C.green; ctx.fill();
    ctx.fillStyle = C.white; ctx.beginPath(); ctx.arc(x + w * p, y + 98, 26, 0, TAU); ctx.fill();
  }
  ctx.restore();
}

// Small mute label at the top of a scene.
export function label(ctx, u, at, str, y = S.y + 44, out = Infinity) {
  if (u >= out) return;
  rise(ctx, u, at, str, CX, y, font(42, 600, UI), C.mute, 'center', 80);
}

// End card (cut on beat 28): logo wipe, service name, free strategy call, phone, URL.
export function endCard(ctx, u, IMG, service) {
  bg(ctx);
  const logo = IMG.logo;
  if (logo) {
    const lw = S.w, lh = lw * logo.height / logo.width, lx = CX - lw / 2, ly = 520;
    const p = E.outQuint(prog(u, 27.8, 28.6));
    ctx.save(); ctx.beginPath(); ctx.rect(lx - 10, ly - 20, (lw + 20) * p, lh + 40); ctx.clip();
    ctx.drawImage(logo, lx + (1 - p) * -60, ly, lw, lh); ctx.restore();
    if (p > 0 && p < 0.97) { ctx.fillStyle = C.green; ctx.fillRect(lx - 10 + (lw + 20) * p - 8, ly - 20, 16, lh + 40); }
  }
  const sz = Math.min(88, fitSize(ctx, service, 800, DISPLAY, S.w, 88));
  rise(ctx, u, 28.75, service, CX, 860, font(sz, 800, DISPLAY), C.white, 'center', 140);
  pill(ctx, u, 29.25, 'FREE STRATEGY CALL', CX, 1000, { size: 50, rot: 0 });
  rise(ctx, u, 29.75, '(727) 210-5044', CX, 1170, font(70, 600, UI), C.white, 'center');
  const up = springU(u, 30.2, SPRING.bouncy);
  if (up > 0) {
    ctx.save(); ctx.translate(CX, 1290); ctx.scale(up, up);
    text(ctx, 'wdmorgan.com', 0, 0, font(70, 600, UI), C.green, 'center'); ctx.restore();
    const lp = E.outCubic(prog(u, 30.5, 31.2));
    ctx.font = font(70, 600, UI); const w = ctx.measureText('wdmorgan.com').width;
    ctx.fillStyle = C.green; ctx.fillRect(CX - w / 2, 1318, w * lp, 9);
  }
}

export const END_HITS = [
  [28, 'cut to end', 'sub', { len: 0.6 }],
  [28.5, 'logo', 'bell', { pitch: 'F6' }],
  [29.25, 'strategy call', 'pop', { pitch: 'C6' }],
  [29.75, 'phone', 'tick'],
  [30.2, 'url', 'pop', { pitch: 'F6' }],
];

// Standard harness: hook until beat 8, body until 28, end card after.
export function run({ hook, body, service, images = {}, hits }) {
  M.film({
    fonts: FONTS,
    images: { logo: 'assets/logo.png', ...images },
    hits: [...hits, ...END_HITS],
    draw(ctx, u, t, IMG) {
      if (u < 8) hook(ctx, u, IMG);
      else if (u < 28) body(ctx, u, IMG);
      else endCard(ctx, u, IMG, service);
    },
  });
}
