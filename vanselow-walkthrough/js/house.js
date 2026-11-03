// Van Selow Design Build: the model. One building, used for the plan, the
// rising walls and the walk. Plan coordinates (x east, n north) are turned into
// three.js coordinates by z = -n.

import * as THREE from 'three';
import { RectSolid, pushBox, bucketToGeometry } from './solid.js';
import { ROOMS, BASE_Y, GROUND_Y, TREES, DOORS, POOL } from './plan.js';

const roomAt = (x, n, y = 0) => {
  for (const r of ROOMS) if (x > r.x0 && x < r.x1 && n > r.n0 && n < r.n1 && y < r.ceil + 0.1) return r.key;
  return 'rest';
};

// Collects loose pieces (furniture, glass, frames) per room and material.
class Kit {
  constructor() {
    this.b = {};
    this.e = {};
  }
  bucket(room, mat) {
    return (this.b[room + '|' + mat] ??= { p: [], n: [], uv: [], idx: [] });
  }
  edges(room) {
    return (this.e[room] ??= []);
  }
  box(room, mat, x0, n0, x1, n1, y0, y1, edges = true) {
    pushBox(
      this.bucket(room, mat), edges ? this.edges(room) : null,
      Math.min(x0, x1), Math.min(y0, y1), -Math.max(n0, n1), Math.max(x0, x1), Math.max(y0, y1), -Math.min(n0, n1)
    );
  }
  // any three.js geometry, already placed in world space
  geo(room, mat, g, edgeAngle = 30) {
    const B = this.bucket(room, mat);
    const src = g.index ? g.toNonIndexed() : g;
    const p = src.attributes.position, nrm = src.attributes.normal, uv = src.attributes.uv;
    const base = B.p.length / 3;
    for (let i = 0; i < p.count; i++) {
      B.p.push(p.getX(i), p.getY(i), p.getZ(i));
      B.n.push(nrm.getX(i), nrm.getY(i), nrm.getZ(i));
      B.uv.push(uv ? uv.getX(i) : 0, uv ? uv.getY(i) : 0);
      B.idx.push(base + i);
    }
    if (edgeAngle !== null) {
      const eg = new THREE.EdgesGeometry(g, edgeAngle);
      const E = this.edges(room), ep = eg.attributes.position;
      for (let i = 0; i < ep.count; i++) E.push(ep.getX(i), ep.getY(i), ep.getZ(i));
    }
  }
}

const place = (g, x, y, n, ry = 0, sx = 1, sy = 1, sz = 1) => {
  g.applyMatrix4(new THREE.Matrix4().compose(new THREE.Vector3(x, y, -n), new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0, 1, 0), ry), new THREE.Vector3(sx, sy, sz)));
  return g;
};
const profile = (pts, n = 30) => new THREE.SplineCurve(pts.map((p) => new THREE.Vector2(p[0], p[1]))).getPoints(n);

export function buildHouse() {
  // ------------------------------------------------------------------
  // 1. The shell: floor slab and walls as one solid.
  // ------------------------------------------------------------------
  const S = new RectSolid();
  const A = (x0, n0, x1, n1, y0, y1) => S.add(x0, y0, -n0, x1, y1, -n1);
  const C = (x0, n0, x1, n1, y0, y1) => S.sub(x0, y0, -n0, x1, y1, -n1);

  const LOW = 3.2; // parapet of the low roofs
  const HL = 4.9; // great room walls
  const HK = 3.8; // kitchen walls
  const KNEE = 0.55; // knee wall of the pool cage

  // floor slab: house, lanai, entrance landing
  A(-6.4, -0.4, 12.4, 28.8, BASE_Y, 0);
  A(-6.4, 28.6, 6.4, 41.0, BASE_Y, 0);
  A(-3.4, -3.0, 3.4, -0.4, BASE_Y, 0);

  // outside walls
  A(-6.4, -0.4, 12.4, 0, 0, LOW); // front (south)
  A(-6.4, -0.4, -6.0, 7.2, 0, LOW); // west, by the office
  A(-6.4, 7.0, -6.0, 18.4, 0, HL); // west, great room
  A(-6.4, 18.2, -6.0, 28.6, 0, HK); // west, kitchen
  A(12.0, -0.4, 12.4, 28.8, 0, LOW); // east, bedroom wing
  A(6.2, 28.4, 12.4, 28.8, 0, LOW); // north end of the wing
  A(-6.4, 28.4, 6.2, 28.6, 0, HK); // kitchen to lanai
  // pool cage knee walls
  A(-6.4, 28.6, -6.0, 41.0, 0, KNEE);
  A(-6.4, 40.6, 6.4, 41.0, 0, KNEE);
  A(6.0, 28.8, 6.4, 41.0, 0, KNEE);

  // the cross walls of the long bar
  A(-6.4, 7.0, 6.2, 7.2, 0, HL); // foyer block | great room
  A(-6.4, 18.2, 6.2, 18.4, 0, HL); // great room | kitchen
  // the wall between the bar and the bedroom wing
  A(6.0, 0, 6.2, 7.0, 0, 2.7);
  A(6.0, 7.0, 6.2, 18.4, 0, HL);
  A(6.0, 18.2, 6.2, 28.6, 0, HK);

  // foyer side walls, office | mudroom | powder
  A(-2.2, 0, -2.0, 7.0, 0, 2.7);
  A(2.0, 0, 2.2, 7.0, 0, 2.7);
  A(2.2, 4.3, 6.0, 4.5, 0, 2.7);

  // bedroom wing partitions
  A(7.6, 0, 7.8, 28.4, 0, 2.7); // gallery
  A(7.8, 6.3, 12.0, 6.5, 0, 2.7);
  A(7.8, 12.8, 12.0, 13.0, 0, 2.7);
  A(7.8, 17.0, 12.0, 17.2, 0, 2.7);
  A(9.8, 13.0, 10.0, 17.0, 0, 2.7);
  A(7.8, 24.2, 12.0, 24.4, 0, 2.7);

  // linear fireplace in a white stone surround, east wall of the great room
  A(5.2, 10.6, 6.0, 15.4, 0, 4.2);
  C(5.2, 11.4, 5.75, 14.6, 0.5, 0.95);

  // ---- openings ----
  C(-2.0, -0.4, 2.0, 0, 0, 2.7); // glazed front of the foyer
  C(-1.2, 7.0, 1.2, 7.2, 0, 2.7); // foyer to great room
  C(-1.5, 18.2, 1.5, 18.4, 0, 3.0); // great room to kitchen
  C(-5.4, 28.4, 5.4, 28.6, 0, 2.9); // kitchen to lanai: a wall of sliders
  C(-6.4, 8.0, -6.0, 17.4, 0, 4.2); // great room glass wall, west
  // windows
  C(-6.4, 2.0, -6.0, 5.0, 0.9, 2.4); // office, west
  C(-5.2, -0.4, -3.2, 0, 0.9, 2.4); // office, south
  C(-6.4, 19.6, -6.0, 22.4, 1.0, 2.6); // kitchen, west, either side of the hood
  C(-6.4, 24.6, -6.0, 27.4, 1.0, 2.6);
  C(12.0, 1.5, 12.4, 4.5, 0.9, 2.4); // bedroom 3
  C(8.8, -0.4, 11.0, 0, 0.9, 2.4); // bedroom 3, south
  C(12.0, 8.0, 12.4, 11.0, 0.9, 2.4); // bedroom 2
  C(12.0, 19.0, 12.4, 23.0, 0, 2.4); // primary suite
  // doors, 0.9 wide and 2.2 high
  C(2.0, 0.7, 2.2, 1.6, 0, 2.2);
  C(4.6, 4.3, 5.4, 4.5, 0, 2.2);
  C(-5.0, 7.0, -4.1, 7.2, 0, 2.2);
  C(6.0, 8.2, 6.2, 9.1, 0, 2.2);
  C(7.6, 5.2, 7.8, 6.1, 0, 2.2);
  C(7.6, 7.0, 7.8, 7.9, 0, 2.2);
  C(7.6, 14.6, 7.8, 15.4, 0, 2.2);
  C(10.6, 12.8, 11.4, 13.0, 0, 2.2);
  C(7.6, 17.6, 7.8, 18.5, 0, 2.2);
  C(8.2, 24.2, 9.1, 24.4, 0, 2.2);
  // shadow gaps between the oak panels of the foyer's east wall
  for (const n of [2.5, 3.4, 4.3, 5.2, 6.1]) C(2.0, n, 2.008, n + 0.008, 0, 2.7);
  // pool
  C(POOL.x0, POOL.n0, POOL.x1, POOL.n1, BASE_Y, 0);

  const shell = S.build(
    (cx, cy, cz, nx, ny, nz) => {
      const n = -cz;
      if (ny > 0.5 && Math.abs(cy) < 1e-3) return n > 28.5 ? 'deck' : 'floor';
      if (cx > 1.99 && cx < 2.19 && n > 0 && n < 7 && cy > 0 && cy < 2.7 && nx < 0.5) return 'oak';
      if (cx > 5.19 && n > 10.59 && n < 15.41 && cy < 4.2 && cy > 0) {
        if (cx < 5.76 && n > 11.39 && n < 14.61 && cy > 0.49 && cy < 0.96) return 'soot';
        return 'firestone';
      }
      if (n > 28.6 && cy < 0.56) return 'deck';
      return 'plaster';
    },
    (mx, my, mz, ax, ay, az) => roomAt(ax, -az, ay)
  );

  // ------------------------------------------------------------------
  // 2. Roofs: their own solid, so that the cut shows them as a plain lid.
  // ------------------------------------------------------------------
  const Rf = new RectSolid();
  const RA = (x0, n0, x1, n1, y0, y1) => Rf.add(x0, y0, -n0, x1, y1, -n1);
  RA(-6.0, 0, 12.0, 7.0, 2.7, 3.0); // foyer block and the south end of the wing
  RA(6.2, 7.0, 12.0, 28.4, 2.7, 3.0); // wing
  RA(-6.0, 7.2, 6.0, 18.2, 4.2, 4.55); // great room
  RA(-6.0, 18.4, 6.0, 28.4, 3.2, 3.5); // kitchen
  RA(-6.4, 28.6, 6.4, 32.0, 3.0, 3.25); // covered lanai
  const roof = Rf.build(
    (cx, cy, cz, nx, ny) => (ny < -0.5 ? 'ceiling' : 'plaster'),
    (mx, my, mz, ax, ay, az) => roomAt(ax, -az, ay)
  );

  // ------------------------------------------------------------------
  // 3. Loose pieces.
  // ------------------------------------------------------------------
  const K = new Kit();
  const G = 'generic';

  // ---- glass and frames ----
  K.box('hall', 'glass', -1.97, -0.22, -0.8, -0.18, 0.02, 2.68); // sidelights
  K.box('hall', 'glass', 0.8, -0.22, 1.97, -0.18, 0.02, 2.68);
  for (const x of [-2.0, -0.8, 0.75, 1.95]) K.box('hall', 'bronze', x, -0.26, x + 0.05, -0.14, 0, 2.7);
  K.box('hall', 'bronze', -2.0, -0.26, 2.0, -0.14, 2.66, 2.7);
  // great room, west: impact glass in slim bronze frames
  for (const n of [8.0, 10.35, 12.7, 15.05, 17.32]) K.box('living', 'bronze', -6.28, n, -6.14, n + 0.08, 0, 4.2);
  K.box('living', 'glass', -6.22, 8.08, -6.19, 17.32, 0.02, 4.18);
  K.box('living', 'bronze', -6.28, 8.0, -6.14, 17.4, 0, 0.05);
  K.box('living', 'bronze', -6.28, 8.0, -6.14, 17.4, 2.7, 2.76);
  // kitchen to lanai: four sliding panes
  for (const x of [-5.4, -2.72, -0.04, 2.64, 5.32]) K.box('kitchen', 'bronze', x, 28.46, x + 0.08, 28.56, 0, 2.9);
  K.box('kitchen', 'glass', -5.32, 28.5, 5.32, 28.52, 0.02, 2.88);
  // ordinary windows
  K.box('rest', 'glass', -6.21, 2.0, -6.19, 5.0, 0.9, 2.4);
  K.box('rest', 'glass', -5.2, -0.21, -3.2, -0.19, 0.9, 2.4);
  K.box('kitchen', 'glass', -6.21, 19.6, -6.19, 22.4, 1.0, 2.6);
  K.box('kitchen', 'glass', -6.21, 24.6, -6.19, 27.4, 1.0, 2.6);
  K.box('rest', 'glass', 12.19, 1.5, 12.21, 4.5, 0.9, 2.4);
  K.box('rest', 'glass', 8.8, -0.21, 11.0, -0.19, 0.9, 2.4);
  K.box('rest', 'glass', 12.19, 8.0, 12.21, 11.0, 0.9, 2.4);
  K.box('rest', 'glass', 12.19, 19.0, 12.21, 23.0, 0.02, 2.4);

  // ---- inner doors, standing open the way a plan draws them ----
  for (const d of DOORS) {
    const a = (d.open * Math.PI) / 180;
    const x1 = d.x + Math.cos(a) * 0.9, n1 = d.n + Math.sin(a) * 0.9;
    if (Math.abs(Math.cos(a)) > 0.5) K.box('rest', G, d.x, d.n, x1, d.n + 0.04, 0.01, 2.19);
    else K.box('rest', G, d.x, d.n, d.x + 0.04, n1, 0.01, 2.19);
  }

  // ==================================================================
  // FOYER
  // ==================================================================
  // marble console on two blades, west wall
  K.box('hall', 'quartz', -2.0, 2.9, -1.52, 5.5, 0.74, 0.82);
  K.box('hall', 'brass', -1.96, 3.08, -1.58, 3.16, 0, 0.74);
  K.box('hall', 'brass', -1.96, 5.24, -1.58, 5.32, 0, 0.74);
  // painting above it
  K.box('hall', 'painting', -1.992, 3.3, -1.965, 5.1, 1.14, 2.44);
  K.box('hall', 'trim', -1.998, 3.27, -1.955, 3.3, 1.11, 2.47, false);
  K.box('hall', 'trim', -1.998, 5.1, -1.955, 5.13, 1.11, 2.47, false);
  K.box('hall', 'trim', -1.998, 3.27, -1.955, 5.13, 1.11, 1.14, false);
  K.box('hall', 'trim', -1.998, 3.27, -1.955, 5.13, 2.44, 2.47, false);
  // things on the console
  const vase = new THREE.LatheGeometry([new THREE.Vector2(0, 0), ...profile([[0.07, 0], [0.125, 0.07], [0.15, 0.17], [0.12, 0.28], [0.065, 0.35], [0.048, 0.39], [0.058, 0.42]])], 40);
  K.geo('hall', 'ceramicBlue', place(vase, -1.74, 0.82, 3.55), 60);
  const twig = (dx, dn, h, lean) => {
    const g = new THREE.CylinderGeometry(0.002, 0.0045, h, 5);
    g.translate(0, h / 2, 0);
    g.rotateZ(lean * dx);
    g.rotateX(lean * dn);
    K.geo('hall', 'branch', place(g, -1.74, 1.2, 3.55), null);
    const top = new THREE.Vector3(0, h, 0).applyEuler(new THREE.Euler(lean * dn, 0, lean * dx));
    K.edges('hall').push(-1.74, 1.2, -3.55, -1.74 + top.x, 1.2 + top.y, -3.55 + top.z);
  };
  twig(1, 0.2, 0.95, 0.3); twig(-0.6, -1, 0.8, 0.28); twig(0.3, 1, 1.05, 0.2); twig(-1, 0.6, 0.72, 0.34); twig(0.9, -0.7, 0.86, 0.18); twig(-0.2, -0.3, 1.1, 0.12); twig(0.5, 0.9, 0.6, 0.4);
  const mkBowl = () => new THREE.LatheGeometry([[0.0, 0.0], [0.06, 0.0], [0.15, 0.035], [0.19, 0.075], [0.185, 0.08], [0.14, 0.045], [0.0, 0.02]].map((p) => new THREE.Vector2(p[0], p[1])), 28);
  K.geo('hall', 'brass', place(mkBowl(), -1.74, 0.82, 4.35), 35);
  K.box('hall', 'bookA', -1.9, 4.85, -1.62, 5.22, 0.82, 0.855);
  K.box('hall', 'bookB', -1.89, 4.87, -1.64, 5.2, 0.855, 0.885);
  K.box('hall', 'bookC', -1.87, 4.9, -1.66, 5.16, 0.885, 0.91);
  // oak bench with a linen cushion, east wall
  K.box('hall', 'oakLong', 1.5, 3.0, 1.96, 4.9, 0.36, 0.42);
  K.box('hall', 'oakLong', 1.54, 3.12, 1.92, 3.18, 0, 0.36);
  K.box('hall', 'oakLong', 1.54, 4.72, 1.92, 4.78, 0, 0.36);
  K.box('hall', 'linen', 1.52, 3.03, 1.94, 4.87, 0.42, 0.49);
  // tall jar in the far corner
  const jar = new THREE.LatheGeometry([new THREE.Vector2(0, 0), ...profile([[0.16, 0], [0.25, 0.14], [0.3, 0.4], [0.26, 0.64], [0.165, 0.8], [0.125, 0.86], [0.145, 0.9]])], 44);
  K.geo('hall', 'ceramicSand', place(jar, -1.52, 0, 6.48), 60);
  // three small lights let into the ceiling
  for (const n of [1.3, 3.5, 5.7]) K.geo('hall', 'lamp', place(new THREE.CylinderGeometry(0.045, 0.045, 0.012, 20), 0, 2.694, n), 35);

  // ==================================================================
  // GREAT ROOM
  // ==================================================================
  K.box('living', 'rug', -4.7, 9.6, 1.0, 16.0, 0, 0.015); // rug
  // linen sectional facing the fireplace, with a return along the north
  K.box('living', 'linen', -4.4, 10.4, -3.3, 15.9, 0, 0.42);
  K.box('living', 'linen', -4.4, 10.4, -4.08, 15.9, 0.42, 0.82);
  K.box('living', 'linen', -4.4, 10.4, -3.3, 10.66, 0.42, 0.62);
  K.box('living', 'linen', -4.08, 14.8, -1.4, 15.9, 0, 0.42);
  K.box('living', 'linen', -4.08, 15.58, -1.4, 15.9, 0.42, 0.82);
  K.box('living', 'linen', -1.66, 14.8, -1.4, 15.58, 0.42, 0.62);
  for (const n of [10.7, 12.0, 13.3]) K.box('living', 'linenSeat', -4.06, n + 0.02, -3.32, n + 1.26, 0.42, 0.54);
  for (const x of [-3.3, -2.48]) K.box('living', 'linenSeat', x, 14.82, x + 0.8, 15.56, 0.42, 0.54);
  // throw pillows
  for (const [x0, n0, x1, n1] of [[-4.04, 10.75, -3.9, 11.25], [-4.04, 13.6, -3.9, 14.1], [-3.95, 15.42, -3.45, 15.56], [-2.2, 15.42, -1.7, 15.56]]) K.box('living', 'navy', x0, n0, x1, n1, 0.54, 0.95);
  // low oak table and a tray
  K.box('living', 'oakLong', -2.6, 11.4, -1.0, 13.9, 0.34, 0.4);
  K.box('living', 'oakLong', -2.5, 11.5, -1.1, 13.8, 0, 0.34);
  K.box('living', 'ceramicSand', -2.0, 12.3, -1.55, 12.9, 0.4, 0.43);
  // two armchairs across from the sofa
  for (const n of [10.6, 13.6]) {
    K.box('living', 'navy', 1.3, n, 2.2, n + 0.9, 0, 0.4);
    K.box('living', 'navy', 1.95, n, 2.2, n + 0.9, 0.4, 0.8);
    K.box('living', 'navy', 1.3, n, 1.95, n + 0.14, 0.4, 0.6);
    K.box('living', 'navy', 1.3, n + 0.76, 1.95, n + 0.9, 0.4, 0.6);
  }
  K.box('living', 'oakLong', 4.55, 10.6, 5.2, 15.4, 0, 0.32); // hearth bench
  // white oak built-ins either side of the fireplace
  K.box('living', 'cabinet', 5.5, 8.0, 6.0, 10.4, 0, 0.8);
  K.box('living', 'cabinet', 5.5, 15.6, 6.0, 18.0, 0, 0.8);
  for (const y of [1.3, 1.85, 2.4]) {
    K.box('living', 'oakLong', 5.65, 8.0, 6.0, 10.4, y, y + 0.04);
    K.box('living', 'oakLong', 5.65, 15.6, 6.0, 18.0, y, y + 0.04);
  }
  K.box('living', 'ceramicBlue', 5.72, 8.5, 5.94, 8.75, 1.34, 1.62);
  K.box('living', 'bookB', 5.7, 16.2, 5.95, 16.8, 1.89, 2.12);
  K.box('living', 'ceramicSand', 5.72, 9.4, 5.94, 9.62, 1.89, 2.25);
  // a painting over the fireplace
  K.box('living', 'painting2', 5.17, 11.6, 5.2, 14.4, 1.9, 3.5);
  K.box('living', 'oakLong', 2.4, 7.25, 5.0, 7.75, 0, 0.76); // sideboard, south wall
  K.box('living', 'brass', -5.6, 7.45, -5.5, 7.55, 0, 1.55); // floor lamp
  K.geo('living', 'lampShade', place(new THREE.CylinderGeometry(0.17, 0.22, 0.3, 24, 1, true), -5.55, 1.62, 7.5), 50);
  K.box('living', 'leather', -5.5, 16.3, -4.6, 17.2, 0, 0.42); // reading chair
  K.box('living', 'leather', -5.5, 16.98, -4.6, 17.2, 0.42, 0.85);
  // exposed cypress beams across the vaulted ceiling
  for (const n of [8.9, 11.5, 14.1, 16.7]) K.box('living', 'oakBeam', -6.0, n - 0.11, 6.0, n + 0.11, 3.92, 4.2);
  // ceiling fan
  K.box('living', 'brass', 0.11, 12.66, 0.19, 12.74, 3.55, 3.92, false);
  K.geo('living', 'oakBeam', place(new THREE.CylinderGeometry(0.11, 0.13, 0.14, 20), 0.15, 3.48, 12.7), 40);
  for (let i = 0; i < 5; i++) {
    const a = (i / 5) * Math.PI * 2 + 0.3;
    const g = new THREE.BoxGeometry(0.62, 0.012, 0.13);
    g.translate(0.42, 0, 0);
    K.geo('living', 'oakLong', place(g, 0.15, 3.47, 12.7, a), 30);
  }

  // ==================================================================
  // KITCHEN AND DINING
  // ==================================================================
  // perimeter run under the windows, west wall
  K.box('kitchen', 'cabinet', -6.0, 19.2, -5.38, 27.8, 0.1, 0.88);
  K.box('kitchen', 'navy', -6.0, 19.2, -5.42, 27.8, 0, 0.1, false); // toe kick
  K.box('kitchen', 'quartz', -6.0, 19.15, -5.32, 27.85, 0.88, 0.92);
  K.box('kitchen', 'quartz', -6.0, 19.15, -5.97, 27.85, 0.92, 1.0, false); // backsplash lip
  // drawer and door seams on the cabinet faces, drawn as thin brass pulls
  for (let n = 19.5; n < 27.6; n += 0.6) K.box('kitchen', 'brass', -5.37, n, -5.35, n + 0.26, 0.76, 0.78, false);
  // range and hood between the windows
  K.box('kitchen', 'steel', -6.0, 22.75, -5.36, 24.25, 0.1, 0.9);
  K.box('kitchen', 'steelDark', -6.0, 22.8, -5.38, 24.2, 0.9, 0.93);
  K.box('kitchen', 'plaster2', -6.0, 22.7, -5.45, 24.3, 1.75, 2.15);
  K.box('kitchen', 'plaster2', -6.0, 23.0, -5.65, 24.0, 2.15, 3.2);
  K.box('kitchen', 'brass', -5.46, 22.7, -5.44, 24.3, 1.75, 1.79, false);
  // the tall wall: fridge and pantry
  K.box('kitchen', 'cabinet', -6.0, 18.42, -2.2, 19.05, 0, 2.6);
  for (const x of [-5.0, -4.05, -3.1]) K.box('kitchen', 'brass', x, 19.06, x + 0.02, 19.09, 0.9, 1.7, false);
  // the island: navy cabinetry, quartz top, brass pulls
  K.box('kitchen', 'navy', -3.5, 20.2, -2.3, 24.4, 0.08, 0.88);
  K.box('kitchen', 'navyDark', -3.44, 20.26, -2.36, 24.34, 0, 0.08, false);
  K.box('kitchen', 'quartz', -3.56, 20.1, -2.0, 24.5, 0.88, 0.93);
  for (const n of [20.6, 21.6, 22.6, 23.6]) K.box('kitchen', 'brass', -3.52, n, -3.5, n + 0.28, 0.74, 0.76, false);
  // four counter stools on the east side
  for (const n of [20.75, 21.75, 22.75, 23.75]) {
    K.geo('kitchen', 'linenSeat', place(new THREE.CylinderGeometry(0.21, 0.2, 0.08, 24), -1.7, 0.66, n), 40);
    K.geo('kitchen', 'brass', place(new THREE.CylinderGeometry(0.018, 0.022, 0.62, 8), -1.7, 0.31, n), null);
    K.geo('kitchen', 'brass', place(new THREE.TorusGeometry(0.17, 0.008, 6, 24).rotateX(Math.PI / 2), -1.7, 0.24, n), null);
  }
  // three pendants over the island
  for (const n of [21.0, 22.3, 23.6]) {
    K.box('kitchen', 'brass', -2.79, n - 0.006, -2.77, n + 0.006, 2.02, 3.2, false);
    const shade = new THREE.LatheGeometry([[0.012, 0.3], [0.05, 0.29], [0.14, 0.18], [0.2, 0.04], [0.21, 0.0]].map((p) => new THREE.Vector2(p[0], p[1])), 32);
    K.geo('kitchen', 'brass', place(shade, -2.78, 1.72, n), 45);
    K.geo('kitchen', 'lamp', place(new THREE.CircleGeometry(0.19, 24).rotateX(Math.PI / 2), -2.78, 1.725, n), null);
  }
  // dining table for eight, upholstered chairs, a woven chandelier
  K.box('kitchen', 'oakLong', 1.9, 20.6, 3.1, 24.0, 0.72, 0.77);
  for (const [x, n] of [[2.0, 20.75], [2.92, 20.75], [2.0, 23.77], [2.92, 23.77]]) K.box('kitchen', 'oakLong', x, n, x + 0.08, n + 0.08, 0, 0.72);
  for (let i = 0; i < 4; i++) {
    const n = 20.9 + i * 0.8;
    K.box('kitchen', 'linen', 1.25, n, 1.72, n + 0.48, 0.02, 0.48);
    K.box('kitchen', 'linen', 1.25, n, 1.32, n + 0.48, 0.48, 0.92);
    K.box('kitchen', 'linen', 3.28, n, 3.75, n + 0.48, 0.02, 0.48);
    K.box('kitchen', 'linen', 3.68, n, 3.75, n + 0.48, 0.48, 0.92);
  }
  const lantern = new THREE.SphereGeometry(0.42, 18, 10, 0, Math.PI * 2, 0, Math.PI * 0.62);
  K.geo('kitchen', 'rattan', place(lantern, 2.5, 1.62, 22.3, 0, 1, -0.75, 1), 50);
  K.geo('kitchen', 'lamp', place(new THREE.SphereGeometry(0.08, 12, 8), 2.5, 1.58, 22.3), null);
  K.box('kitchen', 'brass', 2.49, 22.29, 2.51, 22.31, 1.62, 3.2, false);
  K.box('kitchen', 'cabinet', 5.45, 19.6, 6.0, 25.0, 0, 0.84); // buffet
  K.box('kitchen', 'quartz', 5.4, 19.55, 6.0, 25.05, 0.84, 0.88);
  K.geo('kitchen', 'ceramicSand', place(new THREE.LatheGeometry([new THREE.Vector2(0, 0), ...profile([[0.1, 0], [0.16, 0.12], [0.11, 0.3], [0.06, 0.38], [0.07, 0.4]])], 30), 5.72, 0.88, 21.0), 60);
  // a bowl of lemons on the island
  K.geo('kitchen', 'ceramicWhite', place(mkBowl().scale(1.4, 1.6, 1.4), -2.9, 0.93, 22.6), 40);
  for (const [dx, dn] of [[0, 0], [0.09, 0.06], [-0.08, 0.07], [0.02, -0.1], [-0.05, -0.04]]) K.geo('kitchen', 'lemon', place(new THREE.SphereGeometry(0.045, 12, 8).scale(1, 0.92, 1.2), -2.9 + dx, 1.0, 22.6 + dn), null);

  // ==================================================================
  // LANAI AND POOL
  // ==================================================================
  // posts of the covered lanai
  for (const x of [-6.2, -2.2, 2.0, 6.0]) K.box('court', 'trim', x, 31.8, x + 0.2, 32.0, 0, 3.0);
  // the screened pool cage: aluminium frame and screens
  const CAGE = 4.2;
  const post = (x, n) => K.box('court', 'alu', x - 0.05, n - 0.05, x + 0.05, n + 0.05, KNEE, CAGE);
  for (let n = 32.0; n <= 40.85; n += 2.2) { post(-6.2, n); post(6.2, n); }
  for (let x = -6.2; x <= 6.25; x += 2.07) post(x, 40.8);
  K.box('court', 'alu', -6.25, 31.95, -6.15, 40.85, CAGE - 0.08, CAGE);
  K.box('court', 'alu', 6.15, 31.95, 6.25, 40.85, CAGE - 0.08, CAGE);
  K.box('court', 'alu', -6.25, 40.75, 6.25, 40.85, CAGE - 0.08, CAGE);
  for (let n = 33.1; n < 40.8; n += 2.2) K.box('court', 'alu', -6.2, n - 0.035, 6.2, n + 0.035, CAGE - 0.06, CAGE, false);
  K.box('court', 'alu', -6.2, 31.96, 6.2, 32.04, 3.25, CAGE, false);
  K.box('court', 'screen', -6.22, 32.0, -6.18, 40.8, KNEE, CAGE);
  K.box('court', 'screen', 6.18, 32.0, 6.22, 40.8, KNEE, CAGE);
  K.box('court', 'screen', -6.2, 40.78, 6.2, 40.82, KNEE, CAGE);
  K.box('court', 'screen', -6.2, 32.0, 6.2, 40.8, CAGE - 0.01, CAGE + 0.01, false);
  // the water, with a coping band around it
  K.box('court', 'water', POOL.x0, POOL.n0, POOL.x1, POOL.n1, BASE_Y + 0.01, -0.06, false);
  K.box('court', 'coping', POOL.x0 - 0.3, POOL.n0 - 0.3, POOL.x1 + 0.3, POOL.n0, 0, 0.03, false);
  K.box('court', 'coping', POOL.x0 - 0.3, POOL.n1, POOL.x1 + 0.3, POOL.n1 + 0.3, 0, 0.03, false);
  K.box('court', 'coping', POOL.x0 - 0.3, POOL.n0, POOL.x0, POOL.n1, 0, 0.03, false);
  K.box('court', 'coping', POOL.x1, POOL.n0, POOL.x1 + 0.3, POOL.n1, 0, 0.03, false);
  // outdoor kitchen under the cover, east side
  K.box('court', 'cabinet', 5.2, 28.9, 5.95, 31.6, 0, 0.88);
  K.box('court', 'quartz', 5.1, 28.85, 5.95, 31.65, 0.88, 0.93);
  K.box('court', 'steel', 5.25, 29.6, 5.9, 30.6, 0.93, 1.05);
  K.box('court', 'steelDark', 5.25, 29.6, 5.9, 30.6, 1.05, 1.07);
  // outdoor dining under the cover, west side
  K.box('court', 'teak', -4.9, 29.3, -3.1, 30.7, 0.72, 0.76);
  for (const [x, n] of [[-4.8, 29.4], [-3.25, 29.4], [-4.8, 30.55], [-3.25, 30.55]]) K.box('court', 'teak', x, n, x + 0.06, n + 0.06, 0, 0.72);
  for (const x of [-4.6, -3.8]) {
    K.box('court', 'teak', x - 0.22, 28.75, x + 0.22, 29.15, 0, 0.45);
    K.box('court', 'teak', x - 0.22, 28.72, x + 0.22, 28.78, 0.45, 0.88);
    K.box('court', 'teak', x - 0.22, 30.85, x + 0.22, 31.25, 0, 0.45);
    K.box('court', 'teak', x - 0.22, 31.22, x + 0.22, 31.28, 0.45, 0.88);
  }
  // two chaise loungers on the west deck, a side table between them
  for (const x of [-5.5, -4.3]) {
    K.box('court', 'trim', x, 35.2, x + 0.75, 37.2, 0.05, 0.3);
    K.box('court', 'linenSeat', x + 0.03, 35.25, x + 0.72, 36.6, 0.3, 0.38);
    const back = new THREE.BoxGeometry(0.69, 0.08, 0.62);
    back.rotateX(-0.85);
    K.geo('court', 'linenSeat', place(back, x + 0.375, 0.58, 36.85), 30);
    for (const n of [35.25, 37.1]) for (const dx of [0.03, 0.68]) K.box('court', 'trim', x + dx, n, x + dx + 0.04, n + 0.05, 0, 0.05);
  }
  K.geo('court', 'teak', place(new THREE.CylinderGeometry(0.22, 0.22, 0.45, 20), -4.92, 0.225, 37.8), 40);
  // a big pot with a sago palm by the slider
  K.geo('court', 'ceramicWhite', place(new THREE.LatheGeometry([new THREE.Vector2(0, 0), ...profile([[0.22, 0], [0.3, 0.2], [0.32, 0.55], [0.3, 0.6]])], 30), 4.6, 0, 32.6), 50);
  for (let i = 0; i < 9; i++) {
    const a = (i / 9) * Math.PI * 2;
    const f = new THREE.BoxGeometry(0.9, 0.01, 0.12);
    f.translate(0.45, 0, 0);
    f.rotateZ(0.5);
    K.geo('court', 'leaf', place(f, 4.6, 0.6, 32.6, a), null);
  }

  // ---- trees outside, ink only ----
  for (const t of TREES) {
    if (t.kind === 'oak') {
      K.geo('rest', G, place(new THREE.CylinderGeometry(0.13, 0.19, t.trunk, 9), t.x, GROUND_Y + t.trunk / 2, t.n), 50);
      K.geo('rest', G, place(new THREE.IcosahedronGeometry(t.r, 1), t.x, GROUND_Y + t.trunk + t.r * 0.62, t.n, t.turn, 1.25, 0.6, 1.25), 1);
    } else {
      const trunk = new THREE.CylinderGeometry(0.14, 0.2, t.trunk, 9);
      trunk.translate(0, t.trunk / 2, 0);
      trunk.rotateZ(0.06);
      K.geo('rest', G, place(trunk, t.x, GROUND_Y, t.n), 50);
      for (let i = 0; i < 9; i++) {
        const frond = new THREE.BoxGeometry(t.r, 0.02, 0.3);
        frond.translate(t.r / 2, 0, 0);
        frond.rotateZ(-0.35 - (i % 3) * 0.12);
        K.geo('rest', G, place(frond, t.x + 0.36, GROUND_Y + t.trunk, t.n, t.turn + (i / 9) * Math.PI * 2), 20);
      }
    }
  }

  // ---- office, mudroom, powder ----
  K.box('rest', G, -5.6, 2.6, -3.9, 3.5, 0.7, 0.75);
  for (const [x, n] of [[-5.55, 2.65], [-4.01, 2.65], [-5.55, 3.39], [-4.01, 3.39]]) K.box('rest', G, x, n, x + 0.06, n + 0.06, 0, 0.7);
  K.box('rest', G, -5.0, 3.7, -4.5, 4.2, 0, 0.46);
  K.box('rest', G, -2.62, 0.3, -2.2, 6.7, 0, 2.4);
  K.box('rest', G, -5.9, 5.6, -5.0, 6.9, 0, 0.4);
  K.box('rest', G, 5.4, 0.1, 6.0, 4.2, 0, 2.4);
  K.box('rest', G, 2.3, 2.4, 2.75, 4.2, 0, 0.45);
  K.box('rest', G, 5.2, 5.4, 5.92, 5.82, 0, 0.42);
  K.box('rest', G, 2.3, 5.1, 2.8, 6.4, 0.78, 0.9);

  // ---- bedroom wing ----
  const bed = (x0, n0, w, l) => {
    K.box('rest', G, x0, n0, x0 + w, n0 + l, 0, 0.48);
    K.box('rest', G, x0, n0 + l - 0.08, x0 + w, n0 + l, 0.48, 1.05);
    K.box('rest', G, x0 + 0.1, n0 + l - 0.62, x0 + w / 2 - 0.05, n0 + l - 0.14, 0.48, 0.6);
    K.box('rest', G, x0 + w / 2 + 0.05, n0 + l - 0.62, x0 + w - 0.1, n0 + l - 0.14, 0.48, 0.6);
    K.box('rest', G, x0 - 0.55, n0 + l - 0.5, x0 - 0.1, n0 + l - 0.05, 0, 0.5);
    K.box('rest', G, x0 + w + 0.1, n0 + l - 0.5, x0 + w + 0.55, n0 + l - 0.05, 0, 0.5);
  };
  bed(9.0, 4.1, 1.8, 2.1);
  K.box('rest', G, 7.8, 0.2, 8.4, 3.8, 0, 2.4);
  bed(9.0, 10.6, 1.8, 2.1);
  K.box('rest', G, 7.8, 8.4, 8.4, 12.6, 0, 2.4);
  K.box('rest', G, 7.9, 15.1, 8.75, 16.9, 0, 0.56); // tub
  K.box('rest', G, 7.9, 13.1, 9.0, 13.6, 0.78, 0.9);
  K.box('rest', G, 10.1, 15.6, 11.9, 16.9, 0, 0.05); // curbless shower
  K.box('rest', G, 10.9, 13.1, 11.9, 13.6, 0.78, 0.9);
  bed(8.9, 21.9, 2.0, 2.2);
  K.box('rest', G, 9.2, 21.1, 10.6, 21.55, 0, 0.44);
  K.box('rest', G, 7.8, 24.5, 8.4, 28.3, 0, 2.4);
  K.box('rest', G, 11.4, 24.5, 12.0, 28.3, 0, 2.4);
  K.box('rest', G, 9.3, 25.6, 10.5, 27.2, 0, 0.45);

  // ---- outside ----
  K.box('rest', G, -5.0, -2.4, -3.8, -0.9, GROUND_Y, 0.55); // planters by the door
  K.box('rest', G, 3.8, -2.4, 5.0, -0.9, GROUND_Y, 0.55);

  // ------------------------------------------------------------------
  // 4. The front door: an oak slab on an offset pivot.
  // ------------------------------------------------------------------
  const doorB = { p: [], n: [], uv: [], idx: [] };
  const pullB = { p: [], n: [], uv: [], idx: [] };
  const doorE = [];
  pushBox(doorB, doorE, -0.35, 0.012, -0.035, 1.14, 2.655, 0.035);
  pushBox(pullB, doorE, 0.98, 0.85, 0.035, 1.015, 1.75, 0.085);
  pushBox(pullB, doorE, 0.98, 0.85, -0.085, 1.015, 1.75, -0.035);

  return {
    shell, roof, kit: K,
    door: { leaf: bucketToGeometry(doorB), pull: bucketToGeometry(pullB), edges: doorE, pivot: new THREE.Vector3(-0.4, 0, 0.2) },
    bucketToGeometry,
  };
}
