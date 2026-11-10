// The camera's flight, keyed on song time. Catmull-Rom through keys keeps it
// always moving; a `cut` key starts a new path.
import { CUE } from "../cues.ts";
import { BLOCKS, FEATURES, TUG, districtCell, scanX, type V3 } from "./board.ts";

type Key = { t: number; pos: V3; look: V3; cut?: boolean };

// The tug block, before and after: the payoff is a match cut on the opening.
const [ox, oz] = BLOCKS[TUG].stages[0];
const [fx, fz] = districtCell(0, BLOCKS[TUG].k);
const near = (x: number, z: number, d: V3, l: V3) => ({ pos: [x + d[0], d[1], z + d[2]] as V3, look: [x + l[0], l[1], z + l[2]] as V3 });
const [bx, bz] = FEATURES[0].district;
const [gx, gz] = FEATURES[1].district;

const KEYS: Key[] = [
  // 1 · the tug: close on one block, then pull back as the feature tears loose
  { t: -0.3, ...near(ox, oz, [3.4, 3.0, 7.6], [-0.4, 1.0, -0.5]) },
  { t: 2.6, ...near(ox, oz, [3.0, 3.6, 7.8], [-0.4, 2.4, -0.5]) },
  { t: 3.7, pos: [3, 8.5, 15.5], look: [-0.8, 1.6, 0.5] },
  { t: 6.0, pos: [5, 11, 17.5], look: [0, 0.8, 0] },
  // 2 · title: aerial drift
  { t: 6.0, pos: [9, 24, 9], look: [0, 0, 0.8], cut: true },
  { t: 8.0, pos: [0, 20, 15], look: [0, 0, 0.5] },
  { t: 10.0, pos: [-11, 14, 12], look: [0, 0, 0.5] },
  // 3 · ride alongside the scan beam, then crane back to the tagged board
  { t: 10.0, pos: [scanX(10.0) - 3.2, 3.0, 9.6], look: [scanX(10.0) + 1.5, 0.9, 0], cut: true },
  { t: 12.0, pos: [scanX(12.0) - 3.2, 3.2, 9.6], look: [scanX(12.0) + 1.5, 0.9, 0] },
  { t: 14.0, pos: [scanX(14.0) - 3.2, 3.4, 9.6], look: [scanX(14.0) + 1.5, 0.9, 0] },
  { t: 15.6, pos: [scanX(15.6) - 2.5, 4.2, 10.5], look: [scanX(15.6), 0.9, 0] },
  { t: 17.9, pos: [2, 15, 16], look: [0, 0.6, 0] },
  // 4 · redesign: lift to the hanging lists and orbit them
  { t: 20.0, pos: [0, 12.5, 18], look: [0, 3.6, 0] },
  { t: 23.0, pos: [-8, 12, 15.5], look: [0, 3.4, 0] },
  { t: 25.9, pos: [-6, 9, 13], look: [bx, 1.2, bz] },
  // 5 · land each fix: swoop district to district
  { t: 27.2, pos: [bx + 3.5, 5.5, bz + 7.5], look: [bx, 0.8, bz] },
  { t: 29.4, pos: [bx - 3, 6.5, bz + 7.5], look: [bx, 0.8, bz] },
  { t: 31.0, pos: [gx + 3, 6, gz + 7.5], look: [gx, 0.8, gz] },
  { t: 32.6, pos: [gx - 2, 7.5, gz + 8.5], look: [gx, 0.6, gz] },
  { t: 34.2, pos: [2, 11, 10], look: [0, 0.2, -1] },
  { t: 36.4, pos: [-4, 13, 8], look: [0, 0.2, -3] },
  { t: 38.3, pos: [3, 19, 15], look: [0, 0, 0] },
  { t: 40.0, pos: [-5, 15, 15], look: [0, 0, 0.5] },
  // 6 · search: low and dark among the inspectors
  { t: 41.8, pos: [-6, 8.5, 13], look: [0, 0.6, 1.5] },
  { t: 44.0, pos: [6, 9.5, 13.5], look: [0, 0.6, 1] },
  // 7 · the tug again, matched to the opening
  { t: 44.0, ...near(fx, fz, [3.4, 3.0, 7.6], [-0.4, 1.0, -0.5]), cut: true },
  { t: 45.8, ...near(fx, fz, [3.5, 4.5, 10], [-0.5, 2.4, -0.5]) },
  { t: 48.0, pos: [5, 13, 17], look: [-1, 0.8, 0] },
  { t: 50.0, pos: [-3, 17, 16], look: [0, 0.5, 0] },
  // 8 · lockup: straight above
  { t: 50.0, pos: [2, 30, 4], look: [0, 0, 0], cut: true },
  { t: 54.5, pos: [-3, 23, 6], look: [0, 0, 0] },
];

const cr = (p0: number, p1: number, p2: number, p3: number, u: number) =>
  0.5 * (2 * p1 + (-p0 + p2) * u + (2 * p0 - 5 * p1 + 4 * p2 - p3) * u * u + (-p0 + 3 * p1 - 3 * p2 + p3) * u * u * u);

function sample(s: number, field: "pos" | "look"): V3 {
  let i = 0;
  while (i < KEYS.length - 2 && s >= KEYS[i + 1].t) i++;
  const k1 = KEYS[i], k2 = KEYS[i + 1];
  if (s <= k1.t) return [...k1[field]];
  if (s >= k2.t) return [...k2[field]];
  if (k2.cut) return [...k1[field]]; // hold until the cut
  const k0 = k1.cut || i === 0 ? k1 : KEYS[i - 1];
  const k3 = i + 2 < KEYS.length && !KEYS[i + 2].cut ? KEYS[i + 2] : k2;
  const u = (s - k1.t) / (k2.t - k1.t);
  return [0, 1, 2].map((a) => cr(k0[field][a], k1[field][a], k2[field][a], k3[field][a], u)) as V3;
}

export function cameraAt(s: number) {
  const pos = sample(s, "pos");
  const look = sample(s, "look");
  // Handheld drift, stronger near the ground; none in the lockup.
  const d = s > CUE.lockup ? 0 : 0.05 + 0.1 * Math.exp(-pos[1] / 4);
  pos[0] += Math.sin(s * 1.3) * d;
  pos[1] += Math.sin(s * 1.7 + 1) * d * 0.6;
  look[0] += Math.sin(s * 0.9 + 2) * d * 0.5;
  // Whip overshoot after the drop cut.
  if (s >= CUE.drop && s < CUE.drop + 0.6) pos[2] += Math.sin((s - CUE.drop) * 18) * 1.2 * Math.exp(-(s - CUE.drop) / 0.15);
  return { pos, look };
}
