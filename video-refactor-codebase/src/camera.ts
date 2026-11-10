// One 2D camera over one world. Each scene owns a 1920×1080 patch of the
// world at its origin; the camera holds on a scene with a slow drift and
// whips to the next on the downbeat, so the piece reads as one flight.
import { CUE, SECTIONS } from "./cues.ts";
import { inOutCubic, lerp, outCubic, prog } from "./anim.ts";
import { GIANT } from "./scenes/Giant.tsx";

export const ORIGIN = {
  atlas: [0, 0],
  scatter: [2600, 0],
  guards: [2600, 1500],
  states: [5200, 1500],
  giant: [5200, 3000],
  tests: [7800, 3000],
  weeks: [0, -1500],
} as const;
export type Place = keyof typeof ORIGIN;

export type Pose = { x: number; y: number; z: number };
// A pose in a scene's own coordinates (its 1920×1080 frame).
const at = (place: Place, x: number, y: number, z: number): Pose => ({ x: ORIGIN[place][0] + x, y: ORIGIN[place][1] + y, z });

// Where the camera sits while holding on each scene.
function hold(place: Place, s: number): Pose {
  switch (place) {
    case "atlas": {
      if (s >= CUE.lockup) return at("atlas", 960, 540, lerp(1.12, 1.2, prog(s, CUE.lockup, SECTIONS.outro[1])));
      if (s >= CUE.matchCut) return at("atlas", 960, 430, lerp(1.32, 1.18, outCubic(prog(s, CUE.matchCut, CUE.matchCut + 1.2))));
      const pull = outCubic(prog(s, 0, CUE.request));
      return at("atlas", 960, lerp(500, 540, pull), lerp(1.35, 1.0, pull) + 0.1 * prog(s, CUE.request, SECTIONS.title[1]));
    }
    case "scatter":
      return at("scatter", 960, 460, lerp(1.12, 1.18, prog(s, 10, CUE.scatter.lift)) - 0.08 * inOutCubic(prog(s, CUE.scatter.lift, CUE.scatter.land)));
    case "guards": {
      const out = inOutCubic(prog(s, CUE.guards.wrap[0] - 0.1, CUE.guards.wrap[5] + 0.3));
      const back = inOutCubic(prog(s, CUE.guards.peel[0], CUE.guards.peel[5] + 0.4));
      return at("guards", 960, 550, lerp(lerp(1.6, 0.86, out), 1.5, back));
    }
    case "states": {
      const jam = s >= CUE.states.jam && s < CUE.states.collapse ? 0.08 * Math.exp(-(s - CUE.states.jam) / 0.4) : 0;
      return at("states", 960, 450, lerp(1.06, 1.1, prog(s, 20, CUE.states.collapse)) + jam);
    }
    case "giant": {
      const [g0, g1] = CUE.giant.grow;
      const bottom = GIANT.top + GIANT.height(s);
      const follow = at("giant", 960, Math.max(470, bottom - 330), 1);
      const tall = at("giant", 960, GIANT.top + GIANT.full / 2, 0.4);
      const row = at("giant", 960, 470, 0.7);
      if (s < g1) return follow;
      const zoomOut = inOutCubic(prog(s, g1, g1 + 0.5));
      const toRow = inOutCubic(prog(s, CUE.giant.split, CUE.giant.split + 0.5));
      const p1 = mixPose(follow, tall, zoomOut);
      return mixPose(p1, row, toRow);
    }
    case "tests":
      return at("tests", 960, 400, lerp(1.08, 1.14, prog(s, 30, 36)));
    case "weeks":
      return at("weeks", 960, 480, lerp(1.0, 1.08, prog(s, 40, CUE.lockup)));
  }
}

const mixPose = (a: Pose, b: Pose, t: number): Pose => ({ x: lerp(a.x, b.x, t), y: lerp(a.y, b.y, t), z: lerp(a.z, b.z, t) });

// The edit: which scene holds when, and how it gets to the next.
type Shot = { place: Place; from: number; cut?: boolean };
const SHOTS: Shot[] = [
  { place: "atlas", from: -1 },
  { place: "scatter", from: SECTIONS.scatter[0] },
  { place: "guards", from: SECTIONS.guards[0] },
  { place: "states", from: SECTIONS.states[0] },
  { place: "giant", from: SECTIONS.giant[0] },
  { place: "tests", from: SECTIONS.tests[0] },
  { place: "atlas", from: CUE.matchCut, cut: true },
  { place: "weeks", from: SECTIONS.weeks[0] },
  { place: "atlas", from: CUE.lockup, cut: true },
];
const WHIP = [0.38, 0.06]; // starts before the downbeat, lands just after it

export function camera(s: number): Pose {
  let i = 0;
  while (i + 1 < SHOTS.length && s >= SHOTS[i + 1].from - (SHOTS[i + 1].cut ? 0 : WHIP[0])) i++;
  const shot = SHOTS[i];
  const prev = SHOTS[i - 1];
  if (!prev || shot.cut || s >= shot.from + WHIP[1]) return hold(shot.place, s);
  const t0 = shot.from - WHIP[0], t1 = shot.from + WHIP[1];
  const a = hold(prev.place, t0), b = hold(shot.place, t1);
  const p = inOutCubic(prog(s, t0, t1));
  const dip = Math.sin(Math.PI * p) * 0.18; // pull out mid-whip
  return { x: lerp(a.x, b.x, p), y: lerp(a.y, b.y, p), z: lerp(a.z, b.z, p) * (1 - dip) };
}

// Which scene the camera is on (or arriving at), for scene culling.
export const placesAt = (s: number): Place[] => {
  const out = new Set<Place>();
  SHOTS.forEach((shot, i) => {
    const next = SHOTS[i + 1];
    const start = shot.from - (shot.cut ? 0 : WHIP[0]) - 0.05;
    const end = next ? next.from + WHIP[1] + 0.05 : Infinity;
    if (s >= start && s < end) out.add(shot.place);
  });
  return [...out];
};
