// The one timing source. The 3D board, the type layers, and the synthesized
// score all read it, so every hit on screen lands on a hit in the mix. Times
// are song seconds; the video adds PREROLL in front for the feed thumbnail.

export const BPM = 120;
export const BEAT = 60 / BPM;
export const BAR = BEAT * 4;
export const PREROLL = 0.3;
export const FPS = 60;
export const SONG_END = 52;
export const DURATION = PREROLL + SONG_END;

// Arrangement, in 2s bars.
export const SECTIONS = {
  intro: [0, 6], // the tug: one change drags six modules
  dropA: [6, 10], // title
  scan: [10, 18], // layer 1: the scan names the slop
  clean: [18, 24], // layer 1 cleared, one kind of slop per bar
  deep: [24, 26], // layer 2: a deeper scan finds the debt under it
  gather: [26, 32], // layer 2 cleared: each feature lands in one place
  payoff: [32, 36], // the tug again
  weeks: [36, 44], // slop creeps back; run it again
  claim: [44, 48],
  outro: [48, SONG_END],
} as const;

export const COMMAND = "/refactor-codebase";
export const INSTALL_CMD = "npx skills add dzhng/skills";

const range = (start: number, step: number, n: number) => Array.from({ length: n }, (_, i) => start + i * step);

// One fix = one mechanism. `lift` starts it, `land` is the downbeat it lands on,
// `stamp` (gathers only) is the review stamp.
export type Fix = { lift: number; land: number; stamp: number };
const fix = (lift: number, travel: number): Fix => ({ lift, land: lift + travel, stamp: lift + travel + 0.75 });

export const CUE = {
  // 1 · The tug: one change drags the same feature out of five other places.
  tug: 2.0,
  yanks: [3.0, 3.25, 3.5, 3.75, 4.0],
  slack: 5.0,
  riser1: [4.5, 6.0],

  // 2 · Drop: the name slams; the command types.
  drop: 6.0,
  tagWords: [6.75],
  typing: range(7.5, 0.6 / COMMAND.length, COMMAND.length),
  enter: 8.25,
  clear: 9.5,

  // 3 · Layer 1: the scan names the slop as it passes.
  scan: [10.5, 15.5],
  reveal: 16.0,

  // 4 · Layer 1 cleared: tape, wrappers, needless links; then the two gathers.
  fixes: [fix(18.0, 0.5), fix(20.0, 0.5), fix(22.0, 0.5), fix(26.0, 0.75), fix(28.0, 0.75)],

  // 5 · Layer 2: a red scan sweeps back under the floor.
  xray: 24.0,
  scan2: [24.25, 25.75],

  // 6 · The tug again: the feature lifts as one block.
  matchCut: 32.0,
  tug2: 32.5,

  // 7 · Every week: new slop creeps in, a quick sweep clears it.
  weeks: [36.0, 38.0, 40.0, 42.0],

  // 8 · The claim and the lockup.
  slam: 44.0,
  slam2: 44.5,
  lockup: 48.0,
  lockTag: 48.5,
  lockCmd: 49.0,
  lockInstall: 49.5,
  finalHit: 50.0,
} as const;

// Within each week: slop grows in, then the sweep crosses the board.
export const WEEK = { creep: [0.1, 0.7], sweep: [0.9, 1.5] } as const;

// Section headers, bottom-left.
export const STEPS = [
  { at: SECTIONS.scan[0], until: SECTIONS.deep[0], n: "LAYER 1", label: "AI slop" },
  { at: SECTIONS.deep[0], until: SECTIONS.payoff[0], n: "LAYER 2", label: "The debt under it" },
  { at: SECTIONS.weeks[0], until: SECTIONS.claim[0], n: "EVERY WEEK", label: "Slop creeps back" },
];
