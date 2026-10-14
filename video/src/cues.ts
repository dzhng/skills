// The one timing source. The 3D world, the type layers, and the synthesized
// score all read it, so every hit on screen lands on a hit in the mix. Times
// are song seconds; the video adds PREROLL in front for the feed thumbnail.

export const BPM = 120;
export const BEAT = 60 / BPM;
export const BAR = BEAT * 4;
export const PREROLL = 0.3;
export const FPS = 60;
export const SONG_END = 33.5;
export const DURATION = PREROLL + SONG_END;

// Arrangement.
export const SECTIONS = {
  intro: [0, 4],
  dropA: [4, 16],
  night: [16, 20],
  build: [20, 22],
  dropB: [22, 26],
  breath: [26, 30],
  dropC: [30, 32],
  outro: [32, SONG_END],
} as const;

export const SKILLS = [
  "explore-unknowns", "write-spec", "implement-spec", "implement-spec-with-codex",
  "close-spec", "auto-research", "refactor-clean", "write-tests",
  "audit-performance", "write-docs", "code-review", "audit-choices",
  "eli5", "review", "codex", "claude",
  "marketing-pages", "compare-screenshots", "screenshot-critique", "preview-shots",
  "write-skills", "eval-skills", "renderer", "launch-video",
];
export const INSTALL_CMD = "npx skills add dzhng/skills";

const range = (start: number, step: number, n: number) => Array.from({ length: n }, (_, i) => start + i * step);

export const CUE = {
  // 1 · Fog: fly through the words.
  fogWords: [0.25, 1.85], // "The goal is clear." · "The terrain isn't."
  glints: [0.25, 1.25, 2.25, 3.0, 3.25, 3.5],
  riser1: [2.5, 4.0],

  // 2 · Drop: fog blasts, ground ripples, skills rain in.
  drop: 4.0,
  tagWords: [4.75, 5.0, 5.125, 5.25],
  typing: range(5.75, 1 / 27, INSTALL_CMD.length),
  enter: 7.0,
  rain: range(7.25, 1 / 32, SKILLS.length),

  // 3 · Map the fog: sonar pulses clear one quadrant each.
  explore: 8.0,
  pulses: [8.5, 9.5, 10.5, 11.5],

  // 4 · Slice: lasers cut, territories rise and flood with color.
  slice: 12.0,
  lasers: [12.5, 13.0, 13.5, 14.0],
  rise: 14.25,
  color: 14.5,
  flags: range(15.0, 0.0625, 7),

  // 5 · Build at night: the agent verifies each territory; factories grow.
  night: 16.0,
  visits: [
    { t: 16.5, land: 0, ok: true },
    { t: 17.0, land: 1, ok: true },
    { t: 17.5, land: 2, ok: false },
    { t: 18.0, land: 2, ok: true },
    { t: 18.5, land: 3, ok: true },
    { t: 19.0, land: 4, ok: true },
    { t: 19.25, land: 5, ok: true },
    { t: 19.5, land: 6, ok: true },
  ],
  reslice: 17.75,
  timelapse: [19.5, 22.0],
  riser2: [20.0, 22.0],

  // 6 · Proof.
  slam: 22.0, // "The middle"
  slam2: 22.5, // "runs itself."
  proofSub: [23.0], // timer docks under the headline

  // 7 · Review the choices.
  dawn: 26.0,
  choiceWords: [26.25, 26.75, 27.5], // "Review the" "choices," "not the diff."
  harness: [28.5, 28.75, 29.0],
  collapse: [29.5, 30.0],

  // 8 · Lockup.
  lockup: 30.0,
  lockTag: 30.5,
  lockCmd: 31.0,
  lockUrl: 31.5,
  finalHit: 32.0,
} as const;

// The unattended timer: it races through hours in the time-lapse, then keeps
// counting into days under "The middle runs itself." (illustrative, not a claim).
const HOURS_AT_SLAM = 7 * 3600 + 23 * 60;
const TIMER_END = 2 * 86400 + 21 * 3600 + 47 * 60;
export const timerSeconds = (s: number) => {
  const [a] = CUE.timelapse;
  if (s <= a) return 0;
  if (s < CUE.slam) return HOURS_AT_SLAM * ((s - a) / (CUE.slam - a)) ** 2;
  const p = Math.min(1, (s - CUE.slam) / (CUE.dawn - 0.3 - CUE.slam));
  return HOURS_AT_SLAM + (TIMER_END - HOURS_AT_SLAM) * p ** 1.3;
};
// A tick each time the counter crosses another 20 minutes (hours) or 4 hours (days).
export const timerTicks: number[] = [];
{
  let last = 0;
  for (let s = CUE.timelapse[0]; s < CUE.dawn; s += 0.002) {
    const v = timerSeconds(s);
    const step = v < HOURS_AT_SLAM ? 1200 : 4 * 3600;
    const bucket = v < HOURS_AT_SLAM ? Math.floor(v / step) : 1000 + Math.floor(v / step);
    if (bucket !== last && s > CUE.timelapse[0] + 0.05) timerTicks.push(s);
    last = bucket;
  }
}

// Command tags typed out as each step begins (bottom-left), one key per char.
export const STEP_TAGS = [
  { at: CUE.explore, until: CUE.slice, label: "01 · map the fog", cmd: "/explore-unknowns" },
  { at: CUE.slice, until: CUE.night, label: "02 · slice it", cmd: "/write-spec" },
  { at: CUE.night, until: CUE.timelapse[0], label: "03 · build", cmd: "/goal /implement-spec" },
].map((tag) => ({ ...tag, keys: range(tag.at + 0.15, 0.4 / tag.cmd.length, tag.cmd.length) }));
