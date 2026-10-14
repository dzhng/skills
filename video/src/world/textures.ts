// Canvas-drawn textures, built once after fonts load.
import * as THREE from "three";
import { C, MONO, SANS } from "../theme.ts";

const cache = new Map<string, THREE.CanvasTexture>();

function make(key: string, w: number, h: number, draw: (g: CanvasRenderingContext2D) => void) {
  const hit = cache.get(key);
  if (hit) return hit;
  const cv = document.createElement("canvas");
  cv.width = w;
  cv.height = h;
  draw(cv.getContext("2d")!);
  const tex = new THREE.CanvasTexture(cv);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = 8;
  cache.set(key, tex);
  return tex;
}

export const puffTex = () =>
  make("puff", 256, 256, (g) => {
    const grd = g.createRadialGradient(128, 128, 0, 128, 128, 128);
    grd.addColorStop(0, "rgba(255,255,255,1)");
    grd.addColorStop(0.45, "rgba(255,255,255,0.55)");
    grd.addColorStop(1, "rgba(255,255,255,0)");
    g.fillStyle = grd;
    g.fillRect(0, 0, 256, 256);
  });

export const glowTex = () =>
  make("glow", 128, 128, (g) => {
    const grd = g.createRadialGradient(64, 64, 0, 64, 64, 64);
    grd.addColorStop(0, "rgba(255,255,255,1)");
    grd.addColorStop(0.2, "rgba(255,255,255,0.6)");
    grd.addColorStop(1, "rgba(255,255,255,0)");
    g.fillStyle = grd;
    g.fillRect(0, 0, 128, 128);
  });

// Vertical fade for light beams: bright at the base, gone at the top.
export const beamTex = () =>
  make("beam", 16, 256, (g) => {
    const grd = g.createLinearGradient(0, 256, 0, 0);
    grd.addColorStop(0, "rgba(255,255,255,1)");
    grd.addColorStop(0.35, "rgba(255,255,255,0.45)");
    grd.addColorStop(1, "rgba(255,255,255,0)");
    g.fillStyle = grd;
    g.fillRect(0, 0, 16, 256);
  });

export const stampTex = (ok: boolean) =>
  make(`stamp${ok}`, 256, 256, (g) => {
    g.fillStyle = "#fff";
    g.beginPath();
    g.arc(128, 128, 124, 0, Math.PI * 2);
    g.fill();
    g.fillStyle = ok ? C.green : C.red;
    g.beginPath();
    g.arc(128, 128, 106, 0, Math.PI * 2);
    g.fill();
    g.strokeStyle = "#fff";
    g.lineWidth = 26;
    g.lineCap = "round";
    g.lineJoin = "round";
    g.beginPath();
    if (ok) {
      g.moveTo(78, 132); g.lineTo(114, 168); g.lineTo(180, 96);
    } else {
      g.moveTo(88, 88); g.lineTo(168, 168); g.moveTo(168, 88); g.lineTo(88, 168);
    }
    g.stroke();
  });

export const questionTex = () =>
  make("q", 256, 256, (g) => {
    g.font = `800 200px ${SANS}`;
    g.textAlign = "center";
    g.textBaseline = "middle";
    g.shadowColor = "rgba(43,82,245,0.9)";
    g.shadowBlur = 30;
    g.fillStyle = "#fff";
    g.fillText("?", 128, 140);
  });

export const skillTileTex = (name: string) =>
  make(`tile${name}`, 1024, 160, (g) => {
    g.font = `700 54px ${MONO}`;
    const w = Math.min(1010, g.measureText(name).width + 160);
    const x0 = (1024 - w) / 2;
    g.fillStyle = C.ink;
    g.beginPath();
    g.roundRect(x0, 16, w, 128, 64);
    g.fill();
    g.fillStyle = C.blue;
    g.beginPath();
    g.arc(x0 + 70, 80, 32, 0, Math.PI * 2);
    g.fill();
    g.strokeStyle = "#fff";
    g.lineWidth = 9;
    g.lineCap = "round";
    g.beginPath();
    g.moveTo(x0 + 55, 81); g.lineTo(x0 + 66, 92); g.lineTo(x0 + 86, 70);
    g.stroke();
    g.fillStyle = "#fff";
    g.textBaseline = "middle";
    g.fillText(name, x0 + 120, 84);
  });


// Factory facade: dark panels with a grid of warm windows (used as emissive map).
export const facadeTex = () =>
  make("facade", 128, 256, (g) => {
    g.fillStyle = "#000";
    g.fillRect(0, 0, 128, 256);
    for (let y = 14; y < 250; y += 22) {
      for (let x = 12; x < 120; x += 26) {
        const on = ((x * 7 + y * 13) % 5) !== 0;
        g.fillStyle = on ? "#ffd48a" : "#1b2350";
        g.fillRect(x, y, 16, 12);
      }
    }
  });

// Daytime facade: pale panels, blue-grey glass.
export const facadeDayTex = () =>
  make("facadeDay", 128, 256, (g) => {
    g.fillStyle = "#eef1fa";
    g.fillRect(0, 0, 128, 256);
    for (let y = 14; y < 250; y += 22) {
      for (let x = 12; x < 120; x += 26) {
        g.fillStyle = "#8d9ccc";
        g.fillRect(x, y, 16, 12);
      }
    }
  });

export const ringTex = () =>
  make("ring", 512, 512, (g) => {
    const grd = g.createRadialGradient(256, 256, 180, 256, 256, 256);
    grd.addColorStop(0, "rgba(255,255,255,0)");
    grd.addColorStop(0.75, "rgba(255,255,255,0.9)");
    grd.addColorStop(0.85, "rgba(255,255,255,1)");
    grd.addColorStop(1, "rgba(255,255,255,0)");
    g.fillStyle = grd;
    g.fillRect(0, 0, 512, 512);
  });

// Big words laid on the board (white; tinted by the material).
export const wordTex = (text: string) =>
  make(`w${text}`, 2048, 384, (g) => {
    // Shrink long lines to fit the canvas instead of clipping them.
    g.font = `900 300px ${SANS}`;
    const size = Math.min(300, (300 * 1960) / g.measureText(text).width);
    g.font = `900 ${size}px ${SANS}`;
    g.textAlign = "center";
    g.textBaseline = "middle";
    g.fillStyle = "#ffffff";
    g.fillText(text, 1024, 200);
  });

// The choices.md ledger card (illustrative rows, confidence rising).
export const docTex = () =>
  make("doc", 800, 1000, (g) => {
    g.fillStyle = "#ffffff";
    g.beginPath();
    g.roundRect(0, 0, 800, 1000, 48);
    g.fill();
    g.fillStyle = C.green;
    g.fillRect(0, 0, 800, 18);
    g.fillStyle = C.green;
    g.beginPath();
    g.roundRect(56, 70, 60, 76, 8);
    g.fill();
    g.fillStyle = C.ink;
    g.font = `700 60px ${MONO}`;
    g.textBaseline = "middle";
    g.fillText("choices.md", 140, 110);
    g.fillStyle = C.muted;
    g.font = `600 32px ${SANS}`;
    g.fillText("ranked least-confident first", 58, 200);
    const rows = [
      ["Kept retry state in one owner", 0.34],
      ["Split the sync slice in two", 0.52],
      ["Reused the existing cache key", 0.71],
      ["Server-side sort for the list", 0.88],
    ] as const;
    rows.forEach(([text, conf], i) => {
      const y = 290 + i * 160;
      g.fillStyle = "#e6ebf8";
      g.fillRect(56, y - 50, 688, 3);
      g.fillStyle = C.ink;
      g.font = `700 38px ${SANS}`;
      g.fillText(`${i + 1}  ${text}`, 58, y + 10);
      g.fillStyle = "#edf1fb";
      g.beginPath();
      g.roundRect(100, y + 50, 560, 20, 10);
      g.fill();
      g.fillStyle = conf < 0.5 ? "#f0a14a" : C.green;
      g.beginPath();
      g.roundRect(100, y + 50, 560 * conf, 20, 10);
      g.fill();
    });
    g.fillStyle = "#8e9ab8";
    g.font = `500 28px ${SANS}`;
    g.fillText("illustrative entries", 58, 950);
  });

// Terrain detail: near-white grain, speckle, and faint strata; multiplies the
// land color and doubles as the bump/roughness map.
export const terrainTex = () => {
  const tex = make("terrain", 512, 512, (g) => {
    g.fillStyle = "#f2f2f2";
    g.fillRect(0, 0, 512, 512);
    let seed = 7;
    const rnd = () => ((seed = (seed * 16807) % 2147483647) / 2147483647);
    for (let i = 0; i < 9000; i++) {
      const v = 200 + Math.floor(rnd() * 55);
      g.fillStyle = `rgba(${v},${v},${v},${0.25 + rnd() * 0.35})`;
      const r = 0.6 + rnd() * 2.4;
      g.beginPath();
      g.arc(rnd() * 512, rnd() * 512, r, 0, Math.PI * 2);
      g.fill();
    }
    for (let i = 0; i < 18; i++) {
      g.strokeStyle = `rgba(150,150,150,${0.08 + rnd() * 0.1})`;
      g.lineWidth = 1 + rnd() * 3;
      g.beginPath();
      const y = rnd() * 512;
      g.moveTo(0, y);
      for (let x = 0; x <= 512; x += 32) g.lineTo(x, y + Math.sin(x / 60 + i) * 10 + (rnd() - 0.5) * 6);
      g.stroke();
    }
  });
  tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
  return tex;
};


// Survey stake: red-and-white banding.
export const stakeTex = () => {
  const tex = make("stake", 16, 128, (g) => {
    for (let i = 0; i < 8; i++) {
      g.fillStyle = i % 2 ? "#ffffff" : "#e5484d";
      g.fillRect(0, i * 16, 16, 16);
    }
  });
  return tex;
};

// A phrase with colored runs; `soft` renders it blurred, as if seen through fog.
export const phraseTex = (parts: [string, string][], soft: boolean) =>
  make(`ph${soft}${parts.map((p) => p.join(":")).join("|")}`, 2048, 384, (g) => {
    g.font = `900 250px ${SANS}`;
    const total = parts.reduce((a, [t]) => a + g.measureText(t).width, 0);
    const size = Math.min(250, (250 * 1900) / total);
    g.font = `900 ${size}px ${SANS}`;
    let x = 1024 - parts.reduce((a, [t]) => a + g.measureText(t).width, 0) / 2;
    g.textBaseline = "middle";
    if (soft) g.filter = "blur(4px)";
    for (const [text, color] of parts) {
      g.fillStyle = color;
      g.fillText(text, x, 200);
      x += g.measureText(text).width;
    }
  });
