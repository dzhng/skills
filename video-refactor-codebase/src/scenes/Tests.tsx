// Tests that prove nothing: a wall of green that a real bug falls straight
// through. After the audit each column is one test of a real contract, and
// the same bug gets caught.
import React from "react";
import { CUE } from "../cues.ts";
import { C, MONO } from "../theme.ts";
import { clamp, hit, inCubic, inOutCubic, lerp, outBack, outCubic, prog, rng } from "../anim.ts";
import { Bars, Bug, Check, Cross, hexA } from "./kit.tsx";

const COLS = 4, ROWS = 6, PW = 340, PH = 50, GX = 24, GY = 12, TOP = 262;
const px = (c: number) => 960 - (COLS * PW + (COLS - 1) * GX) / 2 + c * (PW + GX);
const py = (r: number) => TOP + r * (PH + GY);
const NAMES = [
  "calls fetch", "mock returns 200", "renders", "matches snapshot",
  "sets isLoading", "calls setState", "spy called once", "renders twice",
  "mock resolves", "has 3 children", "snapshot (mobile)", "calls onProgress",
  "returns a promise", "mock rejects", "renders spinner", "calls dispatch",
  "matches snapshot 2", "uses the mock", "re-renders", "calls retry",
  "has a button", "mock called", "snapshot (dark)", "calls onDone",
];
// What each column becomes: one test of something a user would notice.
const CONTRACTS = ["resumes after pause", "reaches 100% once", "cancel cleans up", "retries a failed chunk"];
const CAUGHT = 1;
const FINAL = { w: 760, h: 66, gap: 22 };
const fy = (j: number) => TOP + j * (FINAL.h + FINAL.gap) + 20;

// The bug's path: from the code, down through the wall (between columns 1
// and 2), and out the bottom.
const LANE = (px(1) + PW + px(2)) / 2;
const CODE = { x: 660, y: 40, w: 600, h: 150 };

export const Tests: React.FC<{ s: number }> = ({ s }) => {
  const { bug, merge, bug2, caught, fixed } = CUE.tests;
  const broken = s >= bug[0] && s < fixed;
  const bug1y = lerp(CODE.y + 90, 1150, inCubic(prog(s, bug[0] + 0.25, bug[1])));
  const bug2p = prog(s, bug2, caught);
  const bug2y = lerp(CODE.y + 90, fy(CAUGHT) - 10, inCubic(bug2p));
  const caughtNow = s >= caught;
  return (
    <>
      {/* The code under test; one line breaks. */}
      <div style={{ position: "absolute", left: CODE.x, top: CODE.y, width: CODE.w, height: CODE.h, borderRadius: 16, background: "linear-gradient(160deg, #141b3c, #0e1430 70%)", border: `2px solid ${broken ? hexA(C.red, 0.9) : C.cardEdge}`, boxShadow: broken ? `0 0 40px ${hexA(C.red, 0.4)}` : "0 18px 40px rgba(0,0,0,0.45)", overflow: "hidden" }}>
        <div style={{ position: "absolute", left: 18, top: 10, fontFamily: MONO, fontWeight: 500, fontSize: 22, color: C.muted }}>uploadApi.ts</div>
        <div style={{ position: "absolute", left: 18, right: 18, top: 50 }}>
          <Bars seed={77} n={5} width={CODE.w - 36} tint={(i) => (i === 2 && s >= bug[0] ? (s >= fixed ? hexA(C.green, 0.8) : C.red) : undefined)} />
        </div>
      </div>
      {/* The wall. */}
      {Array.from({ length: COLS * ROWS }, (_, i) => {
        const c = i % COLS, row = Math.floor(i / COLS);
        const t = merge[c];
        const m = inOutCubic(prog(s, t + row * 0.02, t + 0.3 + row * 0.02));
        if (m >= 1) return null;
        const x = lerp(px(c), 960 - FINAL.w / 2, m), y = lerp(py(row), fy(c), m);
        // The bug passing this row: every test stays green, and glints.
        const passing = hit(s, lerp(bug[0] + 0.25, bug[1], Math.cbrt(clamp((py(row) - CODE.y - 90) / (1150 - CODE.y - 90)))), 0.18);
        return (
          <div key={i} style={{ position: "absolute", left: x, top: y, width: lerp(PW, FINAL.w, m), height: PH, display: "flex", alignItems: "center", gap: 12, padding: "0 16px", borderRadius: 14, background: hexA(C.green, 0.1 + passing * 0.25), border: `2px solid ${hexA(C.green, 0.35 + passing * 0.6)}`, opacity: 1 - m * 0.8, fontFamily: MONO, fontWeight: 500, fontSize: 22, color: "#cfeedd", whiteSpace: "nowrap", overflow: "hidden", transform: `scale(${1 + passing * 0.04})` }}>
            <Check size={26} />
            {NAMES[i]}
          </div>
        );
      })}
      {/* After: one test per contract. */}
      {CONTRACTS.map((name, j) => {
        const t = merge[j] + 0.3;
        if (s < t - 0.02) return null;
        const p = outBack(prog(s, t, t + 0.25));
        const isCaught = j === CAUGHT && caughtNow && s < fixed;
        const col = isCaught ? C.red : C.green;
        return (
          <div key={name} style={{ position: "absolute", left: 960 - FINAL.w / 2, top: fy(j), width: FINAL.w, height: FINAL.h, display: "flex", alignItems: "center", gap: 18, padding: "0 24px", borderRadius: 18, background: hexA(col, isCaught ? 0.3 : 0.16), border: `3px solid ${col}`, boxShadow: `0 0 ${isCaught ? 60 : 24}px ${hexA(col, 0.5)}`, transform: `scale(${p * (1 + (isCaught ? hit(s, caught, 0.15) * 0.1 : 0) + (j === CAUGHT ? hit(s, fixed, 0.15) * 0.06 : 0))})`, fontFamily: MONO, fontWeight: 700, fontSize: 32, color: "#fff", whiteSpace: "nowrap" }}>
            {isCaught ? <Cross size={38} /> : <Check size={38} />}
            {name}
          </div>
        );
      })}
      {/* The bug: first through the wall, then into the one test that holds. */}
      {s >= bug[0] && s < bug[1] && (
        <div style={{ position: "absolute", left: LANE - 40, top: bug1y - 40, transform: `scale(${outBack(prog(s, bug[0], bug[0] + 0.2))}) rotate(${Math.sin(s * 12) * 8}deg)`, zIndex: 5 }}>
          <Bug size={80} wiggle={s * 30} />
        </div>
      )}
      {s >= bug2 && s < caught + 0.5 && (
        <div style={{ position: "absolute", left: 960 - 40, top: bug2y - 40, transform: `scale(${outBack(prog(s, bug2, bug2 + 0.2)) * (1 - inCubic(prog(s, caught, caught + 0.25)) * 0.6)}) rotate(${caughtNow ? (s - caught) * 400 : Math.sin(s * 12) * 8}deg)`, opacity: 1 - prog(s, caught + 0.1, caught + 0.45), zIndex: 5 }}>
          <Bug size={80} wiggle={s * 30} />
        </div>
      )}
      {caughtNow && s < caught + 0.6 && <Burst s={s} at={caught} x={960} y={fy(CAUGHT)} />}
    </>
  );
};

const Burst: React.FC<{ s: number; at: number; x: number; y: number }> = ({ s, at, x, y }) => {
  const r = rng(9);
  const t = s - at;
  return (
    <>
      {Array.from({ length: 18 }, (_, i) => {
        const a = r() * Math.PI * 2, v = 200 + r() * 420;
        const d = outCubic(clamp(t / 0.5));
        return <div key={i} style={{ position: "absolute", left: x + Math.cos(a) * v * d - 6, top: y + Math.sin(a) * v * d * 0.6 - 6, width: 12, height: 12, borderRadius: 6, background: i % 3 ? C.red : "#fff", opacity: 1 - d }} />;
      })}
    </>
  );
};
