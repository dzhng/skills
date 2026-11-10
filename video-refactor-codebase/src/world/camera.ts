// The camera's flight, keyed on song time. Catmull-Rom through keys keeps it
// always moving; a `cut` key starts a new path.
import { CUE } from "../cues.ts";
import { BLOCKS, SWEEP_1, SWEEP_2, TUG, districtCell, sweepX, type V3 } from "./board.ts";

type Key = { t: number; pos: V3; look: V3; cut?: boolean };

// The tug block, before and after: the payoff is a match cut on the opening.
const [ox, oz] = BLOCKS[TUG].stages[0];
const [fx, fz] = districtCell(0, BLOCKS[TUG].k);
const near = (x: number, z: number, d: V3, l: V3) => ({ pos: [x + d[0], d[1], z + d[2]] as V3, look: [x + l[0], l[1], z + l[2]] as V3 });
const scanX = (s: number) => sweepX(SWEEP_1, s);
const deepX = (s: number) => sweepX(SWEEP_2, s);

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
  // 4 · layer 1 cleared: orbit while each kind of slop goes, bar by bar
  { t: 19.5, pos: [-7, 12, 14], look: [0, 0.6, 0.5] },
  { t: 21.5, pos: [-2, 9.5, 12.5], look: [0, 0.6, 0] },
  { t: 23.9, pos: [7, 10, 12], look: [0, 0.6, 0] },
  // 5 · layer 2: low behind the red beam as it sweeps back under the floor
  { t: 24.0, pos: [deepX(24.0) + 3.2, 3.0, 9.6], look: [deepX(24.0) - 1.5, 0.4, 0], cut: true },
  { t: 25.0, pos: [deepX(25.0) + 3.2, 3.1, 9.6], look: [deepX(25.0) - 1.5, 0.4, 0] },
  { t: 25.9, pos: [-4.5, 4.4, 11], look: [-3.5, 0.6, 0] },
  // 6 · the gathers: rise over the board as each pair of features lands
  { t: 27.0, pos: [-3, 13, 15], look: [0, 0.4, 0.5] },
  { t: 29.0, pos: [5, 14, 13], look: [0, 0.3, -0.5] },
  { t: 31.9, pos: [9, 15, 12], look: [0, 0.3, 0] },
  // 7 · the tug again, matched to the opening
  { t: 32.0, ...near(fx, fz, [3.4, 3.0, 7.6], [-0.4, 1.0, -0.5]), cut: true },
  { t: 33.8, ...near(fx, fz, [3.5, 4.5, 10], [-0.5, 2.4, -0.5]) },
  { t: 36.0, pos: [3, 15, 17], look: [0, 0.6, 0.5] },
  // 8 · every week: slow orbit high over the clean board
  { t: 40.0, pos: [-10, 14, 12], look: [0, 0.4, 0] },
  { t: 44.0, pos: [-3, 16, 15], look: [0, 0.4, 0.5] },
  // 9 · the claim
  { t: 48.0, pos: [6, 13, 16], look: [0, 0.5, 0] },
  // 10 · lockup: straight above
  { t: 48.0, pos: [2, 30, 4], look: [0, 0, 0], cut: true },
  { t: 52.5, pos: [-3, 23, 6], look: [0, 0, 0] },
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
