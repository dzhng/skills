// The one timing source. The 3D board, the type layers, and the synthesized
// score all read it, so every hit on screen lands on a hit in the mix. Times
// are song seconds; the video adds PREROLL in front for the feed thumbnail.

export const BPM = 120;
export const BEAT = 60 / BPM;
export const BAR = BEAT * 4;
export const PREROLL = 0.3;
export const FPS = 60;
export const SONG_END = 54;
export const DURATION = PREROLL + SONG_END;

// Arrangement, in 2s bars.
export const SECTIONS = {
  intro: [0, 6], // the tug: one change drags six blocks
  dropA: [6, 10], // title
  scan: [10, 18], // 01 tag every problem
  redesign: [18, 26], // 02 one fix behind many
  land: [26, 40], // 03 land one fix at a time
  search: [40, 44], // 04 search again
  payoff: [44, 46], // the tug again
  dropC: [46, 50], // one change, one place
  outro: [50, SONG_END],
} as const;

export const COMMAND = "/refactor-codebase";
export const INSTALL_CMD = "npx skills add dzhng/skills";

const range = (start: number, step: number, n: number) => Array.from({ length: n }, (_, i) => start + i * step);

// One fix = one mechanism = one commit. `lift` starts the move, `land` is the
// downbeat it lands on, `stamp` is code-review, `commit` drops its bead.
export type Fix = { lift: number; land: number; stamp: number; commit: number };
const fix = (lift: number, travel: number): Fix => ({ lift, land: lift + travel, stamp: lift + travel + 0.75, commit: lift + travel + 1.25 });

export const CUE = {
  // 1 · The tug: one change drags the same feature out of five other places.
  tug: 2.0,
  yanks: [3.0, 3.25, 3.5, 3.75, 4.0],
  slack: 5.0, // everything drops back
  riser1: [4.5, 6.0],

  // 2 · Drop: the name slams; the command types.
  drop: 6.0,
  tagWords: [6.75],
  typing: range(7.5, 0.6 / COMMAND.length, COMMAND.length),
  enter: 8.25,
  clear: 9.5,

  // 3 · Tag every problem: a scan beam sweeps the board.
  scan: [10.5, 15.5],
  reveal: 16.0, // pull back to the whole board, every problem tagged

  // 4 · Redesign: blueprint; tags fly into one cluster per fix.
  blueprint: 18.0,
  flock: [18.5, 20.0],
  snaps: [20.0, 20.5, 21.0, 21.5],
  tally: 22.0, // "31 problems → 4 fixes"
  riser2: [24.0, 26.0],

  // 5 · Land one fix at a time, biggest first.
  fixes: [fix(26.0, 1.0), fix(30.0, 0.75), fix(33.0, 0.75), fix(35.5, 0.75)],
  clean: 38.0,

  // 6 · Search again: fresh inspectors sweep with flashlights.
  dim: 40.0,
  sweep: [40.25, 43.5],
  found: 41.5,
  refix: 42.5,
  allClear: 43.5,

  // 7 · The tug again: the feature lifts as one block.
  matchCut: 44.0,
  tug2: 44.5,
  slam: 46.0, // "One change."
  slam2: 46.5, // "One place."

  // 8 · Lockup.
  lockup: 50.0,
  lockCmd: 50.75,
  lockInstall: 51.25,
  finalHit: 52.0,
} as const;

export const COMMITS = [
  ...CUE.fixes.map((f) => f.commit),
  CUE.refix + 0.5,
];

// Step headers, typed bottom-left as each step begins.
export const STEPS = [
  { at: SECTIONS.scan[0], until: SECTIONS.redesign[0], n: "01", label: "Tag every problem" },
  { at: SECTIONS.redesign[0], until: SECTIONS.land[0], n: "02", label: "One fix behind many" },
  { at: SECTIONS.land[0], until: SECTIONS.search[0], n: "03", label: "Land one fix at a time" },
  { at: SECTIONS.search[0], until: SECTIONS.payoff[0], n: "04", label: "Search again" },
];
