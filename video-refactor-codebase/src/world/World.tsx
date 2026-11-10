// The 3D board: modules wired by tangled cables, scanned, tagged, redesigned
// and rewired one fix at a time. Everything is a pure function of song time `s`.
import React, { useMemo } from "react";
import * as THREE from "three";
import { useThree } from "@react-three/fiber";
import { ThreeCanvas } from "@remotion/three";
import { RoomEnvironment } from "three/examples/jsm/environments/RoomEnvironment.js";
import { RoundedBoxGeometry } from "three/examples/jsm/geometries/RoundedBoxGeometry.js";
import { CUE } from "../cues.ts";
import { C, H, W } from "../theme.ts";
import { blueprint, clamp, dim, inCubic, inOutCubic, kick, lerp, outBack, outCubic, prog, spring, squash } from "../anim.ts";
import { cameraAt } from "./camera.ts";
import { Post } from "./Post.tsx";
import {
  BLOCKS, FEATURES, FIX_ANCHOR, FIX_OF_FEATURE, GREY, LATE, LINKS, PROBLEMS, TUG, arcHeight, blockXZ, districtCell, scanX,
  type Block, type Link, type V3,
} from "./board.ts";
import { fadeTex, fixTex, floorTex, glowTex, inkTex, padTex, plateTex, tagTex, tapeTex } from "./textures.ts";

const ADD = THREE.AdditiveBlending;
const col = (a: string, b: string, t: number) => new THREE.Color(a).lerp(new THREE.Color(b), clamp(t));
const FIXES = CUE.fixes;
const HOOK_Y = 1.15; // hook sits this far above the block top

// ---------- the tug ----------
// Blue modules other than the tug block, in the order the opening yanks them.
const YANKED = BLOCKS.filter((b) => b.feature === 0 && b.id !== TUG)
  .sort((a, b) => Math.hypot(a.stages[0][0] - BLOCKS[TUG].stages[0][0], a.stages[0][1] - BLOCKS[TUG].stages[0][1]) - Math.hypot(b.stages[0][0] - BLOCKS[TUG].stages[0][0], b.stages[0][1] - BLOCKS[TUG].stages[0][1]))
  .map((b) => b.id);
const slackDrop = (s: number) => 1 - inCubic(prog(s, CUE.slack, CUE.slack + 0.22));
const tugLift = (s: number) => 2.3 * outBack(prog(s, CUE.tug, CUE.tug + 0.8), 1.2) * slackDrop(s);
const payLift = (s: number) => 2.1 * spring(s, CUE.tug2, 1.3, 0.55) + (s > CUE.tug2 + 1 ? Math.sin((s - CUE.tug2) * 2.2) * 0.08 : 0);

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
  // Surplus junctions sink through the floor.
  let gone = false;
  if (b.feature === GREY) {
    const f = FIXES[2];
    y -= (b.h + 0.4) * inCubic(prog(s, f.lift, f.land));
    gone = s > f.land;
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
const fixLanded = (fx: number, s: number) => s >= FIXES[fx].land;
type CableState = { ends: [V3, V3]; arc: number; u0: number; u1: number; split: number; color: THREE.Color; glow: number; opacity: number; radius: number };
function cableState(l: Link, s: number): CableState | null {
  const A = BLOCKS[l.a], B = BLOCKS[l.b];
  const f = FIXES[l.fix];
  const feature = A.feature === GREY ? B.feature : A.feature;
  const hue = FEATURES[feature]?.color ?? "#8892b0";
  const made = l.kind === "hidden" && fixLanded(l.fix, s); // a hidden link, now drawn in the open
  // Opening: the tug pulls blue hidden links taut, so for a moment you see them.
  const taut = feature === 0 && s < CUE.slack + 0.4 ? prog(s, CUE.tug + 0.3, CUE.tug + 0.9) * slackDrop(s) : 0;
  const glimpse = l.kind === "hidden" && feature === 0 && s >= CUE.yanks[0] - 0.05 && s < CUE.slack + 0.15;
  const onFloor = l.kind === "hidden" && !made && !glimpse;
  const ends: [V3, V3] = onFloor ? [floorPoint(A, s, l.id), floorPoint(B, s, l.id + 3)] : [topPoint(A, s, l.id), topPoint(B, s, l.id + 3)];
  let arc = onFloor ? 0.02 : arcHeight(l, ends[0], ends[1]);
  // Opening: blue cables snap taut under the tug.
  if (feature === 0 && s < CUE.slack + 0.4) arc *= 1 - 0.85 * prog(s, CUE.tug + 0.3, CUE.tug + 0.9) * slackDrop(s);
  let u0 = 0, u1 = 1, split = 0, glow = 0.35, opacity = 1, radius = 0.045;
  let color = new THREE.Color(hue);
  if (glimpse) {
    color = new THREE.Color("#cfd8ff");
    glow = 3 + 3 * Math.exp(-(s - CUE.yanks[0]) / 0.2);
    radius = 0.03;
    arc = 0.02;
  } else if (l.kind === "hidden" && !made) {
    const p = problemOfLink.get(l.id)!;
    if (s < p.tagAt) return null; // nothing shows it
    color = new THREE.Color(C.red);
    glow = 2.2 + 3 * Math.exp(-(s - p.tagAt) / 0.15);
    radius = 0.035;
  }
  if (made) {
    glow = 0.8 + 2.5 * Math.exp(-(s - f.land) / 0.25);
  }
  if (taut > 0 && !glimpse) glow += taut * 2;
  // A tagged needless link runs hot until it's cut.
  const tagged = problemOfLink.get(l.id);
  if (l.kind === "needless" && tagged && s >= tagged.tagAt) {
    color.lerp(new THREE.Color(C.red), 0.75);
    glow = 1.4 + 3 * Math.exp(-(s - tagged.tagAt) / 0.15) + Math.sin(s * 9 + l.id) * 0.4;
  }
  // Title: cables pulse on the kick.
  if (s >= CUE.drop && s < CUE.clear + 0.5) glow += kick(s) * 1.2;
  if (l.kind === "needless") {
    // Snipped in the middle; both halves reel back to their blocks.
    split = outCubic(prog(s, f.lift - 0.2, f.lift + 0.35));
    if (split >= 1) return null;
  }
  if (l.kind === "surplus") {
    // Reeled into the junction box as it sinks.
    const r = inOutCubic(prog(s, f.lift - 0.3, f.lift + 0.3));
    if (r >= 1) return null;
    if (A.feature === GREY) u1 = 1 - r;
    else u0 = r;
    color = new THREE.Color("#9aa3bd");
    glow = 0.15;
  }
  // Settled cables glow once their feature is one place.
  if (l.kind === "legit" && fixLanded(l.fix, s)) glow = 0.8 + 2.5 * Math.exp(-(s - f.land) / 0.25);
  // Blueprint: everything reads as linework.
  const bp = blueprint(s);
  if (bp > 0) {
    color.lerp(new THREE.Color(C.printLine), bp * 0.6);
    glow = lerp(glow, 1.2, bp);
  }
  return { ends, arc, u0, u1, split, color, glow, opacity, radius };
}

// Curve through the cable: an arc with a sideways bulge, so cables tangle in 3D.
function curvePoint(l: Link | null, st: CableState, u: number, out: THREE.Vector3) {
  const [p, q] = st.ends;
  const dx = q[0] - p[0], dz = q[2] - p[2];
  const d = Math.hypot(dx, dz) || 1;
  const bulge = l ? ((l.id % 2 ? 1 : -1) * st.arc * 0.45) : 0;
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

const Cable: React.FC<{ l: Link; s: number; half?: 0 | 1 }> = ({ l, s, half }) => {
  const mesh = useTube();
  const st = cableState(l, s);
  if (!st || (half === 1 && st.split === 0)) return null;
  // Whole cable, or one reeling half of a snipped one.
  let a = st.u0, b = st.u1;
  if (st.split > 0) {
    const keep = 0.5 * (1 - st.split) - 0.02;
    if (keep <= 0.005) return null;
    [a, b] = half === 1 ? [1 - keep, 1] : [0, keep];
  }
  fillTube(mesh, (u, o) => curvePoint(l, st, a + (b - a) * u, o), st.radius);
  const mat = mesh.material as THREE.MeshStandardMaterial;
  mat.color.copy(new THREE.Color("#1a2033").lerp(st.color, 0.35));
  mat.emissive.copy(st.color);
  mat.emissiveIntensity = st.glow;
  return <primitive object={mesh} />;
};

// The one link the second search finds, between the blue and green districts.
const LateCable: React.FC<{ s: number }> = ({ s }) => {
  const mesh = useTube();
  if (!tagMat.map) tagMat.map = tagTex("hidden");
  if (s < CUE.found || s > CUE.refix + 0.5) return null;
  const A = BLOCKS[LATE.a], B = BLOCKS[LATE.b];
  const st: CableState = { ends: [floorPoint(A, s, 2), floorPoint(B, s, 5)], arc: 0.02, u0: 0, u1: 1, split: 0, color: new THREE.Color(C.red), glow: 2.5 + 4 * Math.exp(-(s - CUE.found) / 0.15), opacity: 1, radius: 0.04 };
  const r = outCubic(prog(s, CUE.refix, CUE.refix + 0.4));
  const keep = 0.5 * (1 - r);
  fillTube(mesh, (u, o) => {
    const uu = u < 0.5 ? u * 2 * keep : 1 - (1 - (u - 0.5) * 2) * keep;
    return curvePoint(null, st, uu, o);
  }, st.radius);
  const mat = mesh.material as THREE.MeshStandardMaterial;
  mat.color.set(C.red);
  mat.emissive.set(C.red);
  mat.emissiveIntensity = st.glow;
  const mid = curvePoint(null, st, 0.5, new THREE.Vector3());
  const pop = spring(s, CUE.found, 3, 0.35) * (1 - inCubic(prog(s, CUE.refix - 0.1, CUE.refix + 0.1)));
  return (
    <>
      <primitive object={mesh} />
      {pop > 0.01 && <sprite position={[mid.x, 0.85, mid.z]} scale={[0.5 * pop, 0.75 * pop, 1]} material={tagMat} />}
    </>
  );
};
const tagMat = new THREE.SpriteMaterial({ fog: false, toneMapped: false });

// ---------- modules ----------
const bodyGeo = new Map<number, THREE.BufferGeometry>();
const plateGeo = new RoundedBoxGeometry(1.2, 0.08, 1.2, 2, 0.03);
const edgeGeo = new Map<number, THREE.EdgesGeometry>();
const BLOCK_W = 1.5;

const Module: React.FC<{ b: Block; s: number }> = ({ b, s }) => {
  const p = pose(b, s);
  const body = useMemo(() => {
    const key = Math.round(b.h * 100);
    if (!bodyGeo.has(key)) {
      bodyGeo.set(key, new RoundedBoxGeometry(BLOCK_W, b.h, BLOCK_W, 4, 0.12));
      edgeGeo.set(key, new THREE.EdgesGeometry(new THREE.BoxGeometry(BLOCK_W, b.h, BLOCK_W)));
    }
    return { geo: bodyGeo.get(key)!, edges: edgeGeo.get(key)! };
  }, [b.h]);
  const mats = useMemo(() => ({
    body: new THREE.MeshPhysicalMaterial({ color: "#232a3f", metalness: 0.55, roughness: 0.32, clearcoat: 0.7, clearcoatRoughness: 0.25 }),
    plate: new THREE.MeshStandardMaterial({ color: b.feature === GREY ? "#5b6275" : FEATURES[b.feature].color, map: plateTex(), roughness: 0.3, metalness: 0.2 }),
    edge: new THREE.LineBasicMaterial({ color: C.printLine, transparent: true }),
  }), [b.feature]);
  if (p.gone) return null;
  const fx = b.feature === GREY ? -1 : FIX_OF_FEATURE[b.feature];
  const settled = fx >= 0 && s >= FIXES[fx].land;
  const flash = fx >= 0 && s >= FIXES[fx].land ? Math.exp(-(s - FIXES[fx].land) / 0.3) : 0;
  const bp = blueprint(s);
  const lifted = b.feature === 0 && s < CUE.slack + 0.4 && (b.id === TUG || YANKED.includes(b.id)) ? prog(s, CUE.tug, CUE.tug + 0.3) * slackDrop(s) : 0;
  const color = b.feature === GREY ? "#5b6275" : FEATURES[b.feature].color;
  mats.plate.emissive.set(b.feature === GREY ? "#000" : color);
  mats.plate.emissiveIntensity = b.feature === GREY ? 0 : (0.35 + (settled ? 0.65 : 0) + flash * 2.5 + lifted * 1.2 + kick(s) * 0.15) * (1 - dim(s) * 0.5);
  mats.body.color.copy(col("#232a3f", "#16337f", bp));
  mats.body.emissive.copy(col("#000", "#0b2a8f", bp));
  mats.edge.opacity = bp;
  // Junctions flare red as they're pulled under.
  if (b.feature === GREY) {
    const f = FIXES[2];
    const tag = PROBLEMS.find((q) => q.block === b.id)!;
    const warn = Math.max(s >= tag.tagAt ? 0.45 + 0.5 * Math.exp(-(s - tag.tagAt) / 0.2) : 0, prog(s, f.lift - 0.4, f.lift)) * (1 - blueprint(s) * 0.5);
    mats.plate.emissive.set(C.red);
    mats.plate.emissiveIntensity = warn * 3;
  }
  return (
    <group position={[p.x, p.y, p.z]} rotation={[p.rx, 0, p.rz]} scale={[p.sx, p.sy, p.sx]}>
      <mesh geometry={body.geo} material={mats.body} position={[0, b.h / 2, 0]} castShadow receiveShadow />
      <mesh geometry={plateGeo} material={mats.plate} position={[0, b.h + 0.02, 0]} castShadow />
      {bp > 0.01 && <lineSegments geometry={body.edges} material={mats.edge} position={[0, b.h / 2, 0]} />}
    </group>
  );
};

// Special-case wraps: hazard tape around a cable, torn off when its fix lands.
const Tape: React.FC<{ l: Link; s: number }> = ({ l, s }) => {
  const mat = useMemo(() => new THREE.MeshStandardMaterial({ map: tapeTex(), roughness: 0.6, emissive: new THREE.Color(C.tape), emissiveMap: tapeTex(), emissiveIntensity: 0.25, transparent: true }), []);
  const st = cableState(l, s);
  const f = FIXES[l.fix];
  const rip = prog(s, f.lift - 0.25, f.lift + 0.35);
  if (!st || rip >= 1) return null;
  const at = curvePoint(l, st, 0.5, new THREE.Vector3());
  const ahead = curvePoint(l, st, 0.52, new THREE.Vector3());
  const dir = ahead.sub(at).normalize();
  const q = new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 1, 0), dir);
  const flyUp = outCubic(rip);
  mat.opacity = 1 - flyUp;
  return (
    <mesh position={[at.x, at.y + flyUp * 2.5, at.z]} quaternion={q} scale={1 + flyUp * 0.5} material={mat} castShadow>
      <cylinderGeometry args={[0.11, 0.11, 0.38, 16, 1, false]} />
    </mesh>
  );
};

// ---------- problem tags ----------
// A red luggage tag per problem: pops on as the scan passes, flies into its
// fix's list during the redesign, and burns up when that fix lands.
const LIST_COLS = 4;
const listSlot = (fx: number, slot: number): V3 => {
  const [x, y, z] = FIX_ANCHOR[fx];
  const n = PROBLEMS.filter((p) => p.fix === fx).length;
  const cols = Math.min(LIST_COLS, n);
  return [x + ((slot % LIST_COLS) - (cols - 1) / 2) * 0.52, y - 0.95 - Math.floor(slot / LIST_COLS) * 0.72, z];
};
const fixLanding = (fx: number): V3 => {
  if (fx === 2) return [0, 0.5, 0];
  if (fx === 3) return [0, 0.5, -3];
  const [x, z] = FEATURES[fx].district;
  return [x, 1.2, z];
};
const flockStart = (p: { fix: number; slot: number }) => CUE.flock[0] + p.fix * 0.12 + p.slot * 0.05;
function tagPos(p: (typeof PROBLEMS)[number], s: number): { pos: V3; scale: number; spin: number } | null {
  if (s < p.tagAt) return null;
  const f = FIXES[p.fix];
  if (s >= f.land) return null;
  const hang: V3 = [p.anchor[0], p.anchor[1] + 0.75, p.anchor[2]];
  const pop = spring(s, p.tagAt, 3, 0.35);
  const swing = Math.sin((s - p.tagAt) * 5 + p.id) * 0.25 * Math.exp(-(s - p.tagAt) / 1.5);
  const t0 = flockStart(p);
  if (s < t0) return { pos: hang, scale: pop, spin: swing };
  const list = listSlot(p.fix, p.slot);
  const fly = inOutCubic(prog(s, t0, t0 + 0.9));
  let pos: V3 = [lerp(hang[0], list[0], fly), lerp(hang[1], list[1], fly) + Math.sin(Math.PI * fly) * 1.5, lerp(hang[2], list[2], fly)];
  let scale = 1 + Math.sin(Math.PI * fly) * 0.3;
  // Dive into the district and burn.
  const dive = inCubic(prog(s, f.lift + 0.02 * p.slot, f.land));
  if (dive > 0) {
    const to = fixLanding(p.fix);
    pos = [lerp(pos[0], to[0], dive), lerp(pos[1], to[1], dive), lerp(pos[2], to[2], dive)];
    scale *= 1 - dive * 0.7;
  }
  return { pos, scale, spin: swing * (1 - fly) + fly * Math.sin(s * 3 + p.id) * 0.05 };
}

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
    const t = tagPos(p, s);
    if (!t) return null;
    if (s < flockStart(p)) {
      arr.set([p.anchor[0], p.anchor[1], p.anchor[2], t.pos[0], t.pos[1] + 0.26 * t.scale, t.pos[2]], p.id * 6);
    }
    return (
      <sprite key={p.id} position={t.pos} scale={[0.42 * t.scale, 0.63 * t.scale, 1]} material={mats[p.kind]} />
    );
  });
  strings.geometry.attributes.position.needsUpdate = true;
  return (
    <>
      {sprites}
      <primitive object={strings} />
    </>
  );
};

// Each fix's header sign: snaps over its list, turns green when reviewed.
const FixSign: React.FC<{ fx: number; s: number }> = ({ fx, s }) => {
  const n = PROBLEMS.filter((p) => p.fix === fx).length;
  const f = FIXES[fx];
  const done = s >= f.stamp;
  const mat = useMemo(() => ({
    open: new THREE.SpriteMaterial({ map: fixTex(n, false), fog: false, toneMapped: false, transparent: true }),
    done: new THREE.SpriteMaterial({ map: fixTex(n, true), fog: false, toneMapped: false, transparent: true }),
  }), [n]);
  const at = CUE.snaps[fx];
  if (s < at) return null;
  const pop = spring(s, at, 2.6, 0.38);
  const dive = inOutCubic(prog(s, f.lift, f.land));
  const to = fixLanding(fx);
  const from = FIX_ANCHOR[fx];
  const out = prog(s, f.commit + 0.3, f.commit + 0.7);
  if (out >= 1) return null;
  const y = lerp(from[1], to[1] + 2.4, dive);
  const m = done ? mat.done : mat.open;
  m.opacity = 1 - out;
  const flip = done ? spring(s, f.stamp, 3, 0.4) : 1;
  return <sprite position={[lerp(from[0], to[0], dive), y + out * 1.2, lerp(from[2], to[2], dive)]} scale={[1.3 * pop * flip, 0.65 * pop, 1]} material={m} />;
};

// ---------- review stamp ----------
const STAMP_AT: V3[] = [
  [FEATURES[0].district[0], 0, FEATURES[0].district[1] + 2.75],
  [FEATURES[1].district[0], 0, FEATURES[1].district[1] + 2.75],
  [0, 0, 6.3],
  [0, 0, -3],
];
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
          <mesh material={mats.rubber} position={[0, 0, 0]} castShadow>
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
  const fx = FIX_OF_FEATURE[f];
  const mat = useMemo(() => new THREE.MeshBasicMaterial({ map: padTex(), color: FEATURES[f].color, transparent: true, blending: ADD, depthWrite: false, toneMapped: false }), [f]);
  const on = prog(s, FIXES[fx].land, FIXES[fx].land + 0.3);
  if (on <= 0) return null;
  const [x, z] = FEATURES[f].district;
  const flash = Math.exp(-(s - FIXES[fx].land) / 0.25);
  const lift = f === 0 && s >= CUE.matchCut ? payLift(s) : 0;
  mat.opacity = on * (0.55 + flash * 0.8 + kick(s) * 0.15);
  return (
    <mesh material={mat} position={[x, 0.02 + lift * 0.02, z]} rotation={[-Math.PI / 2, 0, 0]} scale={[3 * 1.95 + 0.9 + flash * 0.6, 2 * 1.95 + 0.9 + flash * 0.6, 1]}>
      <planeGeometry args={[1, 1]} />
    </mesh>
  );
};

// Redesign: each fix's target drawn on the floor in blueprint, wired by a
// plumb line to the list of problems it removes.
const PLAN_PADS: { fx: number; at: V3; w: number; d: number }[] = [
  { fx: 0, at: [FEATURES[0].district[0], 0, FEATURES[0].district[1]], w: 6.75, d: 4.8 },
  { fx: 1, at: [FEATURES[1].district[0], 0, FEATURES[1].district[1]], w: 6.75, d: 4.8 },
  ...BLOCKS.filter((b) => b.feature === GREY).map((b) => ({ fx: 2, at: [b.stages[0][0], 0, b.stages[0][1]] as V3, w: 2.1, d: 2.1 })),
  { fx: 3, at: [FEATURES[2].district[0], 0, FEATURES[2].district[1]], w: 6.75, d: 4.8 },
  { fx: 3, at: [FEATURES[3].district[0], 0, FEATURES[3].district[1]], w: 6.75, d: 4.8 },
];
const Plan: React.FC<{ s: number }> = ({ s }) => {
  const mats = useMemo(() => PLAN_PADS.map(() => ({
    pad: new THREE.MeshBasicMaterial({ map: padTex(), color: "#bfe0ff", transparent: true, blending: ADD, depthWrite: false, toneMapped: false }),
    beam: new THREE.MeshBasicMaterial({ color: "#bfe0ff", transparent: true, blending: ADD, depthWrite: false, toneMapped: false }),
  })), []);
  const bp = blueprint(s);
  if (bp <= 0) return null;
  return (
    <>
      {PLAN_PADS.map((p, i) => {
        const at = CUE.snaps[p.fx] + 0.1;
        if (s < at) return null;
        const draw = outCubic(prog(s, at, at + 0.45));
        const flash = Math.exp(-(s - at) / 0.2);
        mats[i].pad.opacity = bp * (0.55 + flash);
        const A = new THREE.Vector3(FIX_ANCHOR[p.fx][0], FIX_ANCHOR[p.fx][1] - 0.35, FIX_ANCHOR[p.fx][2]);
        const B = new THREE.Vector3(p.at[0], 0.05, p.at[2]);
        const end = A.clone().lerp(B, draw);
        const dir = B.clone().sub(A).normalize();
        mats[i].beam.opacity = bp * (0.35 + flash);
        return (
          <group key={i}>
            <mesh material={mats[i].pad} position={[p.at[0], 0.04, p.at[2]]} rotation={[-Math.PI / 2, 0, 0]} scale={[p.w * (0.6 + 0.4 * draw), p.d * (0.6 + 0.4 * draw), 1]}>
              <planeGeometry args={[1, 1]} />
            </mesh>
            <mesh material={mats[i].beam} position={[(A.x + end.x) / 2, (A.y + end.y) / 2, (A.z + end.z) / 2]} quaternion={new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 1, 0), dir)}>
              <cylinderGeometry args={[0.025, 0.025, Math.max(0.001, end.distanceTo(A)), 6]} />
            </mesh>
          </group>
        );
      })}
    </>
  );
};

// ---------- the hook: "a change" ----------
const Hook: React.FC<{ s: number }> = ({ s }) => {
  const mat = useMemo(() => new THREE.MeshStandardMaterial({ color: "#d9dde8", metalness: 1, roughness: 0.18 }), []);
  const lineMat = useMemo(() => new THREE.MeshStandardMaterial({ color: "#c7ccd8", metalness: 0.9, roughness: 0.3 }), []);
  const first = s < CUE.slack + 1.2;
  const second = s >= CUE.matchCut && s < CUE.lockup;
  if (!first && !second) return null;
  const b = BLOCKS[TUG];
  const p = pose(b, s);
  const top = p.y + b.h + HOOK_Y;
  const t0 = first ? CUE.tug : CUE.tug2;
  // Lowers onto the block, then rides it; lets go at the slack.
  const descend = 1 - outCubic(prog(s, t0 - 1.2, t0 - 0.05));
  const release = first ? outCubic(prog(s, CUE.slack, CUE.slack + 0.8)) : 0;
  const y = top + descend * 6 + release * 4;
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

// ---------- scan beam ----------
const Scan: React.FC<{ s: number }> = ({ s }) => {
  const mats = useMemo(() => ({
    curtain: new THREE.MeshBasicMaterial({ map: fadeTex(), color: "#7fe3ff", transparent: true, blending: ADD, depthWrite: false, side: THREE.DoubleSide, toneMapped: false }),
    line: new THREE.MeshBasicMaterial({ color: "#c9f6ff", toneMapped: false }),
    wake: new THREE.MeshBasicMaterial({ color: "#2fb6ff", transparent: true, blending: ADD, depthWrite: false, toneMapped: false }),
  }), []);
  const [a, b] = CUE.scan;
  const on = prog(s, a - 0.3, a) * (1 - prog(s, b, b + 0.4));
  if (on <= 0) return null;
  const x = scanX(s);
  mats.curtain.opacity = 0.75 * on;
  mats.wake.opacity = 0.18 * on;
  return (
    <group>
      <mesh material={mats.curtain} position={[x, 1.6, 0]} rotation={[0, Math.PI / 2, 0]}>
        <planeGeometry args={[16, 3.2]} />
      </mesh>
      <mesh material={mats.line} position={[x, 0.03, 0]}>
        <boxGeometry args={[0.06, 0.03, 16]} />
      </mesh>
      <mesh material={mats.wake} position={[x - 1.2, 0.02, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <planeGeometry args={[2.4, 16]} />
      </mesh>
      <pointLight position={[x + 0.3, 1.8, 2]} color="#7fe3ff" intensity={on * 26} distance={9} decay={1.6} />
    </group>
  );
};

// ---------- search drones ----------
const DRONES = [0, 1, 2];
function dronePos(i: number, s: number): V3 {
  const t = s - CUE.sweep[0];
  let x = Math.sin(t * (0.9 + i * 0.25) + i * 2.1) * 6.5;
  let z = Math.cos(t * (0.7 + i * 0.2) + i * 1.3) * 4.2;
  if (i === 0) {
    // The one that finds the late link hovers over it.
    const A = BLOCKS[LATE.a].stages[4], B = BLOCKS[LATE.b].stages[4];
    const mx = (A[0] + B[0]) / 2, mz = (A[1] + B[1]) / 2;
    const hold = inOutCubic(prog(s, CUE.found - 0.6, CUE.found)) * (1 - inOutCubic(prog(s, CUE.refix + 0.4, CUE.refix + 1)));
    x = lerp(x, mx, hold);
    z = lerp(z, mz, hold);
  }
  return [x, 4.6 + Math.sin(t * 2 + i) * 0.15, z];
}
const Drones: React.FC<{ s: number }> = ({ s }) => {
  const mats = useMemo(() => DRONES.map(() => ({
    cone: new THREE.MeshBasicMaterial({ map: fadeTex(), transparent: true, blending: ADD, depthWrite: false, side: THREE.DoubleSide, toneMapped: false }),
    orb: new THREE.MeshStandardMaterial({ color: "#fff", emissive: new THREE.Color("#fff"), emissiveIntensity: 4 }),
    spot: new THREE.MeshBasicMaterial({ map: glowTex(), transparent: true, blending: ADD, depthWrite: false, toneMapped: false }),
  })), []);
  const on = prog(s, CUE.sweep[0] - 0.2, CUE.sweep[0] + 0.3) * (1 - prog(s, CUE.allClear + 0.4, CUE.allClear + 0.9));
  if (on <= 0) return null;
  return (
    <>
      {DRONES.map((i) => {
        const [x, y, z] = dronePos(i, s);
        const enter = outBack(prog(s, CUE.sweep[0] + i * 0.15, CUE.sweep[0] + i * 0.15 + 0.5));
        const red = i === 0 ? prog(s, CUE.found, CUE.found + 0.05) * (1 - prog(s, CUE.refix + 0.3, CUE.refix + 0.5)) : 0;
        const green = prog(s, CUE.allClear, CUE.allClear + 0.1);
        const c = col("#e8f1ff", C.red, red).lerp(new THREE.Color(C.green), green);
        const m = mats[i];
        m.cone.color.copy(c);
        m.cone.opacity = 0.35 * on * enter;
        m.orb.emissive.copy(c);
        m.spot.color.copy(c);
        m.spot.opacity = 0.7 * on * enter;
        return (
          <group key={i}>
            <mesh material={m.orb} position={[x, y + (1 - enter) * 4, z]}>
              <sphereGeometry args={[0.16, 24, 12]} />
            </mesh>
            <mesh material={m.cone} position={[x, y / 2, z]}>
              <cylinderGeometry args={[0.08, 1.6, y, 32, 1, true]} />
            </mesh>
            <mesh material={m.spot} position={[x, 0.04, z]} rotation={[-Math.PI / 2, 0, 0]} scale={3.6}>
              <planeGeometry args={[1, 1]} />
            </mesh>
            <spotLight position={[x, y, z]} target-position={[x, 0, z]} angle={0.42} penumbra={0.6} intensity={on * enter * 40} distance={12} decay={1.4} color={c} />
          </group>
        );
      })}
    </>
  );
};

// ---------- particles ----------
type Burst = { t: number; at: () => V3; color: string; n: number; speed: number; life: number; up: number };
const BURSTS: Burst[] = [];
{
  const blueTop = (id: number, s: number) => () => topPoint(BLOCKS[id], s, 0);
  YANKED.forEach((id, i) => BURSTS.push({ t: CUE.yanks[i], at: blueTop(id, CUE.yanks[i]), color: "#9fb3ff", n: 26, speed: 3.5, life: 0.6, up: 2 }));
  BLOCKS.filter((b) => b.feature === 0).forEach((b) => BURSTS.push({ t: CUE.slack + 0.22, at: () => [b.stages[0][0], 0.1, b.stages[0][1]], color: "#c8d2ff", n: 18, speed: 2.5, life: 0.5, up: 0.6 }));
  PROBLEMS.forEach((p) => BURSTS.push({ t: p.tagAt, at: () => p.anchor, color: C.red, n: 8, speed: 1.6, life: 0.35, up: 1 }));
  FIXES.forEach((f, fx) => {
    BURSTS.push({ t: f.land, at: () => fixLanding(fx), color: "#ff8a5c", n: 70, speed: 4.5, life: 0.8, up: 3 });
    BURSTS.push({ t: f.stamp, at: () => STAMP_AT[fx], color: C.green, n: 40, speed: 3, life: 0.6, up: 1.2 });
  });
  BURSTS.push({ t: CUE.refix, at: () => { const A = BLOCKS[LATE.a].stages[4], B = BLOCKS[LATE.b].stages[4]; return [(A[0] + B[0]) / 2, 0.2, (A[1] + B[1]) / 2]; }, color: C.tape, n: 40, speed: 3.5, life: 0.6, up: 2 });
  BLOCKS.filter((b) => b.feature === 0).forEach((b) => BURSTS.push({ t: CUE.slam, at: () => { const [x, z] = districtCell(0, b.k); return [x, 0.1, z]; }, color: "#9fb3ff", n: 14, speed: 2.5, life: 0.7, up: 0.4 }));
}
const MAX_P = 1400;
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
  const bp = blueprint(s);
  const dk = dim(s);
  scene.environment = env;
  scene.environmentIntensity = lerp(0.55, 0.12, dk);
  const { pos, look } = cameraAt(s);
  camera.position.set(pos[0], pos[1], pos[2]);
  camera.lookAt(look[0], look[1], look[2]);
  const cam = camera as THREE.PerspectiveCamera;
  cam.fov = 36 - kick(s) * 0.6;
  cam.updateProjectionMatrix();

  const bg = col(C.bg, "#0a1f6e", bp).lerp(new THREE.Color("#020308"), dk * 0.7);
  scene.background = bg;
  const fog = useMemo(() => new THREE.Fog(C.bg, 26, 70), []);
  fog.color.copy(bg);
  scene.fog = fog;

  const floor = useMemo(() => new THREE.MeshStandardMaterial({ map: floorTex(), roughness: 0.5, metalness: 0.35, emissiveMap: floorTex() }), []);
  floor.color.copy(col("#1a2034", "#1b47c9", bp));
  floor.emissive.copy(col("#000000", C.printLine, bp));
  floor.emissiveIntensity = 0.35 * bp;

  const key = lerp(2.4, 0.35, dk) * lerp(1, 0.6, bp);
  return (
    <>
      <hemisphereLight args={["#b8c6ff", "#0b0e19", lerp(0.5, 0.08, dk)]} />
      <directionalLight position={[-6, 14, 9]} intensity={key} color="#fff3e2" castShadow shadow-mapSize={[2048, 2048]} shadow-camera-left={-14} shadow-camera-right={14} shadow-camera-top={14} shadow-camera-bottom={-14} shadow-bias={-0.0006} shadow-radius={6} shadow-blurSamples={16} />
      <directionalLight position={[8, 6, -12]} intensity={lerp(1.6, 0.3, dk)} color="#7f9cff" />
      <mesh material={floor} rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
        <planeGeometry args={[120, 120]} />
      </mesh>
      {BLOCKS.map((b) => <Module key={b.id} b={b} s={s} />)}
      {LINKS.map((l) => <Cable key={`${l.id}a`} l={l} s={s} half={0} />)}
      {LINKS.filter((l) => l.kind === "needless").map((l) => <Cable key={`${l.id}b`} l={l} s={s} half={1} />)}
      {LINKS.filter((l) => l.tape).map((l) => <Tape key={l.id} l={l} s={s} />)}
      <LateCable s={s} />
      {FEATURES.map((_, f) => <DistrictPad key={f} f={f} s={s} />)}
      <Plan s={s} />
      <Tags s={s} />
      {[0, 1, 2, 3].map((fx) => <FixSign key={fx} fx={fx} s={s} />)}
      {[0, 1, 2, 3].map((fx) => <Stamp key={fx} fx={fx} s={s} />)}
      <Hook s={s} />
      <Scan s={s} />
      <Drones s={s} />
      <Particles s={s} />
      <Post s={s} n={Math.max(dk, bp * 0.3)} />
    </>
  );
};
