// The truth behind the figure: a toy next-token step for the prompt below.
// The logits are illustrative but shaped like a real model's: one clear favourite,
// a few plausible rivals and a long tail. Everything the figure shows comes from here.

export const PROMPT = ["The", "cat", "sat", "on", "the"];
export const WORDS = ["mat", "floor", "sofa", "bed", "roof"];
export const LOGITS = [3.4, 2.6, 2.0, 1.5, 0.5];
export const TEMP = { min: 0.2, max: 2, step: 0.1, start: 0.8 };

// softmax(z / T): divide every logit by the temperature, then normalise.
export function probsAt(t) {
  const z = LOGITS.map((logit) => logit / t);
  const top = Math.max(...z);
  const e = z.map((value) => Math.exp(value - top));
  const sum = e.reduce((a, b) => a + b, 0);
  return e.map((value) => value / sum);
}

// Inverse-CDF sampling: lay the probabilities end to end on [0, 1) and take the
// word whose segment holds the uniform number u.
export function pick(probs, u) {
  let edge = 0;
  for (let i = 0; i < probs.length; i++) {
    edge += probs[i];
    if (u < edge) return i;
  }
  return probs.length - 1;
}

// Where each segment starts on [0, 1).
export function edgesOf(probs) {
  const out = [0];
  probs.forEach((p) => out.push(out[out.length - 1] + p));
  return out;
}

// Shannon entropy in bits: how spread out the choice is.
export const entropyOf = (probs) => -probs.reduce((sum, p) => sum + (p > 0 ? p * Math.log2(p) : 0), 0);

// A small seedable generator (mulberry32), so a roll can be replayed exactly.
export function seeded(seed) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
