import { loadFont as loadInter } from "@remotion/google-fonts/Inter";
import { loadFont as loadMono } from "@remotion/google-fonts/JetBrainsMono";

export const fontsReady = Promise.all([
  loadInter("normal", { weights: ["400", "600", "700", "800", "900"], subsets: ["latin"] }).waitUntilDone(),
  loadMono("normal", { weights: ["400", "500", "700"], subsets: ["latin"] }).waitUntilDone(),
]);

// The repo's palette (assets/hero.jpg): ink navy, brand blue, periwinkle.
export const C = {
  bg: "#06080f",
  floor: "#0d1120",
  fg: "#f4f6ff",
  muted: "#8b95b8",
  blue: "#2b52f5",
  periwinkle: "#8fb0ff",
  red: "#ff4d5e",
  green: "#3fdc8f",
  tape: "#ffd23f",
  print: "#0f2a8a", // blueprint ground
  printLine: "#7fb2ff",
};

export const SANS = "Inter, system-ui, sans-serif";
export const MONO = "'JetBrains Mono', Menlo, monospace";
export const W = 1920;
export const H = 1080;
