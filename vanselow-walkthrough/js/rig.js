// The camera path, as a function of scroll progress s (0 to 1).
//
// One perspective camera does the whole page. On the sheet it hangs far above
// the house with a lens of 2 degrees, which flattens perspective until the
// model reads as a drawing. Coming down, the lens opens and the distance
// shrinks together, so there is never a cut.
//
//   1  the sheet       0.000 - 0.035
//   2  the lift        0.035 - 0.19    walls rise, camera tips back
//      the descent     0.19  - 0.32    roofs close, camera lands
//   3  arrival         0.32  - 0.43
//   4  foyer           0.43  - 0.52
//   5  great room      0.52  - 0.69
//   6  kitchen         0.69  - 0.86
//   7  lanai and pool  0.86  - 1.00

import { CUT_PLAN, CUT_OPEN } from './plan.js';

const io = (t) => t * t * (3 - 2 * t);
const io5 = (t) => t * t * t * (t * (t * 6 - 15) + 10);
const lin = (t) => t;
const clamp01 = (t) => Math.min(1, Math.max(0, t));
const rad = Math.PI / 180;

// keys: [s, value, ease into this key]
function track(keys) {
  return (s) => {
    if (s <= keys[0][0]) return keys[0][1];
    for (let i = 1; i < keys.length; i++) {
      if (s <= keys[i][0]) {
        const t = (s - keys[i - 1][0]) / (keys[i][0] - keys[i - 1][0]);
        const e = (keys[i][2] ?? lin)(t);
        return keys[i - 1][1] + (keys[i][1] - keys[i - 1][1]) * e;
      }
    }
    return keys[keys.length - 1][1];
  };
}

// Smooth curve through keys that never overshoots (monotone cubic), with the
// first and last key at rest. Used for walking so the pace never stops dead.
function glide(keys) {
  const n = keys.length;
  const xs = keys.map((k) => k[0]), ys = keys.map((k) => k[1]);
  const d = [], m = new Array(n).fill(0);
  for (let i = 0; i < n - 1; i++) d.push((ys[i + 1] - ys[i]) / (xs[i + 1] - xs[i]));
  for (let i = 1; i < n - 1; i++) m[i] = d[i - 1] * d[i] <= 0 ? 0 : (2 * d[i - 1] * d[i]) / (d[i - 1] + d[i]);
  return (s) => {
    if (s <= xs[0]) return ys[0];
    if (s >= xs[n - 1]) return ys[n - 1];
    let i = 0;
    while (s > xs[i + 1]) i++;
    const h = xs[i + 1] - xs[i], t = (s - xs[i]) / h;
    const t2 = t * t, t3 = t2 * t;
    return (2 * t3 - 3 * t2 + 1) * ys[i] + (t3 - 2 * t2 + t) * h * m[i] + (-2 * t3 + 3 * t2) * ys[i + 1] + (t3 - t2) * h * m[i + 1];
  };
}

export const STOPS = { sheetEnd: 0.035, liftEnd: 0.19, landed: 0.32, walk: 0.345, end: 1 };

export function makeRig(aspect) {
  const portrait = aspect < 0.9;
  // the lens used at eye height: wide enough to feel the room, never fisheye
  const fovWalk = portrait ? 76 : aspect < 1.5 ? 58 : 50;
  // what the sheet shows: a frame F0 metres tall, centred on (cx, cn)
  // (on a phone the sheet is taller: headline above the plan, title block below)
  const F0 = portrait ? 82 : 60;
  const cn = portrait ? 24.2 : 17.2;
  const cx = portrait ? 2.4 : 3.0 - 0.26 * ((F0 * aspect) / 2);
  const frame = { cx, cn, w: F0 * aspect, h: F0 };

  const L = Math.log, T = (deg) => Math.tan((deg * rad) / 2);
  const DOOR_Z = 0.2;
  const REST_Z = 8.2; // where the camera lands, 8 m from the door
  const landFrame = 2 * (REST_Z - DOOR_Z) * T(fovWalk);
  const { sheetEnd: s1, liftEnd: s2, landed: s3 } = STOPS;

  // ---- stops 1 and 2: framed from above -----------------------------------
  // tip early, so the walls are seen rising rather than only seen risen
  const early = (t) => 0.5 * io(t) + 0.5 * (1 - (1 - t) * (1 - t));
  const elev = track([[0, 90], [s1, 90], [s2, 33, early], [s3, 0, io]]);
  const fovL = track([[0, L(T(2))], [s1, L(T(2))], [s2, L(T(4.6)), io], [s3, L(T(fovWalk)), io5]]);
  const frmL = track([[0, L(F0)], [s1, L(F0)], [s2, L(portrait ? 62 : 46), io], [s3, L(landFrame), io5]]);
  const tx = track([[0, cx], [s1, cx], [s2, portrait ? 3.0 : 2.4, io], [s3, 0.15, io]]);
  const ty = track([[0, 0], [s1, 0], [s2, 1.2, io], [s3, 1.45, io]]);
  const tz = track([[0, -cn], [s1, -cn], [s2, -15.5, io], [s3, DOOR_Z, io]]);
  // walls first; the roofs only close in the last stretch of the descent
  const cut = track([[0, CUT_PLAN], [s1 + 0.008, CUT_PLAN], [s2, 2.64, io], [0.251, 2.69, lin], [0.306, CUT_OPEN, io]]);
  const fogN = track([[0, L(4000)], [s2, L(4000)], [s3, L(26), io]]);
  const fogF = track([[0, L(9000)], [s2, L(9000)], [s3, L(92), io]]);

  // ---- stops 3 and 4: on foot -------------------------------------------------
  const pz = glide([
    [s3, REST_Z], [0.345, 7.85], [0.39, 4.5], [0.43, 1.0], [0.47, -1.6], // arrival, door, foyer
    [0.52, -4.6], [0.57, -8.4], [0.62, -11.2], [0.665, -14.4], // great room
    [0.71, -17.6], [0.76, -20.6], [0.81, -23.4], [0.855, -26.4], // kitchen
    [0.9, -28.8], [0.95, -29.9], [1, -30.3], // out onto the lanai
  ]);
  // head turns: towards the sofa and glass wall in the great room, the island in the kitchen
  const yawS = glide([[0.5, 0], [0.575, 0.55], [0.615, 0.46], [0.66, 0], [0.7, 0.12], [0.745, 0.72], [0.79, 0.62], [0.835, 0.12], [0.87, 0], [0.94, -0.12], [1, -0.04]]);
  const pitchS = glide([[0.43, 0], [0.5, -4.5], [0.58, 1.5], [0.66, -1.5], [0.75, -9], [0.82, -5], [0.9, -3], [1, -2.5]]);

  function at(sIn) {
    const s = clamp01(sIn);
    const o = { s };
    o.cut = cut(s);
    o.fogNear = Math.exp(fogN(s));
    o.fogFar = Math.exp(fogF(s));
    if (s <= s3) {
      const e = elev(s) * rad;
      const tanHalf = Math.exp(fovL(s));
      const dist = Math.exp(frmL(s)) / (2 * tanHalf);
      o.fov = (2 * Math.atan(tanHalf)) / rad;
      o.pitch = -e;
      o.yaw = 0;
      o.x = tx(s);
      o.y = ty(s) + dist * Math.sin(e);
      o.z = tz(s) + dist * Math.cos(e);
      o.dist = dist;
      o.door = 0;
      o.reveal = { hall: 0, living: 0, kitchen: 0, court: 0 };
    } else {
      const z = pz(s);
      o.fov = fovWalk;
      o.yaw = yawS(s);
      o.pitch = s < 0.5 ? -4.5 * rad * io(clamp01((1.6 - z) / 2.4)) : pitchS(s) * rad;
      o.x = 0.15;
      o.y = 1.45 + 0.15 * io(clamp01((3.4 - z) / 1.2)); // one step up onto the landing
      o.z = z;
      o.dist = 8;
      o.door = io(clamp01((6.9 - z) / 4.4));
      // each sweep starts as the camera reaches that room's threshold
      o.reveal = {
        hall: clamp01((1.35 - z) / 2.1),
        living: clamp01((-4.4 - z) / 3.6),
        kitchen: clamp01((-15.2 - z) / 3.6),
        court: clamp01((-25.6 - z) / 3.4),
      };
    }
    // keep the depth buffer tight: from far above, everything sits in a thin slab
    o.near = Math.max(0.08, (o.y - 7) * 0.6);
    o.far = o.y > 60 ? o.y * 1.6 + 500 : 700;
    return o;
  }

  return { at, frame, portrait, fovWalk };
}
