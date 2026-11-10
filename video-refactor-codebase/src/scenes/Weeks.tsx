// Every week the agents add slop back; each run of refactor-codebase takes it
// out. Plotted as places per change: a sawtooth that stays low, beside the
// line it would follow if nobody ran it.
import React from "react";
import { COMMAND, CUE, RUN_AT, SECTIONS } from "../cues.ts";
import { C, MONO } from "../theme.ts";
import { clamp, hit, outBack, prog } from "../anim.ts";
import { Check, hexA } from "./kit.tsx";

const X0 = 300, X1 = 1640, Y0 = 640, UNIT = 70; // value 0 sits at Y0
const T0 = SECTIONS.weeks[0], T1 = SECTIONS.weeks[1];
const tx = (t: number) => X0 + ((t - T0) / (T1 - T0)) * (X1 - X0);
const vy = (v: number) => Y0 - v * UNIT;

// Places per change at time t: commits step it up, the run drops it to 1.
function value(t: number) {
  const w = Math.floor(t - T0);
  const u = t - T0 - w;
  const step = (k: number) => 1 + (k / 6) * 3.5;
  if (u < RUN_AT) return step(Math.floor((u / RUN_AT) * 6));
  return 1 + (step(5) - 1) * (1 - clamp((u - RUN_AT) / 0.08));
}
const ghost = (t: number) => 1 + 3.5 * ((t - T0) / RUN_AT) * 0.9;

export const Weeks: React.FC<{ s: number }> = ({ s }) => {
  const end = Math.min(s, T1);
  const pts: [number, number][] = [];
  for (let t = T0; t <= end; t += 0.005) pts.push([tx(t), vy(value(t))]);
  const line = pts.map(([x, y], i) => `${i ? "L" : "M"}${x.toFixed(1)} ${y.toFixed(1)}`).join(" ");
  const area = pts.length ? `${line} L${pts.at(-1)![0]} ${Y0} L${X0} ${Y0} Z` : "";
  const gpts: [number, number][] = [];
  for (let t = T0; t <= end && vy(ghost(t)) > 60; t += 0.02) gpts.push([tx(t), vy(ghost(t))]);
  const gline = gpts.map(([x, y], i) => `${i ? "L" : "M"}${x.toFixed(1)} ${y.toFixed(1)}`).join(" ");
  const head = gpts.at(-1);
  const enter = clamp(prog(s, T0 - 0.45, T0 - 0.15));
  return (
    <>
      <svg style={{ position: "absolute", left: 0, top: 0, overflow: "visible" }} width={1920} height={1080}>
        <defs>
          <linearGradient id="slop" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" stopColor={C.red} stopOpacity="0.45" />
            <stop offset="1" stopColor={C.red} stopOpacity="0.02" />
          </linearGradient>
        </defs>
        <g opacity={enter}>
          {[1, 3, 5, 7].map((v) => (
            <line key={v} x1={X0} x2={X1} y1={vy(v)} y2={vy(v)} stroke="rgba(143,176,255,0.1)" strokeWidth={2} />
          ))}
          <line x1={X0} x2={X1} y1={Y0} y2={Y0} stroke="rgba(143,176,255,0.4)" strokeWidth={3} />
          {[0, 1, 2, 3].map((w) => (
            <text key={w} x={tx(T0 + w + 0.5)} y={Y0 + 50} fill={s >= T0 + w ? C.fg : C.muted} fontFamily={MONO} fontWeight={700} fontSize={34} textAnchor="middle">week {w + 1}</text>
          ))}
          <text x={X0} y={vy(7.6)} fill={C.muted} fontFamily={MONO} fontWeight={700} fontSize={34}>places per change</text>
        </g>
        {gline && <path d={gline} fill="none" stroke={hexA(C.red, 0.55)} strokeWidth={4} strokeDasharray="14 12" />}
        {head && (
          <text x={head[0] + 16} y={head[1] + 8} fill={hexA(C.red, 0.9)} fontFamily={MONO} fontWeight={700} fontSize={34} opacity={clamp(prog(s, T0 + 0.3, T0 + 0.6))}>never run</text>
        )}
        {area && <path d={area} fill="url(#slop)" />}
        {line && <path d={line} fill="none" stroke={C.fg} strokeWidth={6} strokeLinejoin="round" />}
      </svg>
      {CUE.weeks.map((w, i) => {
        const t = w + RUN_AT;
        if (s < t) return null;
        const p = outBack(prog(s, t, t + 0.2));
        return (
          <React.Fragment key={w}>
            <div style={{ position: "absolute", left: tx(t) - 26, top: vy(1) - 26, transform: `scale(${p * (1 + hit(s, t, 0.15) * 0.3)})`, filter: `drop-shadow(0 0 ${10 + 30 * hit(s, t, 0.3)}px ${C.green})` }}>
              <Check size={52} />
            </div>
            {i === 0 && (
              <div style={{ position: "absolute", left: tx(t), top: vy(4.5) - 74, transform: `translateX(-50%) scale(${p})`, padding: "8px 18px", borderRadius: 14, background: "rgba(14,20,44,0.95)", border: `2px solid ${C.green}`, fontFamily: MONO, fontWeight: 700, fontSize: 30, color: "#fff", whiteSpace: "nowrap" }}>
                <span style={{ color: C.green }}>❯ </span>{COMMAND}
              </div>
            )}
          </React.Fragment>
        );
      })}
    </>
  );
};
