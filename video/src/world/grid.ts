// The hex continent: 91 hexes carved into 7 territories (the hero map's seven).
import { random } from "remotion";

export const RINGS = 5;
export const HEX = 1; // circumradius
const SQ3 = Math.sqrt(3);

export type Hex = { x: number; z: number; dist: number; angle: number; land: number; quad: number; rnd: number; half: number; i: number };
export type Land = { cx: number; cz: number; dir: [number, number]; hexes: number[] };

const seeds = [{ x: 0, z: 0 }].concat(
  Array.from({ length: 6 }, (_, k) => {
    const a = ((k * 60 - 90) * Math.PI) / 180;
    return { x: Math.cos(a) * 5.4, z: Math.sin(a) * 5.4 };
  }),
);

export const HEXES: Hex[] = [];
for (let q = -RINGS; q <= RINGS; q++) {
  for (let r = Math.max(-RINGS, -q - RINGS); r <= Math.min(RINGS, -q + RINGS); r++) {
    const x = SQ3 * HEX * (q + r / 2);
    const z = 1.5 * HEX * r;
    let land = 0, best = Infinity;
    seeds.forEach((sd, k) => {
      const d = (sd.x - x) ** 2 + (sd.z - z) ** 2 * 1.05 + (random(`j${q}${r}${k}`) - 0.5) * 3;
      if (d < best) { best = d; land = k; }
    });
    const angle = Math.atan2(z, x);
    const dist = Math.hypot(x, z);
    HEXES.push({ x, z, dist, angle, land, quad: dist < 1 ? 3 : Math.floor(((angle + Math.PI) / (2 * Math.PI)) * 4) % 4, rnd: random(`h${q}${r}`), half: 0, i: HEXES.length });
  }
}

export const LANDS: Land[] = seeds.map((_, k) => {
  const hexes = HEXES.filter((h) => h.land === k).map((h) => h.i);
  const cx = hexes.reduce((a, i) => a + HEXES[i].x, 0) / hexes.length;
  const cz = hexes.reduce((a, i) => a + HEXES[i].z, 0) / hexes.length;
  const len = Math.hypot(cx, cz) || 1;
  return { cx, cz, dir: k === 0 ? [0, 0] : [cx / len, cz / len], hexes };
});

// The re-sliced territory splits in two across its own axis.
export const RESLICE_LAND = 2;
{
  const L = LANDS[RESLICE_LAND];
  for (const i of L.hexes) {
    const h = HEXES[i];
    h.half = (h.x - L.cx) * -L.dir[1] + (h.z - L.cz) * L.dir[0] > 0 ? 1 : -1;
  }
}

// Hexes the skills rain onto: spread out, one per skill.
export const RAIN_TARGETS = [...HEXES].sort((a, b) => a.rnd - b.rnd).filter((h) => h.dist > 1.5).slice(0, 24).map((h) => h.i);

// Factory buildings: a few per territory, on the hexes nearest its center.
export const BUILDINGS = LANDS.flatMap((L, land) =>
  [...L.hexes]
    .sort((a, b) => Math.hypot(HEXES[a].x - L.cx, HEXES[a].z - L.cz) - Math.hypot(HEXES[b].x - L.cx, HEXES[b].z - L.cz))
    .slice(0, land === 0 ? 3 : 5)
    .map((i, k) => ({ hex: i, land, k, h: 0.8 + random(`bh${i}`) * 1.9, w: 0.55 + random(`bw${i}`) * 0.35 })),
);

// Border segments between neighboring hexes of different territories, per land.
// Each segment is the shared edge: midpoint of the two centers, unit length.
export type Seg = { x: number; z: number; angle: number; k: number };
export const BORDERS: Seg[][] = LANDS.map(() => []);
{
  const NEIGHBOR = Math.sqrt(3) * HEX;
  for (const a of HEXES) {
    for (const b of HEXES) {
      if (b.i <= a.i || a.land === b.land) continue;
      const d = Math.hypot(a.x - b.x, a.z - b.z);
      if (Math.abs(d - NEIGHBOR) > 0.01) continue;
      const seg = { x: (a.x + b.x) / 2, z: (a.z + b.z) / 2, angle: Math.atan2(b.z - a.z, b.x - a.x) + Math.PI / 2, k: 0 };
      for (const land of [a.land, b.land]) BORDERS[land].push({ ...seg, k: BORDERS[land].length });
    }
  }
}

// Terrain hidden under the fog, uncovered hex by hex as the sonar passes.
// The last quadrant (the unknown unknowns) hides glowing crystals.
export type Prop = { hex: number; kind: "trees" | "rock" | "ruin" | "crystal"; ox: number; oz: number; rot: number };
const taken = new Set([...BUILDINGS.map((b) => b.hex), ...RAIN_TARGETS]);
export const PROPS: Prop[] = [...HEXES]
  .filter((h) => !taken.has(h.i) && h.dist > 0.5)
  .sort((a, b) => random(`p${a.i}`) - random(`p${b.i}`))
  .slice(0, 36)
  .map((h) => {
    const r = random(`pk${h.i}`);
    const kind = h.quad === 3 ? "crystal" : r < 0.5 ? "trees" : r < 0.8 ? "rock" : "ruin";
    return { hex: h.i, kind, ox: (random(`px${h.i}`) - 0.5) * 0.5, oz: (random(`pz${h.i}`) - 0.5) * 0.5, rot: random(`pr${h.i}`) * Math.PI * 2 };
  });
export const revealAt = (h: Hex, pulses: readonly number[]) => pulses[h.quad] + h.dist / 11 + 0.05;
