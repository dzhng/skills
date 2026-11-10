// Synthesizes the soundtrack from the cue sheet: a 120 BPM synth-pop bed plus
// one sound per on-screen event. Writes public/raw.wav; master.ts loudnorms it.
import { writeFileSync } from "node:fs";
import {
  BAR, BEAT, COMMITS, CUE, DURATION, PREROLL, SECTIONS, SONG_END,
} from "../src/cues.ts";
import { PROBLEMS } from "../src/world/board.ts";

const SR = 48000;
const N = Math.ceil(DURATION * SR);
const L = new Float32Array(N);
const R = new Float32Array(N);
const sendL = new Float32Array(N); // reverb send
const sendR = new Float32Array(N);

// ---------- helpers ----------
const at = (s: number) => Math.round((s + PREROLL) * SR); // song time → sample
const hz = (midi: number) => 440 * 2 ** ((midi - 69) / 12);
const inRange = (s: number, [a, b]: readonly number[]) => s >= a && s < b;
let seed = 1;
const noise = () => {
  seed = (seed * 1664525 + 1013904223) >>> 0;
  return seed / 2 ** 31 - 1;
};

type Voice = (i: number, t: number) => number; // i = sample index in voice, t = seconds
function place(s: number, dur: number, fn: Voice, gain = 1, pan = 0, send = 0) {
  const start = at(s);
  const len = Math.round(dur * SR);
  const gl = gain * Math.cos(((pan + 1) * Math.PI) / 4) * Math.SQRT2;
  const gr = gain * Math.sin(((pan + 1) * Math.PI) / 4) * Math.SQRT2;
  for (let i = 0; i < len; i++) {
    const k = start + i;
    if (k < 0 || k >= N) continue;
    const v = fn(i, i / SR);
    L[k] += v * gl;
    R[k] += v * gr;
    sendL[k] += v * gl * send;
    sendR[k] += v * gr * send;
  }
}

// Resonant state-variable lowpass/bandpass/highpass, cutoff may vary per sample.
function svf(mode: "lp" | "bp" | "hp", q = 0.7) {
  let low = 0, band = 0;
  return (x: number, cutoff: number) => {
    const f = 2 * Math.sin((Math.PI * Math.min(cutoff, SR / 6)) / SR);
    low += f * band;
    const high = x - low - band / q;
    band += f * high;
    return mode === "lp" ? low : mode === "bp" ? band : high;
  };
}
const saw = (ph: number) => 2 * (ph - Math.floor(ph + 0.5));
const env = (t: number, a: number, d: number) => (t < a ? t / a : Math.exp(-(t - a) / d));

// ---------- arrangement ----------
// vi–IV–I–V in C (Am F C G), one chord per bar: tense, then resolving.
const CHORDS = [
  { root: 33, notes: [57, 60, 64, 69] },
  { root: 41, notes: [57, 60, 65, 69] },
  { root: 36, notes: [55, 60, 64, 67] },
  { root: 43, notes: [55, 59, 62, 67] },
];
const chordAt = (s: number) => CHORDS[Math.floor(Math.max(0, s) / BAR) % 4];
const kickOn = (s: number) => inRange(s, SECTIONS.dropA) || inRange(s, SECTIONS.scan) || inRange(s, SECTIONS.land) || inRange(s, SECTIONS.dropC);
const kicks: number[] = [];
for (let s = 0; s < SONG_END; s += BEAT) if (kickOn(s)) kicks.push(s);

// Sidechain: everything melodic ducks under each kick.
function duck(s: number) {
  let last = -1;
  for (const k of kicks) if (k <= s) last = k; else break;
  if (last < 0 || s - last > 0.4) return 1;
  return 1 - 0.75 * Math.exp(-(s - last) / 0.11);
}

// ---------- drums ----------
function kick(s: number, gain = 1) {
  place(s, 0.45, (_, t) => {
    const f = 45 + 120 * Math.exp(-t / 0.03);
    const ph = 45 * t + (120 * 0.03) * (1 - Math.exp(-t / 0.03));
    const click = t < 0.004 ? noise() * (1 - t / 0.004) * 0.5 : 0;
    return (Math.sin(2 * Math.PI * ph) * env(t, 0.001, 0.16) + click) * (f > 0 ? 1 : 0);
  }, 0.95 * gain);
}
function clap(s: number, gain = 1) {
  const bp = svf("bp", 1.2);
  place(s, 0.3, (_, t) => {
    const bursts = [0, 0.011, 0.022].reduce((a, o) => a + (t >= o ? Math.exp(-(t - o) / 0.006) : 0), 0);
    const tail = Math.exp(-t / 0.09);
    return bp(noise() * (bursts * 0.6 + tail), 1400) * 1.6;
  }, 0.5 * gain, 0, 0.35);
}
function hat(s: number, open = false, gain = 1, pan = 0) {
  const hp = svf("hp", 0.8);
  place(s, open ? 0.25 : 0.06, (_, t) => hp(noise(), 8000) * env(t, 0.0005, open ? 0.07 : 0.018), 0.22 * gain, pan);
}

// ---------- tonal ----------
function bassNote(s: number, midi: number, dur: number) {
  const lp = svf("lp", 1.1);
  place(s, dur, (_, t) => {
    const f = hz(midi);
    const v = saw(f * t) + 0.6 * Math.sin(2 * Math.PI * f * 0.5 * t);
    return lp(v, 180 + 1400 * Math.exp(-t / 0.08)) * env(t, 0.004, dur * 0.6) * duck(s + t);
  }, 0.36);
}
function pad(s0: number, s1: number, cutoffAt: (s: number) => number, gain: number) {
  for (let b = Math.floor(s0 / BAR); b * BAR < s1; b++) {
    const s = Math.max(s0, b * BAR);
    const e = Math.min(s1, (b + 1) * BAR);
    const { notes } = chordAt(s);
    const lpL = svf("lp", 0.9), lpR = svf("lp", 0.9);
    const detune = [-0.12, 0, 0.11];
    const len = e - s;
    const gl = gain, gr = gain;
    const start = at(s);
    for (let i = 0; i < len * SR; i++) {
      const t = i / SR;
      let vl = 0, vr = 0;
      for (const n of notes) for (const d of detune) {
        const f = hz(n + d);
        vl += saw(f * t + d);
        vr += saw(f * 1.002 * t + d * 3);
      }
      const edge = Math.min(1, t / 0.02, (len - t) / 0.02);
      const c = cutoffAt(s + t);
      const g = edge * duck(s + t) / 12;
      const k = start + i;
      if (k >= N) break;
      const l = lpL(vl, c) * g * gl, r = lpR(vr, c) * g * gr;
      L[k] += l; R[k] += r; sendL[k] += l * 0.5; sendR[k] += r * 0.5;
    }
  }
}
function pluck(s: number, midi: number, gain: number, bright: number, pan: number) {
  const lp = svf("lp", 1.4);
  place(s, 0.22, (_, t) => {
    const f = hz(midi);
    const sq = Math.sign(Math.sin(2 * Math.PI * f * t)) * 0.6 + saw(f * 2.001 * t) * 0.4;
    return lp(sq, 300 + bright * Math.exp(-t / 0.05)) * env(t, 0.002, 0.07) * duck(s + t);
  }, gain, pan, 0.4);
}

// ---------- FX + UI sounds ----------
function riser(s0: number, s1: number, gain = 1) {
  const bp = svf("bp", 2.5);
  const dur = s1 - s0;
  place(s0, dur, (_, t) => {
    const p = t / dur;
    const n = bp(noise(), 400 + 9000 * p * p);
    const tone = saw(hz(48 + 24 * p) * t * (1 + p)) * 0.25;
    return (n * 1.3 + tone * p) * p * p;
  }, 0.5 * gain, 0, 0.3);
}
function impact(s: number, gain = 1) {
  const lp = svf("lp", 0.7);
  place(s, 2.2, (_, t) => {
    const boom = Math.sin(2 * Math.PI * (30 * t + 60 * 0.12 * (1 - Math.exp(-t / 0.12)))) * env(t, 0.002, 0.5);
    const crash = lp(noise(), 2000 + 7000 * Math.exp(-t / 0.3)) * env(t, 0.001, 0.45);
    return boom * 0.9 + crash * 0.55;
  }, 0.7 * gain, 0, 0.5);
}
function whoosh(s: number, dur = 0.45, gain = 1, up = true) {
  const bp = svf("bp", 1.6);
  place(s, dur, (_, t) => {
    const p = t / dur;
    const c = up ? 300 + 5000 * p * p : 5000 - 4700 * p;
    return bp(noise(), c) * Math.sin(Math.PI * Math.min(1, p)) ** 1.5;
  }, 0.45 * gain, 0, 0.3);
}
function pop(s: number, pitch = 1, gain = 1, pan = 0) {
  place(s, 0.09, (_, t) => {
    const f = (500 + 700 * Math.exp(-t / 0.012)) * pitch;
    return Math.sin(2 * Math.PI * f * t) * env(t, 0.001, 0.025);
  }, 0.32 * gain, pan, 0.25);
}
function tick(s: number, pitch = 1, gain = 1, pan = 0) {
  const bp = svf("bp", 3);
  place(s, 0.03, (_, t) => (bp(noise(), 3200 * pitch) * 2 + Math.sin(2 * Math.PI * 2600 * pitch * t) * 0.5) * env(t, 0.0005, 0.006), 0.28 * gain, pan);
}
function key(s: number, heavy = false) {
  const bp = svf("bp", 1.2);
  const pan = (noise() * 0.3);
  place(s, 0.05, (_, t) => (bp(noise(), heavy ? 1500 : 2400) * 1.8 + Math.sin(2 * Math.PI * 180 * t) * 0.5) * env(t, 0.0005, heavy ? 0.018 : 0.008), heavy ? 0.4 : 0.22, pan);
}
function checkBlip(s: number, gain = 1) {
  place(s, 0.22, (_, t) => {
    const f = t < 0.06 ? hz(84) : hz(88);
    return Math.sin(2 * Math.PI * f * t) * env(t < 0.06 ? t : t - 0.06, 0.002, 0.05) * 0.8;
  }, 0.3 * gain, 0.1, 0.4);
}
function thud(s: number) {
  const lp = svf("lp", 1);
  place(s, 0.3, (_, t) => {
    const f = 110 * Math.exp(-t / 0.2);
    return lp(Math.sign(Math.sin(2 * Math.PI * f * t)), 900) * env(t, 0.001, 0.08);
  }, 0.5, 0, 0.2);
}
function ding(s: number, midi = 96, gain = 1) {
  place(s, 1.6, (_, t) => {
    const f = hz(midi);
    return (Math.sin(2 * Math.PI * f * t) + 0.4 * Math.sin(2 * Math.PI * f * 2.76 * t) * Math.exp(-t / 0.2) + 0.2 * Math.sin(2 * Math.PI * f * 5.4 * t) * Math.exp(-t / 0.08)) * env(t, 0.002, 0.45);
  }, 0.16 * gain, 0, 0.6);
}

// ---------- more voices ----------
function sparkle(s: number, midi = 100, gain = 1) {
  place(s, 0.6, (_, t) => (Math.sin(2 * Math.PI * hz(midi) * t) + 0.5 * Math.sin(2 * Math.PI * hz(midi + 7) * t)) * env(t, 0.002, 0.12), 0.12 * gain, (noise() * 0.8), 0.8);
}
function ping(s: number, gain = 1) {
  place(s, 1.4, (_, t) => {
    const f = 1500 * Math.exp(-t / 0.4) + 700;
    return Math.sin(2 * Math.PI * f * t) * env(t, 0.001, 0.25);
  }, 0.22 * gain, 0, 0.9);
}
function zap(s: number, gain = 1) {
  const lp = svf("lp", 3);
  place(s - 0.05, 0.35, (_, t) => {
    const f = 3000 * Math.exp(-t / 0.06) + 120;
    return lp(saw(f * t) + noise() * 0.3, 6000 * Math.exp(-t / 0.1) + 300) * env(t, 0.001, 0.09);
  }, 0.35 * gain, (noise() * 0.6), 0.4);
}
function rumble(s: number, dur: number, gain = 1) {
  const lp = svf("lp", 0.8);
  place(s, dur, (_, t) => lp(noise(), 90 + 200 * (t / dur)) * 3 * Math.sin(Math.PI * Math.min(1, t / dur)), 0.5 * gain);
}
function subDrop(s: number, gain = 1) {
  place(s, 1.2, (_, t) => Math.sin(2 * Math.PI * (28 * t + 40 * 0.4 * (1 - Math.exp(-t / 0.4)))) * env(t, 0.005, 0.5), 0.6 * gain);
}
function scratch(s: number) {
  const bp = svf("bp", 2);
  place(s, 0.25, (_, t) => bp(noise(), 800 + 5000 * (t / 0.25)) * env(t, 0.005, 0.1) * 2, 0.35, 0.2);
}


// Taut-cable twang: a plucked low string that bends up as it's yanked.
function twang(s: number, gain = 1, pan = 0) {
  const lp = svf("lp", 2);
  place(s, 0.6, (_, t) => {
    const f = 70 * (1 + 0.6 * (1 - Math.exp(-t / 0.05)));
    return lp(saw(f * t) + 0.5 * saw(f * 2.01 * t), 2400 * Math.exp(-t / 0.12) + 200) * env(t, 0.001, 0.2);
  }, 0.4 * gain, pan, 0.3);
}
// Metal hook latching on.
function clank(s: number, gain = 1) {
  place(s, 0.5, (_, t) => [1, 2.76, 5.4, 8.9].reduce((a, k, i) => a + Math.sin(2 * Math.PI * 620 * k * t) * Math.exp(-t / (0.12 / (i + 1))), 0) * env(t, 0.0005, 0.25) * 0.5, 0.3 * gain, 0.1, 0.4);
}
// The scan beam: a band of noise that tracks the beam across the board.
function scanHum(s0: number, s1: number) {
  const bp = svf("bp", 4);
  const dur = s1 - s0;
  place(s0, dur, (_, t) => {
    const p = t / dur;
    const edge = Math.min(1, t / 0.2, (dur - t) / 0.3);
    return (bp(noise(), 900 + 2600 * p) * 1.2 + Math.sin(2 * Math.PI * (220 + 110 * p) * t) * 0.15) * edge;
  }, 0.3, 0, 0.3);
}
// Tags burning off when a fix lands.
function crackle(s: number, dur = 0.6, gain = 1) {
  const hp = svf("hp", 0.9);
  place(s, dur, (_, t) => (noise() > 0.93 ? 1 : 0) * hp(noise(), 3000) * 3 * Math.exp(-t / (dur * 0.4)), 0.35 * gain, 0, 0.3);
}

// ---------- the bed ----------
const drumsOn = (s: number) => kickOn(s);
const HEAVY = [CUE.drop, CUE.slam, ...CUE.fixes.map((f) => f.land)];
for (const k of kicks) kick(k, HEAVY.some((t) => Math.abs(t - k) < 0.01) ? 1.2 : 1);
for (let s = 0; s < SONG_END; s += BEAT) {
  const beat = Math.round(s / BEAT) % 4;
  if (drumsOn(s) && (beat === 1 || beat === 3)) clap(s, inRange(s, SECTIONS.scan) ? 0.8 : 1);
  // Heartbeat sub under the tug and the search.
  if ((inRange(s, SECTIONS.intro) && s > 0.4 && s < CUE.slack) || inRange(s, SECTIONS.search)) place(s, 0.3, (_, t) => Math.sin(2 * Math.PI * 50 * t) * env(t, 0.004, 0.09), inRange(s, SECTIONS.search) ? 0.4 : 0.5);
}
for (let s = 0; s < SONG_END; s += BEAT / 4) {
  const sixteenth = Math.round(s / (BEAT / 4)) % 4;
  if (drumsOn(s)) {
    if (sixteenth === 2) hat(s, true, 0.9, 0.2);
    else hat(s, false, sixteenth === 0 ? 0.5 : 0.8, -0.25);
  } else if (inRange(s, SECTIONS.redesign) && s < CUE.riser2[0] && sixteenth % 2 === 0) hat(s, sixteenth === 2, 0.45, 0.2);
}
// Snare roll into the landing: quarters → eighths → sixteenths.
for (let s = CUE.riser2[0]; s < CUE.riser2[1]; ) {
  const p = (s - CUE.riser2[0]) / (CUE.riser2[1] - CUE.riser2[0]);
  clap(s, 0.35 + 0.65 * p);
  s += p < 0.5 ? BEAT : p < 0.75 ? BEAT / 2 : BEAT / 4;
}
// Bass: pumping eighths wherever the kick plays; long roots in the redesign.
for (let s = 0; s < SONG_END; s += BEAT / 2) {
  const { root } = chordAt(s);
  if (drumsOn(s)) {
    const off = Math.round(s / (BEAT / 2)) % 2 === 1;
    bassNote(s, root + (off ? 12 : 0), BEAT / 2);
  } else if (inRange(s, SECTIONS.redesign) && Math.abs((s / BAR) % 1) < 0.01) bassNote(s, root, BAR * 0.9);
}
// Pad: shut in the tangle, open in the drops, wide in the blueprint, dark in the search.
pad(0, SONG_END, (s) => {
  if (s < 6) return 250 + 900 * (s / 6) ** 2;
  if (inRange(s, SECTIONS.redesign)) return 2200 + (s > 24 ? 3000 * ((s - 24) / 2) ** 2 : 0);
  if (inRange(s, SECTIONS.search)) return 600;
  if (inRange(s, SECTIONS.payoff)) return 900 + 2500 * ((s - 44) / 2) ** 2;
  if (s >= SECTIONS.outro[0]) return 3200;
  return 2700;
}, 1);
// Arp: sixteenths over chord tones in the drops, softer in the redesign.
for (let s = 0; s < SECTIONS.outro[0]; s += BEAT / 4) {
  const inDrop = drumsOn(s) && !inRange(s, SECTIONS.scan);
  const soft = inRange(s, SECTIONS.redesign) || inRange(s, SECTIONS.scan);
  if (!inDrop && !soft) continue;
  const { notes } = chordAt(s);
  const i = Math.round(s / (BEAT / 4));
  const n = notes[[0, 1, 2, 3, 2, 1, 3, 2][i % 8]] + 12;
  pluck(s, n, soft ? 0.09 : 0.13, soft ? 1500 : 3500, i % 2 ? 0.35 : -0.35);
}
for (const n of CHORDS[2].notes) pluck(CUE.finalHit, n + 12, 0.2, 5000, 0);
bassNote(CUE.finalHit, 36, 1.2);

// ---------- cue sounds ----------
// 1 · the tug
whoosh(-PREROLL, PREROLL + 0.05, 0.9);
clank(CUE.tug - 0.05, 1.2);
place(CUE.tug, 3, (_, t) => Math.sin(2 * Math.PI * (55 + 20 * Math.min(1, t / 2.5)) * t) * Math.min(1, t / 0.3) * Math.exp(-Math.max(0, t - 2.6) / 0.1), 0.25);
CUE.yanks.forEach((s, i) => {
  twang(s, 1 + i * 0.1, ((i % 3) - 1) * 0.5);
  thud(s);
  tick(s, 0.8 + i * 0.08, 0.7);
});
impact(CUE.slack + 0.22, 0.5);
riser(CUE.riser1[0], CUE.riser1[1], 1.1);
// 2 · title
impact(CUE.drop, 1.2);
subDrop(CUE.drop);
CUE.tagWords.forEach((s) => pop(s, 1, 1));
CUE.typing.forEach((s) => key(s));
key(CUE.enter, true);
pop(CUE.enter, 0.8);
whoosh(CUE.clear, 0.4, 0.8);
// 3 · scan
scanHum(CUE.scan[0] - 0.2, CUE.scan[1] + 0.3);
PROBLEMS.forEach((p, i) => {
  pop(p.tagAt, 1.4 + (i % 6) * 0.08, 0.7, ((i % 5) - 2) / 3);
  tick(p.tagAt, 1.2 + (i % 4) * 0.1, 0.5);
});
whoosh(CUE.reveal - 0.3, 0.6, 0.8);
// 4 · redesign
whoosh(CUE.blueprint - 0.3, 0.4, 1, false);
impact(CUE.blueprint, 0.35);
PROBLEMS.forEach((p, i) => sparkle(CUE.flock[0] + p.fix * 0.12 + p.slot * 0.05 + 0.85, 96 + (i % 5) * 2, 0.8));
CUE.snaps.forEach((s, i) => {
  ding(s, 84 + [0, 3, 5, 7][i], 0.9);
  pop(s, 1 + i * 0.1, 1);
});
pop(CUE.tally, 0.9, 1.2);
riser(CUE.riser2[0], CUE.riser2[1], 1.2);
// 5 · land each fix
CUE.fixes.forEach((f, i) => {
  zap(f.lift - 0.2, 0.9); // snip
  scratch(f.lift - 0.1); // tape torn off
  whoosh(f.lift, f.land - f.lift, 1);
  impact(f.land, i === 0 ? 1.2 : 0.7);
  if (i === 0) subDrop(f.land);
  crackle(f.land, 0.7, 1);
  thud(f.stamp);
  checkBlip(f.stamp + 0.04, 1.2);
});
COMMITS.forEach((s, i) => {
  tick(s, 1.6, 1);
  pop(s, 1.3 + i * 0.06, 0.8);
});
// 6 · search
[0, 1, 2].forEach((i) => ping(CUE.sweep[0] + i * 0.15, 0.8));
for (let s = CUE.sweep[0] + 1; s < CUE.allClear; s += 1) ping(s, 0.45);
thud(CUE.found);
place(CUE.found, 0.3, (_, t) => Math.sign(Math.sin(2 * Math.PI * 880 * t)) * env(t, 0.002, 0.08) * (t < 0.12 || t > 0.16 ? 1 : 0), 0.08, 0.2, 0.5);
zap(CUE.refix, 1);
checkBlip(CUE.refix + 0.3, 1.2);
ding(CUE.allClear, 91, 1);
ding(CUE.allClear + 0.06, 95, 0.8);
// 7 · the tug again
clank(CUE.tug2 - 0.05, 1);
place(CUE.tug2, 1.5, (_, t) => (Math.sin(2 * Math.PI * hz(57 + 12 * Math.min(1, t / 1.2)) * t) * 0.6) * Math.min(1, t / 0.2) * Math.exp(-Math.max(0, t - 1.1) / 0.2), 0.2, 0, 0.5);
riser(CUE.slam - 1, CUE.slam, 1);
impact(CUE.slam, 1.4);
subDrop(CUE.slam, 1.1);
impact(CUE.slam2, 0.7);
// 8 · lockup
whoosh(CUE.lockup - 0.4, 0.4, 0.8, false);
impact(CUE.lockup, 0.9);
subDrop(CUE.lockup, 0.7);
key(CUE.lockCmd, true);
pop(CUE.lockCmd, 1.1);
pop(CUE.lockInstall, 1.3);
impact(CUE.finalHit, 0.5);
ding(CUE.finalHit, 96, 1.2);

// ---------- reverb (small Schroeder) + mixdown ----------
function reverb(inp: Float32Array, spread: number) {
  const out = new Float32Array(N);
  const combs = [1557, 1617, 1491, 1422].map((d) => ({ d: d + spread, buf: new Float32Array(d + spread), i: 0, lp: 0 }));
  for (let k = 0; k < N; k++) {
    let acc = 0;
    for (const c of combs) {
      const y = c.buf[c.i];
      c.lp = y * 0.6 + c.lp * 0.4;
      c.buf[c.i] = inp[k] + c.lp * 0.8;
      c.i = (c.i + 1) % c.d;
      acc += y;
    }
    out[k] = acc * 0.25;
  }
  for (const d of [225, 556]) {
    const buf = new Float32Array(d);
    let i = 0;
    for (let k = 0; k < N; k++) {
      const b = buf[i];
      const y = -out[k] + b;
      buf[i] = out[k] + b * 0.5;
      i = (i + 1) % d;
      out[k] = y;
    }
  }
  return out;
}
const rvL = reverb(sendL, 0), rvR = reverb(sendR, 23);
const fadeStart = at(SONG_END - 0.8);
for (let k = 0; k < N; k++) {
  const fade = k > fadeStart ? Math.max(0, 1 - (k - fadeStart) / (N - fadeStart)) : 1;
  L[k] = Math.tanh((L[k] + rvL[k] * 0.35) * 0.9) * fade;
  R[k] = Math.tanh((R[k] + rvR[k] * 0.35) * 0.9) * fade;
}

// ---------- write 24-bit WAV ----------
const bytes = 3;
const buf = Buffer.alloc(44 + N * 2 * bytes);
buf.write("RIFF", 0); buf.writeUInt32LE(36 + N * 2 * bytes, 4); buf.write("WAVE", 8);
buf.write("fmt ", 12); buf.writeUInt32LE(16, 16); buf.writeUInt16LE(1, 20); buf.writeUInt16LE(2, 22);
buf.writeUInt32LE(SR, 24); buf.writeUInt32LE(SR * 2 * bytes, 28); buf.writeUInt16LE(2 * bytes, 32); buf.writeUInt16LE(24, 34);
buf.write("data", 36); buf.writeUInt32LE(N * 2 * bytes, 40);
let o = 44;
for (let k = 0; k < N; k++) for (const ch of [L, R]) {
  const v = Math.round(Math.max(-1, Math.min(1, ch[k])) * 8388607);
  buf.writeIntLE(v, o, 3); o += 3;
}
writeFileSync(new URL("../public/raw.wav", import.meta.url), buf);
console.log(`raw.wav ${(N / SR).toFixed(2)}s`);
