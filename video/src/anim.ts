// Motion primitives driven by absolute song seconds, so cue values stay literal.
import { BEAT, CUE, SECTIONS } from "./cues.ts";

export const clamp = (x: number, a = 0, b = 1) => Math.min(b, Math.max(a, x));
export const lerp = (a: number, b: number, t: number) => a + (b - a) * t;
export const prog = (s: number, a: number, b: number) => clamp((s - a) / (b - a));
export const outCubic = (t: number) => 1 - (1 - clamp(t)) ** 3;
export const inCubic = (t: number) => clamp(t) ** 3;
export const outExpo = (t: number) => (t >= 1 ? 1 : 1 - 2 ** (-10 * clamp(t)));
export const inOutCubic = (t: number) => {
  t = clamp(t);
  return t < 0.5 ? 4 * t * t * t : 1 - (-2 * t + 2) ** 3 / 2;
};
export const outBack = (t: number, k = 1.8) => {
  t = clamp(t);
  return 1 + (k + 1) * (t - 1) ** 3 + k * (t - 1) ** 2;
};

// Damped spring from 0 to 1 starting at `start`; overshoots by design.
export function spring(s: number, start: number, freq = 2.4, damp = 0.32) {
  const t = s - start;
  if (t <= 0) return 0;
  const w = 2 * Math.PI * freq;
  const wd = w * Math.sqrt(1 - damp * damp);
  return 1 - Math.exp(-damp * w * t) * (Math.cos(wd * t) + ((damp * w) / wd) * Math.sin(wd * t));
}

// Squash & stretch after a landing at `start`: [scaleX, scaleY].
export function squash(s: number, start: number, amount = 0.22): [number, number] {
  const t = s - start;
  if (t < 0) return [1, 1];
  const k = amount * Math.exp(-t / 0.09) * Math.cos(t * 38);
  return [1 + k, 1 - k];
}

const within = (s: number, [a, b]: readonly number[]) => s >= a && s < b;
export const kickOn = (s: number) =>
  within(s, SECTIONS.dropA) || within(s, SECTIONS.night) || within(s, SECTIONS.dropB) || within(s, SECTIONS.dropC);

// 1 on each kick, decaying before the next.
export function kick(s: number) {
  if (!kickOn(s)) return 0;
  return Math.exp(-(((s % BEAT) + BEAT) % BEAT) / 0.11);
}

export const IMPACTS: [number, number][] = [
  [CUE.drop, 1.2],
  [CUE.visits[2].t, 0.6],
  [CUE.slam, 1.4],
  [CUE.dawn, 0.5],
  [CUE.lockup, 0.8],
];

// Screen shake summed over recent impacts, in px.
export function shake(s: number) {
  let x = 0, y = 0, r = 0;
  for (const [t, a] of IMPACTS) {
    const d = s - t;
    if (d < 0 || d > 0.7) continue;
    const e = a * Math.exp(-d / 0.13);
    x += Math.sin(d * 91 + t) * 24 * e;
    y += Math.cos(d * 77 + t * 3) * 18 * e;
    r += Math.sin(d * 53 + t) * 0.7 * e;
  }
  return { x, y, r };
}

// Day ↔ night: dusk at the build, dawn at the choices.
export const night = (s: number) => inOutCubic(prog(s, CUE.night - 0.25, CUE.night + 0.75)) * (1 - inOutCubic(prog(s, CUE.dawn - 0.1, CUE.dawn + 0.3)));
