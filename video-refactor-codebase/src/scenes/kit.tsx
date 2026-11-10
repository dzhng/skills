// Shared parts every scene builds from: file cards, code lines, glyphs, links.
import React, { useId } from "react";
import { C, MONO } from "../theme.ts";
import { clamp, rng } from "../anim.ts";

// Code lines as a minimap: indented rounded bars, deterministic per seed.
export const Bars: React.FC<{ seed: number; n: number; width: number; color?: string; pitch?: number; top?: number; tint?: (i: number) => string | undefined }> = ({ seed, n, width, color = C.bar, pitch = 20, top = 0, tint }) => {
  const r = rng(seed);
  const rows = [];
  let indent = 0;
  for (let i = 0; i < n; i++) {
    indent = Math.max(0, Math.min(3, indent + (r() < 0.3 ? 1 : r() < 0.35 ? -1 : 0)));
    const w = (0.25 + r() * 0.6) * (width - indent * 22);
    rows.push(
      <div key={i} style={{ position: "absolute", left: indent * 22, top: top + i * pitch, width: w, height: pitch * 0.42, borderRadius: pitch, background: tint?.(i) ?? color }} />,
    );
  }
  return <>{rows}</>;
};

export type CardProps = {
  x: number;
  y: number;
  w: number;
  h: number;
  name?: string;
  seed?: number;
  accent?: string; // feature colour, shown as the edge and the fill tint
  lit?: number; // 0..1 how strongly the accent shows
  alarm?: number; // 0..1 red alarm edge
  opacity?: number;
  scale?: number;
  rotate?: number;
  nameSize?: number;
  children?: React.ReactNode;
  style?: React.CSSProperties;
};

// A source file.
export const Card: React.FC<CardProps> = ({ x, y, w, h, name, seed = 1, accent, lit = 0, alarm = 0, opacity = 1, scale = 1, rotate = 0, nameSize = 22, children, style }) => {
  const a = clamp(lit);
  const edge = alarm > 0.01 ? `rgba(255,77,94,${0.3 + 0.7 * alarm})` : accent && a > 0 ? mix(C.cardEdge, accent, a) : C.cardEdge;
  const pad = 18;
  const head = name ? nameSize + 16 : 0;
  const lines = Math.max(0, Math.floor((h - head - pad * 1.4) / 20));
  return (
    <div
      style={{
        position: "absolute",
        left: x,
        top: y,
        width: w,
        height: h,
        borderRadius: 16,
        background: accent && a > 0 ? `linear-gradient(160deg, ${hexA(accent, 0.28 * a)} 0%, ${C.card} 70%)` : `linear-gradient(160deg, #141b3c 0%, ${C.card} 70%)`,
        border: `2px solid ${edge}`,
        boxShadow: `0 18px 40px rgba(0,0,0,0.45)${accent && a > 0 ? `, 0 0 ${40 * a}px ${hexA(accent, 0.55 * a)}` : ""}${alarm > 0.01 ? `, 0 0 ${50 * alarm}px rgba(255,77,94,${0.6 * alarm})` : ""}`,
        opacity,
        transform: `scale(${scale}) rotate(${rotate}deg)`,
        overflow: "hidden",
        ...style,
      }}
    >
      {name && (
        <div style={{ position: "absolute", left: pad, top: 12, fontFamily: MONO, fontWeight: 500, fontSize: nameSize, color: accent && a > 0.3 ? "#fff" : C.muted, whiteSpace: "nowrap" }}>{name}</div>
      )}
      <div style={{ position: "absolute", left: pad, top: head + pad * 0.7, right: pad }}>
        <Bars seed={seed} n={lines} width={w - pad * 2} color={accent && a > 0.3 ? hexA(accent, 0.45) : C.bar} />
      </div>
      {children}
    </div>
  );
};

export const hexA = (hex: string, a: number) => {
  const n = parseInt(hex.slice(1), 16);
  return `rgba(${(n >> 16) & 255},${(n >> 8) & 255},${n & 255},${clamp(a)})`;
};
const mix = (_from: string, to: string, a: number) => hexA(to, 0.25 + 0.75 * a);

// A tick in a circle.
export const Check: React.FC<{ size: number; color?: string; stroke?: string }> = ({ size, color = C.green, stroke = "#04130b" }) => (
  <svg width={size} height={size} viewBox="0 0 40 40" style={{ display: "block", flex: "none" }}>
    <circle cx="20" cy="20" r="19" fill={color} />
    <path d="M11 20.5 L17.5 27 L29.5 14" fill="none" stroke={stroke} strokeWidth="4.5" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);

export const Cross: React.FC<{ size: number; color?: string }> = ({ size, color = C.red }) => (
  <svg width={size} height={size} viewBox="0 0 40 40" style={{ display: "block", flex: "none" }}>
    <circle cx="20" cy="20" r="19" fill={color} />
    <path d="M13 13 L27 27 M27 13 L13 27" stroke="#fff" strokeWidth="4.5" strokeLinecap="round" />
  </svg>
);

// A beetle, drawn: the universal sign for a bug.
export const Bug: React.FC<{ size: number; color?: string; wiggle?: number }> = ({ size, color = C.red, wiggle = 0 }) => (
  <svg width={size} height={size} viewBox="-50 -50 100 100" style={{ display: "block", overflow: "visible" }}>
    <g stroke={color} strokeWidth="6" strokeLinecap="round" fill="none">
      {[-1, 1].map((side) =>
        [-14, 2, 18].map((y, i) => (
          <path key={`${side}${i}`} d={`M${side * 18} ${y} L${side * 36} ${y - 8 + Math.sin(wiggle + i * 2 + side) * 6} L${side * 42} ${y + 4}`} />
        )),
      )}
      <path d="M-8 -30 L-16 -44 M8 -30 L16 -44" />
    </g>
    <ellipse cx="0" cy="4" rx="22" ry="30" fill={color} />
    <circle cx="0" cy="-28" r="12" fill={color} />
    <path d="M0 -24 L0 32" stroke="rgba(0,0,0,0.35)" strokeWidth="3" />
  </svg>
);

// Point along a quadratic curve from a to b that bows by `bend` (perpendicular px).
export function curve(a: [number, number], b: [number, number], bend: number) {
  const mx = (a[0] + b[0]) / 2, my = (a[1] + b[1]) / 2;
  const dx = b[0] - a[0], dy = b[1] - a[1];
  const len = Math.hypot(dx, dy) || 1;
  const c: [number, number] = [mx - (dy / len) * bend, my + (dx / len) * bend];
  return { d: `M${a[0]} ${a[1]} Q${c[0]} ${c[1]} ${b[0]} ${b[1]}`, len: len * 1.15, c };
}

// Stroke drawn on from 0 to `p` of its length.
export const Draw: React.FC<{ d: string; len: number; p: number; color: string; width?: number; dash?: number; glow?: number; flow?: number }> = ({ d, len, p, color, width = 4, dash, glow = 0, flow = 0 }) => {
  const id = "m" + useId().replace(/[^a-zA-Z0-9_-]/g, "");
  if (p <= 0) return null;
  const common = { d, fill: "none", stroke: color, strokeWidth: width, strokeLinecap: "round" as const };
  return (
    <g>
      {glow > 0 && <path {...common} strokeWidth={width + 10} opacity={0.25 * glow} strokeDasharray={`${len * p} ${len}`} style={{ filter: "blur(6px)" }} />}
      {dash ? (
        <>
          <defs>
            <mask id={id}>
              <path {...common} stroke="#fff" strokeWidth={width + 2} strokeDasharray={`${len * p} ${len}`} />
            </mask>
          </defs>
          <path {...common} strokeDasharray={`${dash} ${dash * 0.8}`} strokeDashoffset={-flow} mask={`url(#${id})`} />
        </>
      ) : (
        <path {...common} strokeDasharray={`${len * p} ${len}`} />
      )}
    </g>
  );
};
