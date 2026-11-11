// Files too big to read: one file grows far past what an agent can read in
// one pass, then splits along the concepts it already holds into files that
// each fit.
import React from "react";
import { CUE } from "../cues.ts";
import { C, MONO, SANS } from "../theme.ts";
import { clamp, hit, inOutCubic, lerp, outBack, outCubic, prog } from "../anim.ts";
import { Bars, Check, hexA } from "./kit.tsx";

const X = 680, W = 560, PIECE = 600, BUDGET = 700;
const NAMES = ["upload.ts", "queue.ts", "progress.ts", "retry.ts"];
const PITCH = 22;

export const GIANT = {
  top: 60,
  full: PIECE * 4,
  height: (s: number) => lerp(300, PIECE * 4, inOutCubic(prog(s, CUE.giant.grow[0], CUE.giant.grow[1]))),
};
// Size of the largest file, in thousands of tokens (illustrative).
export const largestK = (s: number) => (s >= CUE.giant.split + 0.3 ? 7 : Math.round((GIANT.height(s) / GIANT.full) * 31));

const rowX = (k: number) => 960 - (4 * W + 3 * 70) / 2 + k * (W + 70);

export const Giant: React.FC<{ s: number }> = ({ s }) => {
  const { seams, split, checks } = CUE.giant;
  const top = GIANT.top;
  const h = GIANT.height(s);
  const fly = (k: number) => inOutCubic(prog(s, split + k * 0.05, split + 0.45 + k * 0.05));
  const whole = 1 - prog(s, seams[0], seams[0] + 0.1);
  const over = h > BUDGET;
  const row = inOutCubic(prog(s, split, split + 0.5));
  const lineSpan = lerp(1, 2.1, row);
  return (
    <>
      {PIECES.map((k) => {
        const f = fly(k);
        const cut = k === 0 ? 1 : outCubic(prog(s, seams[k - 1], seams[k - 1] + 0.2));
        const gap = cut * 18 * k * (1 - f);
        const vis = clamp(h - k * PIECE, 0, PIECE);
        if (vis <= 0) return null;
        const x = lerp(X, rowX(k), f), y = lerp(top + k * PIECE + gap, top, f);
        const checked = s >= checks[k];
        const hot = !checked && over;
        return (
          <div key={k} style={{ position: "absolute", left: x, top: y, width: W, height: vis, borderRadius: cut > 0.5 || k === 0 ? 18 : 0, background: "linear-gradient(170deg, #141b3c, #0e1430 60%)", border: `2px solid ${checked ? hexA(C.green, 0.9) : hexA(C.periwinkle, 0.25 * clamp(1 - whole + (k === 0 ? 1 : 0)))}`, boxShadow: checked ? `0 0 ${30 + 50 * hit(s, checks[k], 0.3)}px ${hexA(C.green, 0.5)}` : "0 20px 50px rgba(0,0,0,0.5)", overflow: "hidden" }}>
            <div style={{ position: "absolute", left: 24, right: 24, top: 20 - k * PIECE }}>
              <Bars seed={404} n={Math.floor(GIANT.full / PITCH)} width={W - 48} pitch={PITCH} top={60} tint={(i) => (hot && i * PITCH + 60 > BUDGET ? hexA(C.red, 0.45) : undefined)} />
              {f < 0.5 && NAMES.map((n, j) => j > 0 && (
                <div key={n} style={{ position: "absolute", left: 0, top: j * PIECE + 20, fontFamily: MONO, fontWeight: 700, fontSize: 30, color: "#6fcf97", whiteSpace: "nowrap", background: "#111836", paddingRight: 12 }}>{`// ${n.replace(".ts", "")}`}</div>
              ))}
            </div>
            {(k === 0 || f > 0.5) && (
              <div style={{ position: "absolute", left: 0, right: 0, top: 0, height: 62, padding: "14px 24px", background: "#121a3a", borderBottom: `2px solid ${C.cardEdge}`, fontFamily: MONO, fontWeight: 700, fontSize: 30, color: "#fff", whiteSpace: "nowrap", opacity: k === 0 ? 1 : clamp((f - 0.5) * 4) }}>{NAMES[k]}</div>
            )}
            {checked && (
              <div style={{ position: "absolute", right: 18, top: 14, transform: `scale(${outBack(prog(s, checks[k], checks[k] + 0.2))})` }}>
                <Check size={44} />
              </div>
            )}
          </div>
        );
      })}
      {/* One read covers the top of the file; the rest goes unread. */}
      {over && whole > 0 && (
        <>
          <div style={{ position: "absolute", left: X, top: top + BUDGET, width: W, height: h - BUDGET, background: "rgba(4,6,14,0.6)", opacity: whole }} />
          <div style={{ position: "absolute", left: X - 14, top: top - 14, width: W + 28, height: BUDGET + 14, borderRadius: 24, border: `5px solid ${C.amber}`, boxShadow: `0 0 60px ${hexA(C.amber, 0.5)}, inset 0 0 60px ${hexA(C.amber, 0.15)}`, opacity: whole }} />
          <div style={{ position: "absolute", left: 960, top: top + BUDGET + (h - BUDGET) / 2, transform: `translate(-50%, -50%) rotate(-90deg)`, fontFamily: SANS, fontWeight: 900, fontSize: 150, letterSpacing: -4, color: C.red, whiteSpace: "nowrap", opacity: whole * clamp(prog(s, CUE.giant.grow[1] + 0.15, CUE.giant.grow[1] + 0.4)), textShadow: "0 0 40px rgba(4,6,14,0.9)" }}>never read</div>
        </>
      )}
      {/* The outer edge of the one big file, until it's cut. */}
      {whole > 0 && <div style={{ position: "absolute", left: X, top, width: W, height: h, borderRadius: 18, border: `3px solid ${over ? hexA(C.red, 0.85) : hexA(C.periwinkle, 0.4)}`, boxShadow: over ? `0 0 50px ${hexA(C.red, 0.4)}` : undefined, opacity: whole }} />}
      {/* Laser cuts along the seams. */}
      {seams.map((t, j) => {
        const p = outCubic(prog(s, t - 0.1, t + 0.05));
        const fade = 1 - prog(s, t + 0.05, t + 0.4);
        if (p <= 0 || fade <= 0) return null;
        const y = top + (j + 1) * PIECE + 9 * (j + 1);
        return <div key={t} style={{ position: "absolute", left: X - 80, top: y - 4, width: (W + 160) * p, height: 8, borderRadius: 4, background: "#fff", boxShadow: `0 0 30px 8px ${hexA(C.periwinkle, 0.9)}`, opacity: fade }} />;
      })}
      {/* What one read holds. */}
      <div style={{ position: "absolute", left: 960 - (W / 2 + 380) * lineSpan, top: top + BUDGET, width: (W + 760) * lineSpan, borderTop: `4px dashed ${hexA(C.amber, 0.9)}`, opacity: clamp(prog(s, CUE.giant.grow[0] + 0.1, CUE.giant.grow[0] + 0.4)) }}>
      </div>
      {/* Its label: beside the tall file, then centred under the row of pieces. */}
      <div style={{ position: "absolute", left: lerp(X - 30, 960, row), top: top + BUDGET - 12, transform: `translate(${lerp(-100, -50, row)}%, -100%)`, fontFamily: MONO, fontWeight: 700, fontSize: lerp(lerp(34, 64, prog(s, CUE.giant.grow[1], CUE.giant.grow[1] + 0.5)), 40, row), color: C.amber, whiteSpace: "nowrap", opacity: clamp(prog(s, CUE.giant.grow[0] + 0.1, CUE.giant.grow[0] + 0.4)) }}>one read · 8k tokens</div>
    </>
  );
};
const PIECES = [0, 1, 2, 3];
