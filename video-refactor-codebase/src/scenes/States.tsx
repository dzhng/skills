// Hidden state machines: one upload's lifecycle kept in four flags in four
// files, each flipped from somewhere else. They jam in a state that can't
// exist, with no way out. Then the flags become one machine where every state
// has an exit.
import React from "react";
import { CUE } from "../cues.ts";
import { C, MONO, SANS } from "../theme.ts";
import { clamp, hit, inOutCubic, lerp, outBack, outCubic, prog } from "../anim.ts";
import { Card, Draw, curve, hexA } from "./kit.tsx";

type Flag = "isUploading" | "isPaused" | "hasError" | "isDone";
const FILES: { name: string; flag: Flag; x: number; y: number; state: string }[] = [
  { name: "UploadButton.tsx", flag: "isUploading", x: 170, y: 110, state: "uploading" },
  { name: "useUpload.ts", flag: "isPaused", x: 1110, y: 90, state: "paused" },
  { name: "uploadStore.ts", flag: "hasError", x: 230, y: 470, state: "failed" },
  { name: "uploadApi.ts", flag: "isDone", x: 1050, y: 450, state: "done" },
];
const CW = 620, CH = 240;
// Each flag sits on its card's outer side, clear of the jammed widget between them.
const togglePos = (k: number): [number, number] => {
  const f = FILES[k];
  return [f.x < 960 ? f.x + 24 : f.x + CW - 334, f.y + 150];
};
// Each flip: which file writes, which flag it sets, and the call it makes.
const FLIPS: { from: number; to: number; value: boolean; call: string }[] = [
  { from: 0, to: 0, value: true, call: "setUploading(true)" },
  { from: 3, to: 1, value: false, call: "setPaused(false)" },
  { from: 1, to: 3, value: false, call: "setDone(false)" },
  { from: 0, to: 1, value: true, call: "setPaused(true)" },
  { from: 3, to: 3, value: true, call: "setDone(true)" },
  { from: 2, to: 2, value: false, call: "setError(false)" },
  { from: 1, to: 0, value: true, call: "setUploading(true)" },
];
const flagValue = (k: number, s: number) => {
  let v = false;
  FLIPS.forEach((f, i) => {
    if (f.to === k && s >= CUE.states.flips[i]) v = f.value;
  });
  return v;
};
const flagFlippedAt = (k: number, s: number) => FLIPS.reduce((a, f, i) => (f.to === k && s >= CUE.states.flips[i] ? CUE.states.flips[i] : a), -1);

// The machine: nodes and the transitions between them.
const NODES: Record<string, [number, number]> = { idle: [330, 400], uploading: [880, 400], paused: [880, 150], failed: [880, 650], done: [1480, 400] };
const EDGES: { a: string; b: string; label: string; side: number }[] = [
  { a: "idle", b: "uploading", label: "start", side: 0 },
  { a: "uploading", b: "paused", label: "pause", side: -1 },
  { a: "paused", b: "uploading", label: "resume", side: -1 },
  { a: "uploading", b: "failed", label: "error", side: -1 },
  { a: "failed", b: "uploading", label: "retry", side: -1 },
  { a: "uploading", b: "done", label: "complete", side: 0 },
  { a: "paused", b: "idle", label: "cancel", side: 0 },
  { a: "failed", b: "idle", label: "give up", side: 0 },
];
const NW = 250, NH = 92;

const Toggle: React.FC<{ on: boolean; at: number; s: number; alarm: number; size?: number }> = ({ on, at, s, alarm, size = 1 }) => {
  const p = on ? outBack(prog(s, at, at + 0.15)) : 1 - outCubic(prog(s, at, at + 0.15));
  const w = 104 * size, h = 56 * size;
  const color = alarm > 0.01 ? C.red : on ? C.green : "#2a3358";
  return (
    <div style={{ width: w, height: h, borderRadius: h, background: color, position: "relative", boxShadow: alarm > 0.01 ? `0 0 ${30 * alarm}px ${C.red}` : on ? `0 0 20px ${hexA(C.green, 0.5)}` : undefined, flex: "none" }}>
      <div style={{ position: "absolute", top: 6 * size, left: 6 * size + clamp(p, -0.2, 1.2) * (w - h), width: h - 12 * size, height: h - 12 * size, borderRadius: h, background: "#fff" }} />
    </div>
  );
};

export const States: React.FC<{ s: number }> = ({ s }) => {
  const { flips, jam, collapse, edges, run } = CUE.states;
  const jammed = s >= jam;
  const morph = inOutCubic(prog(s, collapse, collapse + 0.5));
  const cardsFade = 1 - outCubic(prog(s, collapse - 0.05, collapse + 0.3));
  const jamPulse = jammed && s < collapse ? 0.6 + 0.4 * Math.sin((s - jam) * 18) ** 2 : 0;
  const arcs: React.ReactNode[] = [];
  FLIPS.forEach((f, i) => {
    const t = flips[i];
    if (s < t - 0.15 || s > t + 0.6 || f.from === f.to) return;
    const a = FILES[f.from], b = FILES[f.to];
    const [tx, ty] = togglePos(f.to);
    const c = curve([a.x + CW / 2, a.y + 70], [tx + 155, ty + 32], 120);
    arcs.push(<g key={i} opacity={1 - prog(s, t + 0.3, t + 0.6)}><Draw d={c.d} len={c.len} p={outCubic(prog(s, t - 0.15, t))} color={C.periwinkle} width={4} glow={1} /></g>);
  });
  return (
    <>
      {/* Before: four files, one flag each, written from everywhere. */}
      {cardsFade > 0 &&
        FILES.map((f, k) => {
          const on = flagValue(k, s);
          const writes = FLIPS.map((x, i) => (x.from === k && s >= flips[i] && s < flips[i] + 0.5 ? i : -1)).filter((i) => i >= 0).at(-1);
          const alarm = jammed && on ? jamPulse : 0;
          return (
            <Card key={f.name} x={f.x} y={f.y} w={CW} h={CH} name={f.name} seed={k + 60} opacity={cardsFade} alarm={alarm * 0.8} nameSize={26}>
              {writes !== undefined && (
                <div style={{ position: "absolute", left: 22, top: 62, padding: "6px 14px", borderRadius: 10, background: hexA(C.periwinkle, 0.2), border: `2px solid ${C.periwinkle}`, fontFamily: MONO, fontWeight: 700, fontSize: 26, color: "#fff", transform: `scale(${outBack(prog(s, flips[writes], flips[writes] + 0.15))})`, transformOrigin: "left center", whiteSpace: "nowrap" }}>{FLIPS[writes].call}</div>
              )}
            </Card>
          );
        })}
      <svg style={{ position: "absolute", left: 0, top: 0, overflow: "visible" }} width={1920} height={1080}>{arcs}</svg>
      {/* The flags fly out of their files and become the machine's states. */}
      {FILES.map((f, k) => {
        const on = flagValue(k, s);
        const [nx, ny] = NODES[f.state];
        const [fx, fy] = togglePos(k);
        const x = lerp(fx, nx - NW / 2, morph), y = lerp(fy, ny - NH / 2, morph);
        const alarm = jammed && on && s < collapse ? jamPulse : 0;
        return (
          <div key={f.flag} style={{ position: "absolute", left: x, top: y, width: lerp(310, NW, morph), height: lerp(64, NH, morph), display: "flex", alignItems: "center", justifyContent: morph > 0.5 ? "center" : "space-between", gap: 14, padding: morph > 0.5 ? 0 : "0 0 0 4px", borderRadius: 20, background: hexA("#1b2556", morph), border: morph > 0.02 ? `3px solid ${hexA(C.periwinkle, morph)}` : "none", boxShadow: morph > 0.5 ? `0 12px 40px rgba(0,0,0,0.5), 0 0 ${nodeGlow(f.state, s)}px ${hexA(f.state === "done" ? C.green : C.blue, 0.7)}` : undefined, fontFamily: MONO, fontWeight: 700, fontSize: lerp(28, 34, morph), color: alarm > 0.01 ? "#ffb3bb" : "#fff", whiteSpace: "nowrap", transform: `scale(${1 + hit(s, flagFlippedAt(k, s), 0.12) * 0.08 * (1 - morph)})` }}>
            {morph < 0.5 ? (
              <>
                <span style={{ opacity: 1 - morph * 2 }}>{f.flag}</span>
                <span style={{ opacity: 1 - morph * 2 }}>
                  <Toggle on={on} at={flagFlippedAt(k, s)} s={s} alarm={alarm} />
                </span>
              </>
            ) : (
              <span style={{ opacity: morph * 2 - 1, color: f.state === "done" && s >= run[1] ? C.green : "#fff" }}>{f.state}</span>
            )}
          </div>
        );
      })}
      {/* The jam: the screen the user sees, in three states at once. */}
      {jammed && s < collapse + 0.3 && <Jammed s={s} />}
      {/* After: the machine. */}
      {s >= collapse + 0.15 && <Machine s={s} />}
      {s >= edges[0] - 0.1 && (
        <svg style={{ position: "absolute", left: 0, top: 0, overflow: "visible" }} width={1920} height={1080}>
          {EDGES.map((e, i) => {
            const t = lerp(edges[0], edges[1], i / (EDGES.length - 1));
            const { d, len, mid } = edgePath(e);
            const p = outCubic(prog(s, t - 0.1, t + 0.15));
            const exit = e.label === "cancel" || e.label === "give up" || e.label === "retry" || e.label === "error";
            const col = exit ? C.amber : C.periwinkle;
            return (
              <g key={i}>
                <Draw d={d} len={len} p={p} color={col} width={4} glow={0.6} />
                {p > 0.95 && <Arrow e={e} color={col} />}
                <text x={mid[0]} y={mid[1]} fill={col} fontFamily={MONO} fontWeight={700} fontSize={24} textAnchor="middle" opacity={clamp((p - 0.6) * 3)} style={{ paintOrder: "stroke", stroke: C.bg, strokeWidth: 8 }}>{e.label}</text>
              </g>
            );
          })}
          {s >= run[0] && <Token s={s} />}
        </svg>
      )}
    </>
  );
};

function nodeGlow(state: string, s: number) {
  const { run } = CUE.states;
  const mid = (run[0] + run[1]) / 2;
  if (state === "uploading") return 10 + 50 * hit(s, mid - 0.05, 0.25);
  if (state === "done") return s >= run[1] ? 40 + 60 * hit(s, run[1], 0.3) : 10;
  return 10;
}

// Edge geometry: parallel pairs offset to their side, others bowed a little.
function edgePath(e: { a: string; b: string; side: number; label: string }) {
  const A = NODES[e.a], B = NODES[e.b];
  const dx = B[0] - A[0], dy = B[1] - A[1];
  const len0 = Math.hypot(dx, dy);
  const ux = dx / len0, uy = dy / len0;
  const off = e.side ? 24 : 0; // a pair runs on opposite sides, since their directions oppose
  const px = -uy * off, py = ux * off;
  const ra = Math.abs(ux) > Math.abs(uy) ? NW / 2 + 8 : NH / 2 + 8;
  const a: [number, number] = [A[0] + ux * ra + px, A[1] + uy * ra + py];
  const b: [number, number] = [B[0] - ux * ra + px, B[1] - uy * ra + py];
  const bend = e.label === "cancel" || e.label === "give up" ? 40 : 0;
  const c = curve(a, b, bend);
  const labelOff = e.side ? 36 * Math.sign(off || 1) : -24;
  const mid: [number, number] = [(a[0] + b[0]) / 2 - uy * labelOff + (bend ? c.c[0] - (a[0] + b[0]) / 2 : 0) * 0.5, (a[1] + b[1]) / 2 + ux * labelOff + 8 + (bend ? c.c[1] - (a[1] + b[1]) / 2 : 0) * 0.5];
  return { d: c.d, len: c.len, mid, end: b, c: c.c };
}

const Arrow: React.FC<{ e: (typeof EDGES)[number]; color: string }> = ({ e, color }) => {
  const { end, c } = edgePath(e);
  const ang = Math.atan2(end[1] - c[1], end[0] - c[0]);
  const k = 16;
  const p1 = [end[0] - k * Math.cos(ang - 0.45), end[1] - k * Math.sin(ang - 0.45)];
  const p2 = [end[0] - k * Math.cos(ang + 0.45), end[1] - k * Math.sin(ang + 0.45)];
  return <path d={`M${p1[0]} ${p1[1]} L${end[0]} ${end[1]} L${p2[0]} ${p2[1]}`} fill="none" stroke={color} strokeWidth={4} strokeLinecap="round" strokeLinejoin="round" />;
};

// The idle node is born where the flags meet.
const Machine: React.FC<{ s: number }> = ({ s }) => {
  const t = CUE.states.collapse + 0.25;
  const p = outBack(prog(s, t, t + 0.25));
  const [x, y] = NODES.idle;
  return (
    <div style={{ position: "absolute", left: x - NW / 2, top: y - NH / 2, width: NW, height: NH, borderRadius: 20, background: "#1b2556", border: `3px solid ${C.periwinkle}`, display: "grid", placeItems: "center", fontFamily: MONO, fontWeight: 700, fontSize: 34, color: "#fff", transform: `scale(${p})`, boxShadow: `0 12px 40px rgba(0,0,0,0.5), 0 0 ${10 + 50 * hit(s, CUE.states.run[0], 0.25)}px ${hexA(C.blue, 0.7)}` }}>idle</div>
  );
};

// One upload runs the machine: idle → uploading → done.
const Token: React.FC<{ s: number }> = ({ s }) => {
  const [r0, r1] = CUE.states.run;
  const mid = (r0 + r1) / 2;
  const leg = s < mid ? edgePath(EDGES[0]) : edgePath(EDGES[5]);
  const p = s < mid ? inOutCubic(prog(s, r0, mid)) : inOutCubic(prog(s, mid, r1));
  const A = leg.d.split(/[MQ ]/).filter(Boolean).map(Number);
  const [ax, ay, cx, cy, bx, by] = A;
  const x = (1 - p) ** 2 * ax + 2 * (1 - p) * p * cx + p * p * bx;
  const y = (1 - p) ** 2 * ay + 2 * (1 - p) * p * cy + p * p * by;
  const fade = 1 - prog(s, r1, r1 + 0.2);
  return (
    <g opacity={fade}>
      <circle cx={x} cy={y} r={22} fill={C.green} opacity={0.3} style={{ filter: "blur(6px)" }} />
      <circle cx={x} cy={y} r={12} fill="#fff" />
    </g>
  );
};

// The upload widget in an impossible state: uploading, paused and done.
const Jammed: React.FC<{ s: number }> = ({ s }) => {
  const { jam, collapse } = CUE.states;
  const p = outBack(prog(s, jam, jam + 0.2), 1.4);
  const out = inOutCubic(prog(s, collapse - 0.1, collapse + 0.25));
  const jitter = Math.sin(s * 70) * 4 * (1 - out);
  return (
    <div style={{ position: "absolute", left: 960, top: 330, transform: `translate(-50%, -50%) translate(${jitter}px, 0) scale(${p * (1 - out * 0.4)})`, opacity: clamp(p * 2) * (1 - out), width: 760, padding: "30px 36px", borderRadius: 26, background: "#f4f6ff", boxShadow: `0 30px 80px rgba(0,0,0,0.6), 0 0 ${60 + 40 * hit(s, jam, 0.3)}px rgba(255,77,94,0.75)`, border: `4px solid ${C.red}`, fontFamily: SANS, color: "#0b1022", zIndex: 4 }}>
      <div style={{ display: "flex", alignItems: "center", gap: 18, fontWeight: 800, fontSize: 40 }}>
        <svg width={44} height={44} viewBox="0 0 44 44" style={{ transform: `rotate(${s * 720}deg)` }}>
          <circle cx="22" cy="22" r="17" fill="none" stroke="#d5dbf5" strokeWidth="6" />
          <path d="M22 5 A17 17 0 0 1 39 22" fill="none" stroke={C.blue} strokeWidth="6" strokeLinecap="round" />
        </svg>
        Uploading… 100%
      </div>
      <div style={{ marginTop: 20, height: 18, borderRadius: 9, background: C.blue }} />
      <div style={{ marginTop: 22, display: "flex", gap: 14 }}>
        {[["Paused", C.amber], ["Done", C.green]].map(([label, col], i) => (
          <div key={label} style={{ padding: "8px 20px", borderRadius: 30, background: col, fontWeight: 800, fontSize: 30, color: "#0b1022", transform: `scale(${outBack(prog(s, jam + 0.15 + i * 0.12, jam + 0.35 + i * 0.12))})` }}>{label}</div>
        ))}
      </div>
    </div>
  );
};
