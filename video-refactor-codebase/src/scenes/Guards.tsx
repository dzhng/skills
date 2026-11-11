// Guards nothing needs: one line of real work, wrapped ring after ring in
// protection against cases that never happen. Then the rings peel off.
import React from "react";
import { CUE } from "../cues.ts";
import { C, MONO } from "../theme.ts";
import { clamp, hit, inCubic, outBack, prog } from "../anim.ts";
import { hexA } from "./kit.tsx";

// Inside out; `lines` is what each ring adds to the function.
export const RINGS = [
  { code: "if (!upload) return 0", lines: 3 },
  { code: "try { … } catch { return 0 }", lines: 5 },
  { code: "retry(3, () => …)", lines: 6 },
  { code: "await sleep(100)", lines: 2 },
  { code: "?? lastKnownProgress", lines: 4 },
  { code: "if (flags.legacyProgress) …", lines: 7 },
];
export const guardLines = (s: number) => 1 + RINGS.reduce((a, r, i) => a + (s >= CUE.guards.wrap[i] && s < CUE.guards.peel[RINGS.length - 1 - i] ? r.lines : 0), 0);

const CX = 960, CY = 470;
const CORE = { w: 600, h: 120 };
const STEP = { x: 78, y: 50 };

export const Guards: React.FC<{ s: number }> = ({ s }) => {
  const { wrap, peel } = CUE.guards;
  const done = s >= peel[5];
  return (
    <>
      {RINGS.map((r, i) => {
        const w = CORE.w + (i + 1) * STEP.x * 2, h = CORE.h + (i + 1) * STEP.y * 2;
        const tIn = wrap[i], tOut = peel[RINGS.length - 1 - i];
        if (s < tIn - 0.01) return null;
        const pin = outBack(prog(s, tIn, tIn + 0.2), 2.2);
        const off = inCubic(prog(s, tOut, tOut + 0.4));
        if (off >= 1) return null;
        const h0 = hit(s, tIn, 0.15);
        const dir = i % 2 ? 1 : -1;
        return (
          <div key={i} style={{ position: "absolute", left: CX - w / 2, top: CY - h / 2, width: w, height: h, borderRadius: 26 + i * 6, border: `3px ${i % 2 ? "dashed" : "solid"} ${hexA(C.amber, 0.85 - off * 0.5)}`, background: hexA(C.amber, 0.035 + h0 * 0.08), boxShadow: `0 0 ${20 + h0 * 50}px ${hexA(C.amber, 0.25 + h0 * 0.4)}, inset 0 0 40px rgba(0,0,0,0.35)`, transform: `translate(${off * dir * 260}px, ${off * -220}px) rotate(${off * dir * 18}deg) scale(${(1.25 - 0.25 * pin) * (1 + off * 0.25)})`, opacity: clamp(pin * 3) * (1 - off) }}>
            <div style={{ position: "absolute", left: 24, top: -22, padding: "4px 14px", borderRadius: 10, background: "#1a1606", border: `2px solid ${hexA(C.amber, 0.7)}`, fontFamily: MONO, fontWeight: 500, fontSize: 26, color: C.amber, whiteSpace: "nowrap" }}>{r.code}</div>
          </div>
        );
      })}
      {/* The one line doing the work. */}
      <div style={{ position: "absolute", left: CX - CORE.w / 2, top: CY - CORE.h / 2, width: CORE.w, height: CORE.h, borderRadius: 22, background: "linear-gradient(160deg, #1b2556, #0e1430)", border: `3px solid ${done ? C.green : C.periwinkle}`, boxShadow: `0 0 ${done ? 60 + 60 * hit(s, peel[5], 0.4) : 30}px ${hexA(done ? C.green : C.blue, 0.55)}`, display: "grid", placeItems: "center", fontFamily: MONO, fontWeight: 700, fontSize: 40, color: "#fff", whiteSpace: "nowrap", transform: `scale(${1 + hit(s, peel[5] + 0.2, 0.15) * 0.08})` }}>
        <span>
          <span style={{ color: "#ff7ab6" }}>return</span> upload.progress
        </span>
      </div>
    </>
  );
};
