// The camera's flight, keyed on song time. Catmull-Rom through keys keeps it
// always moving; a `cut` key starts a new path (hidden by the drop's white-out).
import { CUE } from "../cues.ts";

type V3 = [number, number, number];
type Key = { t: number; pos: V3; look: V3; cut?: boolean };

const KEYS: Key[] = [
  // 1 · low over the fogged board, flying across the words
  { t: -0.3, pos: [0, 4.2, 15], look: [0, 1.2, 3] },
  { t: 2.0, pos: [0, 3.8, 11.5], look: [0, 1.1, 0] },
  { t: 3.95, pos: [0, 3.2, 8], look: [0, 1.8, -3] },
  // 2 · whip up to the aerial on the drop, then pull back
  { t: 4.0, pos: [0, 19, 9], look: [0, 0, 0], cut: true },
  { t: 5.2, pos: [0, 29, 17], look: [0, 0, 0.5] },
  { t: 8.0, pos: [4, 26, 17], look: [0, 0, 0.5] },
  // 3 · arc low around the map
  { t: 10.0, pos: [13, 17, 14], look: [0, 0, 0] },
  { t: 12.0, pos: [16, 12, 3], look: [0, 0, 0] },
  // 4 · orbit while it's sliced
  { t: 14.0, pos: [3, 15, 16], look: [0, 0, 0] },
  { t: 16.0, pos: [-13, 10, 10], look: [0, 0.5, 0] },
  // 5 · dusk, down among the factories
  { t: 17.8, pos: [-10, 6, 8.5], look: [0, 0.8, 0] },
  { t: 19.5, pos: [-3, 8, 12.5], look: [0, 0.6, 0] },
  { t: 22.0, pos: [0, 19, 16], look: [0, 0, 0] },
  // 6 · orbit the lit city through the proof
  { t: 24.0, pos: [15, 15, 5], look: [0, 0, 0] },
  { t: 26.0, pos: [7, 12, -14], look: [0, 1, 0] },
  // 7 · circle the choices card at dawn
  { t: 27.6, pos: [10, 8.5, 12], look: [-3.4, 4.6, 0] },
  { t: 29.3, pos: [-5, 9.5, 13], look: [-3.4, 4.6, 0] },
  // 8 · straight up until the world is a dot
  { t: 29.65, pos: [0, 70, 0.01], look: [0, 0, 0] },
  { t: 34.5, pos: [0, 70, 0.01], look: [0, 0, 0] },
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
  // Handheld drift, stronger near the ground; none once the lockup settles.
  const d = s > CUE.collapse[0] ? 0 : 0.06 + 0.12 * Math.exp(-pos[1] / 4);
  pos[0] += Math.sin(s * 1.3) * d;
  pos[1] += Math.sin(s * 1.7 + 1) * d * 0.6;
  look[0] += Math.sin(s * 0.9 + 2) * d * 0.5;
  // Whip: overshoot on arrival after the drop cut.
  if (s >= CUE.drop && s < CUE.drop + 0.6) pos[2] += Math.sin((s - CUE.drop) * 18) * 1.5 * Math.exp(-(s - CUE.drop) / 0.15);
  return { pos, look };
}
