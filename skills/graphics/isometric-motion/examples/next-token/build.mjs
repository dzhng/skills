import { readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import * as k from "../../kit/iso-kit.mjs";
import { kitScript } from "../../scripts/inline-kit.mjs";
import * as M from "./model.mjs";

const HERE = dirname(fileURLToPath(import.meta.url));
const theme = process.argv.includes("--light") ? "light" : "dark";

const WIDTH = 640;
const HEIGHT = 460;

// World: x runs left to right along the bench, y from back to front, z up.
const PLATE = { x: -152, y: -100, w: 304, d: 196, r: 10 };
const PLATE_H = 10;
const FOOT_H = 5;

// The terminal at the back left: the prompt is written on its screen.
const CASE = { x: -142, y: -90, w: 110, d: 56, r: 6 };
const FRONT = CASE.y + CASE.d;
const SIDE = CASE.x + CASE.w;
const PLINTH_H = 4;
const TOP = 92;
const BEZEL = { x0: -132, x1: -42, z0: 30, z1: 84, r: 5, depth: 1.6 };
const CRT = { x0: -127, x1: -47, z0: 35, z1: 79, r: 6, depth: 4 };

// Five candidate columns: a stack of chips whose height is the word's probability.
const COL_W = 24;
const COL_D = 20;
const colX = (i) => -12 + i * 30;
const COL_Y = -38;
const CHIP_Z = 2;
const FULL = 74; // p = 1 reaches CHIP_Z + FULL
const CHIPS = 46;
const PITCH = FULL / CHIPS;

// The scale board behind the columns, ruled in tenths of probability.
const BOARD = { x: -18, y: -54, w: 156, d: 5, r: 0 };
const BOARD_FACE = BOARD.y + BOARD.d;
const BOARD_Z = 3;
const BOARD_TOP = 86;

// The key bed: one keycap per candidate word.
const KB = { x: -20, y: -10, w: 160, d: 30, r: 4 };
const KB_TOP = 6;
const KEY_H = 6;
const keyPlan = (i) => ({ x: colX(i), y: -6, w: COL_W, d: 21, r: 2.5 });

// The sampling strip at the front: segments end to end, a carriage that stops at u.
const STRIP = { x: -24, y: 38, w: 168, d: 16, r: 2 };
const STRIP_H = 4;
const SPAN = [STRIP.x + 6, STRIP.x + STRIP.w - 6];
const SEG = { y: STRIP.y + 2.5, d: 8.5 };

// The temperature knob at the front left.
const KNOB = [-96, 40];
const KNOB_BASE = { x: -132, y: 6, w: 72, d: 70, r: 8 };
const KNOB_Z = 3;
const SWEEP = [-Math.PI * 0.75, Math.PI * 1.5];

const P = k.fitProjection(
  [...k.boxCorners(PLATE, -PLATE_H - FOOT_H, 0), ...k.boxCorners(CASE, 0, TOP), ...k.boxCorners(BOARD, 0, BOARD_TOP)],
  WIDTH,
  HEIGHT,
  { pad: 26, azimuth: 50 },
);

const at = (point) => k.iso(point, P);
const S = (paths, style) => k.solidSvg(paths, style);
const L = (d, style) => k.lineSvg(d, style);
const D = (points, style) => k.dotsSvg(points, style);
const byDepth = (points) => [...points].sort((a, b) => k.depthOf([a[0], a[1], 0], P) - k.depthOf([b[0], b[1], 0], P));
const planeOf = (y) => k.sideMatrix([0, y], 0, P, "left");
const flat = (x0, z0, x1, z1, r, steps = 6) => k.pathOf(k.roundedPlan({ x: x0, y: z0, w: x1 - x0, d: z1 - z0, r }, steps).map(([u, z]) => [u, -z]), true);
const sideSlot = (x, y, z0, z1, half = 0.8) => k.pathOf(k.roundedPlan({ x: y - half, y: z0, w: half * 2, d: z1 - z0, r: half }, 4).map(([u, z]) => at([x, u, z])), true);
const tempAngle = (t) => SWEEP[0] + ((t - M.TEMP.min) / (M.TEMP.max - M.TEMP.min)) * SWEEP[1];

let clips = 0;
// A rounded opening in a front face (normal +y) with its walls and back drawn.
function recess({ x0, x1, z0, z1, r, depth }, y, back = "", backClass = "nt-well", inside = "") {
  const id = `nt-clip-${clips++}`;
  const ring = k.roundedPlan({ x: x0, y: z0, w: x1 - x0, d: z1 - z0, r }, 6);
  const cx = (x0 + x1) / 2;
  const cz = (z0 + z1) / 2;
  const { sinA } = k.cameraOf(P);
  const tops = [];
  const sides = [[], [], [], []];
  ring.forEach(([ax, az], index) => {
    const [bx, bz] = ring[(index + 1) % ring.length];
    const length = Math.hypot(bx - ax, bz - az) || 1;
    let [nx, nz] = [(bz - az) / length, -(bx - ax) / length];
    if (nx * (cx - (ax + bx) / 2) + nz * (cz - (az + bz) / 2) < 0) [nx, nz] = [-nx, -nz];
    if (nx <= 0 && nz <= 0) return;
    const quad = k.pathOf([at([ax, y, az]), at([bx, y, bz]), at([bx, y - depth, bz]), at([ax, y - depth, az])], true);
    if (nz >= nx) tops.push(quad);
    else sides[Math.min(3, Math.max(0, Math.floor(((nx * -sinA + 1) / 2) * 4)))].push(quad);
  });
  const shape = flat(x0, z0, x1, z1, r);
  return [
    `<clipPath id="${id}"><path transform="${planeOf(y)}" d="${shape}"/></clipPath>`,
    `<g clip-path="url(#${id})">`,
    `<path class="iso-top" d="${tops.join("")}"/>`,
    ...sides.map((d, shade) => (d.length ? `<path class="iso-shade" data-shade="${shade}" d="${d.join("")}"/>` : "")),
    `<g transform="${planeOf(y - depth)}"><path class="${backClass}" d="${shape}"/>${back}<path class="iso-line" data-tone="faint" d="${shape}"/></g>`,
    inside,
    `</g>`,
    `<g transform="${planeOf(y)}"><path class="iso-line" data-tone="lo" d="${shape}"/></g>`,
  ].join("");
}

function plate() {
  const out = [`<path class="iso-halo" d="${k.haloOf(PLATE, -PLATE_H - FOOT_H, PLATE_H, P)}"/>`];
  for (const [x, y] of byDepth(k.corners(PLATE, 22))) {
    out.push(S(k.cylinder(x, y, 7, -PLATE_H - FOOT_H, 1.6, P, 28), { tone: "lo" }));
    out.push(S(k.cylinder(x, y, 5.4, -PLATE_H - FOOT_H + 1.6, FOOT_H - 1.6, P, 28), { tone: "mid" }));
  }
  out.push(S(k.slabOf(PLATE, -PLATE_H, PLATE_H, P, 8, 1.6), { tone: "mid" }));
  out.push(L(k.planOutline(k.insetPlan(PLATE, 5), 0, P), { tone: "lo" }));
  const screws = k.corners(PLATE, 10);
  out.push(L(screws.map(([x, y]) => k.ring(x, y, 2.2, 0, P, 16)).join(""), { tone: "lo" }));
  out.push(D(screws.map(([x, y]) => at([x, y, 0])), { size: 0.5 }));
  // A front ruler strip along the bench edge, ticks rooted on its back edge.
  const ruler = { x: -24, y: 74, w: 100, d: 8, r: 1 };
  out.push(S(k.slabOf(ruler, 0, 0.8, P, 3), { tone: "lo", crease: "none" }));
  const ticks = k.topTicks(ruler.x + 3, ruler.x + ruler.w - 3, 2, 5, ruler.y, 0.8, [2, 3.6], P);
  out.push(L(ticks.minor, { tone: "lo" }), L(ticks.major, { tone: "mid" }));
  // Label plate: the one engraved label, plus rule lines standing for small print.
  const label = { x: 92, y: 68, w: 52, d: 16, r: 1.4 };
  out.push(S(k.slabOf(label, 0, 0.8, P, 3), { tone: "lo", crease: "none" }));
  out.push(k.faceTextSvg(k.topMatrix([label.x + 4, label.y + 6.4], 0.8, P, "x"), "softmax(z / T)", { size: 3.6, tone: "mid" }));
  out.push(L([34, 26].map((w, i) => k.lineOnTop([label.x + 4, label.y + 9.6 + i * 3], [label.x + 4 + w, label.y + 9.6 + i * 3], 0.8, P)).join(""), { tone: "lo", free: true }));
  out.push(D([at([label.x + label.w - 3, label.y + 3, 0.8]), at([label.x + label.w - 3, label.y + label.d - 3, 0.8])], { size: 0.45 }));
  return out.join("");
}

function screen() {
  const lines = [];
  for (let z = CRT.z0 + 1.2; z < CRT.z1; z += 1.6) lines.push(`M${CRT.x0} ${(-z).toFixed(1)}H${CRT.x1}`);
  const glow = flat(CRT.x0 + 8, CRT.z0 + 6, CRT.x1 - 8, CRT.z1 - 6, 16, 10);
  const x = CRT.x0 + 5;
  const crt = [
    `<path class="nt-glow" d="${glow}"/>`,
    `<path class="nt-scan" d="${lines.join("")}"/>`,
    `<text class="nt-dim" x="${x}" y="${-(CRT.z1 - 8)}" font-size="4.2">prompt</text>`,
    `<text class="nt-text" x="${x}" y="${-(CRT.z1 - 19)}" font-size="8">${M.PROMPT.slice(0, 4).join(" ")}</text>`,
    `<text class="nt-text" data-part="line" x="${x}" y="${-(CRT.z1 - 30)}" font-size="8">${M.PROMPT[4]} <tspan class="nt-word" data-part="word"></tspan></text>`,
    `<rect class="nt-cursor" data-part="cursor" x="${x + 20}" y="${-(CRT.z1 - 30) - 6.4}" width="4.4" height="7.6"/>`,
    `<text class="nt-dim" data-part="status" x="${x}" y="${-(CRT.z0 + 3.6)}" font-size="4.2">T 0.80</text>`,
  ].join("");
  return recess(BEZEL, FRONT, "", "nt-bezel", recess(CRT, FRONT - BEZEL.depth, `<g data-part="crt">${crt}</g>`, "nt-glass"));
}

function terminal() {
  const out = [`<path class="iso-halo" d="${k.haloOf(CASE, 0, 8, P)}"/>`];
  out.push(S(k.slabOf(k.insetPlan(CASE, 3), 0, PLINTH_H, P, 8), { tone: "lo" }));
  out.push(S(k.slabOf(CASE, PLINTH_H, TOP - PLINTH_H, P, 6, 1.4), { tone: "mid" }));
  // Top: a carry recess and a field of vent slots.
  const grip = { x: -126, y: CASE.y + 6, w: 78, d: 10, r: 5 };
  out.push(L(k.planOutline(grip, TOP, P, 8), { tone: "lo" }));
  out.push(L(k.planOutline(k.insetPlan(grip, 2), TOP, P, 8), { tone: "faint" }));
  out.push(L(Array.from({ length: 6 }, (_, i) => k.planOutline({ x: -120, y: CASE.y + 23 + i * 3.6, w: 66, d: 1.4, r: 0.7 }, TOP, P, 4)).join(""), { tone: "faint" }));
  // Seam where the case halves meet, round the top and down the side.
  const seam = FRONT - 10;
  out.push(L(k.lineOnTop([CASE.x, seam], [SIDE, seam], TOP, P) + k.segment([SIDE, seam, TOP], [SIDE, seam, PLINTH_H], P), { tone: "lo" }));
  out.push(D([at([SIDE - 4, seam + 3, TOP]), at([CASE.x + 4, seam + 3, TOP])], { size: 0.45 }));
  // Side vents and the side badge.
  const rowOf = (from, to, step) => Array.from({ length: Math.floor((to - from) / step + 1e-9) + 1 }, (_, i) => from + i * step);
  out.push(L(rowOf(CASE.y + 8, CASE.y + 34, 3.2).map((y) => sideSlot(SIDE, y, TOP - 34, TOP - 10)).join(""), { tone: "faint" }));
  out.push(L(rowOf(CASE.y + 8, CASE.y + 24, 3.2).map((y) => sideSlot(SIDE, y, 14, 24)).join(""), { tone: "faint" }));
  out.push(`<g transform="${planeOf(FRONT)}"><path class="iso-line" data-tone="faint" d="${flat(CASE.x + 4, PLINTH_H + 4, SIDE - 4, TOP - 4, 4)}"/></g>`);
  out.push(screen());
  // Under the screen: a speaker grille, a power lamp and two trim screws.
  out.push(`<g transform="${planeOf(FRONT)}">${L(Array.from({ length: 10 }, (_, i) => flat(-128 + i * 3, 12, -126.6 + i * 3, 22, 0.7, 4)).join(""), { tone: "lo" })}</g>`);
  out.push(`<g transform="${planeOf(FRONT)}">${L(flat(-70, 14, -46, 19, 2.5, 4), { tone: "lo" })}</g>`);
  out.push(D([at([-58, FRONT, 16.5])], { size: 0.5, tone: "lo" }));
  out.push(D([at([-80, FRONT, 17])], { size: 0.85, tone: "hi" }));
  out.push(D([at([CASE.x + 8, FRONT, TOP - 7]), at([SIDE - 8, FRONT, TOP - 7])], { size: 0.5, tone: "mid" }));
  // Rocker on the side.
  const y = CASE.y + 40;
  out.push(S(k.slabOf({ x: SIDE, y, w: 1.2, d: 10, r: 1 }, 10, 13, P, 3), { tone: "mid" }));
  out.push(S(k.slabOf({ x: SIDE + 1.2, y: y + 1.5, w: 2.2, d: 7, r: 0.6 }, 11, 5, P, 2), { tone: "mid" }));
  out.push(S(k.slabOf({ x: SIDE + 1.2, y: y + 1.5, w: 0.8, d: 7, r: 0.6 }, 17, 5, P, 2), { tone: "mid" }));
  return out.join("");
}

function board() {
  const out = [];
  const foot = { x: BOARD.x - 2, y: BOARD.y - 3, w: BOARD.w + 4, d: BOARD.d + 6, r: 1.5 };
  out.push(`<path class="iso-halo" d="${k.haloOf(foot, 0, 4, P)}" style="filter:blur(3px)"/>`);
  out.push(S(k.slabOf(foot, 0, BOARD_Z, P, 3, 0.4), { tone: "lo" }));
  out.push(D([foot.x + 3, foot.x + foot.w - 3].map((x) => at([x, foot.y + foot.d - 1.6, BOARD_Z])), { size: 0.45 }));
  out.push(S(k.slabOf(BOARD, BOARD_Z, BOARD_TOP - BOARD_Z, P, 2), { tone: "mid" }));
  // Rules in tenths of probability, run edge to edge across the face.
  const x0 = BOARD.x + BOARD.r;
  const x1 = BOARD.x + BOARD.w;
  const rule = (p) => `M${x0} ${-(CHIP_Z + p * FULL)}H${x1}`;
  const minor = [];
  const major = [];
  for (let i = 1; i <= 10; i++) (i % 5 ? minor : major).push(rule(i / 10));
  out.push(`<g transform="${planeOf(BOARD_FACE)}">${L(minor.join(""), { tone: "faint" })}${L(major.join(""), { tone: "lo" })}`);
  // Fine ticks between the rules on a strip at the left edge.
  const fine = [];
  for (let i = 1; i < 50; i++) if (i % 5) fine.push(`M${x0} ${-(CHIP_Z + (i / 50) * FULL)}h${i % 5 ? 2.2 : 3.6}`);
  out.push(L(fine.join(""), { tone: "lo" }));
  out.push(L(`M${x0 + 8} ${-BOARD_Z}V${-BOARD_TOP}`, { tone: "faint" }));
  out.push(L(`M${x1} ${-BOARD_Z}V${-BOARD_TOP}`, { tone: "lo" }));
  for (const p of [0.5, 1]) out.push(k.faceTextSvg(`translate(${x0 + 1.4} ${-(CHIP_Z + p * FULL) + 4.6})`, p === 1 ? "1.0" : "0.5", { size: 3.4, tone: "mid" }));
  out.push(`</g>`);
  out.push(D([[x0 + 3, BOARD_TOP - 3], [x1 - 3, BOARD_TOP - 3]].map(([x, z]) => at([x, BOARD_FACE, z])), { size: 0.5 }));
  // A cap rail along the top.
  out.push(S(k.slabOf({ x: BOARD.x - 1, y: BOARD.y - 1, w: BOARD.w + 2, d: BOARD.d + 2, r: 1 }, BOARD_TOP, 2.4, P, 3, 0.3), { tone: "mid" }));
  return out.join("");
}

// Sockets and guide rods: the static part of each column.
function socket(i) {
  const x = colX(i);
  const out = [];
  const plan = { x: x - 2, y: COL_Y - 2, w: COL_W + 4, d: COL_D + 4, r: 2.5 };
  out.push(S(k.slabOf(plan, 0, CHIP_Z, P, 4, 0.3), { tone: "lo" }));
  out.push(D([at([plan.x + 1.6, plan.y + plan.d - 1.6, CHIP_Z]), at([plan.x + plan.w - 1.6, plan.y + plan.d - 1.6, CHIP_Z])], { size: 0.4, tone: "mid" }));
  for (const rx of [x + 3, x + COL_W - 3]) {
    out.push(S(k.cylinder(rx, COL_Y - 0.6, 0.9, CHIP_Z, FULL + 4, P, 12), { tone: "mid", crease: "none" }));
    out.push(S(k.cylinder(rx, COL_Y - 0.6, 1.5, CHIP_Z + FULL + 4, 1.4, P, 14), { tone: "mid" }));
  }
  return out.join("");
}

function keybed() {
  const out = [`<path class="iso-halo" d="${k.haloOf(KB, 0, 4, P)}" style="filter:blur(3px)"/>`];
  out.push(S(k.slabOf(KB, 0, KB_TOP, P, 4, 0.6), { tone: "mid" }));
  out.push(L(k.planOutline(k.insetPlan(KB, 2.4), KB_TOP, P, 4), { tone: "faint" }));
  out.push(D(k.corners(KB, 4.6).map(([x, y]) => at([x, y, KB_TOP])), { size: 0.45 }));
  // Index lamps on the front lip, one per key.
  out.push(D(M.WORDS.map((_, i) => at([colX(i) + COL_W / 2, KB.y + KB.d - 2.4, KB_TOP])), { size: 0.55, tone: "lo" }));
  out.push(...M.WORDS.map((_, i) => `<g data-lamp="${i}" style="display:none">${D([at([colX(i) + COL_W / 2, KB.y + KB.d - 2.4, KB_TOP])], { size: 0.9, tone: "lit" })}</g>`));
  return out.join("");
}

function key(i) {
  const plan = keyPlan(i);
  const word = M.WORDS[i];
  const body = [
    S(k.slabOf(plan, KB_TOP, KEY_H, P, 3, 0.5), { tone: "mid", crease: "faint" }),
    L(k.planOutline(k.insetPlan(plan, 1.8), KB_TOP + KEY_H, P, 3), { tone: "faint" }),
    k.faceTextSvg(k.topMatrix([plan.x + plan.w / 2, plan.y + plan.d / 2 + 2.6], KB_TOP + KEY_H, P, "x"), word, { size: 7, tone: "hi", anchor: "middle" }),
  ].join("");
  const lit = S(k.slabOf(plan, KB_TOP, KEY_H, P, 3, 0.5), { tone: "hi", crease: "faint", lit: true }) +
    L(k.planOutline(k.insetPlan(plan, 1.8), KB_TOP + KEY_H, P, 3), { tone: "lit" }) +
    k.faceTextSvg(k.topMatrix([plan.x + plan.w / 2, plan.y + plan.d / 2 + 2.6], KB_TOP + KEY_H, P, "x"), word, { size: 7, tone: "lit", anchor: "middle" });
  const glow = `<path class="nt-keyglow" d="${k.haloOf(k.insetPlan(plan, -3), KB_TOP, 0.1, P)}"/>`;
  return `<g class="nt-key" data-key="${i}"><g data-face="rest">${body}</g><g data-face="lit" style="display:none">${glow}${lit}</g></g>`;
}

function strip() {
  const out = [`<path class="iso-halo" d="${k.haloOf(STRIP, 0, 3, P)}" style="filter:blur(3px)"/>`];
  out.push(S(k.slabOf(STRIP, 0, STRIP_H, P, 3, 0.5), { tone: "mid" }));
  // The segment channel and its ruler: 0 to 1 in fiftieths, ticks rooted on the front edge.
  out.push(L(k.planOutline({ x: SPAN[0] - 1, y: SEG.y - 1, w: SPAN[1] - SPAN[0] + 2, d: SEG.d + 2, r: 1 }, STRIP_H, P, 3), { tone: "lo" }));
  const minor = [];
  const major = [];
  for (let i = 0; i <= 50; i++) {
    const x = SPAN[0] + (i / 50) * (SPAN[1] - SPAN[0]);
    const len = i % 5 ? 1.8 : 3.4;
    (i % 5 ? minor : major).push(k.lineOnTop([x, STRIP.y + STRIP.d], [x, STRIP.y + STRIP.d - len], STRIP_H, P));
  }
  out.push(L(minor.join(""), { tone: "lo" }), L(major.join(""), { tone: "mid" }));
  // End stops with their screws.
  for (const x of [STRIP.x + 0.5, STRIP.x + STRIP.w - 4.5]) {
    out.push(S(k.slabOf({ x, y: STRIP.y + 1, w: 4, d: STRIP.d - 2, r: 0.8 }, STRIP_H, 4, P, 2, 0.3), { tone: "mid" }));
    out.push(D([at([x + 2, STRIP.y + 4, STRIP_H + 4]), at([x + 2, STRIP.y + STRIP.d - 4, STRIP_H + 4])], { size: 0.4 }));
  }
  return out.join("");
}

function carriage() {
  const x = 0;
  const out = [];
  const jaw = (y) => S(k.slabOf({ x: x - 4, y, w: 8, d: 2.4, r: 0.6 }, 1.2, STRIP_H + 3.2, P, 2), { tone: "mid", crease: "none" });
  out.push(jaw(STRIP.y - 2.4));
  out.push(S(k.slabOf({ x: x - 4.5, y: STRIP.y - 2.4, w: 9, d: STRIP.d + 4.8, r: 1.2 }, STRIP_H + 1.6, 2.8, P, 3, 0.4), { tone: "mid" }));
  out.push(D([at([x - 2.4, STRIP.y - 0.8, STRIP_H + 4.4]), at([x + 2.4, STRIP.y + STRIP.d + 0.8, STRIP_H + 4.4])], { size: 0.4 }));
  // The lit index: a thin blade that points at u.
  out.push(S(k.slabOf({ x: x - 0.7, y: SEG.y - 1, w: 1.4, d: SEG.d + 6, r: 0.3 }, STRIP_H + 4.4, 1.6, P, 2), { tone: "hi", lit: true, crease: "none" }));
  out.push(jaw(STRIP.y + STRIP.d));
  // Thumb screw on the front.
  out.push(S(k.slabOf({ x: x - 1.2, y: STRIP.y + STRIP.d + 2.4, w: 2.4, d: 2.4, r: 0.8 }, 4.2, 2.4, P, 2), { tone: "mid", crease: "none" }));
  out.push(S(k.cylinder(x, STRIP.y + STRIP.d + 6.4, 2.6, 2.6, 5, P, 18), { tone: "mid" }));
  out.push(L(k.knurl(x, STRIP.y + STRIP.d + 6.4, 2.6, 2.6, 7.6, 16, P), { tone: "lo" }));
  return out.join("");
}

function knob() {
  const [x, y] = KNOB;
  const out = [`<path class="iso-halo" d="${k.haloOf(KNOB_BASE, 0, 3, P)}" style="filter:blur(3px)"/>`];
  out.push(S(k.slabOf(KNOB_BASE, 0, KNOB_Z, P, 6, 0.5), { tone: "mid" }));
  out.push(D(k.corners(KNOB_BASE, 4.6).map(([cx, cy]) => at([cx, cy, KNOB_Z])), { size: 0.45 }));
  // A dial ring: 18 steps of 0.1 from T 0.2 to 2.0 over 270 degrees.
  out.push(L(k.ring(x, y, 27, KNOB_Z, P, 72), { tone: "lo" }));
  const ticks = k.radialTicks(x, y, 27, 18, 4, KNOB_Z, [2, 4], P, SWEEP[0], SWEEP[1]);
  out.push(L(ticks.minor, { tone: "lo" }), L(ticks.major, { tone: "mid" }));
  for (const t of [0.2, 1, 2]) {
    const a = tempAngle(t);
    const r = 33.5;
    out.push(k.faceTextSvg(k.topMatrix([x + Math.sin(a) * r, y - Math.cos(a) * r + 1.6], KNOB_Z, P, "x"), t === 1 ? "1.0" : t.toFixed(1), { size: 5, tone: "mid", anchor: "middle" }));
  }
  // Skirt, knurled body and cap.
  out.push(S(k.cylinder(x, y, 19, KNOB_Z, 2.4, P, 48), { tone: "lo" }));
  out.push(`<g class="nt-knob" data-part="knob">`);
  out.push(S(k.cylinder(x, y, 15, KNOB_Z + 2.4, 9, P, 48, 0.6), { tone: "mid" }));
  out.push(L(k.knurl(x, y, 15, KNOB_Z + 4.4, KNOB_Z + 11.4, 48, P), { tone: "lo" }));
  out.push(L(k.sideArc(x, y, 15, KNOB_Z + 4.4, P, 40), { tone: "faint" }));
  out.push(S(k.cylinder(x, y, 11, KNOB_Z + 11.4, 2.2, P, 40, 0.4), { tone: "hi", crease: "lo" }));
  out.push(L(k.ring(x, y, 8.4, KNOB_Z + 13.6, P, 40), { tone: "faint" }));
  out.push(`</g>`);
  out.push(`<path data-part="pointer" class="iso-line nt-pointer" data-tone="lit" data-free="start" d="${pointerAt(M.TEMP.start)}"/>`);
  out.push(`<g data-part="pip">${D([pipAt(M.TEMP.start)], { size: 0.9, tone: "hi" })}</g>`);
  return out.join("");
}
function pointerAt(t) {
  const a = tempAngle(t);
  const [x, y] = KNOB;
  return k.lineOnTop([x + Math.sin(a) * 2, y - Math.cos(a) * 2], [x + Math.sin(a) * 10.6, y - Math.cos(a) * 10.6], KNOB_Z + 13.6, P);
}
function pipAt(t) {
  const a = tempAngle(t);
  return at([KNOB[0] + Math.sin(a) * 21.4, KNOB[1] - Math.cos(a) * 21.4, KNOB_Z]);
}

// A flat ribbon cable from the terminal's side down to the key bed: the scores travel to the keys.
const RIBBON = { x: SIDE + 1, y: -52, to: -6, w: 6 };
function ribbon() {
  const out = [];
  const { x, y, to, w } = RIBBON;
  const z = 0.9;
  // Connector on the terminal side.
  out.push(S(k.slabOf({ x: SIDE, y: y - 2, w: 3, d: w + 4, r: 0.8 }, 4, 6, P, 2, 0.3), { tone: "mid" }));
  // Run 1 along x off the connector, run 2 along y to the key bed corner, run 3 into the bed's left face.
  const corner = x + 4;
  out.push(S(k.slabOf({ x: SIDE + 3, y, w: corner + w - SIDE - 3, d: w, r: 0.6 }, 0, z, P, 2), { tone: "lo", crease: "none" }));
  out.push(S(k.slabOf({ x: corner, y: y + w, w, d: to - y - w, r: 0 }, 0, z, P, 2), { tone: "lo", crease: "none" }));
  const wires = [];
  for (let i = 1; i < 6; i++) {
    const f = (i / 6) * w;
    wires.push(k.onTop([[SIDE + 3, y + f], [corner + w - f, y + f], [corner + w - f, to]], z, P));
  }
  out.push(L(wires.join(""), { tone: "faint" }));
  // The plug on the key bed's side.
  out.push(S(k.slabOf({ x: corner - 1, y: to, w: KB.x - corner + 1, d: 9, r: 0.8 }, 0, 4.4, P, 2, 0.3), { tone: "mid" }));
  out.push(D([at([corner + 1.4, to + 4.5, 4.4])], { size: 0.45 }));
  // Strain-relief clip across run 2.
  out.push(S(k.slabOf({ x: corner - 2, y: -32, w: w + 4, d: 3, r: 0.6 }, 0, 2, P, 2, 0.2), { tone: "mid" }));
  out.push(D([at([corner - 1, -30.5, 2]), at([corner + w + 1, -30.5, 2])], { size: 0.4 }));
  return out.join("");
}

// The sample button: press it (or click anywhere) to draw a new u.
const BUTTON = [-40, 70];
function button() {
  const [x, y] = BUTTON;
  const out = [`<path class="iso-halo" d="${k.haloOf({ x: x - 11, y: y - 11, w: 22, d: 22, r: 11 }, 0, 2, P)}" style="filter:blur(3px)"/>`];
  out.push(S(k.cylinder(x, y, 11, 0, 2, P, 40, 0.3), { tone: "lo" }));
  out.push(L(k.ring(x, y, 9.4, 2, P, 40), { tone: "faint" }));
  out.push(S(k.cylinder(x, y, 8.2, 2, 2.6, P, 36), { tone: "mid" }));
  out.push(`<g class="nt-button" data-part="button">${S(k.cylinder(x, y, 6.6, 4.6, 3.4, P, 36, 0.5), { tone: "hi", crease: "lo" })}${L(k.ring(x, y, 4.2, 8, P, 32), { tone: "faint" })}</g>`);
  return out.join("");
}

const svg = k.figureSvg({
  width: WIDTH,
  height: HEIGHT,
  label:
    "A next-token sampler on a bench. A terminal shows the prompt “The cat sat on the”. Five keycaps carry the candidate words mat, floor, sofa, bed and roof; behind each, a stack of chips on a ruled board is as tall as that word's probability. A temperature knob reshapes the stacks. At the front the probabilities lie end to end along a strip, and a carriage stops at a random point u: the word whose segment holds u lights up, its key goes down and the word is written on the screen.",
  body: [
    plate(),
    terminal(),
    ribbon(),
    board(),
    ...M.WORDS.map((_, i) => `${socket(i)}<g data-col="${i}"></g>`),
    keybed(),
    ...M.WORDS.map((_, i) => key(i)),
    knob(),
    button(),
    strip(),
    `<g data-part="segments"></g>`,
    `<g data-part="carriage">${carriage()}</g>`,
  ],
});

const model = readFileSync(join(HERE, "model.mjs"), "utf8").replace(/^export /gm, "");

const live = `
${model}
const P = ${JSON.stringify(P)};
const COL = { w: ${COL_W}, d: ${COL_D}, y: ${COL_Y}, z: ${CHIP_Z}, pitch: ${PITCH}, count: ${CHIPS} };
const COL_X = ${JSON.stringify(M.WORDS.map((_, i) => colX(i)))};
const SPAN = ${JSON.stringify(SPAN)}, SEG = ${JSON.stringify(SEG)}, STRIP_H = ${STRIP_H};
const KNOB = ${JSON.stringify(KNOB)}, KNOB_Z = ${KNOB_Z}, SWEEP = ${JSON.stringify(SWEEP)};
const tempAngle = ${tempAngle.toString().replace(/M\.TEMP/g, "TEMP")};
const pointerAt = ${pointerAt.toString().replace("k.lineOnTop", "lineOnTop").replace(/M\.TEMP/g, "TEMP")};
const at = (point) => iso(point, P);
const pipAt = ${pipAt.toString()};
const stage = document.querySelector(".iso-stage");
const svg = stage.querySelector("svg");
const cols = COL_X.map((_, i) => svg.querySelector('[data-col="' + i + '"]'));
const keys = COL_X.map((_, i) => svg.querySelector('[data-key="' + i + '"]'));
const lamps = COL_X.map((_, i) => svg.querySelector('[data-lamp="' + i + '"]'));
const segments = svg.querySelector('[data-part="segments"]');
const carriage = svg.querySelector('[data-part="carriage"]');
const pointer = svg.querySelector('[data-part="pointer"]');
const pip = svg.querySelector('[data-part="pip"]');
const buttonEl = svg.querySelector('[data-part="button"]');
let btn = 0, btnHeld = 0;
const knob = svg.querySelector('[data-part="knob"]');
const wordEl = svg.querySelector('[data-part="word"]');
const lineEl = svg.querySelector('[data-part="line"]');
const cursor = svg.querySelector('[data-part="cursor"]');
const statusEl = svg.querySelector('[data-part="status"]');
const readout = document.querySelector("[data-readout]");
const still = matchMedia("(prefers-reduced-motion: reduce)");
const down = axisVector(P, [0, 0, -1]);
const DOWN = 2.4;
const seed = Number(new URLSearchParams(location.search).get("seed") || stage.dataset.seed || 7);
let rng = seeded(seed);
const clamp = (v, lo, hi) => Math.min(hi, Math.max(lo, v));
const xOfU = (u) => SPAN[0] + u * (SPAN[1] - SPAN[0]);

let T = TEMP.start, shownT = T, probs = probsAt(T), shown = probs.slice();
let glide = { from: 0.31, t: 1, time: 1 }, u = 0.31, shownU = u, picked = -1, landed = false, rolls = 0;
let press = COL_X.map(() => 0);
let pcts = COL_X.map(() => -1), counts = COL_X.map(() => -1), litCols = COL_X.map(() => false), segKey = "";
let frame = 0, last = 0, visible = false, touring = !still.matches, idleTimer = 0, clock = 0, step = 0;

function columnSvg(i, n, lit, p) {
  const x = COL_X[i];
  let out = "";
  for (let j = 0; j < n; j++) {
    const z = COL.z + j * COL.pitch;
    const top = j === n - 1;
    const plan = { x, y: COL.y, w: COL.w, d: COL.d, r: 2 };
    out += solidSvg(slabOf(plan, z, COL.pitch - (top ? 0 : 0.36), P, 3, top ? 0.3 : 0), { tone: top ? "hi" : "mid", crease: "none", lit: lit && top });
  }
  const zTop = COL.z + n * COL.pitch;
  out += faceTextSvg(topMatrix([x + COL.w / 2, COL.y + COL.d / 2 + 2], zTop, P, "x"), Math.round(p * 100) + "%", { size: 5.6, tone: lit ? "lit" : "mid", anchor: "middle" });
  return out;
}

function segmentsSvg() {
  const edges = edgesOf(shown);
  let out = "";
  shown.forEach((p, i) => {
    const x0 = xOfU(edges[i]) + 0.35, x1 = xOfU(edges[i + 1]) - 0.35;
    if (x1 - x0 < 0.3) return;
    const plan = { x: x0, y: SEG.y, w: x1 - x0, d: SEG.d, r: Math.min(0.8, (x1 - x0) / 2) };
    const lit = i === picked && landed;
    out += solidSvg(slabOf(plan, STRIP_H, 1.2, P, 2), { tone: lit ? "hi" : i % 2 ? "lo" : "mid", crease: "none", lit });
  });
  return out;
}

function draw() {
  const n = shown.map((p) => Math.max(1, Math.round(p * COL.count)));
  n.forEach((count, i) => {
    const lit = i === picked && landed;
    const pct = Math.round(shown[i] * 100);
    if (count !== counts[i] || lit !== litCols[i] || pct !== pcts[i]) { cols[i].innerHTML = columnSvg(i, count, lit, shown[i]); counts[i] = count; litCols[i] = lit; pcts[i] = pct; }
    const key = keys[i];
    key.setAttribute("transform", "translate(" + (down[0] * press[i]).toFixed(2) + " " + (down[1] * press[i]).toFixed(2) + ")");
    key.querySelector('[data-face="rest"]').style.display = lit ? "none" : "";
    key.querySelector('[data-face="lit"]').style.display = lit ? "" : "none";
    lamps[i].style.display = lit ? "" : "none";
  });
  const sk = shown.map((p) => p.toFixed(3)).join() + "|" + (landed ? picked : -1);
  if (sk !== segKey) { segments.innerHTML = segmentsSvg(); segKey = sk; }
  carriage.setAttribute("transform", translateAlong(P, [xOfU(shownU), 0, 0]));
  pointer.setAttribute("d", pointerAt(shownT));
  const [px, py] = pipAt(shownT);
  const dot = pip.querySelector("circle");
  dot.setAttribute("cx", px.toFixed(1)); dot.setAttribute("cy", py.toFixed(1));
  const word = landed && picked >= 0 ? WORDS[picked] : "";
  if (wordEl.textContent !== word) {
    wordEl.textContent = word;
    cursor.setAttribute("x", String(Number(lineEl.getAttribute("x")) + lineEl.getComputedTextLength() + 1.2));
  }
  const top = probs.indexOf(Math.max(...probs));
  const st = "T " + T.toFixed(1) + " · H " + entropyOf(probs).toFixed(2) + " bits";
  if (statusEl.textContent !== st) statusEl.textContent = st;
  const text = "T " + T.toFixed(1) + " · " + WORDS[top] + " " + Math.round(probs[top] * 100) + "%" +
    (landed && picked >= 0 ? " · u " + u.toFixed(2) + " → " + WORDS[pick(probs, u)] + " " + Math.round(probs[pick(probs, u)] * 100) + "%" : " · rolling");
  if (readout.textContent !== text) readout.textContent = text;
  stage.setAttribute("aria-valuenow", T.toFixed(1));
  stage.setAttribute("aria-valuetext", text);
  stage.dataset.picked = landed && picked >= 0 ? WORDS[picked] : "";
}

function setT(next) {
  T = Math.round(clamp(next, TEMP.min, TEMP.max) * 100) / 100;
  probs = probsAt(T);
  if (landed) picked = pick(probs, u);
  run();
}
function roll(value) {
  u = value === undefined ? rng() : clamp(value, 0, 0.9999);
  picked = pick(probs, u);
  landed = still.matches;
  btnHeld = 0.14;
  // The carriage glides to u in an eased move whose time grows gently with the distance.
  glide = { from: shownU, t: 0, time: 0.45 + 0.6 * Math.abs(u - shownU) };
  rolls++;
  run();
}

const tourSteps = [
  [1.6, () => roll()], [2.8, () => setT(1.6)], [1.6, () => roll()], [2.6, () => roll()],
  [2.8, () => setT(0.3)], [1.6, () => roll()], [2.6, () => setT(0.8)], [1.6, () => roll()],
];
function tour(dt) {
  clock += dt;
  if (clock < tourSteps[step][0]) return;
  clock = 0;
  tourSteps[step][1]();
  step = (step + 1) % tourSteps.length;
}

function tick(now) {
  const dt = last ? Math.min((now - last) / 1000, 1 / 30) : 1 / 60;
  last = now;
  const calm = still.matches;
  if (touring) tour(dt);
  const ease = (tau) => (calm ? 1 : 1 - Math.exp(-dt / tau));
  let busy = touring;
  shownT += (T - shownT) * ease(0.18);
  if (Math.abs(T - shownT) < 0.002) shownT = T; else busy = true;
  shown = shown.map((v, i) => { const n = v + (probs[i] - v) * ease(0.32); if (Math.abs(n - probs[i]) < 0.0005) return probs[i]; busy = true; return n; });
  // The carriage glides to u with a critically damped follow: no bounce, no overshoot.
  if (glide.t < 1) {
    glide.t = calm ? 1 : Math.min(1, glide.t + dt / glide.time);
    const e = glide.t < 0.5 ? 4 * glide.t ** 3 : 1 - (-2 * glide.t + 2) ** 3 / 2;
    shownU = glide.from + (u - glide.from) * e;
    busy = true;
  }
  if (glide.t >= 1) { shownU = u; if (!landed && picked >= 0) landed = true; }
  // If T changes after a roll, the lit word follows the segment now under the carriage.
  if (landed && picked >= 0) picked = pick(shown, u);
  press = press.map((p, i) => {
    const want = landed && i === picked ? DOWN : 0;
    const n = p + (want - p) * ease(want ? 0.06 : 0.12);
    if (Math.abs(want - n) < 0.01) return want;
    busy = true;
    return n;
  });
  btnHeld = Math.max(0, btnHeld - dt);
  const bw = btnHeld > 0 ? 1.8 : 0;
  btn += (bw - btn) * ease(bw ? 0.03 : 0.1);
  if (Math.abs(bw - btn) < 0.01) btn = bw; else busy = true;
  buttonEl.setAttribute("transform", "translate(" + (down[0] * btn).toFixed(2) + " " + (down[1] * btn).toFixed(2) + ")");
  draw();
  frame = visible && busy ? requestAnimationFrame(tick) : 0;
}
function run() { if (!frame && visible) { last = 0; frame = requestAnimationFrame(tick); } }
function takeOver() {
  touring = false;
  clearTimeout(idleTimer);
  idleTimer = setTimeout(() => { if (still.matches) return; touring = true; clock = 0; run(); }, 3600);
}
stage.addEventListener("pointerenter", takeOver);
stage.addEventListener("pointermove", () => { if (!dragging) takeOver(); });
stage.addEventListener("focus", takeOver);
new IntersectionObserver((entries) => { visible = entries[entries.length - 1].isIntersecting; if (visible) run(); }, { rootMargin: "120px 0px" }).observe(stage);

// Drag on the knob (or anywhere near it) to turn it; the angle round its centre sets T.
let dragging = false;
function knobAngle(event) {
  const box = svg.getBoundingClientRect();
  const s = box.width / ${WIDTH};
  const [cx, cy] = at([KNOB[0], KNOB[1], KNOB_Z]);
  const dx = event.clientX - box.left - cx * s, dy = event.clientY - box.top - cy * s;
  // Undo the iso squash of the floor plane before taking the angle.
  const { sinA, cosA, sinE } = cameraOf(P);
  const sx = dx, sy = dy / sinE;
  const wx = sx * sinA + sy * cosA, wy = -sx * cosA + sy * sinA;
  let a = Math.atan2(wx, -wy);
  if (a < SWEEP[0] - 0.4) a += Math.PI * 2;
  return a;
}
knob.addEventListener("pointerdown", (event) => { dragging = true; takeOver(); knob.setPointerCapture?.(event.pointerId); event.preventDefault(); });
svg.addEventListener("pointerdown", (event) => {
  if (event.target.closest('[data-part="knob"]')) { dragging = true; svg.setPointerCapture(event.pointerId); takeOver(); return; }
});
svg.addEventListener("pointermove", (event) => {
  if (!dragging) return;
  const a = knobAngle(event);
  setT(TEMP.min + clamp((a - SWEEP[0]) / SWEEP[1], 0, 1) * (TEMP.max - TEMP.min));
});
const stopDrag = () => { if (dragging) { dragging = false; takeOver(); } };
svg.addEventListener("pointerup", (event) => { const was = dragging; stopDrag(); if (!was && !event.target.closest('[data-part="knob"]')) { takeOver(); roll(); } });
svg.addEventListener("pointercancel", stopDrag);
svg.addEventListener("wheel", (event) => { if (!event.target.closest('[data-part="knob"]')) return; event.preventDefault(); takeOver(); setT(T + (event.deltaY < 0 ? TEMP.step : -TEMP.step)); }, { passive: false });
stage.addEventListener("keydown", (event) => {
  let handled = true;
  if (event.key === "ArrowRight" || event.key === "ArrowUp") setT(T + TEMP.step);
  else if (event.key === "ArrowLeft" || event.key === "ArrowDown") setT(T - TEMP.step);
  else if (event.key === "Home") setT(TEMP.min);
  else if (event.key === "End") setT(TEMP.max);
  else if (event.key === " " || event.key === "Enter") roll();
  else if (event.key === "Escape") { /* stop the tour only */ }
  else handled = false;
  if (!handled) return;
  event.preventDefault();
  takeOver();
});
// Screenshot and test hooks: set the temperature, roll at a given u, or reseed.
window.__nextToken = {
  temp(t) { takeOver(); setT(t); },
  roll(value) { takeOver(); roll(value); },
  seed(s) { rng = seeded(s); },
  state: () => ({ T, u, picked: picked >= 0 ? WORDS[picked] : null, landed, probs: probs.slice(), rolls }),
};
if (still.matches) { touring = false; roll(u); }
picked = pick(probs, u); landed = true; shownU = u;
draw();
`;

const css = `<style>
.nt-well{fill:var(--anatomy-shade-1)}
.nt-bezel{fill:var(--anatomy-top)}
.nt-glass{fill:var(--anatomy-lit-shade)}
.nt-glow{fill:var(--anatomy-lit);opacity:.07;filter:blur(6px)}
.nt-scan{fill:none;stroke:var(--anatomy-faint);stroke-width:.5px;vector-effect:non-scaling-stroke;opacity:.7}
.nt-text{fill:var(--anatomy-lit);font-family:var(--anatomy-mono);letter-spacing:.02em}
.nt-word{fill:var(--anatomy-lit);font-weight:600}
.nt-dim{fill:var(--anatomy-mid);font-family:var(--anatomy-mono);letter-spacing:.06em}
.nt-cursor{fill:var(--anatomy-lit);animation:nt-blink 1.06s steps(1,end) infinite}
.nt-pointer{stroke-width:1.3px;stroke-linecap:round}
.nt-knob{cursor:grab}
[data-lamp] circle{fill:var(--anatomy-lit);opacity:1}
.nt-keyglow{fill:var(--anatomy-lit);opacity:.22;filter:blur(5px)}
.nt-key [data-face=lit] .iso-top{fill:var(--anatomy-hi)}
.nt-key [data-face=lit] .iso-face-text{fill:var(--anatomy-page)}
[data-col] .iso-face-text[data-tone=lit]{fill:var(--anatomy-page)}
[data-col] [data-lit]>.iso-top,[data-part=segments] [data-lit]>.iso-top{fill:var(--anatomy-hi)}
.iso-face-text{font-family:var(--anatomy-mono)}
@keyframes nt-blink{50%{opacity:0}}
@media (prefers-reduced-motion:reduce){.nt-cursor{animation:none}}
.iso-stage{touch-action:pan-y;cursor:pointer}
.iso-stage:focus{outline:none}
.iso-stage:focus-visible{outline:1px solid var(--anatomy-muted);outline-offset:6px}
</style>`;

const body =
  css +
  k.plateHtml({
    fig: "Fig 1",
    title: "Next token",
    hint: "Drag the knob · click to sample",
    readout: "",
    keys: [
      { mark: "lit", label: "The sampled word: its segment, its stack, its key and the screen" },
      { mark: "raised", label: "Chip stacks: each word's probability, on a board ruled in tenths" },
    ],
    caption:
      "“The cat sat on the …”. The model scores five candidate words (logits 3.4, 2.6, 2.0, 1.5 and 0.5); softmax(z / T) turns the scores into probabilities, and each stack of chips is as tall as one of them. The same probabilities lie end to end along the strip at the front. Sampling draws a uniform number u between 0 and 1; the carriage stops at u and the word whose segment holds it is the next token. Turn the temperature down and mat takes almost the whole strip; turn it up and the rivals win more often.",
    body: `<div class="iso-stage" tabindex="0" role="slider" data-seed="7" aria-label="Next-token sampler. Arrow keys set the temperature, Space or Enter samples a word." aria-valuemin="${M.TEMP.min}" aria-valuemax="${M.TEMP.max}" aria-valuenow="${M.TEMP.start}">${svg}</div>`,
  });

const name = theme === "light" ? "next-token-light.html" : "next-token.html";
writeFileSync(join(HERE, name), k.pageHtml({ title: "Next token", theme, body, script: kitScript() + live }));
console.log("wrote", name);
