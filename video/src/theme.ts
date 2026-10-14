import { loadFont as loadInter } from "@remotion/google-fonts/Inter";
import { loadFont as loadMono } from "@remotion/google-fonts/JetBrainsMono";

export const fontsReady = Promise.all([
  loadInter("normal", { weights: ["400", "600", "700", "800", "900"], subsets: ["latin"] }).waitUntilDone(),
  loadMono("normal", { weights: ["400", "500", "700"], subsets: ["latin"] }).waitUntilDone(),
]);

// Palette from the repo's own art (assets/hero.jpg, assets/full-loop.svg).
export const C = {
  sky: "#dfe6fb",
  skyDeep: "#c3d0f7",
  ink: "#0f1839",
  fg: "#f4f6ff", // type on the space background
  muted: "#5b6684",
  blue: "#2b52f5",
  periwinkle: "#8fb0ff",
  green: "#2f9a5c",
  red: "#e5484d",
  night: "#0a1030",
  nightFog: "#141d4a",
  land: "#98a3c6",
  // Territory colors, in the hero map's order.
  lands: ["#3346c4", "#6f9f6c", "#d6b27c", "#9fb4e6", "#8b7fd8", "#5eaaa1", "#4f62d2"],
};

// Daytime sky options (gradient stops + matching fog). Selected by the
// "sky" input prop so alternatives render side by side.
export const SKIES = {
  space: { stops: ["#161c30", "#0b0e19", "#04050a"], fog: "#0e121d" },
  periwinkle: { stops: ["#f4f7ff", "#dde5fc", "#95abf3"], fog: "#d2dbf8" },
  paper: { stops: ["#faf7f1", "#efe8dc", "#d9cdb8"], fog: "#ece5d8" },
  graphite: { stops: ["#343a48", "#1f232c", "#0f1116"], fog: "#1f232c" },
  dusk: { stops: ["#fff0e6", "#f2dcec", "#b9a9ef"], fog: "#f1dfea" },
} as const;
export type SkyName = keyof typeof SKIES;

export const SANS = "Inter, system-ui, sans-serif";
export const MONO = "'JetBrains Mono', Menlo, monospace";
export const W = 1920;
export const H = 1080;
