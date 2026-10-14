// The 3D world: a hex continent under fog that gets mapped, sliced, built on,
// and verified. Everything is a pure function of song time `s`.
import React, { useMemo } from "react";
import * as THREE from "three";
import { useThree } from "@react-three/fiber";
import { RoomEnvironment } from "three/examples/jsm/environments/RoomEnvironment.js";
import { RoundedBoxGeometry } from "three/examples/jsm/geometries/RoundedBoxGeometry.js";
import { Post } from "./Post.tsx";
import { ThreeCanvas } from "@remotion/three";
import { random } from "remotion";
import { CUE, SKILLS } from "../cues.ts";
import { C, H, SKIES, W, type SkyName } from "../theme.ts";
import { getInputProps } from "remotion";
import { clamp, inCubic, inOutCubic, kick, lerp, night, outBack, outCubic, outExpo, prog, spring } from "../anim.ts";
import { cameraAt } from "./camera.ts";
import { BORDERS, BUILDINGS, HEXES, LANDS, PROPS, RAIN_TARGETS, RESLICE_LAND, revealAt, type Hex } from "./grid.ts";
import { beamTex, docTex, facadeDayTex, facadeTex, glowTex, puffTex, questionTex, ringTex, skillTileTex, phraseTex, stakeTex, stampTex, terrainTex, wordTex } from "./textures.ts";

export const LOCKUP_BG = "#080a12";
// Sky: the hero art's periwinkle gradient by day, navy by night.
let skyCanvas: HTMLCanvasElement | null = null;
let skyTex: THREE.CanvasTexture | null = null;
function skyTexture(n: number, flat: number, sky: SkyName) {
  if (!skyCanvas) {
    skyCanvas = document.createElement("canvas");
    skyCanvas.width = 160;
    skyCanvas.height = 90;
    skyTex = new THREE.CanvasTexture(skyCanvas);
    skyTex.colorSpace = THREE.SRGBColorSpace;
  }
  const g = skyCanvas.getContext("2d")!;
  const day = g.createLinearGradient(0, 0, 160, 90);
  const [a, b, c] = SKIES[sky].stops;
  day.addColorStop(0, a);
  day.addColorStop(0.45, b);
  day.addColorStop(1, c);
  g.globalAlpha = 1;
  g.fillStyle = day;
  g.fillRect(0, 0, 160, 90);
  if (n > 0) {
    const nt = g.createRadialGradient(80, 30, 0, 80, 30, 110);
    nt.addColorStop(0, "#1d2a6e");
    nt.addColorStop(0.7, C.night);
    g.globalAlpha = n;
    g.fillStyle = nt;
    g.fillRect(0, 0, 160, 90);
  }
  if (flat > 0) {
    g.globalAlpha = flat;
    g.fillStyle = LOCKUP_BG;
    g.fillRect(0, 0, 160, 90);
  }
  skyTex!.needsUpdate = true;
  return skyTex!;
}

const col = (a: string, b: string, t: number) => new THREE.Color(a).lerp(new THREE.Color(b), clamp(t));
const ADD = THREE.AdditiveBlending;

// ---------- per-hex state ----------
function ripple(s: number, t0: number, d: number, amp: number, speed: number) {
  if (s < t0) return 0;
  const front = (s - t0) * speed;
  return amp * Math.exp(-((d - front) ** 2) / 1.4) * Math.exp(-(s - t0) / 1.3);
}
const LAND_H = [0.95, 0.55, 0.75, 0.6, 0.8, 0.5, 0.7];

function hexHeight(h: { land: number; rnd: number }, s: number) {
  const start = CUE.rise + h.land * 0.06 + h.rnd * 0.12;
  return 0.35 + h.rnd * 0.05 + spring(s, start, 2.2, 0.35) * (LAND_H[h.land] + h.rnd * 0.25);
}
// Slicing groups existing tiles: on each cut, these territories trace their
// borders, lift, take their color and pull apart from their neighbors.
const GROUPS = [[1, 4], [2, 5], [3, 6], [0]];
const groupAt = (land: number) => CUE.lasers[GROUPS.findIndex((g) => g.includes(land))];
function landGap(land: number, s: number) {
  return outBack(prog(s, groupAt(land) + 0.1, groupAt(land) + 0.4)) * 0.18 + spring(s, CUE.rise, 2, 0.5) * 0.16;
}
function hexOffset(h: Hex, s: number): [number, number] {
  const L = LANDS[h.land];
  const g = landGap(h.land, s);
  let ox = L.dir[0] * g, oz = L.dir[1] * g;
  if (h.land === RESLICE_LAND) {
    const sep = outBack(prog(s, CUE.reslice, CUE.reslice + 0.3)) * 0.4 * h.half;
    ox += -L.dir[1] * sep;
    oz += L.dir[0] * sep;
  }
  return [ox, oz];
}
function hexLift(h: Hex, s: number) {
  let y = ripple(s, CUE.drop, h.dist, 1.4, 13) + ripple(s, CUE.slam, h.dist, 0.9, 15);
  for (const p of CUE.pulses) y += ripple(s, p, h.dist, 0.2, 11);
  const g = groupAt(h.land);
  y += Math.sin(Math.PI * prog(s, g, g + 0.4)) * 0.45;
  const k = RAIN_TARGETS.indexOf(h.i);
  if (k >= 0) {
    const t = s - CUE.rain[k];
    if (t >= 0) y -= 0.35 * Math.exp(-t / 0.12) * Math.cos(t * 28);
  }
  return y;
}
const landTop = (land: number, s: number) => hexHeight({ land, rnd: 0.5 }, s);
const landPos = (land: number, s: number): [number, number] => {
  const L = LANDS[land];
  const g = landGap(land, s);
  return [L.cx + L.dir[0] * g, L.cz + L.dir[1] * g];
};
const passTime = (land: number) => CUE.visits.filter((v) => v.land === land && v.ok).at(-1)!.t;

// ---------- the canvas ----------
export const World: React.FC<{ s: number }> = ({ s }) => (
  <ThreeCanvas width={W} height={H} shadows={{ type: THREE.VSMShadowMap }} gl={{ antialias: false, alpha: false, preserveDrawingBuffer: true, toneMapping: THREE.NoToneMapping, powerPreference: "high-performance" }} camera={{ fov: 38, near: 0.1, far: 300, position: [0, 20, 20] }}>
    <Scene s={s} />
  </ThreeCanvas>
);

const Scene: React.FC<{ s: number }> = ({ s }) => {
  const n = night(s);
  const { camera, scene, gl } = useThree();
  const env = useMemo(() => new THREE.PMREMGenerator(gl).fromScene(new RoomEnvironment(), 0.04).texture, [gl]);
  scene.environment = env;
  scene.environmentIntensity = lerp(0.9, 0.3, n);
  const { pos, look } = cameraAt(s);
  camera.position.set(pos[0], pos[1], pos[2]);
  camera.lookAt(look[0], look[1], look[2]);
  const cam = camera as THREE.PerspectiveCamera;
  cam.fov = 38 - kick(s) * 0.7;
  cam.updateProjectionMatrix();

  const fog = useMemo(() => new THREE.Fog(C.sky, 10, 80), []);
  const sky = ((getInputProps() as { sky?: SkyName }).sky ?? "space") as SkyName;
  scene.background = skyTexture(n, prog(s, CUE.collapse[0] - 0.3, CUE.collapse[0]), sky);
  fog.color.copy(col(SKIES[sky].fog, C.nightFog, n));
  const intro = s < CUE.drop;
  fog.near = intro ? lerp(6, 1, prog(s, 3.0, 4)) : lerp(40, 22, n);
  fog.far = intro ? lerp(46, 9, prog(s, 3.0, 4)) : lerp(120, 80, n);
  scene.fog = fog;

  // Sun: warm by day, moonlight at night, racing through days in the time-lapse.
  const lapse = prog(s, CUE.timelapse[0], CUE.timelapse[1]);
  const az = lapse > 0 && lapse < 1 ? (s - CUE.timelapse[0]) * (4 + lapse * 10) : 0.7;
  const sun: [number, number, number] = [Math.cos(az) * 12, 14, Math.sin(az) * 12];
  const flash = s >= CUE.slam ? Math.exp(-(s - CUE.slam) / 0.25) : 0;

  return (
    <>
      <hemisphereLight args={[col("#f4f7ff", "#3a4a9a", n), col("#8f9bbd", "#0a0f2a", n), lerp(0.7, 0.28, n) + flash * 0.3]} />
      <directionalLight position={[-10, 6, -12]} intensity={lerp(0.9, 0.7, n)} color={col("#c9d6ff", "#6f8cff", n)} />
      <directionalLight position={sun} intensity={lerp(1.9, 0.55, n) + (lapse > 0 && lapse < 1 ? Math.max(0, Math.sin(az)) * 1.2 : 0)} color={col("#fff4e6", "#9fb4ff", n)} castShadow shadow-mapSize={[2048, 2048]} shadow-camera-left={-16} shadow-camera-right={16} shadow-camera-top={16} shadow-camera-bottom={-16} shadow-bias={-0.0006} shadow-radius={6} shadow-blurSamples={16} />
      <Hexes s={s} n={n} />
      <IntroWords s={s} />
      <WallFog s={s} />
      <GroundFog s={s} n={n} />
      <Questions s={s} />
      <Rain s={s} />
      <Sonar s={s} />
      <Terrain s={s} />
      <SurveyTripod s={s} />
      <Cranes s={s} />
      <BorderTraces s={s} />
      <ResliceLaser s={s} />
      <Flags s={s} />
      <Buildings s={s} n={n} />
      <Agent s={s} />
      <Beams s={s} />
      <Stamps s={s} />
      <DocCard s={s} />
      <ShockRing s={s} at={CUE.drop} color="#ffffff" speed={18} />
      <ShockRing s={s} at={CUE.slam} color={C.periwinkle} speed={20} />
      <Stars s={s} />
      <Dust s={s} n={n} />
      <Sparks s={s} />
      <Post s={s} n={n} />
    </>
  );
};

// ---------- hexes ----------
// Bevelled hex prism, unit height centered on the origin, pointy along z.
const HEX_GEO = (() => {
  const shape = new THREE.Shape();
  for (let i = 0; i < 6; i++) {
    const a = ((90 + 60 * i) * Math.PI) / 180;
    const x = Math.cos(a) * 0.9, y = Math.sin(a) * 0.9;
    if (i === 0) shape.moveTo(x, y);
    else shape.lineTo(x, y);
  }
  shape.closePath();
  const bevel = 0.06;
  const geo = new THREE.ExtrudeGeometry(shape, { depth: 1 - 2 * bevel, bevelEnabled: true, bevelSize: bevel, bevelThickness: bevel, bevelSegments: 3 });
  geo.rotateX(-Math.PI / 2);
  geo.translate(0, -0.5 + bevel, 0);
  geo.computeVertexNormals();
  return geo;
})();
const Hexes: React.FC<{ s: number; n: number }> = ({ s, n }) => {
  const mats = useMemo(() => {
    const detail = terrainTex();
    return HEXES.map((h) => {
      const m = new THREE.MeshPhysicalMaterial({ map: detail, bumpMap: detail, bumpScale: 0.6, roughnessMap: detail, roughness: 0.7, clearcoat: 0.35, clearcoatRoughness: 0.35, sheen: 0.3, sheenRoughness: 0.8 });
      // Each tile samples a different patch of the detail texture.
      m.map = detail.clone();
      m.map.repeat.set(0.35, 0.35);
      m.map.offset.set(h.rnd, (h.rnd * 7.3) % 1);
      m.map.needsUpdate = true;
      return m;
    });
  }, []);
  const k = kick(s);
  return (
    <>
      {HEXES.map((h, i) => {
        const height = hexHeight(h, s);
        const lift = hexLift(h, s);
        const [ox, oz] = hexOffset(h, s);
        const L = LANDS[h.land];
        const cp = clamp(spring(s, groupAt(h.land) + 0.05 + Math.hypot(h.x - L.cx, h.z - L.cz) * 0.04, 2.5, 0.5));
        const mapped = outCubic(prog(s, CUE.pulses[h.quad] + h.dist / 11, CUE.pulses[h.quad] + h.dist / 11 + 0.3));
        const base = s < CUE.drop ? "#7f8bb3" : mapped > 0 ? col("#cdd3e8", "#7c87b0", mapped).getStyle() : "#cdd3e8";
        const m = mats[i];
        m.color.copy(col(base, C.lands[h.land], cp));
        const ping = CUE.pulses.reduce((a, p) => a + ripple(s, p, h.dist, 1, 11), 0);
        const visited = CUE.visits.filter((v) => v.land === h.land && s >= v.t).at(-1);
        const visitGlow = visited ? Math.exp(-(s - visited.t) / 0.3) : 0;
        const slamGlow = s >= CUE.slam ? Math.exp(-(s - CUE.slam - h.dist * 0.04) / 0.4) * (s - CUE.slam > h.dist * 0.04 ? 1 : 0) : 0;
        m.emissive.copy(col(C.lands[h.land], visited && !visited.ok && s < CUE.reslice ? C.red : C.lands[h.land], 1));
        const groupGlow = Math.exp(-Math.max(0, s - groupAt(h.land)) / 0.25) * (s >= groupAt(h.land) ? 1 : 0);
        if (cp < 0.5 && ping > 0.02) m.emissive.set(C.blue);
        m.emissiveIntensity = cp * (n * 0.22 + k * 0.08) + visitGlow * 0.9 + slamGlow * 1.2 + groupGlow * 0.8 + (cp < 0.5 ? ping * 0.7 : 0);
        return (
          <mesh key={i} geometry={HEX_GEO} material={m} position={[h.x + ox, height / 2 + lift, h.z + oz]} scale={[1, height, 1]} castShadow receiveShadow />
        );
      })}
    </>
  );
};

// ---------- fog ----------
const WALL = Array.from({ length: 150 }, (_, i) => ({
  x: (random(`wx${i}`) - 0.5) * 30,
  y: random(`wy${i}`) * 4.5,
  z: -8 + random(`wz${i}`) * 34,
  size: 7 + random(`ws${i}`) * 8,
  rnd: random(`wr${i}`),
}));
const WallFog: React.FC<{ s: number }> = ({ s }) => {
  if (s > CUE.drop + 1.4) return null;
  const blast = outExpo(prog(s, CUE.drop, CUE.drop + 1.2));
  const thick = prog(s, 2.8, 3.95);
  return (
    <>
      {WALL.map((p, i) => {
        const d = Math.hypot(p.x, p.z - 6) || 1;
        const push = blast * 30;
        const x = p.x + Math.sin(s * 0.5 + i) * 0.4 + (p.x / d) * push;
        const z = p.z + ((p.z - 6) / d) * push;
        const y = p.y + blast * 6 * p.rnd;
        const o = (0.05 + thick * 0.75) * (1 - blast);
        return (
          <sprite key={i} position={[x, y, z]} scale={[p.size, p.size, 1]}>
            <spriteMaterial map={puffTex()} transparent opacity={o} depthWrite={false} color={i % 3 ? "#454e74" : "#343b5c"} fog={false} />
          </sprite>
        );
      })}
    </>
  );
};

const GROUND = Array.from({ length: 170 }, (_, i) => {
  const r = Math.sqrt(random(`gr${i}`)) * 10.5;
  const a = random(`ga${i}`) * Math.PI * 2;
  const x = Math.cos(a) * r, z = Math.sin(a) * r;
  return { x, z, y: 0.6 + random(`gy${i}`) * 0.6, size: 4.5 + random(`gs${i}`) * 3.5, quad: r < 1 ? 3 : Math.floor(((Math.atan2(z, x) + Math.PI) / (2 * Math.PI)) * 4) % 4, r };
});
const GroundFog: React.FC<{ s: number; n: number }> = ({ s }) => {
  if (s > CUE.pulses[3] + 1.5) return null;
  return (
    <>
      {GROUND.map((p, i) => {
        const clearAt = CUE.pulses[p.quad] + p.r / 11;
        const c = outCubic(prog(s, clearAt, clearAt + 0.6));
        const x = p.x * (1 + c * 0.6), z = p.z * (1 + c * 0.6);
        const o = (s < CUE.drop ? 0.1 + prog(s, 2.8, 4) * 0.3 : 0.5) * (1 - c);
        return (
          <sprite key={i} position={[x + Math.sin(s * 0.6 + i) * 0.2, p.y + c * 2.5, z]} scale={[p.size, p.size, 1]}>
            <spriteMaterial map={puffTex()} transparent opacity={o} depthWrite={false} depthTest={false} color="#3b4468" />
          </sprite>
        );
      })}
    </>
  );
};

// "?" glints: in the fog on the way in, then over each unmapped quadrant.
const Q_INTRO = CUE.glints.map((t, i) => ({ t, x: (random(`qx${i}`) - 0.5) * 8, y: 1.4 + random(`qy${i}`) * 2, z: -5 + random(`qz${i}`) * 8 }));
// One "?" hovers over every hidden feature until the sonar uncovers it.
const Q_MAP = PROPS.map((p, i) => ({ h: HEXES[p.hex], t: CUE.drop + 0.8 + i * 0.03 }));
const Questions: React.FC<{ s: number }> = ({ s }) => (
  <>
    {s < CUE.drop &&
      Q_INTRO.map((q, i) => {
        const p = spring(s, q.t, 3, 0.35);
        const flick = 0.75 + 0.25 * Math.sin(s * 23 + i);
        return p > 0 ? (
          <sprite key={`i${i}`} position={[q.x, q.y, q.z]} scale={[0.9 * p, 0.9 * p, 1]}>
            <spriteMaterial map={questionTex()} transparent opacity={flick * clamp(p)} depthWrite={false} fog={false} />
          </sprite>
        ) : null;
      })}
    {s >= CUE.drop &&
      s < CUE.slice &&
      Q_MAP.map((q, i) => {
        const at = revealAt(q.h, CUE.pulses);
        const pin = spring(s, q.t, 3, 0.35);
        const flip = prog(s, at - 0.05, at + 0.15);
        if (flip >= 1) return null;
        // The mark spins edge-on and pops as its answer surfaces below.
        const sx = 1.1 * pin * Math.cos(flip * Math.PI * 0.5) * (1 + flip);
        const sy = 1.1 * pin * (1 + flip * 0.6);
        return (
          <sprite key={`m${i}`} position={[q.h.x, 2.0 + Math.sin(s * 2 + i) * 0.12 + flip * 0.6, q.h.z]} scale={[sx, sy, 1]}>
            <spriteMaterial map={questionTex()} transparent opacity={clamp(pin) * (1 - flip)} depthWrite={false} />
          </sprite>
        );
      })}
  </>
);

// ---------- skills rain ----------
const Rain: React.FC<{ s: number }> = ({ s }) => {
  if (s < CUE.rain[0] - 0.7 || s > CUE.color + 0.3) return null;
  return (
    <>
      {SKILLS.map((name, k) => {
        const h = HEXES[RAIN_TARGETS[k]];
        const land = CUE.rain[k];
        const t0 = land - 0.38;
        const top = hexHeight(h, s) + 0.5;
        const p = prog(s, t0, land);
        const after = s - land;
        const drift = (random(`rd${k}`) - 0.5) * 3 * (1 - p);
        const shrink = after > 0 ? 1 - outCubic(after / 0.22) : 1;
        const flash = after >= 0 && after < 0.45;
        const marker = after > 0.1 && s < CUE.slice;
        return (
          <group key={name}>
            {s >= t0 && shrink > 0.01 && (
              <sprite position={[h.x + drift, lerp(11, top, inCubic(p)), h.z]} scale={[5 * shrink, 0.78 * shrink, 1]}>
                <spriteMaterial map={skillTileTex(name)} transparent depthWrite={false} opacity={clamp(p * 4)} />
              </sprite>
            )}
            {flash && (
              <mesh position={[h.x, top - 0.4, h.z]} rotation={[-Math.PI / 2, 0, 0]} scale={[0.6 + after * 7, 0.6 + after * 7, 1]}>
                <planeGeometry args={[1, 1]} />
                <meshBasicMaterial map={ringTex()} transparent opacity={1 - after / 0.45} color={C.blue} blending={ADD} depthWrite={false} />
              </mesh>
            )}
            {marker && (
              <sprite position={[h.x, top - 0.1 + hexLift(h, s), h.z]} scale={[0.55, 0.55, 1]}>
                <spriteMaterial map={glowTex()} transparent color={C.blue} blending={ADD} depthWrite={false} opacity={0.9 * (0.7 + 0.3 * kick(s))} />
              </sprite>
            )}
          </group>
        );
      })}
    </>
  );
};

// ---------- mapping ----------
const Sonar: React.FC<{ s: number }> = ({ s }) => (
  <>
    {CUE.pulses.map((p, i) => {
      const t = s - p;
      if (t < 0 || t > 1.3) return null;
      const r = t * 11 + 0.5;
      return (
        <mesh key={i} position={[0, 0.95, 0]} rotation={[-Math.PI / 2, 0, 0]} scale={[r * 2.4, r * 2.4, 1]}>
          <planeGeometry args={[1, 1]} />
          <meshBasicMaterial map={ringTex()} transparent opacity={(1 - t / 1.3) * 0.95} color={new THREE.Color(C.blue).multiplyScalar(1.6)} blending={ADD} depthWrite={false} />
        </mesh>
      );
    })}
  </>
);

const ResliceLaser: React.FC<{ s: number }> = ({ s }) => {
  const t = CUE.reslice;
  const p = inOutCubic(prog(s, t - 0.15, t + 0.05));
  const fade = 1 - prog(s, t + 0.05, t + 0.5);
  if (s < t - 0.15 || fade <= 0) return null;
  const L = LANDS[RESLICE_LAND];
  const [x, z] = landPos(RESLICE_LAND, s);
  const a = Math.atan2(L.dir[1], L.dir[0]);
  const len = 7 * p;
  return (
    <group position={[x, landTop(RESLICE_LAND, s) + 0.15, z]} rotation={[0, -a, 0]}>
      <mesh position={[-3.5 + len / 2, 0, 0]}>
        <boxGeometry args={[Math.max(0.01, len), 0.07, 0.07]} />
        <meshBasicMaterial color={new THREE.Color(5, 5, 5)} transparent opacity={fade} />
      </mesh>
      <mesh position={[-3.5 + len / 2, 0, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <planeGeometry args={[Math.max(0.01, len), 0.8]} />
        <meshBasicMaterial color="#b9a8ff" transparent opacity={fade * 0.7} blending={ADD} depthWrite={false} />
      </mesh>
    </group>
  );
};

const Flags: React.FC<{ s: number }> = ({ s }) => (
  <>
    {LANDS.map((_, land) => {
      const p = spring(s, CUE.flags[land], 3, 0.33);
      if (p <= 0) return null;
      const [x, z] = landPos(land, s);
      const y = landTop(land, s) + hexLiftAt(x, z, s);
      const wave = Math.sin(s * 7 + land) * 0.25;
      return (
        <group key={land} position={[x + 0.55, y, z + 0.3]} scale={[p, p, p]}>
          <mesh position={[0, 0.75, 0]} castShadow>
            <cylinderGeometry args={[0.035, 0.035, 1.5, 8]} />
            <meshStandardMaterial color="#ffffff" map={stakeTex()} />
          </mesh>
          <mesh position={[0.32, 1.3, 0]} rotation={[0, wave, 0]} castShadow>
            <planeGeometry args={[0.64, 0.4]} />
            <meshStandardMaterial color="#ff7a1a" side={THREE.DoubleSide} emissive="#ff7a1a" emissiveIntensity={0.35} />
          </mesh>
        </group>
      );
    })}
  </>
);
const hexLiftAt = (x: number, z: number, s: number) => {
  const d = Math.hypot(x, z);
  return ripple(s, CUE.slam, d, 0.9, 15);
};

// ---------- building ----------
const BOX = new RoundedBoxGeometry(1, 1, 1, 3, 0.07);
// Scaffolding cage: box edges plus mid-level bands, drawn as lines.
const SCAFFOLD_GEO = new THREE.EdgesGeometry(new THREE.BoxGeometry(1, 1, 1, 1, 4, 1));
const SCAFFOLD = new THREE.LineBasicMaterial({ color: "#f5b82e", transparent: true, opacity: 0.85 });
const Buildings: React.FC<{ s: number; n: number }> = ({ s, n }) => {
  const mat = useMemo(() => new THREE.MeshPhysicalMaterial({ color: "#ffffff", map: facadeDayTex(), roughness: 0.28, metalness: 0.15, clearcoat: 0.8, clearcoatRoughness: 0.15, emissive: "#ffffff", emissiveMap: facadeTex() }), []);
  const flash = s >= CUE.slam ? Math.exp(-(s - CUE.slam) / 0.5) : 0;
  mat.color.copy(col("#ffffff", "#28336e", n));
  mat.emissiveIntensity = lerp(0.05, 1.5, n) + flash * 2.5 + kick(s) * 0.25 * n;
  return (
    <>
      {BUILDINGS.map((b, i) => {
        // Construction: foundations go in when the plot passes, floors climb
        // under scaffolding through the unattended run, and the building only
        // tops out at dawn, when the choices are reviewed.
        const start = passTime(b.land) + 0.05 + b.k * 0.07;
        const g = spring(s, start, 2.2, 0.4);
        if (g <= 0.001) return null;
        const floors = lerp(0.25, 0.85, prog(s, start, CUE.dawn) ** 0.8);
        const done = spring(s, CUE.dawn + 0.1 + b.k * 0.05, 2.6, 0.4);
        const built = Math.min(1.05, lerp(floors, 1, clamp(done, 0, 1.05))) * clamp(g, 0, 1.1);
        const h = HEXES[b.hex];
        const [ox, oz] = hexOffset(h, s);
        const top = hexHeight(h, s) + hexLift(h, s);
        const hh = b.h * Math.max(0.001, built);
        const full = b.h * clamp(g);
        const scaffold = 1 - clamp(done * 1.3);
        const w = b.w * 0.9;
        return (
          <group key={i}>
            <mesh geometry={BOX} material={mat} position={[h.x + ox, top + hh / 2, h.z + oz]} scale={[w, hh, w]} castShadow receiveShadow />
            {scaffold > 0.01 && (
              <mesh geometry={SCAFFOLD_GEO} material={SCAFFOLD} position={[h.x + ox, top + full / 2, h.z + oz]} scale={[w * 1.12, full, w * 1.12]} />
            )}
            {scaffold > 0.01 && (
              <mesh position={[h.x + ox, top + hh + 0.02, h.z + oz]} rotation={[-Math.PI / 2, 0, 0]} scale={[w * 0.95, w * 0.95, 1]}>
                <planeGeometry args={[1, 1]} />
                <meshBasicMaterial color={new THREE.Color(3, 2.2, 0.8)} transparent opacity={0.3 * scaffold * (0.6 + 0.4 * Math.sin(s * 9 + i))} toneMapped={false} />
              </mesh>
            )}
          </group>
        );
      })}
    </>
  );
};

// ---------- agent + verification ----------
const START = CUE.night + 0.1;
function agentAt(s: number): [number, number, number] {
  const way = [{ t: START, land: 0 }, ...CUE.visits.map((v) => ({ t: v.t, land: v.land }))];
  if (s >= CUE.timelapse[0]) {
    // Time-lapse: laps around the ring, faster and faster.
    const u = s - CUE.timelapse[0];
    const laps = u * (1.2 + u * 1.6);
    const a = laps * Math.PI * 2 - Math.PI / 2;
    const r = 5.6 + Math.sin(laps * 9) * 0.6;
    return [Math.cos(a) * r, 2.2 + Math.sin(laps * 6) * 0.3, Math.sin(a) * r];
  }
  let i = 0;
  while (i < way.length - 1 && s >= way[i + 1].t) i++;
  const [ax, az] = landPos(way[i].land, s);
  const ay = landTop(way[i].land, s) + 0.8;
  if (i === way.length - 1) return [ax, ay, az];
  const next = way[i + 1];
  const u = inOutCubic(prog(s, next.t - 0.38, next.t));
  const [bx, bz] = landPos(next.land, s);
  const by = landTop(next.land, s) + 0.8;
  return [lerp(ax, bx, u), lerp(ay, by, u) + Math.sin(Math.PI * u) * 1.4 + Math.sin(s * 5) * 0.08, lerp(az, bz, u)];
}
const Agent: React.FC<{ s: number }> = ({ s }) => {
  if (s < START || s > CUE.slam) return null;
  const p = spring(s, START, 3, 0.4);
  const [x, y, z] = agentAt(s);
  const lapse = prog(s, CUE.timelapse[0], CUE.timelapse[1]);
  const trailN = 36;
  const step = lerp(0.03, 0.012, lapse);
  return (
    <>
      <mesh position={[x, y, z]} scale={[p, p, p]}>
        <sphereGeometry args={[0.2, 24, 24]} />
        <meshBasicMaterial color={new THREE.Color(6, 6, 8)} />
      </mesh>
      <sprite position={[x, y, z]} scale={[2.2 * p, 2.2 * p, 1]}>
        <spriteMaterial map={glowTex()} color={C.periwinkle} blending={ADD} transparent depthWrite={false} />
      </sprite>
      <pointLight position={[x, y + 0.4, z]} intensity={10 * p} distance={7} color={C.periwinkle} />
      {Array.from({ length: trailN }, (_, k) => {
        const ts = s - (k + 1) * step;
        if (ts < START) return null;
        const [tx, ty, tz] = agentAt(ts);
        const f = 1 - k / trailN;
        return (
          <sprite key={k} position={[tx, ty, tz]} scale={[0.7 * f, 0.7 * f, 1]}>
            <spriteMaterial map={glowTex()} color={C.periwinkle} blending={ADD} transparent opacity={0.8 * f} depthWrite={false} />
          </sprite>
        );
      })}
    </>
  );
};

const BEAM_GEO = new THREE.CylinderGeometry(0.7, 0.7, 18, 24, 1, true);
const Beams: React.FC<{ s: number }> = ({ s }) => {
  const beams = [
    ...CUE.visits.map((v) => ({ t: v.t, land: v.land, color: v.ok ? "#5fe39a" : C.red, w: 1 })),
    ...LANDS.map((_, land) => ({ t: CUE.slam + land * 0.03, land, color: C.periwinkle, w: 1.5 })),
  ];
  return (
    <>
      {beams.map((b, i) => {
        const t = s - b.t;
        if (t < 0 || t > 0.9) return null;
        const [x, z] = landPos(b.land, s);
        const o = Math.exp(-t / 0.3);
        const w = b.w * (0.4 + t * 1.6);
        return (
          <mesh key={i} geometry={BEAM_GEO} position={[x, landTop(b.land, s) + 9, z]} scale={[w, 1, w]}>
            <meshBasicMaterial map={beamTex()} color={new THREE.Color(b.color).multiplyScalar(3)} transparent opacity={o} blending={ADD} depthWrite={false} side={THREE.DoubleSide} fog={false} />
          </mesh>
        );
      })}
    </>
  );
};

const Stamps: React.FC<{ s: number }> = ({ s }) => (
  <>
    {CUE.visits.map((v, i) => {
      if (s < v.t) return null;
      const superseded = CUE.visits.some((o) => o.land === v.land && o.t > v.t && s >= o.t);
      const outFail = !v.ok ? prog(s, CUE.reslice, CUE.reslice + 0.15) : 0;
      const outAll = prog(s, CUE.slam, CUE.slam + 0.15);
      if (superseded && v.ok) return null;
      const p = spring(s, v.t, 3.2, 0.3) * (1 - outFail) * (1 - outAll) * lerp(1, 0.55, prog(s, v.t + 0.5, v.t + 0.8));
      if (p <= 0.001) return null;
      const [x, z] = landPos(v.land, s);
      const wob = v.ok ? 0 : Math.sin((s - v.t) * 60) * 0.25 * Math.exp(-(s - v.t) / 0.15);
      const y = landTop(v.land, s) + 2.6 + hexLiftAt(x, z, s);
      return (
        <sprite key={i} position={[x + wob, y, z]} scale={[0.075 * p, 0.075 * p, 1]}>
          <spriteMaterial map={stampTex(v.ok)} transparent depthWrite={false} fog={false} sizeAttenuation={false} />
        </sprite>
      );
    })}
  </>
);

const ShockRing: React.FC<{ s: number; at: number; color: string; speed: number }> = ({ s, at, color, speed }) => {
  const t = s - at;
  if (t < 0 || t > 1.4) return null;
  const r = 1 + t * speed;
  return (
    <mesh position={[0, 1.4, 0]} rotation={[-Math.PI / 2, 0, 0]} scale={[r * 2.4, r * 2.4, 1]}>
      <planeGeometry args={[1, 1]} />
      <meshBasicMaterial map={ringTex()} color={new THREE.Color(color).multiplyScalar(2.5)} transparent opacity={(1 - t / 1.4) * 0.9} blending={ADD} depthWrite={false} />
    </mesh>
  );
};

// ---------- words in the world ----------
const INTRO_WORDS = [
  // Two phrases, contrasted: a crisp claim, then a foggy answer.
  { parts: [["The goal is ", "#f4f6ff"], ["clear.", "#8fb0ff"]] as [string, string][], z: 3.5, w: 8.5 },
  { parts: [["The terrain ", "#b4bde0"], ["isn't.", "#96a1cc"]] as [string, string][], z: -0.5, w: 8.5 },
];
const IntroWords: React.FC<{ s: number }> = ({ s }) => {
  if (s >= CUE.drop) return null;
  return (
    <>
      {INTRO_WORDS.map((w, i) => {
        const t = CUE.fogWords[i];
        const p = spring(s, t, 2.2, 0.5);
        if (p <= 0) return null;
        const last = i === INTRO_WORDS.length - 1;
        // Each word stands up to face the lens, holds, then sinks as the next arrives.
        const stand = lerp(0.62, 1, inOutCubic(prog(s, t, t + 0.5)));
        const next = CUE.fogWords[i + 1];
        const leave = next === undefined ? 0 : inCubic(prog(s, next - 0.1, next + 0.25));
        const dissolve = last ? prog(s, 3.2, 3.9) : leave;
        // The foggy phrase arrives out of focus and never fully sharpens.
        const haze = last ? 0.6 * (1 - clamp(p)) + dissolve : 0;
        return (
          <group key={i} position={[0, lerp(-0.5, 0.35, clamp(p)) + (w.w * 0.1875) / 2 - leave * 1.5 + (last ? dissolve * 0.8 : 0), w.z]}>
            <mesh renderOrder={20} rotation={[-Math.PI / 2 + stand * (Math.PI / 2 - 0.2), 0, 0]} scale={[1 + (last ? dissolve * 0.4 : 0), 1 + (last ? dissolve * 0.4 : 0), 1]}>
              <planeGeometry args={[w.w, w.w * 0.1875]} />
              <meshBasicMaterial map={haze > 0.02 ? phraseTex(w.parts, true) : phraseTex(w.parts, false)} color="#ffffff" transparent opacity={clamp(p * 2) * (1 - dissolve) * (last ? 1 - haze * 0.25 : 1)} depthWrite={false} depthTest={false} fog={false} />
            </mesh>
          </group>
        );
      })}
    </>
  );
};

const DocCard: React.FC<{ s: number }> = ({ s }) => {
  const at = CUE.dawn + 1.3;
  if (s < at || s > CUE.collapse[0] + 0.3) return null;
  const p = spring(s, at, 1.6, 0.5);
  const out = inCubic(prog(s, CUE.collapse[0] - 0.2, CUE.collapse[0] + 0.2));
  const { pos } = cameraAt(s);
  const yaw = Math.atan2(pos[0], pos[2]);
  return (
    <group position={[0, lerp(-3, 6.4, clamp(p)) - out * 8, 0]} rotation={[0, yaw + (1 - clamp(p)) * 2.5, 0]}>
      <mesh rotation={[-0.12, 0, 0]} castShadow>
        <planeGeometry args={[4.2, 5.25]} />
        <meshBasicMaterial map={docTex()} transparent side={THREE.DoubleSide} />
      </mesh>
      <sprite position={[0, -3.2, 0]} scale={[7, 3, 1]}>
        <spriteMaterial map={glowTex()} color={C.green} blending={ADD} transparent opacity={0.5 * clamp(p)} depthWrite={false} />
      </sprite>
    </group>
  );
};

// ---------- atmosphere ----------
const MOTES = Array.from({ length: 220 }, (_, i) => ({
  x: (random(`dx${i}`) - 0.5) * 26,
  y: 0.5 + random(`dy${i}`) * 6,
  z: (random(`dz${i}`) - 0.5) * 26,
  r: random(`dr${i}`),
}));
// Dust motes catching the light; brighter and bluer at night.
const Dust: React.FC<{ s: number; n: number }> = ({ s, n }) => {
  if (s > CUE.collapse[0]) return null;
  const tint = new THREE.Color(col("#ffffff", C.periwinkle, n)).multiplyScalar(lerp(1.2, 2.6, n));
  return (
    <>
      {MOTES.map((m, i) => {
        const x = m.x + Math.sin(s * 0.3 + i) * 0.6;
        const y = m.y + ((s * (0.08 + m.r * 0.12)) % 1.5) + Math.sin(s * 0.7 + i * 1.7) * 0.2;
        const z = m.z + Math.cos(s * 0.25 + i) * 0.6;
        const tw = 0.4 + 0.6 * Math.abs(Math.sin(s * (1 + m.r * 2) + i));
        const size = 0.06 + m.r * 0.1;
        return (
          <sprite key={i} position={[x, y, z]} scale={[size, size, 1]}>
            <spriteMaterial map={glowTex()} color={tint} transparent opacity={tw * lerp(0.35, 0.9, n)} blending={ADD} depthWrite={false} />
          </sprite>
        );
      })}
    </>
  );
};

// Sparks burst from each verified territory, and from all of them on the slam.
const BURSTS = [
  ...CUE.visits.map((v) => ({ t: v.t, land: v.land, color: v.ok ? "#7dffb0" : "#ff6b6f", n: 26, power: 1 })),
  ...LANDS.map((_, land) => ({ t: CUE.slam + land * 0.03, land, color: C.periwinkle, n: 30, power: 1.6 })),
];
const Sparks: React.FC<{ s: number }> = ({ s }) => (
  <>
    {BURSTS.flatMap((b, bi) => {
      const t = s - b.t;
      if (t < 0 || t > 1.2) return [];
      const [cx, cz] = landPos(b.land, s);
      const cy = landTop(b.land, s) + 0.4;
      const c = new THREE.Color(b.color).multiplyScalar(4);
      return Array.from({ length: b.n }, (_, i) => {
        const a = random(`sa${bi}${i}`) * Math.PI * 2;
        const up = 3 + random(`su${bi}${i}`) * 5;
        const out = (1 + random(`so${bi}${i}`) * 2.5) * b.power;
        const drag = 1 - Math.exp(-t * 3);
        const x = cx + Math.cos(a) * out * drag;
        const z = cz + Math.sin(a) * out * drag;
        const y = cy + up * t - 7 * t * t;
        const f = 1 - t / 1.2;
        return (
          <sprite key={`${bi}-${i}`} position={[x, Math.max(cy - 0.3, y), z]} scale={[0.14 * f + 0.04, 0.14 * f + 0.04, 1]}>
            <spriteMaterial map={glowTex()} color={c} transparent opacity={f} blending={ADD} depthWrite={false} />
          </sprite>
        );
      });
    })}
  </>
);

// ---------- slicing: borders traced along the tiles themselves ----------
const SEG_GEO = new THREE.BoxGeometry(1, 0.06, 0.06);
const BorderTraces: React.FC<{ s: number }> = ({ s }) => (
  <>
    {LANDS.flatMap((L, land) => {
      const t0 = groupAt(land);
      if (s < t0 - 0.05 || s > t0 + 0.9) return [];
      const fade = 1 - prog(s, t0 + 0.4, t0 + 0.9);
      const c = new THREE.Color(C.lands[land]).lerp(new THREE.Color("#ffffff"), 0.35).multiplyScalar(4);
      const g = landGap(land, s);
      const top = landTop(land, s) + 0.08 + Math.sin(Math.PI * prog(s, t0, t0 + 0.4)) * 0.45;
      return BORDERS[land].map((seg) => {
        const grow = outCubic(prog(s, t0 + seg.k * 0.006, t0 + seg.k * 0.006 + 0.18));
        if (grow <= 0) return null;
        return (
          <mesh key={`${land}-${seg.k}`} geometry={SEG_GEO} position={[seg.x + L.dir[0] * g * 0.5, top, seg.z + L.dir[1] * g * 0.5]} rotation={[0, -seg.angle, 0]} scale={[grow, 1, 1]}>
            <meshBasicMaterial color={c} transparent opacity={fade} toneMapped={false} />
          </mesh>
        );
      });
    })}
  </>
);

// ---------- starfield ----------
const STAR_GEO = (() => {
  const n = 2600;
  const pos = new Float32Array(n * 3);
  const col = new Float32Array(n * 3);
  for (let i = 0; i < n; i++) {
    const u = random(`su${i}`) * 2 - 1, th = random(`st${i}`) * Math.PI * 2;
    const r = 140 + random(`sr${i}`) * 40;
    const k = Math.sqrt(1 - u * u);
    pos.set([Math.cos(th) * k * r, Math.abs(u) * r * 0.9 - 20, Math.sin(th) * k * r], i * 3);
    const warm = random(`sc${i}`);
    const b = 0.5 + random(`sb${i}`) * 0.9;
    col.set([b * (warm > 0.8 ? 1 : 0.8), b * 0.85, b * (warm > 0.8 ? 0.8 : 1.1)], i * 3);
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute("position", new THREE.BufferAttribute(pos, 3));
  g.setAttribute("color", new THREE.BufferAttribute(col, 3));
  return g;
})();
const Stars: React.FC<{ s: number }> = ({ s }) => (
  <points geometry={STAR_GEO} rotation={[0, s * 0.01, 0]}>
    <pointsMaterial size={1.6} sizeAttenuation={false} vertexColors transparent opacity={0.9} depthWrite={false} fog={false} toneMapped={false} />
  </points>
);

// ---------- terrain uncovered by the mapping ----------
const TREE_GEO = new THREE.ConeGeometry(0.2, 0.62, 6);
const TRUNK_GEO = new THREE.CylinderGeometry(0.045, 0.06, 0.2, 5);
const ROCK_GEO = new THREE.DodecahedronGeometry(0.22, 0);
const RUIN_GEO = new THREE.BoxGeometry(0.16, 0.42, 0.16);
const CRYSTAL_GEO = new THREE.OctahedronGeometry(0.2, 0);
const PROP_MATS = {
  leaf: new THREE.MeshPhysicalMaterial({ color: "#3f7d56", flatShading: true, roughness: 0.7, sheen: 0.4 }),
  trunk: new THREE.MeshStandardMaterial({ color: "#6b4f3a", flatShading: true }),
  rock: new THREE.MeshPhysicalMaterial({ color: "#8a8fa3", flatShading: true, roughness: 0.55, clearcoat: 0.3 }),
  ruin: new THREE.MeshPhysicalMaterial({ color: "#c9c3b5", flatShading: true, roughness: 0.8 }),
  crystal: new THREE.MeshPhysicalMaterial({ color: "#9fb4ff", emissive: "#6f8cff", emissiveIntensity: 2.2, roughness: 0.1, metalness: 0.1, transmission: 0.2, flatShading: true }),
};
const Terrain: React.FC<{ s: number }> = ({ s }) => {
  if (s < CUE.pulses[0]) return null;
  return (
    <>
      {PROPS.map((p, i) => {
        const h = HEXES[p.hex];
        const at = revealAt(h, CUE.pulses);
        const g = spring(s, at, 2.6, 0.38);
        if (g <= 0.001) return null;
        const [ox, oz] = hexOffset(h, s);
        const top = hexHeight(h, s) + hexLift(h, s);
        const x = h.x + ox + p.ox, z = h.z + oz + p.oz;
        const burst = s - at;
        return (
          <group key={i}>
            <group position={[x, top, z]} rotation={[0, p.rot, 0]} scale={[g * 1.7, g * 1.7, g * 1.7]}>
              {p.kind === "trees" &&
                [[0, 0, 1], [0.24, 0.12, 0.75], [-0.18, 0.2, 0.85]].map(([tx, tz, k], j) => (
                  <group key={j} position={[tx, 0, tz]} scale={[k, k, k]}>
                    <mesh geometry={TRUNK_GEO} material={PROP_MATS.trunk} position={[0, 0.1, 0]} castShadow />
                    <mesh geometry={TREE_GEO} material={PROP_MATS.leaf} position={[0, 0.5, 0]} castShadow />
                  </group>
                ))}
              {p.kind === "rock" && <mesh geometry={ROCK_GEO} material={PROP_MATS.rock} position={[0, 0.12, 0]} scale={[1.3, 0.8, 1]} castShadow />}
              {p.kind === "ruin" &&
                [[-0.15, 0, 1], [0.15, 0.05, 0.7], [0, -0.18, 0.5]].map(([rx, rz, k], j) => (
                  <mesh key={j} geometry={RUIN_GEO} material={PROP_MATS.ruin} position={[rx, 0.21 * k, rz]} scale={[1, k, 1]} castShadow />
                ))}
              {p.kind === "crystal" &&
                [[0, 0, 1.4], [0.18, 0.1, 0.9], [-0.15, 0.12, 1.1]].map(([cx, cz, k], j) => (
                  <mesh key={j} geometry={CRYSTAL_GEO} material={PROP_MATS.crystal} position={[cx, 0.22 * k, cz]} scale={[0.7, k * 1.4, 0.7]} rotation={[0, j, 0.15 * j]} />
                ))}
            </group>
            {burst >= 0 && burst < 0.6 &&
              Array.from({ length: 8 }, (_, k) => {
                const a = (k / 8) * Math.PI * 2 + i;
                const r = burst * 1.8;
                const f = 1 - burst / 0.6;
                return (
                  <sprite key={k} position={[x + Math.cos(a) * r, top + 0.3 + burst * 1.2, z + Math.sin(a) * r]} scale={[0.16 * f, 0.16 * f, 1]}>
                    <spriteMaterial map={glowTex()} color={new THREE.Color(p.kind === "crystal" ? C.periwinkle : "#ffffff").multiplyScalar(3)} transparent opacity={f} blending={ADD} depthWrite={false} />
                  </sprite>
                );
              })}
          </group>
        );
      })}
    </>
  );
};

// ---------- construction references ----------
const YELLOW = new THREE.MeshPhysicalMaterial({ color: "#f5b82e", roughness: 0.45, metalness: 0.3, clearcoat: 0.5 });
const STEEL = new THREE.MeshStandardMaterial({ color: "#3a4054", roughness: 0.5, metalness: 0.6 });
const BEACON = new THREE.MeshBasicMaterial({ color: new THREE.Color(6, 0.6, 0.5), toneMapped: false });

// A surveyor's total station on a tripod at the heart of the map; it emits the sweeps.
const SurveyTripod: React.FC<{ s: number }> = ({ s }) => {
  if (s < CUE.explore - 0.1 || s > CUE.slice + 0.3) return null;
  const p = spring(s, CUE.explore, 2.4, 0.4);
  const out = inCubic(prog(s, CUE.slice - 0.1, CUE.slice + 0.3));
  const k = clamp(p) * (1 - out);
  const spin = s * 1.6;
  const pulse = CUE.pulses.reduce((a, t) => a + (s >= t ? Math.exp(-(s - t) / 0.15) : 0), 0);
  const top = hexHeight(HEXES[0], s) + 0.02;
  return (
    <group position={[0, top, 0]} scale={[k * 2.8, k * 2.8, k * 2.8]}>
      {[0, 1, 2].map((i) => {
        const a = (i / 3) * Math.PI * 2;
        return (
          <mesh key={i} material={STEEL} position={[Math.cos(a) * 0.18, 0.3, Math.sin(a) * 0.18]} rotation={[Math.sin(a) * 0.35, 0, -Math.cos(a) * 0.35]} castShadow>
            <cylinderGeometry args={[0.02, 0.025, 0.66, 6]} />
          </mesh>
        );
      })}
      <group position={[0, 0.66, 0]} rotation={[0, spin, 0]}>
        <mesh material={YELLOW} castShadow>
          <boxGeometry args={[0.2, 0.16, 0.14]} />
        </mesh>
        <mesh material={STEEL} position={[0.14, 0.03, 0]} rotation={[0, 0, Math.PI / 2]}>
          <cylinderGeometry args={[0.035, 0.045, 0.14, 12]} />
        </mesh>
        <mesh position={[3, 0.03, 0]}>
          <boxGeometry args={[6, 0.012, 0.012]} />
          <meshBasicMaterial color={new THREE.Color(1.5, 2, 6)} transparent opacity={0.35 + pulse * 0.6} toneMapped={false} />
        </mesh>
      </group>
      <sprite position={[0, 0.7, 0]} scale={[0.6 + pulse, 0.6 + pulse, 1]}>
        <spriteMaterial map={glowTex()} color={new THREE.Color(C.blue).multiplyScalar(3)} transparent opacity={0.5 + pulse * 0.5} blending={ADD} depthWrite={false} />
      </sprite>
    </group>
  );
};

// Tower cranes go up on each plot while it's being built, and come down once it passes.
const Cranes: React.FC<{ s: number }> = ({ s }) => (
  <>
    {LANDS.map((L, land) => {
      const first = CUE.visits.find((v) => v.land === land)!.t;
      const pass = passTime(land);
      const up = spring(s, first - 0.45, 2.2, 0.45);
      const down = inCubic(prog(s, CUE.dawn + 0.1 + land * 0.04, CUE.dawn + 0.5 + land * 0.04));
      const k = clamp(up) * (1 - down);
      if (k <= 0.001) return null;
      const [x, z] = landPos(land, s);
      const top = landTop(land, s);
      const outward = Math.atan2(L.dir[1] || 1, L.dir[0] || 0.3);
      const jib = s * (s > CUE.timelapse[0] && s < CUE.dawn ? 2.4 : 0.9) + land;
      const H = 3.2;
      const blink = Math.floor(s * 3 + land) % 2 ? 1 : 0.15;
      return (
        <group key={land} position={[x - Math.cos(outward) * 1.1, top, z - Math.sin(outward) * 1.1]} scale={[1, k, 1]}>
          <mesh material={YELLOW} position={[0, H / 2, 0]} castShadow>
            <boxGeometry args={[0.14, H, 0.14]} />
          </mesh>
          {Array.from({ length: 8 }, (_, i) => (
            <mesh key={i} material={YELLOW} position={[0, 0.2 + i * 0.38, 0]} rotation={[0, 0, i % 2 ? 0.7 : -0.7]}>
              <boxGeometry args={[0.03, 0.2, 0.16]} />
            </mesh>
          ))}
          <group position={[0, H, 0]} rotation={[0, jib, 0]}>
            <mesh material={YELLOW} position={[0.7, 0, 0]} castShadow>
              <boxGeometry args={[2.2, 0.1, 0.1]} />
            </mesh>
            <mesh material={STEEL} position={[-0.55, -0.12, 0]}>
              <boxGeometry args={[0.3, 0.22, 0.22]} />
            </mesh>
            <mesh material={STEEL} position={[1.4, -0.6, 0]}>
              <boxGeometry args={[0.012, 1.1, 0.012]} />
            </mesh>
            <mesh material={YELLOW} position={[1.4, -1.18, 0]}>
              <boxGeometry args={[0.12, 0.08, 0.12]} />
            </mesh>
            <mesh material={BEACON} position={[0, 0.12, 0]} scale={[blink, blink, blink]}>
              <sphereGeometry args={[0.05, 8, 8]} />
            </mesh>
          </group>
        </group>
      );
    })}
  </>
);
