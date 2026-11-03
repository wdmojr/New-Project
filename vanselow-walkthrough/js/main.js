// Van Selow Design Build: the plan sheet, the walls rising, and a walk through
// the finished remodel: foyer, great room, kitchen, lanai and pool.

import * as THREE from 'three';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';
import { LineSegments2 } from 'three/addons/lines/LineSegments2.js';
import { LineSegmentsGeometry } from 'three/addons/lines/LineSegmentsGeometry.js';
import { LineMaterial } from 'three/addons/lines/LineMaterial.js';

import { PAPER, INK, GROUND_Y, SUN_ELEV, SUN_HEADING, ROOMS, FT, ftIn } from './plan.js';
import { CUT, SWEEP_PLANES, setRoomReveal, makeMaterials, texturesReady, setAnisotropy, contactShadowMaterial } from './materials.js';
import { buildHouse } from './house.js';
import { buildSheet } from './sheet.js';
import { makeRig } from './rig.js';

const params = new URLSearchParams(location.search);
const CAPTURE = params.has('capture'); // frame-by-frame recording: no smoothing, no intro
const errors = (window.__errors = []);
window.addEventListener('error', (e) => errors.push(String(e.message)));
window.addEventListener('unhandledrejection', (e) => errors.push(String(e.reason)));

// ---------------------------------------------------------------------------
// renderer
// ---------------------------------------------------------------------------
const canvas = document.getElementById('gl');
const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, powerPreference: 'high-performance' });
renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
renderer.setSize(window.innerWidth, window.innerHeight, false);
renderer.outputColorSpace = THREE.SRGBColorSpace;
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.0;
renderer.localClippingEnabled = true;
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
renderer.shadowMap.autoUpdate = false;
setAnisotropy(renderer.capabilities.getMaxAnisotropy());

const scene = new THREE.Scene();
scene.background = new THREE.Color(PAPER);
scene.fog = new THREE.Fog(new THREE.Color(PAPER), 4000, 9000);
scene.environment = new THREE.PMREMGenerator(renderer).fromScene(new RoomEnvironment(), 0.04).texture;
scene.environmentIntensity = 0.3;

const camera = new THREE.PerspectiveCamera(2, window.innerWidth / window.innerHeight, 1, 5000);
camera.rotation.order = 'YXZ';

// the sheet of paper
const paper = new THREE.Mesh(new THREE.PlaneGeometry(9000, 9000), new THREE.MeshBasicMaterial({ color: PAPER, toneMapped: false, fog: false }));
paper.rotation.x = -Math.PI / 2;
paper.position.y = GROUND_Y;
scene.add(paper);

// ---------------------------------------------------------------------------
// ink lines
// ---------------------------------------------------------------------------
const LINE = {
  structure: { w: 1.2, color: INK, cut: true },
  furniture: { w: 0.85, color: INK, cut: true },
  anno: { w: 0.8, color: INK },
  thin: { w: 0.55, color: INK },
  hatch: { w: 0.5, color: '#aaa69c' },
  dash: { w: 0.6, color: INK, dashed: true },
};
const planesFor = (room, cut = false) => {
  const p = [];
  if (cut) p.push(CUT);
  if (SWEEP_PLANES[room]) p.push(SWEEP_PLANES[room]);
  return p;
};
const lineMats = [];
function lines(kind, room, positions) {
  const k = LINE[kind];
  const g = new LineSegmentsGeometry();
  g.setPositions(positions);
  const m = new LineMaterial({
    color: new THREE.Color(k.color), linewidth: k.w, worldUnits: false, fog: true, toneMapped: false,
    dashed: !!k.dashed, dashSize: 0.34, gapSize: 0.2, clippingPlanes: planesFor(room, k.cut),
  });
  lineMats.push(m);
  const l = new LineSegments2(g, m);
  if (k.dashed) l.computeLineDistances();
  l.frustumCulled = false;
  l.renderOrder = 1;
  return l;
}

// ---------------------------------------------------------------------------
// the house
// ---------------------------------------------------------------------------
const M = makeMaterials();
const H = buildHouse();
const house = new THREE.Group();
scene.add(house);

const solid = (geo, mat, shadows = true) => {
  const m = new THREE.Mesh(geo, mat);
  m.castShadow = shadows;
  m.receiveShadow = shadows;
  house.add(m);
  return m;
};
for (const key in H.shell.geos) solid(H.shell.geos[key], M[key]);
for (const key in H.roof.geos) solid(H.roof.geos[key], key === 'ceiling' ? M.ceiling : M.generic);
for (const key in H.kit.b) {
  const mat = key.split('|')[1];
  if (!M[mat]) errors.push('no material ' + mat);
  const see = mat === 'glass' || mat === 'screen';
  const mesh = solid(H.bucketToGeometry(H.kit.b[key]), M[mat], !see && mat !== 'lamp' && mat !== 'water');
  if (see) mesh.renderOrder = 3;
}
for (const room in H.shell.edges) house.add(lines('structure', room, H.shell.edges[room]));
for (const room in H.roof.edges) house.add(lines('structure', room, H.roof.edges[room]));
for (const room in H.kit.e) house.add(lines('furniture', room, H.kit.e[room]));

// front door on its pivot
const door = new THREE.Group();
door.position.copy(H.door.pivot);
const leaf = new THREE.Mesh(H.door.leaf, M.oakDoor);
const pull = new THREE.Mesh(H.door.pull, M.bronze);
leaf.castShadow = leaf.receiveShadow = pull.castShadow = true;
door.add(leaf, pull, lines('furniture', 'hall', H.door.edges));
house.add(door);

// soft contact shadows for the hall furniture
const contact = (x0, n0, x1, n1, y, strength) => {
  const m = new THREE.Mesh(new THREE.PlaneGeometry(x1 - x0, n1 - n0), contactShadowMaterial(strength));
  m.rotation.x = -Math.PI / 2;
  m.position.set((x0 + x1) / 2, y, -(n0 + n1) / 2);
  m.renderOrder = 2;
  house.add(m);
};
contact(-2.25, 2.7, -1.2, 5.7, 0.006, 0.55); // console
contact(1.2, 2.8, 2.25, 5.1, 0.006, 0.6); // bench
contact(-2.0, 6.0, -1.05, 6.95, 0.006, 0.6); // jar
contact(-2.1, 3.2, -1.4, 3.9, 0.826, 0.5); // vase on the console
contact(-2.0, 4.75, -1.5, 5.32, 0.826, 0.45); // books
contact(-4.7, 10.1, -3.0, 16.2, 0.02, 0.55); // sectional
contact(-4.2, 14.5, -1.1, 16.2, 0.02, 0.45);
contact(-2.9, 11.1, -0.7, 14.2, 0.02, 0.5); // table
contact(1.1, 10.4, 2.4, 14.7, 0.02, 0.45); // armchairs
contact(-3.8, 19.9, -2.0, 24.7, 0.006, 0.6); // island
contact(0.9, 20.4, 4.1, 24.2, 0.006, 0.55); // dining
contact(-6.0, 19.0, -5.1, 28.0, 0.006, 0.45); // perimeter run
contact(-5.2, 28.6, -2.8, 31.4, 0.006, 0.5); // outdoor dining
contact(-5.8, 35.0, -3.3, 37.5, 0.006, 0.5); // loungers

// ---------------------------------------------------------------------------
// light: late afternoon, sun low in the south-west
// ---------------------------------------------------------------------------
const el = (SUN_ELEV * Math.PI) / 180;
const sunDir = new THREE.Vector3(SUN_HEADING[0] * Math.cos(el), -Math.sin(el), SUN_HEADING[1] * Math.cos(el)).normalize();
const sun = new THREE.DirectionalLight(0xffcf9a, 10);
sun.target.position.set(2, 1, -19);
sun.position.copy(sun.target.position).addScaledVector(sunDir, -80);
sun.castShadow = true;
sun.shadow.mapSize.set(4096, 4096);
Object.assign(sun.shadow.camera, { left: -27, right: 27, top: 27, bottom: -27, near: 20, far: 170 });
sun.shadow.bias = -0.0002;
sun.shadow.normalBias = 0.015;
scene.add(sun, sun.target);
scene.add(new THREE.HemisphereLight(0xeef2f8, 0xdccfb9, 0.72));
// light bounced off the sunlit floor and the oak wall, faked with small lamps
const bounce1 = new THREE.PointLight(0xffd3a6, 6, 8, 2);
bounce1.position.set(0.5, 0.75, -2.8);
const bounce2 = new THREE.PointLight(0xffcfa0, 5, 8, 2);
bounce2.position.set(1.1, 1.0, -5.0);
// cool daylight coming in through the glazed front
const sky = new THREE.PointLight(0xe4ecff, 6, 11, 2);
sky.position.set(-0.4, 1.9, -0.2);
scene.add(bounce1, bounce2, sky);
// great room: sun off the floor, and the cool light of the glass wall
const roomLights = [
  [0xffd6a8, 8, 12, 0.2, 1.2, -12.4],
  [0xe6eeff, 7, 12, -4.6, 2.6, -12.7],
  [0xffe2bd, 7, 9, 2.4, 3.2, -10.0],
  // kitchen: the pendants over the island, and daylight from the sliders
  [0xffd4a0, 5, 6, -2.78, 1.5, -22.3],
  [0xf2f4ff, 8, 11, 0.6, 2.6, -26.2],
  [0xffe1ba, 5, 9, 2.6, 2.2, -21.0],
  // under the lanai cover
  [0xffe8cc, 5, 9, 0.0, 2.6, -30.2],
];
for (const [c, i, d, x, y, z] of roomLights) {
  const l = new THREE.PointLight(c, i, d, 2);
  l.position.set(x, y, z);
  scene.add(l);
}

// ---------------------------------------------------------------------------
// rig, sheet, resize
// ---------------------------------------------------------------------------
let rig, sheet, sheetGroup;
function layout() {
  const w = window.innerWidth, h = window.innerHeight;
  renderer.setSize(w, h, false);
  camera.aspect = w / h;
  rig = makeRig(w / h);
  if (sheetGroup) {
    scene.remove(sheetGroup);
    sheet.dispose();
    sheetGroup.traverse((o) => { if (o.isLineSegments2) { o.geometry.dispose(); o.material.dispose(); } });
  }
  const pxPerMetre = h / rig.frame.h;
  sheet = buildSheet({
    frame: rig.frame, portrait: rig.portrait,
    labelScale: Math.min(1.25, Math.max(1, 15 / pxPerMetre)),
    anisotropy: renderer.capabilities.getMaxAnisotropy(), planesFor: (room) => planesFor(room),
  });
  sheetGroup = new THREE.Group();
  sheetGroup.add(sheet.group);
  for (const key in sheet.lines) {
    const [kind, room] = key.split('|');
    sheetGroup.add(lines(kind, room, sheet.lines[key]));
  }
  scene.add(sheetGroup);
}

// ---------------------------------------------------------------------------
// one frame
// ---------------------------------------------------------------------------
const hud = { lens: document.getElementById('hud-lens'), height: document.getElementById('hud-height'), cut: document.getElementById('hud-cut') };
const rail = [...document.querySelectorAll('#rail span')];
const grain = document.getElementById('grain');
const sp = (v) => Math.round(v).toString().replace(/\B(?=(\d{3})+(?!\d))/g, ' ');
let last = null;
let lastShadow = '';
const PAPER_C = new THREE.Color(PAPER), SKY_C = new THREE.Color('#c4dbe6'), LAWN_C = new THREE.Color('#c7ceba');

function draw(s) {
  const o = rig.at(s);
  last = o;
  camera.position.set(o.x, o.y, o.z);
  camera.rotation.set(o.pitch, o.yaw, 0);
  camera.fov = o.fov;
  camera.near = o.near;
  camera.far = o.far;
  camera.updateProjectionMatrix();
  CUT.constant = o.cut;
  // out on the lanai, the paper beyond the screens turns into late-afternoon sky
  const sk = o.reveal.court * 0.9;
  scene.background.copy(PAPER_C).lerp(SKY_C, sk);
  scene.fog.color.copy(scene.background);
  paper.material.color.copy(PAPER_C).lerp(LAWN_C, sk);
  scene.fog.near = o.fogNear;
  scene.fog.far = o.fogFar;
  door.rotation.y = o.door * 1.5;
  for (const k in o.reveal) setRoomReveal(k, o.reveal[k]);
  // the shadow map only changes with the cut (and the front door)
  const shadowKey = o.cut.toFixed(3) + '|' + o.door.toFixed(3);
  if (shadowKey !== lastShadow) {
    lastShadow = shadowKey;
    renderer.shadowMap.needsUpdate = true;
  }
  renderer.render(scene, camera);

  hud.lens.textContent = o.fov.toFixed(1) + '°';
  const above = (o.y - GROUND_Y) * FT;
  hud.height.textContent = above > 60 ? sp(above) + ' ft' : ftIn(o.y - GROUND_Y);
  hud.cut.textContent = o.cut > 5.3 ? 'none' : '+' + ftIn(o.cut);
  for (const r of rail) r.classList.remove('on');
  let on = rail[0];
  for (const r of rail) if (s >= +r.dataset.at) on = r;
  on.classList.add('on');
  grain.style.opacity = (0.5 * (1 - o.reveal.hall)).toFixed(3);
}

// ---------------------------------------------------------------------------
// scroll
// ---------------------------------------------------------------------------
const proxy = { s: 0 };
const tl = gsap.timeline({ paused: true, defaults: { ease: 'none' } });
tl.to(proxy, { s: 1, duration: 1 }, 0);
tl.to('#hero', { autoAlpha: 0, y: -30, duration: 0.04 }, 0.035);
const cap = (sel, a, b) => {
  tl.fromTo(sel, { autoAlpha: 0, y: 24 }, { autoAlpha: 1, y: 0, duration: 0.03 }, a);
  if (b) tl.to(sel, { autoAlpha: 0, y: -16, duration: 0.03 }, b);
};
cap('#cap-lift', 0.06, 0.17);
cap('#cap-fore', 0.31, 0.4);
cap('#cap-hall', 0.445, 0.515);
cap('#cap-living', 0.565, 0.665);
cap('#cap-kitchen', 0.74, 0.84);
cap('#cap-court', 0.885, 0.955);
tl.fromTo('#cta', { autoAlpha: 0, y: 30 }, { autoAlpha: 1, y: 0, duration: 0.03 }, 0.965);

let drawn = -1;
function tick() {
  if (proxy.s !== drawn) {
    drawn = proxy.s;
    draw(drawn);
  }
}

async function boot() {
  await Promise.race([
    Promise.all([
      document.fonts.load('400 20px "IBM Plex Mono"'), document.fonts.load('500 20px "IBM Plex Mono"'),
      document.fonts.load('400 40px "Cormorant Garamond"'), document.fonts.load('italic 400 40px "Cormorant Garamond"'),
    ]),
    new Promise((r) => setTimeout(r, 3000)),
  ]);
  await texturesReady();
  layout();
  for (const m of Object.values(M)) m.needsUpdate = true;
  draw(0);

  if (CAPTURE) {
    // recording: the recorder asks for one exact scroll position at a time
    window.__frame = (s) =>
      new Promise((res) => {
        const max = document.documentElement.scrollHeight - window.innerHeight;
        window.scrollTo(0, s * max);
        tl.progress(s);
        draw(proxy.s);
        requestAnimationFrame(() => requestAnimationFrame(() => res(true)));
      });
  } else {
    gsap.registerPlugin(ScrollTrigger);
    const lenis = new Lenis({ lerp: 0.085, wheelMultiplier: 0.9 });
    window.__lenis = lenis;
    lenis.on('scroll', ScrollTrigger.update);
    gsap.ticker.add((t) => lenis.raf(t * 1000));
    gsap.ticker.lagSmoothing(0);
    ScrollTrigger.create({ trigger: '#track', start: 'top top', end: 'bottom bottom', scrub: 0.8, animation: tl });
    gsap.ticker.add(tick);
    // the page opens: lines of the headline rise out of their masks
    gsap.from('#hero h1 .l > span', { yPercent: 105, duration: 1.3, ease: 'expo.out', stagger: 0.12, delay: 0.25 });
    gsap.from('#hero .eyebrow, #hero .lede, #hero .cue, #bar', { autoAlpha: 0, y: 12, duration: 1, ease: 'power2.out', stagger: 0.08, delay: 0.6 });
  }
  window.addEventListener('resize', () => {
    layout();
    drawn = -1;
    if (CAPTURE) draw(proxy.s);
  });
  window.__state = () => ({ ...last, errors: errors.length, calls: renderer.info.render.calls, tris: renderer.info.render.triangles });
  window.__draw = draw;
  const loading = document.getElementById('loading');
  if (CAPTURE) loading.style.transition = 'none';
  loading.classList.add('done');
  window.__ready = true;
}

boot().catch((e) => {
  errors.push(String(e && e.stack ? e.stack : e));
  console.error(e);
});
