// The board: modules (blocks), the links between them (cables), and the
// problems the scan tags. Pure data, derived once from a seeded layout, so the
// world, the overlay and the soundtrack all agree on every position and time.
import { CUE, type Fix } from "../cues.ts";

export type V2 = [number, number];
export type V3 = [number, number, number];

let seed = 7;
const rnd = () => {
  seed = (seed * 1664525 + 1013904223) >>> 0;
  return seed / 2 ** 32;
};

// ---------- features ----------
// Four features, six modules each, plus four pass-through junction boxes.
// Colour is "the reason it changes": the tangle scatters each feature across
// the board; the refactor gathers each into one district.
export const FEATURES = [
  { name: "blue", color: "#4f6cff", district: [-4.7, 3.0] as V2 },
  { name: "green", color: "#3fbf86", district: [4.7, 3.0] as V2 },
  { name: "amber", color: "#f2a93b", district: [-4.7, -3.0] as V2 },
  { name: "violet", color: "#a77bff", district: [4.7, -3.0] as V2 },
];
export const GREY = 4;

// Fix order: blue (12 problems), green (9), the surplus junctions (6), amber + violet (4).
export const FIX_OF_FEATURE = [0, 1, 3, 3, 2]; // feature index → fix index (GREY → fix 2)

// ---------- slots ----------
const COLS = 7, ROWS = 5, PITCH = 2.4;
const SLOTS: V2[] = [];
for (let r = 0; r < ROWS; r++) for (let c = 0; c < COLS; c++) SLOTS.push([(c - (COLS - 1) / 2) * PITCH, (r - (ROWS - 1) / 2) * PITCH]);

const CELL = 1.95;
export const districtCell = (f: number, k: number): V2 => {
  const [cx, cz] = FEATURES[f].district;
  return [cx + ((k % 3) - 1) * CELL, cz + (Math.floor(k / 3) - 0.5) * CELL];
};
const inDistrict = (p: V2, f: number, margin = 1.3) => {
  const [cx, cz] = FEATURES[f].district;
  return Math.abs(p[0] - cx) < CELL + 0.75 + margin * 0.5 && Math.abs(p[1] - cz) < CELL / 2 + 0.75 + margin * 0.5;
};

// ---------- blocks ----------
export type Block = {
  id: number;
  feature: number; // 0..3, or GREY
  k: number; // index within its feature
  h: number; // body height
  stages: V2[]; // position after each fix (index 0 = the tangle)
  moves: { from: V2; to: V2; t0: number; t1: number }[];
};

// Hand-placed tangle: every feature touches every corner of the board.
// Rows are back (z−) to front (z+); `B` blue, `G` green, `A` amber, `V` violet, `x` junction, `.` empty.
const TANGLE = [
  "G.AxBV.",
  "VBG.AGB",
  "A.xBGVx",
  "GAV.BA.",
  "VxBAG.V",
];
const CODE: Record<string, number> = { B: 0, G: 1, A: 2, V: 3, x: GREY };

export const BLOCKS: Block[] = [];
{
  const count = [0, 0, 0, 0, 0];
  TANGLE.forEach((row, r) =>
    [...row].forEach((ch, c) => {
      if (ch === ".") return;
      const feature = CODE[ch];
      BLOCKS.push({ id: BLOCKS.length, feature, k: count[feature]++, h: 0.8 + rnd() * 0.55, stages: [SLOTS[r * COLS + c]], moves: [] });
    }),
  );
}
// The block the opening tug lifts: front-row blue, centre-left.
export const TUG = BLOCKS.find((b) => b.feature === 0 && b.stages[0][1] > 4 && b.stages[0][0] < 0 && b.stages[0][0] > -4)!.id;

// Stages: each fix gathers its features into their districts; anything
// sitting in a claimed district steps aside to the nearest free slot.
const FIX_FEATURES = [[0], [1], [], [2, 3]];
{
  const claimed: number[] = [];
  for (let fx = 0; fx < 4; fx++) {
    const gathering = FIX_FEATURES[fx];
    claimed.push(...gathering);
    const prev = BLOCKS.map((b) => b.stages[b.stages.length - 1]);
    const gone = (b: Block) => b.feature === GREY && fx >= 2;
    const next: (V2 | null)[] = BLOCKS.map((b, i) => (claimed.includes(b.feature) ? districtCell(b.feature, b.k) : gone(b) ? prev[i] : null));
    const taken = (p: V2) => next.some((q, j) => q && !gone(BLOCKS[j]) && Math.hypot(q[0] - p[0], q[1] - p[1]) < 1.6);
    BLOCKS.forEach((b, i) => {
      if (next[i]) return;
      const here = prev[i];
      const blocked = claimed.some((f) => inDistrict(here, f)) || taken(here);
      if (!blocked) return void (next[i] = here);
      const free = SLOTS.filter((p) => !claimed.some((f) => inDistrict(p, f)) && !taken(p) && !BLOCKS.some((o, j) => j !== i && !next[j] && Math.hypot(prev[j][0] - p[0], prev[j][1] - p[1]) < 0.1))
        .sort((a, b2) => Math.hypot(a[0] - here[0], a[1] - here[1]) - Math.hypot(b2[0] - here[0], b2[1] - here[1]));
      next[i] = free[0] ?? here;
    });
    const f = CUE.fixes[fx];
    BLOCKS.forEach((b, i) => {
      const to = next[i]!;
      b.stages.push(to);
      if (Math.hypot(to[0] - prev[i][0], to[1] - prev[i][1]) > 0.01) {
        const gather = gathering.includes(b.feature);
        // Gathering blocks fly on a stagger and land on the downbeat; displaced ones shuffle first.
        const t0 = gather ? f.lift + 0.06 * b.k : f.lift - 0.35;
        b.moves.push({ from: prev[i], to, t0, t1: gather ? f.land : f.lift + 0.1 });
      }
    });
  }
}

// ---------- links ----------
export type LinkKind = "legit" | "hidden" | "needless" | "surplus";
export type Link = { id: number; a: number; b: number; kind: LinkKind; fix: number; arc: number; tape?: boolean };
export const LINKS: Link[] = [];
const ofFeature = (f: number) => BLOCKS.filter((b) => b.feature === f);
const link = (a: number, b: number, kind: LinkKind, fix: number, tape = false) =>
  LINKS.push({ id: LINKS.length, a, b, kind, fix, arc: 0.9 + rnd() * 1.6, tape });

// Legit dependencies: each feature's modules chained, long and tangled across the board.
for (let f = 0; f < 4; f++) {
  const bs = ofFeature(f);
  for (let i = 1; i < bs.length; i++) link(bs[i - 1].id, bs[i].id, "legit", FIX_OF_FEATURE[f]);
}
// Problems per fix: blue 4/4/4, green 3/3/3, amber+violet 2/1/1. Tapes (special cases) ride on legit cables.
const PLAN = [
  { f: [0], hidden: 4, needless: 4, tapes: 4 },
  { f: [1], hidden: 3, needless: 3, tapes: 3 },
  { f: [2, 3], hidden: 2, needless: 1, tapes: 1 },
];
const pick = <T,>(xs: T[]) => xs[Math.floor(rnd() * xs.length)];
for (const p of PLAN) {
  const fx = FIX_OF_FEATURE[p.f[0]];
  for (let i = 0; i < p.hidden; i++) {
    const f = p.f[i % p.f.length];
    const bs = ofFeature(f);
    link(bs[i % bs.length].id, bs[(i + 2 + (i % 3)) % bs.length].id, "hidden", fx);
  }
  for (let i = 0; i < p.needless; i++) {
    const f = p.f[i % p.f.length];
    const others = BLOCKS.filter((b) => b.feature !== f && b.feature !== GREY && FIX_OF_FEATURE[b.feature] >= fx);
    link(pick(ofFeature(f)).id, pick(others).id, "needless", fx);
  }
  const legit = LINKS.filter((l) => l.kind === "legit" && l.fix === fx && !l.tape);
  for (let i = 0; i < p.tapes; i++) legit[(i * 2) % legit.length].tape = true;
}
// Surplus: each junction box just passes a link through (two cables); two of those cables carry a tape.
{
  const greys = BLOCKS.filter((b) => b.feature === GREY);
  const real = BLOCKS.filter((b) => b.feature !== GREY);
  greys.forEach((g, i) => {
    const near = [...real].sort((p, q) => Math.hypot(p.stages[0][0] - g.stages[0][0], p.stages[0][1] - g.stages[0][1]) - Math.hypot(q.stages[0][0] - g.stages[0][0], q.stages[0][1] - g.stages[0][1]));
    link(near[1].id, g.id, "surplus", 2, i < 2);
    link(g.id, near[4 + i].id, "surplus", 2);
  });
}

// ---------- block motion ----------
// Position of a block's base centre at song time s (before tug offsets).
export function blockXZ(b: Block, s: number): { xz: V2; y: number } {
  let xz = b.stages[0];
  let y = 0;
  for (const m of b.moves) {
    if (s < m.t0) break;
    if (s >= m.t1) {
      xz = m.to;
      continue;
    }
    const u = (s - m.t0) / (m.t1 - m.t0);
    const e = u < 0.5 ? 4 * u * u * u : 1 - (-2 * u + 2) ** 3 / 2;
    xz = [m.from[0] + (m.to[0] - m.from[0]) * e, m.from[1] + (m.to[1] - m.from[1]) * e];
    const d = Math.hypot(m.to[0] - m.from[0], m.to[1] - m.from[1]);
    y = Math.sin(Math.PI * u) * Math.min(3.2, 0.6 + d * 0.28);
    return { xz, y };
  }
  return { xz, y };
}

// ---------- problems ----------
// Every problem is one tag. Its anchor is a cable midpoint (hidden, needless,
// tape) or a junction box top (surplus). The scan front tags it as it passes.
export type Problem = { id: number; fix: number; kind: "hidden" | "needless" | "tape" | "junction"; link?: number; block?: number; anchor: V3; tagAt: number; slot: number };
export const SCAN_X: [number, number] = [-9.5, 9.5];
export const scanX = (s: number) => {
  const [a, b] = CUE.scan;
  const u = Math.min(1, Math.max(0, (s - a) / (b - a)));
  return SCAN_X[0] + (SCAN_X[1] - SCAN_X[0]) * u;
};
const tagTime = (x: number) => CUE.scan[0] + ((x - SCAN_X[0]) / (SCAN_X[1] - SCAN_X[0])) * (CUE.scan[1] - CUE.scan[0]);

const top = (id: number): V3 => {
  const b = BLOCKS[id];
  return [b.stages[0][0], b.h, b.stages[0][1]];
};
export const linkMid = (l: Link, ends: [V3, V3], u = 0.5): V3 => {
  const [p, q] = ends;
  const lift = l.kind === "hidden" ? 0.04 : arcHeight(l, p, q);
  return [p[0] + (q[0] - p[0]) * u, p[1] + (q[1] - p[1]) * u + Math.sin(Math.PI * u) * lift, p[2] + (q[2] - p[2]) * u];
};
export function arcHeight(l: Link, p: V3, q: V3) {
  const d = Math.hypot(q[0] - p[0], q[2] - p[2]);
  return Math.min(l.arc, 0.25 + d * 0.22);
}
export const restEnds = (l: Link): [V3, V3] => {
  const p = top(l.a), q = top(l.b);
  return l.kind === "hidden" ? [[p[0], 0.02, p[2]], [q[0], 0.02, q[2]]] : [p, q];
};

export const PROBLEMS: Problem[] = [];
for (const l of LINKS) {
  if (l.kind === "hidden" || l.kind === "needless") PROBLEMS.push({ id: 0, fix: l.fix, kind: l.kind, link: l.id, anchor: linkMid(l, restEnds(l)), tagAt: 0, slot: 0 });
  if (l.tape) PROBLEMS.push({ id: 0, fix: l.fix, kind: "tape", link: l.id, anchor: linkMid(l, restEnds(l), 0.5), tagAt: 0, slot: 0 });
}
for (const b of BLOCKS) if (b.feature === GREY) PROBLEMS.push({ id: 0, fix: 2, kind: "junction", block: b.id, anchor: top(b.id), tagAt: 0, slot: 0 });
PROBLEMS.sort((p, q) => p.anchor[0] - q.anchor[0]);
{
  const perFix = [0, 0, 0, 0];
  let last = -1;
  PROBLEMS.forEach((p, i) => {
    p.id = i;
    p.tagAt = Math.max(tagTime(p.anchor[0]), last + 0.07);
    last = p.tagAt;
    p.slot = perFix[p.fix]++;
  });
}
export const FIX_SIZES = [0, 1, 2, 3].map((f) => PROBLEMS.filter((p) => p.fix === f).length);

// Where each fix's list hangs during the redesign (above its district).
export const FIX_ANCHOR: V3[] = [
  [FEATURES[0].district[0], 6.2, FEATURES[0].district[1]],
  [FEATURES[1].district[0], 6.2, FEATURES[1].district[1]],
  [0, 6.0, 1.0],
  [0, 7.9, -3.0],
];
// Order fixes land in matches FIX_SIZES descending.
export const fixOf = (fx: number): Fix => CUE.fixes[fx];

// The one problem the second search finds: a hidden link between the blue and
// green districts, fixed straight away.
export const LATE = { a: BLOCKS.filter((b) => b.feature === 0)[5].id, b: BLOCKS.filter((b) => b.feature === 1)[3].id };
