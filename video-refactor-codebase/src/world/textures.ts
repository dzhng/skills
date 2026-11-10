// Canvas-drawn textures, built once after fonts load.
import * as THREE from "three";
import { C, SANS } from "../theme.ts";

const cache = new Map<string, THREE.CanvasTexture>();
// Seeded, so every render worker draws the same grain.
let seed = 11;
const rand = () => ((seed = (seed * 1664525 + 1013904223) >>> 0) / 2 ** 32);

function make(key: string, w: number, h: number, draw: (g: CanvasRenderingContext2D) => void, repeat?: number) {
  const hit = cache.get(key);
  if (hit) return hit;
  const cv = document.createElement("canvas");
  cv.width = w;
  cv.height = h;
  draw(cv.getContext("2d")!);
  const tex = new THREE.CanvasTexture(cv);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = 8;
  if (repeat) {
    tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
    tex.repeat.set(repeat, repeat);
  }
  cache.set(key, tex);
  return tex;
}

export const glowTex = () =>
  make("glow", 128, 128, (g) => {
    const grd = g.createRadialGradient(64, 64, 0, 64, 64, 64);
    grd.addColorStop(0, "rgba(255,255,255,1)");
    grd.addColorStop(0.2, "rgba(255,255,255,0.6)");
    grd.addColorStop(1, "rgba(255,255,255,0)");
    g.fillStyle = grd;
    g.fillRect(0, 0, 128, 128);
  });

// Floor: brushed dark tiles with a fine grid; one tile per board pitch.
export const floorTex = () =>
  make("floor", 512, 512, (g) => {
    g.fillStyle = "#808080";
    g.fillRect(0, 0, 512, 512);
    for (let i = 0; i < 9000; i++) {
      const v = 110 + rand() * 40;
      g.fillStyle = `rgba(${v},${v},${v},0.08)`;
      g.fillRect(rand() * 512, rand() * 512, 1 + rand() * 30, 1);
    }
    g.strokeStyle = "rgba(255,255,255,0.9)";
    g.lineWidth = 3;
    g.strokeRect(0, 0, 512, 512);
    g.strokeStyle = "rgba(255,255,255,0.35)";
    g.lineWidth = 1.5;
    for (const p of [128, 256, 384]) {
      g.beginPath();
      g.moveTo(p, 0);
      g.lineTo(p, 512);
      g.moveTo(0, p);
      g.lineTo(512, p);
      g.stroke();
    }
  }, 24);

// Module top plate: a chip-like face with pins and a seam.
export const plateTex = () =>
  make("plate", 256, 256, (g) => {
    g.fillStyle = "#fff";
    g.fillRect(0, 0, 256, 256);
    g.fillStyle = "rgba(0,0,0,0.18)";
    for (let i = 0; i < 6; i++) {
      g.fillRect(36 + i * 34, 30, 14, 26);
      g.fillRect(36 + i * 34, 200, 14, 26);
    }
    g.strokeStyle = "rgba(0,0,0,0.25)";
    g.lineWidth = 6;
    g.strokeRect(70, 80, 116, 96);
  });

// Problem tag: a red luggage tag with an eyelet and a glyph for its kind:
// ? hidden link, ✕ needless link, ∅ pass-through, ! special case.
const GLYPH = { hidden: "?", needless: "✕", junction: "∅", tape: "!" };
export const tagTex = (kind: keyof typeof GLYPH) =>
  make(`tag-${kind}`, 128, 192, (g) => {
    g.fillStyle = C.red;
    g.beginPath();
    g.moveTo(24, 0);
    g.lineTo(104, 0);
    g.lineTo(128, 32);
    g.lineTo(128, 188);
    g.lineTo(0, 188);
    g.lineTo(0, 32);
    g.closePath();
    g.fill();
    g.fillStyle = "rgba(255,255,255,0.18)";
    g.fillRect(0, 150, 128, 38);
    g.fillStyle = "#3a0710";
    g.beginPath();
    g.arc(64, 26, 11, 0, Math.PI * 2);
    g.fill();
    g.fillStyle = "#fff";
    g.font = `900 ${kind === "needless" ? 76 : 88}px ${SANS}`;
    g.textAlign = "center";
    g.textBaseline = "middle";
    g.fillText(GLYPH[kind], 64, 102);
  });

// Fix header: a wide white sign, the count of problems it removes.
export const fixTex = (n: number, done: boolean) =>
  make(`fix${n}${done}`, 384, 192, (g) => {
    g.fillStyle = done ? C.green : "#ffffff";
    const r = 36;
    g.beginPath();
    g.roundRect(4, 4, 376, 184, r);
    g.fill();
    g.fillStyle = done ? "#fff" : C.print;
    g.font = `900 120px ${SANS}`;
    g.textAlign = "center";
    g.textBaseline = "middle";
    g.fillText(done ? "✓" : `×${n}`, 192, 102);
  });

// Duct tape: hazard stripes for the special-case wraps.
export const tapeTex = () =>
  make("tape", 256, 64, (g) => {
    g.fillStyle = C.tape;
    g.fillRect(0, 0, 256, 64);
    g.fillStyle = "#111";
    for (let x = -64; x < 256; x += 48) {
      g.beginPath();
      g.moveTo(x, 64);
      g.lineTo(x + 24, 64);
      g.lineTo(x + 88, 0);
      g.lineTo(x + 64, 0);
      g.closePath();
      g.fill();
    }
  });

// Code-review stamp ink: a green ring with a check.
export const inkTex = () =>
  make("ink", 256, 256, (g) => {
    g.strokeStyle = C.green;
    g.lineWidth = 18;
    g.beginPath();
    g.arc(128, 128, 104, 0, Math.PI * 2);
    g.stroke();
    g.lineWidth = 26;
    g.lineCap = "round";
    g.lineJoin = "round";
    g.beginPath();
    g.moveTo(78, 132);
    g.lineTo(112, 166);
    g.lineTo(180, 94);
    g.stroke();
  });

// Soft vertical fade for light cones and the scan curtain.
export const fadeTex = () =>
  make("fade", 16, 256, (g) => {
    const grd = g.createLinearGradient(0, 256, 0, 0);
    grd.addColorStop(0, "rgba(255,255,255,1)");
    grd.addColorStop(0.4, "rgba(255,255,255,0.4)");
    grd.addColorStop(1, "rgba(255,255,255,0)");
    g.fillStyle = grd;
    g.fillRect(0, 0, 16, 256);
  });

// Floor glow under a district once it is one place.
export const padTex = () =>
  make("pad", 256, 256, (g) => {
    g.strokeStyle = "#fff";
    g.lineWidth = 10;
    g.beginPath();
    g.roundRect(14, 14, 228, 228, 36);
    g.stroke();
    const grd = g.createRadialGradient(128, 128, 20, 128, 128, 130);
    grd.addColorStop(0, "rgba(255,255,255,0.35)");
    grd.addColorStop(1, "rgba(255,255,255,0.05)");
    g.fillStyle = grd;
    g.beginPath();
    g.roundRect(14, 14, 228, 228, 36);
    g.fill();
  });
