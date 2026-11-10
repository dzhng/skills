// The 3D board: modules wired by sloppy cables, scanned layer by layer,
// cleaned, and kept clean week after week. Everything is a pure function of
// song time `s`.
import React, { useMemo } from "react";
import * as THREE from "three";
import { useThree } from "@react-three/fiber";
import { ThreeCanvas } from "@remotion/three";
import { RoomEnvironment } from "three/examples/jsm/environments/RoomEnvironment.js";
import { RoundedBoxGeometry } from "three/examples/jsm/geometries/RoundedBoxGeometry.js";
import { CUE } from "../cues.ts";
import { C, H, W } from "../theme.ts";
import { clamp, inCubic, inOutCubic, kick, lerp, outBack, outCubic, prog, spring, squash, xray } from "../anim.ts";
import { cameraAt } from "./camera.ts";
import { Post } from "./Post.tsx";
import {
  BLOCKS, FEATURES, FINAL, FIX, GATHER_OF_FEATURE, GREY, LINKS, PROBLEMS, SWEEP_1, SWEEP_2, TUG, WEEKLY, WEEK_SWEEPS,
  arcHeight, blockXZ, sweepX, type Block, type Link, type Problem, type Sweep, type V3,
} from "./board.ts";
import { fadeTex, floorTex, glowTex, inkTex, padTex, plateTex, tagTex, tapeTex } from "./textures.ts";

const ADD = THREE.AdditiveBlending;
const col = (a: string, b: string, t: number) => new THREE.Color(a).lerp(new THREE.Color(b), clamp(t));
const FIXES = CUE.fixes;
const HOOK_Y = 1.15; // hook sits this far above the block top

// Layer 1 fixes ripple across the board left to right, one kind of slop per bar.
const rippleAt = (fx: number, x: number) => FIXES[fx].lift + ((x + 9.5) / 19) * 0.45;

// ---------- the tug ----------
// Blue modules other than the tug block, in the order the opening yanks them.
const YANKED = BLOCKS.filter((b) => b.feature === 0 && b.id !== TUG)
  .sort((a, b) => Math.hypot(a.stages[0][0] - BLOCKS[TUG].stages[0][0], a.stages[0][1] - BLOCKS[TUG].stages[0][1]) - Math.hypot(b.stages[0][0] - BLOCKS[TUG].stages[0][0], b.stages[0][1] - BLOCKS[TUG].stages[0][1]))
  .map((b) => b.id);
const slackDrop = (s: number) => 1 - inCubic(prog(s, CUE.slack, CUE.slack + 0.22));
const tugLift = (s: number) => 2.3 * outBack(prog(s, CUE.tug, CUE.tug + 0.8), 1.2) * slackDrop(s);
const payLift = (s: number) => 2.1 * spring(s, CUE.tug2, 1.3, 0.55) * (1 - inOutCubic(prog(s, CUE.weeks[0] - 0.6, CUE.weeks[0]))) + (s > CUE.tug2 + 1 && s < CUE.weeks[0] ? Math.sin((s - CUE.tug2) * 2.2) * 0.08 : 0);

type Pose = { x: number; y: number; z: number; rx: number; rz: number; sx: number; sy: number; gone: boolean };
function pose(b: Block, s: number): Pose {
  const { xz, y: hop } = blockXZ(b, s);
  let y = hop, rx = 0, rz = 0, sx = 1, sy = 1;
  // Opening: one change, and the same feature tears loose all over the board.
  if (s < CUE.slack + 0.6) {
    if (b.id === TUG) y += tugLift(s);
    const i = YANKED.indexOf(b.id);
    if (i >= 0) {
      const p = spring(s, CUE.yanks[i], 2.4, 0.3);
      y += 2.0 * p * slackDrop(s);
      const t = BLOCKS[TUG].stages[0];
      const d = Math.hypot(t[0] - xz[0], t[1] - xz[1]);
      const sway = 1 + Math.sin((s - CUE.yanks[i]) * 7 + i) * 0.5 * Math.exp(-(s - CUE.yanks[i]) / 0.9);
      rz = -((t[0] - xz[0]) / d) * 0.42 * p * sway * slackDrop(s);
      rx = ((t[1] - xz[1]) / d) * 0.42 * p * sway * slackDrop(s);
    }
    if (b.feature === 0) [sx, sy] = squash(s, CUE.slack + 0.22, 0.3);
  }
  // Payoff: the whole feature lifts as one piece, nothing else stirs.
  if (b.feature === 0 && s >= CUE.matchCut) y += payLift(s);
  // Landings squash.
  for (const m of b.moves) if (s >= m.t1 && s < m.t1 + 0.6) [sx, sy] = squash(s, m.t1, 0.25);
  // Pass-through junctions sink through the floor.
  let gone = false;
  if (b.feature === GREY) {
    const t0 = rippleAt(FIX.junction, xz[0]);
    y -= (b.h + 0.4) * inCubic(prog(s, t0, t0 + 0.4));
    gone = s > t0 + 0.4;
  }
  return { x: xz[0], y, z: xz[1], rx, rz, sx, sy, gone };
}

// Cable ends sit on the block's top face, fanned so they don't stack.
function topPoint(b: Block, s: number, slot: number): V3 {
  const p = pose(b, s);
  const a = slot * 2.399;
  return [p.x + Math.cos(a) * 0.38, p.y + b.h + 0.07, p.z + Math.sin(a) * 0.38];
}
function floorPoint(b: Block, s: number, slot: number): V3 {
  const p = pose(b, s);
  const a = slot * 2.399;
  return [p.x + Math.cos(a) * 0.85, 0.035, p.z + Math.sin(a) * 0.85];
}

// ---------- cable state ----------
const problemOfLink = new Map(PROBLEMS.filter((p) => p.link !== undefined && p.kind !== "tape").map((p) => [p.link!, p]));
const tapeOfLink = new Map(PROBLEMS.filter((p) => p.kind === "tape").map((p) => [p.link!, p]));
type CableState = { ends: [V3, V3]; arc: number; u0: number; u1: number; split: number; color: THREE.Color; glow: number; radius: number; bulge: number };
function cableState(l: Link, s: number): CableState | null {
  const A = BLOCKS[l.a], B = BLOCKS[l.b];
  const f = FIXES[l.fix];
  const feature = A.feature === GREY ? B.feature : A.feature;
  const hue = FEATURES[feature]?.color ?? "#8892b0";
  const made = l.kind === "hidden" && s >= f.land; // a hidden link, now drawn in the open
  // Opening: the tug pulls blue hidden links taut, so for a moment you see them.
  const taut = feature === 0 && s < CUE.slack + 0.4 ? prog(s, CUE.tug + 0.3, CUE.tug + 0.9) * slackDrop(s) : 0;
  const glimpse = l.kind === "hidden" && feature === 0 && s >= CUE.yanks[0] - 0.05 && s < CUE.slack + 0.15;
  const onFloor = l.kind === "hidden" && !made && !glimpse;
  const ends: [V3, V3] = onFloor ? [floorPoint(A, s, l.id), floorPoint(B, s, l.id + 3)] : [topPoint(A, s, l.id), topPoint(B, s, l.id + 3)];
  let arc = onFloor ? 0.02 : arcHeight(l, ends[0], ends[1]);
  if (feature === 0 && s < CUE.slack + 0.4) arc *= 1 - 0.85 * taut;
  let u0 = 0, u1 = 1, split = 0, glow = 0.35, radius = 0.045;
  let color = new THREE.Color(hue);
  if (glimpse) {
    color = new THREE.Color("#cfd8ff");
    glow = 3 + 3 * Math.exp(-(s - CUE.yanks[0]) / 0.2);
    radius = 0.03;
    arc = 0.02;
  } else if (l.kind === "hidden" && !made) {
    const p = problemOfLink.get(l.id)!;
    if (s < p.tagAt) return null; // nothing shows it, until the deep scan
    color = new THREE.Color(C.red);
    glow = 2.2 + 3 * Math.exp(-(s - p.tagAt) / 0.15);
    radius = 0.04;
  }
  if (made) glow = 0.8 + 2.5 * Math.exp(-(s - f.land) / 0.25);
  if (taut > 0 && !glimpse) glow += taut * 2;
  // A tagged needless link runs hot until it's cut.
  const tagged = problemOfLink.get(l.id);
  if (l.kind === "needless" && tagged && s >= tagged.tagAt) {
    color.lerp(new THREE.Color(C.red), 0.75);
    glow = 1.4 + 3 * Math.exp(-(s - tagged.tagAt) / 0.15) + Math.sin(s * 9 + l.id) * 0.4;
  }
  if (l.kind === "needless") {
    // Snipped in the middle; both halves reel back to their blocks.
    const t0 = rippleAt(FIX.needless, (ends[0][0] + ends[1][0]) / 2);
    split = outCubic(prog(s, t0, t0 + 0.4));
    if (split >= 1) return null;
  }
  if (l.kind === "surplus") {
    // Reeled into the junction box as it sinks.
    const g = A.feature === GREY ? A : B;
    const t0 = rippleAt(FIX.junction, g.stages[0][0]);
    const r = inOutCubic(prog(s, t0 - 0.2, t0 + 0.3));
    if (r >= 1) return null;
    if (A.feature === GREY) u1 = 1 - r;
    else u0 = r;
    color = new THREE.Color("#9aa3bd");
    glow = 0.15;
    const p = PROBLEMS.find((q) => q.block === g.id)!;
    if (s >= p.tagAt) {
      color.lerp(new THREE.Color(C.red), 0.4);
      glow = 0.6;
    }
  }
  // Settled cables glow once their feature is one place.
  if (l.kind === "legit" && s >= f.land) glow = 0.8 + 2.5 * Math.exp(-(s - f.land) / 0.25);
  // Title: cables pulse on the kick.
  if (s >= CUE.drop && s < CUE.clear + 0.5) glow += kick(s) * 1.2;
  // Layer 2: everything above the floor dims so the red underneath reads.
  const xr = xray(s);
  if (xr > 0 && !(l.kind === "hidden" && !made)) glow *= 1 - xr * 0.7;
  return { ends, arc, u0, u1, split, color, glow, radius, bulge: (l.id % 2 ? 1 : -1) * 0.45 };
}

// Curve through the cable: an arc with a sideways bulge, so cables tangle in 3D.
function curvePoint(st: CableState, u: number, out: THREE.Vector3) {
  const [p, q] = st.ends;
  const dx = q[0] - p[0], dz = q[2] - p[2];
  const d = Math.hypot(dx, dz) || 1;
  const bulge = st.bulge * st.arc;
  const k = Math.sin(Math.PI * u);
  out.set(p[0] + dx * u + (-dz / d) * bulge * k, p[1] + (q[1] - p[1]) * u + st.arc * k, p[2] + dz * u + (dx / d) * bulge * k);
  return out;
}

const SEG = 48, RAD = 6;
class PathCurve extends THREE.Curve<THREE.Vector3> {
  constructor(private f: (u: number, o: THREE.Vector3) => THREE.Vector3) { super(); }
  getPoint(u: number, o = new THREE.Vector3()) { return this.f(u, o); }
}

// A tube whose vertex buffer is refilled each frame (no GPU reallocation).
function useTube() {
  return useMemo(() => {
    const geo = new THREE.TubeGeometry(new PathCurve((u, o) => o.set(u, 0, 0)), SEG, 1, RAD, false);
    const mat = new THREE.MeshStandardMaterial({ color: "#1c2236", roughness: 0.42, metalness: 0.15 });
    const mesh = new THREE.Mesh(geo, mat);
    mesh.castShadow = true;
    mesh.frustumCulled = false;
    return mesh;
  }, []);
}
function fillTube(mesh: THREE.Mesh, f: (u: number, o: THREE.Vector3) => THREE.Vector3, radius: number) {
  const fresh = new THREE.TubeGeometry(new PathCurve(f), SEG, radius, RAD, false);
  const geo = mesh.geometry as THREE.BufferGeometry;
  (geo.attributes.position.array as Float32Array).set(fresh.attributes.position.array as Float32Array);
  (geo.attributes.normal.array as Float32Array).set(fresh.attributes.normal.array as Float32Array);
  geo.attributes.position.needsUpdate = true;
  geo.attributes.normal.needsUpdate = true;
  geo.computeBoundingSphere();
  fresh.dispose();
}
function paint(mesh: THREE.Mesh, st: CableState) {
  const mat = mesh.material as THREE.MeshStandardMaterial;
  mat.color.copy(new THREE.Color("#1a2033").lerp(st.color, 0.35));
  mat.emissive.copy(st.color);
  mat.emissiveIntensity = st.glow;
}
// Draw a cable whole, or as the two reeling halves of a snipped one.
function drawRange(st: CableState, half: 0 | 1): [number, number] | null {
  if (st.split === 0) return half === 0 ? [st.u0, st.u1] : null;
  const keep = 0.5 * (1 - st.split) - 0.02;
  if (keep <= 0.005) return null;
  return half === 1 ? [1 - keep, 1] : [0, keep];
}

const Cable: React.FC<{ l: Link; s: number; half: 0 | 1 }> = ({ l, s, half }) => {
  const mesh = useTube();
  const st = cableState(l, s);
  const r = st && drawRange(st, half);
  if (!st || !r) return null;
  fillTube(mesh, (u, o) => curvePoint(st, r[0] + (r[1] - r[0]) * u, o), st.radius);
  paint(mesh, st);
  return <primitive object={mesh} />;
};

// Weekly slop: a needless link creeps in between clean districts, then the
// week's sweep cuts it.
const WeeklyCable: React.FC<{ w: (typeof WEEKLY)[number]; s: number; half: 0 | 1 }> = ({ w, s, half }) => {
  const mesh = useTube();
  if (s < w.grow[0] || s > w.cutAt + 0.5) return null;
  const A = BLOCKS[w.a], B = BLOCKS[w.b];
  const ends: [V3, V3] = [topPoint(A, s, w.a + 9), topPoint(B, s, w.b + 5)];
  const grow = inOutCubic(prog(s, w.grow[0], w.grow[1]));
  const st: CableState = {
    ends, arc: arcHeight(w, ends[0], ends[1]), u0: 0, u1: grow, split: outCubic(prog(s, w.cutAt, w.cutAt + 0.4)),
    color: new THREE.Color(C.red), glow: 1.6 + 2 * Math.exp(-Math.max(0, s - w.grow[1]) / 0.2), radius: 0.045, bulge: w.week % 2 ? 0.45 : -0.45,
  };
  const r = drawRange(st, half);
  if (!r || st.u1 <= 0.01) return null;
  fillTube(mesh, (u, o) => curvePoint(st, r[0] + (r[1] - r[0]) * u, o), st.radius);
  paint(mesh, st);
  return <primitive object={mesh} />;
};

// ---------- modules ----------
const bodyGeo = new Map<number, THREE.BufferGeometry>();
const plateGeo = new RoundedBoxGeometry(1.2, 0.08, 1.2, 2, 0.03);
const BLOCK_W = 1.5;

const Module: React.FC<{ b: Block; s: number }> = ({ b, s }) => {
  const p = pose(b, s);
  const body = useMemo(() => {
    const key = Math.round(b.h * 100);
    if (!bodyGeo.has(key)) bodyGeo.set(key, new RoundedBoxGeometry(BLOCK_W, b.h, BLOCK_W, 4, 0.12));
    return bodyGeo.get(key)!;
  }, [b.h]);
  const mats = useMemo(() => ({
    body: new THREE.MeshPhysicalMaterial({ color: "#232a3f", metalness: 0.55, roughness: 0.32, clearcoat: 0.7, clearcoatRoughness: 0.25 }),
    plate: new THREE.MeshStandardMaterial({ color: b.feature === GREY ? "#5b6275" : FEATURES[b.feature].color, map: plateTex(), roughness: 0.3, metalness: 0.2 }),
  }), [b.feature]);
  if (p.gone) return null;
  const xr = xray(s);
  if (b.feature === GREY) {
    // Junctions flag red once tagged and flare as they're pulled under.
    const tag = PROBLEMS.find((q) => q.block === b.id)!;
    const t0 = rippleAt(FIX.junction, p.x);
    mats.plate.emissive.set(C.red);
    mats.plate.emissiveIntensity = Math.max(s >= tag.tagAt ? 0.45 + 0.5 * Math.exp(-(s - tag.tagAt) / 0.2) : 0, prog(s, t0 - 0.4, t0) * 3);
  } else {
    const land = FIXES[GATHER_OF_FEATURE[b.feature]].land;
    const settled = s >= land;
    const flash = settled ? Math.exp(-(s - land) / 0.3) : 0;
    const lifted = b.feature === 0 && s < CUE.slack + 0.4 && (b.id === TUG || YANKED.includes(b.id)) ? prog(s, CUE.tug, CUE.tug + 0.3) * slackDrop(s) : 0;
    mats.plate.emissive.set(FEATURES[b.feature].color);
    mats.plate.emissiveIntensity = (0.35 + (settled ? 0.65 : 0) + flash * 2.5 + lifted * 1.2 + kick(s) * 0.15) * (1 - xr * 0.6);
  }
  mats.body.opacity = 1;
  return (
    <group position={[p.x, p.y, p.z]} rotation={[p.rx, 0, p.rz]} scale={[p.sx, p.sy, p.sx]}>
      <mesh geometry={body} material={mats.body} position={[0, b.h / 2, 0]} castShadow receiveShadow />
      <mesh geometry={plateGeo} material={mats.plate} position={[0, b.h + 0.02, 0]} castShadow />
    </group>
  );
};

// Special cases: hazard tape around a cable, torn off in layer 1 (or, for
// weekly slop, by that week's sweep).
const Tape: React.FC<{ l: Link; s: number; from?: number; until: number }> = ({ l, s, from, until }) => {
  const mat = useMemo(() => new THREE.MeshStandardMaterial({ map: tapeTex(), roughness: 0.6, emissive: new THREE.Color(C.tape), emissiveMap: tapeTex(), emissiveIntensity: 0.25, transparent: true }), []);
  const st = cableState(l, s);
  const rip = prog(s, until, until + 0.45);
  if (!st || rip >= 1 || (from !== undefined && s < from)) return null;
  const at = curvePoint(st, 0.5, new THREE.Vector3());
  const ahead = curvePoint(st, 0.52, new THREE.Vector3());
  const dir = ahead.sub(at).normalize();
  const q = new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 1, 0), dir);
  const flyUp = outCubic(rip);
  const pop = from !== undefined ? spring(s, from, 3, 0.4) : 1;
  mat.opacity = 1 - flyUp;
  mat.emissiveIntensity = 0.25 + (from !== undefined ? 1.5 * Math.exp(-(s - from) / 0.2) : 0);
  return (
    <mesh position={[at.x, at.y + flyUp * 2.5, at.z]} quaternion={q} scale={(1 + flyUp * 0.5) * pop} material={mat} castShadow>
      <cylinderGeometry args={[0.11, 0.11, 0.38, 16, 1, false]} />
    </mesh>
  );
};

// ---------- problem tags ----------
// A red luggage tag per problem: pops on as a scan passes, burns when its fix lands.
const burnAt = (p: Problem) => (p.layer === 2 ? FIXES[p.fix].lift + 0.3 : rippleAt(p.fix, p.anchor[0]));
const Tags: React.FC<{ s: number }> = ({ s }) => {
  const mats = useMemo(() => Object.fromEntries((["hidden", "needless", "junction", "tape"] as const).map((k) => [k, new THREE.SpriteMaterial({ map: tagTex(k), fog: false, toneMapped: false })])), []);
  const strings = useMemo(() => {
    const g = new THREE.BufferGeometry();
    g.setAttribute("position", new THREE.BufferAttribute(new Float32Array(PROBLEMS.length * 6), 3));
    const l = new THREE.LineSegments(g, new THREE.LineBasicMaterial({ color: "#ffb0b8", transparent: true, opacity: 0.8 }));
    l.frustumCulled = false;
    return l;
  }, []);
  const arr = strings.geometry.attributes.position.array as Float32Array;
  arr.fill(0);
  const sprites = PROBLEMS.map((p) => {
    if (s < p.tagAt) return null;
    const burn = prog(s, burnAt(p) - 0.1, burnAt(p) + 0.15);
    if (burn >= 1) return null;
    const pop = spring(s, p.tagAt, 3, 0.35) * (1 - inCubic(burn)) * (p.label ? 1 + 0.7 * Math.exp(-(s - p.tagAt) / 0.6) : 1);
    const swing = Math.sin((s - p.tagAt) * 5 + p.id) * 0.06 * Math.exp(-(s - p.tagAt) / 1.5);
    const pos: V3 = [p.anchor[0] + swing, p.anchor[1] + 0.75 + burn * 0.4, p.anchor[2]];
    arr.set([p.anchor[0], p.anchor[1], p.anchor[2], pos[0], pos[1] + 0.26 * pop, pos[2]], p.id * 6);
    return <sprite key={p.id} position={pos} scale={[0.42 * pop, 0.63 * pop, 1]} material={mats[p.kind]} />;
  });
  strings.geometry.attributes.position.needsUpdate = true;
  return (
    <>
      {sprites}
      <primitive object={strings} />
    </>
  );
};

// ---------- review stamp (one per gather) ----------
const STAMP_AT: Record<number, V3> = { 3: [0, 0, 3], 4: [0, 0, -3] };
const Stamp: React.FC<{ fx: number; s: number }> = ({ fx, s }) => {
  const f = FIXES[fx];
  const mats = useMemo(() => ({
    wood: new THREE.MeshPhysicalMaterial({ color: "#c2402f", roughness: 0.35, clearcoat: 1, clearcoatRoughness: 0.1 }),
    rubber: new THREE.MeshStandardMaterial({ color: "#1d2130", roughness: 0.8 }),
    ink: new THREE.MeshBasicMaterial({ map: inkTex(), transparent: true, toneMapped: false, depthWrite: false }),
  }), []);
  if (s < f.stamp - 0.5) return null;
  const [x, , z] = STAMP_AT[fx];
  const down = inCubic(prog(s, f.stamp - 0.3, f.stamp));
  const up = outCubic(prog(s, f.stamp + 0.15, f.stamp + 0.6));
  const y = 0.18 + (1 - down) * 5 + up * 16;
  const [sx, sy] = squash(s, f.stamp, 0.3);
  const ink = s >= f.stamp ? spring(s, f.stamp, 3, 0.5) : 0;
  return (
    <>
      {up < 1 && (
        <group position={[x, y, z]} scale={[sx, sy, sx]}>
          <mesh material={mats.rubber} castShadow>
            <boxGeometry args={[1.7, 0.24, 1.7]} />
          </mesh>
          <mesh material={mats.wood} position={[0, 0.3, 0]} castShadow>
            <boxGeometry args={[1.5, 0.42, 1.5]} />
          </mesh>
          <mesh material={mats.wood} position={[0, 0.8, 0]} castShadow>
            <cylinderGeometry args={[0.2, 0.32, 0.6, 24]} />
          </mesh>
          <mesh material={mats.wood} position={[0, 1.28, 0]} scale={[1, 0.8, 1]} castShadow>
            <sphereGeometry args={[0.5, 32, 16]} />
          </mesh>
        </group>
      )}
      {ink > 0 && (
        <mesh material={mats.ink} position={[x, 0.025, z]} rotation={[-Math.PI / 2, 0, 0.15]} scale={1.75 * ink}>
          <planeGeometry args={[1, 1]} />
        </mesh>
      )}
    </>
  );
};

// Floor glow under each district once it is one place.
const DistrictPad: React.FC<{ f: number; s: number }> = ({ f, s }) => {
  const fx = GATHER_OF_FEATURE[f];
  const mat = useMemo(() => new THREE.MeshBasicMaterial({ map: padTex(), color: FEATURES[f].color, transparent: true, blending: ADD, depthWrite: false, toneMapped: false }), [f]);
  const on = prog(s, FIXES[fx].land, FIXES[fx].land + 0.3);
  if (on <= 0) return null;
  const [x, z] = FEATURES[f].district;
  const flash = Math.exp(-(s - FIXES[fx].land) / 0.25);
  mat.opacity = on * (0.55 + flash * 0.8 + kick(s) * 0.15);
  return (
    <mesh material={mat} position={[x, 0.02, z]} rotation={[-Math.PI / 2, 0, 0]} scale={[3 * 1.95 + 0.9 + flash * 0.6, 2 * 1.95 + 0.9 + flash * 0.6, 1]}>
      <planeGeometry args={[1, 1]} />
    </mesh>
  );
};

// ---------- the hook: "a change" ----------
const Hook: React.FC<{ s: number }> = ({ s }) => {
  const mat = useMemo(() => new THREE.MeshStandardMaterial({ color: "#d9dde8", metalness: 1, roughness: 0.18 }), []);
  const lineMat = useMemo(() => new THREE.MeshStandardMaterial({ color: "#c7ccd8", metalness: 0.9, roughness: 0.3 }), []);
  const first = s < CUE.slack + 1.2;
  const second = s >= CUE.matchCut && s < CUE.weeks[0] + 0.5;
  if (!first && !second) return null;
  const b = BLOCKS[TUG];
  const p = pose(b, s);
  const top = p.y + b.h + HOOK_Y;
  const t0 = first ? CUE.tug : CUE.tug2;
  // Lowers onto the block, then rides it; lets go when it's done.
  const descend = 1 - outCubic(prog(s, t0 - 1.2, t0 - 0.05));
  const release = outCubic(first ? prog(s, CUE.slack, CUE.slack + 0.8) : prog(s, CUE.weeks[0] - 0.3, CUE.weeks[0] + 0.5));
  const y = top + descend * 6 + release * 6;
  return (
    <group position={[p.x, y, p.z]}>
      <mesh material={lineMat} position={[0, 10.5, 0]}>
        <cylinderGeometry args={[0.025, 0.025, 20, 8]} />
      </mesh>
      <mesh material={mat} position={[0, 0.2, 0]} castShadow>
        <cylinderGeometry args={[0.07, 0.07, 0.5, 16]} />
      </mesh>
      <mesh material={mat} position={[0, -0.35, 0]} rotation={[0, 0, Math.PI * 0.62]} castShadow>
        <torusGeometry args={[0.32, 0.075, 16, 40, Math.PI * 1.45]} />
      </mesh>
      <mesh material={mat} position={[0, -0.82, 0]}>
        <boxGeometry args={[0.5, 0.05, 0.5]} />
      </mesh>
      <mesh material={lineMat} position={[0, -0.6, 0]}>
        <cylinderGeometry args={[0.02, 0.02, 0.45, 6]} />
      </mesh>
    </group>
  );
};

// ---------- scan beams ----------
const BEAMS: { sw: Sweep; color: string; wake: string; height: number }[] = [
  { sw: SWEEP_1, color: "#7fe3ff", wake: "#2fb6ff", height: 3.2 },
  { sw: SWEEP_2, color: "#ff5a6a", wake: "#ff2a4a", height: 2.2 },
  ...WEEK_SWEEPS.map((sw) => ({ sw, color: "#7fe3ff", wake: "#2fb6ff", height: 2.4 })),
];
const Beam: React.FC<{ beam: (typeof BEAMS)[number]; s: number }> = ({ beam, s }) => {
  const mats = useMemo(() => ({
    curtain: new THREE.MeshBasicMaterial({ map: fadeTex(), color: beam.color, transparent: true, blending: ADD, depthWrite: false, side: THREE.DoubleSide, toneMapped: false }),
    line: new THREE.MeshBasicMaterial({ color: beam.color, toneMapped: false }),
    wake: new THREE.MeshBasicMaterial({ color: beam.wake, transparent: true, blending: ADD, depthWrite: false, toneMapped: false }),
  }), [beam]);
  const [a, b] = beam.sw.t;
  const on = prog(s, a - 0.25, a) * (1 - prog(s, b, b + 0.3));
  if (on <= 0) return null;
  const x = sweepX(beam.sw, s);
  const back = beam.sw.x[1] > beam.sw.x[0] ? -1 : 1;
  mats.curtain.opacity = 0.75 * on;
  mats.wake.opacity = 0.18 * on;
  return (
    <group>
      <mesh material={mats.curtain} position={[x, beam.height / 2, 0]} rotation={[0, Math.PI / 2, 0]}>
        <planeGeometry args={[16, beam.height]} />
      </mesh>
      <mesh material={mats.line} position={[x, 0.03, 0]}>
        <boxGeometry args={[0.06, 0.03, 16]} />
      </mesh>
      <mesh material={mats.wake} position={[x + back * 1.2, 0.02, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <planeGeometry args={[2.4, 16]} />
      </mesh>
      <pointLight position={[x - back * 0.3, 1.8, 2]} color={beam.color} intensity={on * 26} distance={9} decay={1.6} />
    </group>
  );
};

// ---------- particles ----------
type Burst = { t: number; at: () => V3; color: string; n: number; speed: number; life: number; up: number };
const BURSTS: Burst[] = [];
{
  const blueTop = (id: number, s: number) => () => topPoint(BLOCKS[id], s, 0);
  YANKED.forEach((id, i) => BURSTS.push({ t: CUE.yanks[i], at: blueTop(id, CUE.yanks[i]), color: "#9fb3ff", n: 26, speed: 3.5, life: 0.6, up: 2 }));
  BLOCKS.filter((b) => b.feature === 0).forEach((b) => BURSTS.push({ t: CUE.slack + 0.22, at: () => [b.stages[0][0], 0.1, b.stages[0][1]], color: "#c8d2ff", n: 18, speed: 2.5, life: 0.5, up: 0.6 }));
  PROBLEMS.forEach((p) => {
    BURSTS.push({ t: p.tagAt, at: () => p.anchor, color: C.red, n: 8, speed: 1.6, life: 0.35, up: 1 });
    BURSTS.push({ t: burnAt(p), at: () => [p.anchor[0], p.anchor[1] + 0.8, p.anchor[2]], color: "#ff8a5c", n: 22, speed: 2.6, life: 0.55, up: 1.6 });
  });
  [3, 4].forEach((fx) => {
    BURSTS.push({ t: FIXES[fx].stamp, at: () => STAMP_AT[fx], color: C.green, n: 40, speed: 3, life: 0.6, up: 1.2 });
    for (const f of [0, 1, 2, 3].filter((q) => GATHER_OF_FEATURE[q] === fx)) BURSTS.push({ t: FIXES[fx].land, at: () => [FEATURES[f].district[0], 0.3, FEATURES[f].district[1]], color: FEATURES[f].color, n: 60, speed: 4.5, life: 0.8, up: 2.5 });
  });
  WEEKLY.forEach((w) => {
    const mid = (): V3 => {
      const A = BLOCKS[w.a].stages[FINAL], B = BLOCKS[w.b].stages[FINAL];
      return [(A[0] + B[0]) / 2, 1.6, (A[1] + B[1]) / 2];
    };
    BURSTS.push({ t: w.cutAt, at: mid, color: C.tape, n: 34, speed: 3.2, life: 0.5, up: 1.5 });
  });
}
const MAX_P = 1600;
const Particles: React.FC<{ s: number }> = ({ s }) => {
  const pts = useMemo(() => {
    const g = new THREE.BufferGeometry();
    g.setAttribute("position", new THREE.BufferAttribute(new Float32Array(MAX_P * 3), 3));
    g.setAttribute("color", new THREE.BufferAttribute(new Float32Array(MAX_P * 3), 3));
    const m = new THREE.PointsMaterial({ map: glowTex(), size: 0.22, vertexColors: true, transparent: true, blending: ADD, depthWrite: false, toneMapped: false });
    const p = new THREE.Points(g, m);
    p.frustumCulled = false;
    return p;
  }, []);
  const pos = pts.geometry.attributes.position.array as Float32Array;
  const colr = pts.geometry.attributes.color.array as Float32Array;
  let k = 0;
  const c = new THREE.Color();
  for (const b of BURSTS) {
    const age = s - b.t;
    if (age < 0 || age > b.life) continue;
    const o = b.at();
    c.set(b.color);
    const fade = (1 - age / b.life) ** 1.5;
    for (let i = 0; i < b.n && k < MAX_P; i++, k++) {
      const h = Math.sin(i * 12.9898 + b.t * 78.233) * 43758.5453;
      const r1 = h - Math.floor(h), r2 = (h * 7.13) % 1, r3 = (h * 3.71) % 1;
      const th = r1 * Math.PI * 2, sp = b.speed * (0.4 + Math.abs(r2) * 0.8);
      const vx = Math.cos(th) * sp, vz = Math.sin(th) * sp, vy = b.up * (0.5 + Math.abs(r3)) + 0.5;
      pos[k * 3] = o[0] + vx * age;
      pos[k * 3 + 1] = Math.max(0.03, o[1] + vy * age - 4.9 * age * age);
      pos[k * 3 + 2] = o[2] + vz * age;
      colr[k * 3] = c.r * fade * 2;
      colr[k * 3 + 1] = c.g * fade * 2;
      colr[k * 3 + 2] = c.b * fade * 2;
    }
  }
  for (let i = k; i < MAX_P; i++) pos[i * 3 + 1] = -100;
  pts.geometry.attributes.position.needsUpdate = true;
  pts.geometry.attributes.color.needsUpdate = true;
  return <primitive object={pts} />;
};

// ---------- the canvas ----------
export const World: React.FC<{ s: number }> = ({ s }) => (
  <ThreeCanvas width={W} height={H} shadows={{ type: THREE.VSMShadowMap }} gl={{ antialias: false, alpha: false, preserveDrawingBuffer: true, toneMapping: THREE.NoToneMapping, powerPreference: "high-performance" }} camera={{ fov: 36, near: 0.1, far: 300, position: [0, 20, 20] }}>
    <Scene s={s} />
  </ThreeCanvas>
);

const Scene: React.FC<{ s: number }> = ({ s }) => {
  const { camera, scene, gl } = useThree();
  const env = useMemo(() => new THREE.PMREMGenerator(gl).fromScene(new RoomEnvironment(), 0.04).texture, [gl]);
  const xr = xray(s);
  scene.environment = env;
  scene.environmentIntensity = lerp(0.55, 0.2, xr);
  const { pos, look } = cameraAt(s);
  camera.position.set(pos[0], pos[1], pos[2]);
  camera.lookAt(look[0], look[1], look[2]);
  const cam = camera as THREE.PerspectiveCamera;
  cam.fov = 36 - kick(s) * 0.6;
  cam.updateProjectionMatrix();

  const bg = col(C.bg, "#14040a", xr);
  scene.background = bg;
  const fog = useMemo(() => new THREE.Fog(C.bg, 26, 70), []);
  fog.color.copy(bg);
  scene.fog = fog;

  const floor = useMemo(() => new THREE.MeshStandardMaterial({ map: floorTex(), roughness: 0.5, metalness: 0.35, emissiveMap: floorTex() }), []);
  floor.color.copy(col("#1a2034", "#1d0a10", xr));
  floor.emissive.copy(col("#000000", "#ff2a4a", xr));
  floor.emissiveIntensity = 0.22 * xr;

  const key = lerp(2.4, 0.9, xr);
  return (
    <>
      <hemisphereLight args={["#b8c6ff", "#0b0e19", lerp(0.5, 0.2, xr)]} />
      <directionalLight position={[-6, 14, 9]} intensity={key} color="#fff3e2" castShadow shadow-mapSize={[2048, 2048]} shadow-camera-left={-14} shadow-camera-right={14} shadow-camera-top={14} shadow-camera-bottom={-14} shadow-bias={-0.0006} shadow-radius={6} shadow-blurSamples={16} />
      <directionalLight position={[8, 6, -12]} intensity={lerp(1.6, 0.6, xr)} color={xr > 0 ? col("#7f9cff", "#ff5a6a", xr) : "#7f9cff"} />
      <mesh material={floor} rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
        <planeGeometry args={[120, 120]} />
      </mesh>
      {BLOCKS.map((b) => <Module key={b.id} b={b} s={s} />)}
      {LINKS.map((l) => <Cable key={`${l.id}a`} l={l} s={s} half={0} />)}
      {LINKS.filter((l) => l.kind === "needless").map((l) => <Cable key={`${l.id}b`} l={l} s={s} half={1} />)}
      {LINKS.filter((l) => l.tape).map((l) => <Tape key={l.id} l={l} s={s} until={rippleAt(FIX.tape, tapeOfLink.get(l.id)!.anchor[0])} />)}
      {WEEKLY.map((w, i) => <WeeklyCable key={`w${i}a`} w={w} s={s} half={0} />)}
      {WEEKLY.map((w, i) => <WeeklyCable key={`w${i}b`} w={w} s={s} half={1} />)}
      {WEEKLY.map((w, i) => <Tape key={`wt${i}`} l={LINKS[w.tapeLink]} s={s} from={w.grow[0] + 0.2} until={w.tapeCutAt} />)}
      {FEATURES.map((_, f) => <DistrictPad key={f} f={f} s={s} />)}
      <Tags s={s} />
      {[3, 4].map((fx) => <Stamp key={fx} fx={fx} s={s} />)}
      <Hook s={s} />
      {BEAMS.map((b, i) => <Beam key={i} beam={b} s={s} />)}
      <Particles s={s} />
      <Post s={s} n={xr * 0.6} />
    </>
  );
};
