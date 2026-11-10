// The one timing source. The scenes, the type layers, and the synthesized
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
  open: [0, 6], // the problem: one change lands in seven places
  title: [6, 10],
  scatter: [10, 16], // one feature spread across five folders
  guards: [16, 20], // guards nothing needs
  states: [20, 26], // hidden state machines
  giant: [26, 30], // files too big to read
  tests: [30, 36], // tests that prove nothing
  payoff: [36, 40], // the same change lands in one place
  weeks: [40, 44], // slop creeps back; run it again
  claim: [44, 48],
  outro: [48, SONG_END],
} as const;

export const COMMAND = "/refactor-codebase";
export const INSTALL_CMD = "npx skills add dzhng/skills";

const range = (start: number, step: number, n: number) => Array.from({ length: n }, (_, i) => start + i * step);

export const CUE = {
  // 0 · The problem: sessions pile up, then one change hits seven places.
  sessions: [0.5, 1.0, 1.5, 2.0],
  request: 2.5,
  hits: range(2.75, 0.25, 7),
  riser1: [4.5, 6.0],

  // Title: the name slams; the command types.
  drop: 6.0,
  tagWords: [6.75],
  typing: range(7.5, 0.6 / COMMAND.length, COMMAND.length),
  enter: 8.25,
  clear: 9.5,

  // 1 · One feature, five folders: the pieces light up, then regroup by feature.
  scatter: { found: range(10.5, 0.25, 5), more: [12.0, 12.5], lift: 13.25, land: 14.0, link: 14.4 },

  // 2 · Guards: rings of defensive code wrap one line, then peel off.
  guards: { wrap: range(16.2, 0.2, 6), peel: range(17.6, 0.2, 6) },

  // 3 · Hidden state machines: flags flip from everywhere, jam, then become one machine.
  states: { flips: range(20.25, 0.25, 7), jam: 22.0, collapse: 23.5, edges: [24.0, 24.5], run: [24.75, 25.4] },

  // 4 · Files too big to read: one file outgrows a read, then splits on its seams.
  giant: { grow: [26.0, 27.25], seams: [27.75, 28.0, 28.25], split: 28.4, checks: range(28.85, 0.125, 4) },

  // 5 · Tests that prove nothing: a bug falls through a green wall; after the
  // audit, one test catches it.
  tests: { bug: [31.0, 32.4], merge: range(32.75, 0.25, 4), bug2: 34.0, caught: 34.5, fixed: 35.0 },

  // Payoff: the same change, one place.
  matchCut: 36.0,
  request2: 36.5,
  hit2: 37.0,

  // Every week slop creeps back in; each run takes it out.
  weeks: [40.0, 41.0, 42.0, 43.0],

  // The claim and the lockup.
  slam: 44.0,
  slam2: 44.5,
  lockup: 48.0,
  lockTag: 48.5,
  lockCmd: 49.0,
  lockInstall: 49.5,
  finalHit: 50.0,
} as const;

// Within each week: slop creeps in, then the run takes it out.
export const RUN_AT = 0.75;

// Find headers, bottom-left: the skill that hunts it, what it finds, and
// what it leaves once the fix lands.
export const FINDS = [
  { at: SECTIONS.scatter[0], until: SECTIONS.scatter[1], skill: "", label: "One feature, five folders", fixed: "One folder per feature", fixAt: CUE.scatter.land },
  { at: SECTIONS.guards[0], until: SECTIONS.guards[1], skill: "find-overengineering", label: "Guards nothing needs", fixed: "Just the real work", fixAt: CUE.guards.peel[5] + 0.2 },
  { at: SECTIONS.states[0], until: SECTIONS.states[1], skill: "find-state-machines", label: "Hidden state machines", fixed: "One explicit state machine", fixAt: CUE.states.collapse + 0.3 },
  { at: SECTIONS.giant[0], until: SECTIONS.giant[1], skill: "ratchet-files", label: "Files too big to read", fixed: "Files read in one pass", fixAt: CUE.giant.split + 0.3 },
  { at: SECTIONS.tests[0], until: SECTIONS.tests[1], skill: "audit-tests", label: "Tests that prove nothing", fixed: "Tests that catch the bug", fixAt: CUE.tests.caught },
  { at: SECTIONS.weeks[0], until: SECTIONS.weeks[1], skill: null, label: "Slop creeps back", fixed: null, fixAt: Infinity },
] as const;
