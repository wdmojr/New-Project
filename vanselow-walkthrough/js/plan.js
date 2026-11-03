// Van Selow Design Build: the numbers.
//
// Plan coordinates: x runs east, n runs north from the inside face of the front
// wall. In three.js that is (x, y up, z = -n), so walking north is walking down
// the negative z axis, which is where a three.js camera looks by default.
// The model is built in metres; everything shown to the visitor is in feet.

export const PAPER = '#f2f0ea';
export const INK = '#16202e'; // a navy-black ink, close to the island colour

export const GROUND_Y = -0.16; // the sheet of paper the house stands on
export const BASE_Y = -0.15; // underside of the floor slab
export const CUT_PLAN = 1.2; // where an architect cuts a plan (about 4 ft)
export const CUT_OPEN = 5.4; // above the highest parapet: nothing is cut

export const EYE = 1.6;

// Rooms, to the centre lines of their walls so that together they tile the plan.
// Each one stays a line drawing until the camera reaches it, then its finished
// materials sweep across it in direction `dir` (x, n).
export const ROOMS = [
  { key: 'hall', name: 'FOYER', x0: -2.1, x1: 2.1, n0: -0.4, n1: 7.1, ceil: 2.7, dir: [0, 1], clear: [4.0, 7.0] },
  { key: 'living', name: 'GREAT ROOM', x0: -6.2, x1: 6.1, n0: 7.1, n1: 18.3, ceil: 4.2, dir: [0, 1], clear: [12.0, 11.0] },
  { key: 'kitchen', name: 'KITCHEN / DINING', x0: -6.2, x1: 6.1, n0: 18.3, n1: 28.5, ceil: 3.2, dir: [0, 1], clear: [12.0, 10.0] },
  { key: 'court', name: 'LANAI / POOL', x0: -6.2, x1: 6.2, n0: 28.5, n1: 40.8, ceil: 30, dir: [0, 1], clear: [12.0, 12.0] },
];

// Rooms the camera never enters. They are drawn and their walls rise, nothing more.
export const SIDE_ROOMS = [
  { name: 'OFFICE', x: -4.1, n: 1.3, clear: [3.8, 7.0] },
  { name: 'MUDROOM', x: 4.1, n: 2.9, clear: [3.8, 4.3] },
  { name: 'POWDER', x: 3.7, n: 6.2, clear: [3.8, 2.5], small: true },
  { name: 'GALLERY', x: 6.9, n: 22.0, clear: [1.4, 28.4], vertical: true },
  { name: 'BEDROOM 3', x: 10.2, n: 2.0, clear: [4.2, 6.3] },
  { name: 'BEDROOM 2', x: 10.2, n: 8.6, clear: [4.2, 6.3] },
  { name: 'BATH', x: 9.2, n: 14.4, clear: [2.0, 4.0], small: true },
  { name: 'SPA BATH', x: 11.0, n: 14.55, clear: [2.0, 4.0], small: true },
  { name: 'PRIMARY SUITE', x: 9.9, n: 19.2, clear: [4.2, 7.0] },
  { name: 'WALK-IN', x: 9.9, n: 25.02, clear: [4.2, 4.0], small: true },
];

// Trees outside the remodel: live oaks out front, two palms beyond the pool cage.
// They never get materials. They stay ink, like everything that is not the work.
export const TREES = [
  { kind: 'oak', x: -14.2, n: 9.6, trunk: 2.0, r: 2.3, turn: 0.2 },
  { kind: 'oak', x: -15.6, n: 15.0, trunk: 2.4, r: 2.8, turn: 1.1 },
  { kind: 'oak', x: -13.8, n: 21.0, trunk: 1.9, r: 2.1, turn: 2.0 },
  { kind: 'oak', x: -11.0, n: -8.6, trunk: 2.2, r: 2.4, turn: 0.7 },
  { kind: 'palm', x: -8.9, n: 38.4, trunk: 6.2, r: 2.2, turn: 0.3 },
  { kind: 'palm', x: 8.8, n: 35.6, trunk: 5.4, r: 2.0, turn: 1.4 },
];

// Inner doors, drawn standing open. hinge (x, n), leaf direction when open and
// the direction it lies in when closed, as angles in degrees from east.
export const DOORS = [
  { x: 2.2, n: 0.7, open: 0, closed: 90 },
  { x: 4.6, n: 4.5, open: 90, closed: 0 },
  { x: -5.0, n: 7.0, open: -90, closed: 0 },
  { x: 6.2, n: 8.2, open: 0, closed: 90 },
  { x: 7.8, n: 5.2, open: 0, closed: 90 },
  { x: 7.8, n: 7.0, open: 0, closed: 90 },
  { x: 7.8, n: 14.6, open: 0, closed: 90 },
  { x: 10.6, n: 13.0, open: 90, closed: 0 },
  { x: 7.8, n: 17.6, open: 0, closed: 90 },
  { x: 8.2, n: 24.4, open: 90, closed: 0 },
];

// The pool, inside the screened cage.
export const POOL = { x0: -2.5, n0: 32.8, x1: 4.5, n1: 39.2 };

// The sun: late afternoon over the Gulf, low in the south-west. This is the
// direction the light travels in three.js coordinates (north-east and down).
export const SUN_ELEV = 19;
export const SUN_HEADING = [0.5, -0.866]; // (x, z)

export const PROJECT = {
  firm: 'Van Selow Design Build',
  name: 'Coastal Remodel',
  place: 'Pinellas County, Florida',
  drawing: 'Floor plan, as remodeled',
  sheet: 'A-101',
  scale: '1/8" = 1\'-0"',
  date: '11.03.2026',
  license: 'Lic. CBC1252610',
};

// ---- units -----------------------------------------------------------------
export const FT = 3.28084;
// 3.6576 -> 12'-0"
export function ftIn(m) {
  let inches = Math.round(m * FT * 12);
  const ft = Math.floor(inches / 12);
  inches -= ft * 12;
  return `${ft}'-${inches}"`;
}
export const sqft = (a, b) => Math.round(a * b * FT * FT).toLocaleString('en-US') + ' SF';
