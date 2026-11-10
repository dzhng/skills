// The board: modules (blocks), the links between them (cables), and the
// problems each scan tags. Pure data, derived once from a seeded layout, so the
// world, the overlay and the soundtrack all agree on every position and time.
import { CUE, WEEK } from "../cues.ts";

export type V2 = [number, number];
export type V3 = [number, number, number];

let seed = 7;
const rnd = () => {
  seed = (seed * 1664525 + 1013904223) >>> 0;
  return seed / 2 ** 32;
};

// ---------- features ----------
// Four features, six modules each, plus four pass-through junction boxes.
// Colour is "the reason it changes": the slop scatters each feature across
// the board; the refactor gathers each into one district.
export const FEATURES = [
  { name: "blue", color: "#4f6cff", district: [-4.7, 3.0] as V2 },
  { name: "green", color: "#3fbf86", district: [4.7, 3.0] as V2 },
  { name: "amber", color: "#f2a93b", district: [-4.7, -3.0] as V2 },
  { name: "violet", color: "#a77bff", district: [4.7, -3.0] as V2 },
];
export const GREY = 4;

// Fixes, in cue order. Layer 1 clears the slop on the surface; layer 2
// gathers each feature into one place.
export const FIX = { tape: 0, junction: 1, needless: 2 } as const;
export const GATHERS: number[][] = [[], [], [], [0, 1], [2, 3]]; // features each fix gathers
export const GATHER_OF_FEATURE = [3, 3, 4, 4];

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
  stages: V2[]; // position after each fix (index 0 = the slop)
  moves: { from: V2; to: V2; t0: number; t1: number }[];
};

// Hand-placed slop: every feature touches every corner of the board.
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

// Stages: each gather moves its features into their districts; anything
// sitting in a claimed district steps aside to the nearest free slot.
{
  const claimed: number[] = [];
  CUE.fixes.forEach((f, fx) => {
    const gathering = GATHERS[fx];
    claimed.push(...gathering);
    const gone = (b: Block) => b.feature === GREY && fx >= FIX.junction;
    const prev = BLOCKS.map((b) => b.stages[b.stages.length - 1]);
    const next: (V2 | null)[] = BLOCKS.map((b, i) => (claimed.includes(b.feature) ? districtCell(b.feature, b.k) : gone(b) ? prev[i] : null));
    const taken = (p: V2) => next.some((q, j) => q && !gone(BLOCKS[j]) && Math.hypot(q[0] - p[0], q[1] - p[1]) < 1.6);
    BLOCKS.forEach((b, i) => {
      if (next[i]) return;
      const here = prev[i];
      const blocked = claimed.some((c) => inDistrict(here, c)) || taken(here);
      if (!blocked) return void (next[i] = here);
      const free = SLOTS.filter((p) => !claimed.some((c) => inDistrict(p, c)) && !taken(p) && !BLOCKS.some((o, j) => j !== i && !next[j] && !gone(o) && Math.hypot(prev[j][0] - p[0], prev[j][1] - p[1]) < 0.1))
        .sort((a, b2) => Math.hypot(a[0] - here[0], a[1] - here[1]) - Math.hypot(b2[0] - here[0], b2[1] - here[1]));
      next[i] = free[0] ?? here;
    });
    BLOCKS.forEach((b, i) => {
      const to = next[i]!;
      b.stages.push(to);
      if (Math.hypot(to[0] - prev[i][0], to[1] - prev[i][1]) > 0.01) {
        const gather = gathering.includes(b.feature);
        // Gathering blocks fly on a stagger and land on the downbeat; displaced ones shuffle first.
        const t0 = gather ? f.lift + 0.05 * b.k : f.lift - 0.35;
        b.moves.push({ from: prev[i], to, t0, t1: gather ? f.land : f.lift + 0.1 });
      }
    });
  });
}
export const FINAL = CUE.fixes.length; // index of the clean stage

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
  for (let i = 1; i < bs.length; i++) link(bs[i - 1].id, bs[i].id, "legit", GATHER_OF_FEATURE[f]);
}
// Hidden links (layer 2), needless links and special-case tape (layer 1).
const PLAN = [
  { f: [0], hidden: 3, needless: 3, tapes: 3 },
  { f: [1], hidden: 2, needless: 2, tapes: 2 },
  { f: [2, 3], hidden: 4, needless: 3, tapes: 3 },
];
const pick = <T,>(xs: T[]) => xs[Math.floor(rnd() * xs.length)];
for (const p of PLAN) {
  for (let i = 0; i < p.hidden; i++) {
    const f = p.f[i % p.f.length];
    const bs = ofFeature(f);
    link(bs[i % bs.length].id, bs[(i + 2 + (i % 3)) % bs.length].id, "hidden", GATHER_OF_FEATURE[f]);
  }
  for (let i = 0; i < p.needless; i++) {
    const f = p.f[i % p.f.length];
    const others = BLOCKS.filter((b) => b.feature !== f && b.feature !== GREY);
    link(pick(ofFeature(f)).id, pick(others).id, "needless", FIX.needless);
  }
  const legit = LINKS.filter((l) => l.kind === "legit" && p.f.includes(BLOCKS[l.a].feature) && !l.tape);
  for (let i = 0; i < p.tapes; i++) legit[(i * 2) % legit.length].tape = true;
}
// Surplus: each junction box just passes a link through (two cables); two of those cables carry tape.
{
  const greys = BLOCKS.filter((b) => b.feature === GREY);
  const real = BLOCKS.filter((b) => b.feature !== GREY);
  greys.forEach((g, i) => {
    const near = [...real].sort((p, q) => Math.hypot(p.stages[0][0] - g.stages[0][0], p.stages[0][1] - g.stages[0][1]) - Math.hypot(q.stages[0][0] - g.stages[0][0], q.stages[0][1] - g.stages[0][1]));
    link(near[1].id, g.id, "surplus", FIX.junction, i < 2);
    link(g.id, near[4 + i].id, "surplus", FIX.junction);
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

// ---------- scans ----------
// A sweep is a beam crossing the board in x; it tags (or clears) what it passes.
export type Sweep = { t: readonly [number, number]; x: readonly [number, number] };
export const SWEEP_1: Sweep = { t: CUE.scan, x: [-9.5, 9.5] };
export const SWEEP_2: Sweep = { t: CUE.scan2, x: [9.5, -9.5] };
export const WEEK_SWEEPS: Sweep[] = CUE.weeks.map((w) => ({ t: [w + WEEK.sweep[0], w + WEEK.sweep[1]] as const, x: [-9.5, 9.5] as const }));
export const sweepX = (sw: Sweep, s: number) => {
  const u = Math.min(1, Math.max(0, (s - sw.t[0]) / (sw.t[1] - sw.t[0])));
  return sw.x[0] + (sw.x[1] - sw.x[0]) * u;
};
export const crossAt = (sw: Sweep, x: number) => sw.t[0] + ((x - sw.x[0]) / (sw.x[1] - sw.x[0])) * (sw.t[1] - sw.t[0]);

// ---------- problems ----------
// Every problem is one tag. Its anchor is a cable midpoint (hidden, needless,
// tape) or a junction box top. A scan tags it as the beam passes.
export type Kind = "hidden" | "needless" | "tape" | "junction";
export type Problem = { id: number; fix: number; layer: 1 | 2; kind: Kind; link?: number; block?: number; anchor: V3; tagAt: number; label?: string };

const top = (id: number): V3 => {
  const b = BLOCKS[id];
  return [b.stages[0][0], b.h, b.stages[0][1]];
};
export function arcHeight(l: { arc: number }, p: V3, q: V3) {
  const d = Math.hypot(q[0] - p[0], q[2] - p[2]);
  return Math.min(l.arc, 0.25 + d * 0.22);
}
export const linkMid = (l: Link, ends: [V3, V3], u = 0.5): V3 => {
  const [p, q] = ends;
  const lift = l.kind === "hidden" ? 0.04 : arcHeight(l, p, q);
  return [p[0] + (q[0] - p[0]) * u, p[1] + (q[1] - p[1]) * u + Math.sin(Math.PI * u) * lift, p[2] + (q[2] - p[2]) * u];
};
export const restEnds = (l: Link): [V3, V3] => {
  const p = top(l.a), q = top(l.b);
  return l.kind === "hidden" ? [[p[0], 0.02, p[2]], [q[0], 0.02, q[2]]] : [p, q];
};

export const PROBLEMS: Problem[] = [];
for (const l of LINKS) {
  if (l.kind === "hidden") PROBLEMS.push({ id: 0, fix: l.fix, layer: 2, kind: "hidden", link: l.id, anchor: linkMid(l, restEnds(l)), tagAt: 0 });
  if (l.kind === "needless") PROBLEMS.push({ id: 0, fix: FIX.needless, layer: 1, kind: "needless", link: l.id, anchor: linkMid(l, restEnds(l)), tagAt: 0 });
  if (l.tape) PROBLEMS.push({ id: 0, fix: FIX.tape, layer: 1, kind: "tape", link: l.id, anchor: linkMid(l, restEnds(l)), tagAt: 0 });
}
for (const b of BLOCKS) if (b.feature === GREY) PROBLEMS.push({ id: 0, fix: FIX.junction, layer: 1, kind: "junction", block: b.id, anchor: top(b.id), tagAt: 0 });
for (const layer of [1, 2] as const) {
  const sw = layer === 1 ? SWEEP_1 : SWEEP_2;
  const ps = PROBLEMS.filter((p) => p.layer === layer).sort((p, q) => crossAt(sw, p.anchor[0]) - crossAt(sw, q.anchor[0]));
  let last = -1;
  for (const p of ps) {
    p.tagAt = Math.max(crossAt(sw, p.anchor[0]), last + 0.06);
    last = p.tagAt;
  }
}
PROBLEMS.sort((p, q) => p.tagAt - q.tagAt).forEach((p, i) => (p.id = i));
export const LAYER_COUNT = { 1: PROBLEMS.filter((p) => p.layer === 1).length, 2: PROBLEMS.filter((p) => p.layer === 2).length };
export const FIX_SIZES = CUE.fixes.map((_, fx) => PROBLEMS.filter((p) => p.fix === fx).length);

// The slop the scan names out loud: the patterns AI-written code piles up.
// One callout per pattern, spaced so each gets its own beat.
const LABELS: Record<Kind, string[]> = {
  tape: ["swallowed error", "retry + sleep", "if for one value", "disabled test"],
  junction: ["pass-through wrapper", "dead code"],
  needless: ["reaching into internals", "param for one caller"],
  hidden: ["copy-pasted logic", "one feature, five folders"],
};
{
  for (const layer of [1, 2] as const) {
    const gap = layer === 1 ? 0.62 : 0.6;
    let lastT = -9, lastKind = "";
    for (const p of PROBLEMS.filter((q) => q.layer === layer)) {
      const pool = LABELS[p.kind];
      if (!pool.length || p.tagAt - lastT < gap || (p.kind === lastKind && layer === 1)) continue;
      p.label = pool.shift();
      lastT = p.tagAt;
      lastKind = p.kind;
    }
  }
}
export const CALLOUTS = PROBLEMS.filter((p) => p.label);

// ---------- weekly slop ----------
// Each week new slop creeps in between the clean districts (a needless link
// and a strip of tape), and that week's sweep clears it as it passes.
export type WeeklySlop = { week: number; a: number; b: number; arc: number; tapeLink: number; cutAt: number; tapeCutAt: number; grow: [number, number] };
export const WEEKLY: WeeklySlop[] = [];
{
  const real = BLOCKS.filter((b) => b.feature !== GREY);
  const legit = LINKS.filter((l) => l.kind === "legit");
  CUE.weeks.forEach((w, i) => {
    for (let j = 0; j < 2; j++) {
      const a = real[(i * 7 + j * 11 + 3) % real.length];
      const others = real.filter((b) => b.feature !== a.feature);
      const b = others[(i * 5 + j * 3 + 1) % others.length];
      const mid = (a.stages[FINAL][0] + b.stages[FINAL][0]) / 2;
      const tl = legit[(i * 5 + j * 2 + 1) % legit.length];
      const tx = (BLOCKS[tl.a].stages[FINAL][0] + BLOCKS[tl.b].stages[FINAL][0]) / 2;
      const sw = WEEK_SWEEPS[i];
      WEEKLY.push({ week: i, a: a.id, b: b.id, arc: 1 + rnd() * 1.4, tapeLink: tl.id, cutAt: crossAt(sw, mid), tapeCutAt: crossAt(sw, tx), grow: [w + WEEK.creep[0] + j * 0.15, w + WEEK.creep[1] + j * 0.1] });
    }
  });
}
