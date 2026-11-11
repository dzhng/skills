// One feature, five folders. Folders sorted by layer put a piece of every
// feature in every folder, tied by links nothing shows. The fix regroups the
// files by feature, so each feature's links stay inside one folder.
import React from "react";
import { CUE } from "../cues.ts";
import { C, FEATURE, MONO, type Feature } from "../theme.ts";
import { clamp, hit, inOutCubic, lerp, outCubic, prog, squash } from "../anim.ts";
import { Card, Draw, curve } from "./kit.tsx";

const COL_W = 260, GAP = 56, TOP = 210, CH = 88, PITCH = 104;
const colX = (i: number) => 960 - (5 * COL_W + 4 * GAP) / 2 + i * (COL_W + GAP);
const BEFORE = ["components/", "hooks/", "api/", "store/", "utils/"];
const AFTER = ["upload/", "billing/", "auth/", "ui/", "lib/"];

// Rows of each layer folder: [feature, file].
const GRID: [Feature, string][][] = [
  [["G", "Button.tsx"], ["U", "UploadButton.tsx"], ["G", "Modal.tsx"], ["B", "Invoice.tsx"]],
  [["B", "useBilling.ts"], ["A", "useSession.ts"], ["G", "useDebounce.ts"], ["U", "useUpload.ts"]],
  [["U", "uploadApi.ts"], ["G", "client.ts"], ["A", "authApi.ts"], ["G", "http.ts"]],
  [["A", "authSlice.ts"], ["B", "billingSlice.ts"], ["U", "uploadSlice.ts"], ["G", "store.ts"]],
  [["G", "date.ts"], ["U", "formatUpload.ts"], ["B", "money.ts"], ["A", "token.ts"]],
];
type Piece = { f: Feature; name: string; from: [number, number]; to: [number, number]; order: number };
const target = (f: Feature, name: string) => (f === "U" ? 0 : f === "B" ? 1 : f === "A" ? 2 : /Button|Modal|Debounce/.test(name) ? 3 : 4);
const counts = [0, 0, 0, 0, 0];
const PIECES: Piece[] = [];
GRID.forEach((rows, col) =>
  rows.forEach(([f, name], row) => {
    const c = target(f, name);
    PIECES.push({ f, name, from: [colX(col), TOP + row * PITCH], to: [colX(c), TOP + counts[c]++ * PITCH], order: PIECES.length });
  }),
);
const of = (f: Feature) => PIECES.filter((p) => p.f === f);
// When each piece is revealed as part of its feature.
const litAt = (p: Piece) => {
  const i = of(p.f).indexOf(p);
  if (p.f === "U") return CUE.scatter.found[i];
  if (p.f === "B") return CUE.scatter.more[0] + i * 0.125;
  if (p.f === "A") return CUE.scatter.more[1] + i * 0.125;
  return Infinity;
};

export const Scatter: React.FC<{ s: number }> = ({ s }) => {
  const { lift, land, link } = CUE.scatter;
  const move = (p: Piece) => {
    const delay = (p.order % 5) * 0.03 + (p.f === "G" ? 0.08 : 0);
    return inOutCubic(prog(s, lift + delay, land - 0.12 + delay));
  };
  const pos = (p: Piece): [number, number] => {
    const m = move(p);
    const arc = Math.sin(Math.PI * m) * (p.from[0] === p.to[0] ? 0 : -60 - (p.order % 3) * 30);
    return [lerp(p.from[0], p.to[0], m), lerp(p.from[1], p.to[1], m) + arc];
  };
  const linksFade = 1 - prog(s, lift, lift + 0.3);
  const header = inOutCubic(prog(s, lift + 0.2, land));
  const [sx, sy] = squash(s, land, 0.12);
  return (
    <>
      {BEFORE.map((b, i) => (
        <div key={b} style={{ position: "absolute", left: colX(i) + 4, top: TOP - 52, fontFamily: MONO, fontWeight: 700, fontSize: 28, whiteSpace: "nowrap" }}>
          <span style={{ position: "absolute", color: C.muted, opacity: 1 - header, transform: `translateY(${header * -20}px)` }}>{b}</span>
          <span style={{ position: "absolute", color: i < 3 ? FEATURE[AFTER_F[i]] : C.muted, opacity: header, transform: `translateY(${(1 - header) * 20}px)`, filter: i < 3 ? "brightness(1.4)" : undefined }}>{AFTER[i]}</span>
        </div>
      ))}
      {/* Hidden links between the pieces of one feature, drawn as they're found. */}
      <svg style={{ position: "absolute", left: 0, top: 0, overflow: "visible", opacity: linksFade }} width={1920} height={1080}>
        {(["U", "B", "A"] as const).flatMap((f) =>
          of(f).slice(1).map((p, i) => {
            const a = of(f)[i];
            const t = litAt(p);
            const c = curve([a.from[0] + COL_W / 2, a.from[1] + CH / 2], [p.from[0] + COL_W / 2, p.from[1] + CH / 2], 50 * (i % 2 ? 1 : -1));
            return <Draw key={p.name} d={c.d} len={c.len} p={outCubic(prog(s, t - 0.12, t + 0.1))} color={f === "U" ? "#7f9bff" : FEATURE[f]} width={5} dash={16} flow={s * 60} glow={0.8} />;
          }),
        )}
      </svg>
      {PIECES.map((p) => {
        const t = litAt(p);
        const [x, y] = pos(p);
        const landed = s >= land;
        const lit = p.f === "G" ? 0 : s >= t ? 0.7 + 0.3 * hit(s, t, 0.25) : 0;
        const flying = move(p) > 0 && move(p) < 1;
        return (
          <Card key={p.name} x={x} y={y} w={COL_W} h={CH} name={p.name} seed={p.order + 11} accent={p.f === "G" ? undefined : FEATURE[p.f]} lit={lit} nameSize={21} scale={(1 + hit(s, t, 0.12) * 0.07) * (flying ? 1.04 : 1)} style={landed ? { transform: `scale(${sx}, ${sy})` } : flying ? { zIndex: 3 } : undefined} />
        );
      })}
      {/* After: one solid spine per feature folder. */}
      {s >= link - 0.1 &&
        [0, 1, 2].map((c) => {
          const n = PIECES.filter((p) => target(p.f, p.name) === c).length;
          const p = outCubic(prog(s, link + c * 0.08, link + 0.35 + c * 0.08));
          const f = AFTER_F[c];
          return (
            <div key={c} style={{ position: "absolute", left: colX(c) - 14, top: TOP - 66, width: COL_W + 28, height: (n - 1) * PITCH + CH + 80, borderRadius: 22, border: `3px solid ${FEATURE[f]}`, opacity: clamp(p) * 0.9, boxShadow: `0 0 ${30 + 50 * hit(s, link + c * 0.08, 0.3)}px ${FEATURE[f]}`, transform: `scale(${1.06 - 0.06 * p})` }} />
          );
        })}
    </>
  );
};
const AFTER_F: Feature[] = ["U", "B", "A", "G", "G"];
