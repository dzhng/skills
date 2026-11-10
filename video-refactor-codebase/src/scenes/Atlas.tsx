// The codebase from above: folders as columns, files as cards. Before, the
// folders are layers and one feature is everywhere; sessions pile slop on, and
// one change has to touch seven places. After, folders are features and the
// same change lands in one.
import React from "react";
import { CUE } from "../cues.ts";
import { C, FEATURE, MONO, SANS } from "../theme.ts";
import { clamp, hit, outBack, outCubic, prog, rng, spring } from "../anim.ts";
import { Card, Draw, curve, hexA } from "./kit.tsx";

type Slot = { col: number; name: string; feature: keyof typeof FEATURE; h: number; grow: number[] };
const COL_W = 250;
const colX = (i: number, n: number) => 960 - (n * COL_W + (n - 1) * 36) / 2 + i * (COL_W + 36);
const TOP = 180;

const LAYERS = ["components/", "hooks/", "api/", "store/", "utils/", "tests/"];
const MESSY: string[][] = [
  ["UploadButton.tsx", "Modal.tsx", "Invoice.tsx", "Dropzone.tsx"],
  ["useUpload.ts", "useSession.ts", "useProgress.ts", "useDebounce.ts"],
  ["uploadApi.ts", "client.ts", "billingApi.ts", "retry.ts"],
  ["uploadSlice.ts", "authSlice.ts", "store.ts", "uploadStatus.ts"],
  ["formatSize.ts", "money.ts", "uploadUtils.ts", "date.ts"],
  ["upload.test.ts", "billing.test.ts", "mocks.ts", "auth.test.ts"],
];
const r = rng(7);
const messy: Slot[] = MESSY.flatMap((files, col) =>
  files.map((name) => ({
    col,
    name,
    feature: /upload|Upload|Dropzone|Progress|Size/.test(name) ? "U" : /Invoice|money|billing/.test(name) ? "B" : /auth|Session/.test(name) ? "A" : "G",
    h: 62 + Math.floor(r() * 30),
    // How much each session bloats this file.
    grow: CUE.sessions.map(() => (r() < 0.6 ? 10 + Math.floor(r() * 12) : 0)),
  })),
);
// The seven places one upload change has to touch, left to right.
const HITS = ["UploadButton.tsx", "Dropzone.tsx", "useUpload.ts", "useProgress.ts", "uploadApi.ts", "uploadSlice.ts", "uploadStatus.ts"];

const CLEAN_COLS = ["upload/", "billing/", "auth/", "ui/", "lib/"];
// The same files the folders shot regrouped.
const CLEAN: string[][] = [
  ["UploadButton.tsx", "useUpload.ts", "uploadApi.ts", "uploadSlice.ts", "formatUpload.ts"],
  ["useBilling.ts", "billingSlice.ts", "Invoice.tsx", "money.ts"],
  ["useSession.ts", "authApi.ts", "authSlice.ts", "token.ts"],
  ["Button.tsx", "Modal.tsx", "useDebounce.ts"],
  ["client.ts", "http.ts", "store.ts", "date.ts"],
];
const CLEAN_FEATURE = ["U", "B", "A", "G", "G"] as const;

const REQUEST_Y = 72;

export const Atlas: React.FC<{ s: number }> = ({ s }) => (s >= CUE.matchCut ? <Clean s={s} /> : <Messy s={s} />);

const Header: React.FC<{ x: number; label: string; color?: string; opacity?: number }> = ({ x, label, color = C.muted, opacity = 1 }) => (
  <div style={{ position: "absolute", left: x + 4, top: TOP - 46, fontFamily: MONO, fontWeight: 700, fontSize: 24, color, opacity, whiteSpace: "nowrap" }}>{label}</div>
);

const Request: React.FC<{ s: number; at: number }> = ({ s, at }) => {
  const p = spring(s, at, 2.6, 0.5);
  const h = hit(s, at + 0.12, 0.2);
  return (
    <div style={{ position: "absolute", left: 960, top: REQUEST_Y, transform: `translate(-50%, ${(1 - p) * -120}px) scale(${1 + h * 0.08})`, opacity: clamp(p * 3), display: "flex", alignItems: "center", gap: 16, padding: "14px 30px", borderRadius: 40, background: "#f4f6ff", boxShadow: `0 12px 40px rgba(0,0,0,0.5), 0 0 ${30 + h * 60}px rgba(143,176,255,${0.5 + h * 0.4})`, fontFamily: SANS, fontWeight: 800, fontSize: 34, color: "#0b1022", whiteSpace: "nowrap", zIndex: 5 }}>
      <span style={{ width: 34, height: 34, borderRadius: 17, background: C.blue, color: "#fff", display: "grid", placeItems: "center", fontSize: 28, lineHeight: 1 }}>+</span>
      Pause uploads
    </div>
  );
};

const Messy: React.FC<{ s: number }> = ({ s }) => {
  const sessions = CUE.sessions;
  const beams: React.ReactNode[] = [];
  const cards = LAYERS.flatMap((_, col) => {
    let y = TOP;
    return messy
      .filter((m) => m.col === col)
      .map((m, row) => {
        const grown = m.grow.reduce((a, g, k) => a + g * outBack(prog(s, sessions[k], sessions[k] + 0.25)), 0);
        const pulse = m.grow.reduce((a, g, k) => a + (g ? hit(s, sessions[k], 0.12) : 0), 0);
        const h = m.h + grown;
        const top = y;
        y += h + 16 + m.grow.filter((g, i) => g && s >= sessions[i]).length * 9;
        const x = colX(col, LAYERS.length);
        const k = HITS.indexOf(m.name);
        const t = k >= 0 ? CUE.hits[k] : Infinity;
        const struck = s >= t;
        // Patches: one sticker per session that touched it.
        const patches = m.grow.map((g, i) => (g && s >= sessions[i] ? i : -1)).filter((i) => i >= 0);
        if (k >= 0 && s >= t - 0.22) {
          const b = curve([960, REQUEST_Y + 60], [x + COL_W / 2, top + 8], (x + COL_W / 2 - 960) * 0.12);
          beams.push(<Draw key={m.name} d={b.d} len={b.len} p={outCubic(prog(s, t - 0.22, t))} color={C.red} width={4} glow={1} />);
        }
        // Every session that touched a file leaves a layer under it.
        return (
          <React.Fragment key={m.name}>
          {patches.map((i, j) => {
            const d = (patches.length - j) * 9 * outBack(prog(s, sessions[i], sessions[i] + 0.25));
            return <div key={i} style={{ position: "absolute", left: x + d, top: top + d, width: COL_W, height: h, borderRadius: 16, background: "#0a0f24", border: `2px solid ${hexA(C.amber, 0.4 + 0.5 * hit(s, sessions[i], 0.2))}` }} />;
          })}
          <Card x={x} y={top} w={COL_W} h={h} name={m.name} seed={col * 10 + row + 3} accent={struck ? C.red : undefined} lit={struck ? 0.6 : 0} alarm={struck ? 0.5 + 0.5 * hit(s, t, 0.25) : 0} scale={1 + pulse * 0.03 + hit(s, t, 0.12) * 0.05} nameSize={19}>
            {patches.map((i, j) => (
              <div key={i} style={{ position: "absolute", right: 10 + j * 14, bottom: 10 + (j % 2) * 6, width: 34, height: 18, borderRadius: 4, background: `repeating-linear-gradient(135deg, ${C.amber} 0 6px, #c98410 6px 12px)`, transform: `rotate(${(j % 2 ? 1 : -1) * 8}deg) scale(${outBack(prog(s, sessions[i], sessions[i] + 0.2))})`, opacity: 0.9 }} />
            ))}
            {struck && (
              <div style={{ position: "absolute", left: 12, bottom: 10, padding: "2px 10px", borderRadius: 10, background: C.red, fontFamily: MONO, fontWeight: 700, fontSize: 16, color: "#fff", transform: `scale(${outBack(prog(s, t, t + 0.18))})` }}>edit</div>
            )}
          </Card>
          </React.Fragment>
        );
      });
  });
  return (
    <>
      {LAYERS.map((l, i) => <Header key={l} x={colX(i, LAYERS.length)} label={l} />)}
      {cards}
      <svg style={{ position: "absolute", left: 0, top: 0, overflow: "visible" }} width={1920} height={1080}>{beams}</svg>
      {s >= CUE.request - 0.1 && <Request s={s} at={CUE.request} />}
    </>
  );
};

const Clean: React.FC<{ s: number }> = ({ s }) => {
  const t = CUE.hit2;
  const lockup = s >= CUE.lockup;
  const x0 = colX(0, CLEAN_COLS.length);
  const beam = curve([960, REQUEST_Y + 60], [x0 + COL_W / 2, TOP + 8], 60);
  return (
    <>
      {CLEAN_COLS.map((l, i) => (
        <Header key={l} x={colX(i, CLEAN_COLS.length)} label={l} color={i === 0 && s >= t && !lockup ? "#fff" : C.muted} />
      ))}
      {CLEAN.map((files, col) =>
        files.map((name, row) => {
          const f = CLEAN_FEATURE[col];
          const struck = col === 0 && s >= t && !lockup;
          return (
            <Card key={name} x={colX(col, CLEAN_COLS.length)} y={TOP + row * 106} w={COL_W} h={90} name={name} seed={col * 10 + row + 40} accent={FEATURE[f]} lit={f === "G" ? 0 : struck ? 0.9 + 0.1 * hit(s, t + row * 0.06, 0.3) : 0.35} nameSize={19} scale={struck ? 1 + hit(s, t + row * 0.06, 0.12) * 0.05 : 1} />
          );
        }),
      )}
      {!lockup && (
        <>
          {s >= t - 0.22 && (
            <div style={{ position: "absolute", left: x0 - 16, top: TOP - 60, width: COL_W + 32, height: 5 * 106 + 60, borderRadius: 24, border: `3px solid ${hexA(C.green, 0.9)}`, boxShadow: `0 0 ${40 + 60 * hit(s, t, 0.3)}px ${hexA(C.green, 0.5)}`, opacity: outCubic(prog(s, t, t + 0.2)), transform: `scale(${1.08 - 0.08 * outCubic(prog(s, t, t + 0.25))})` }} />
          )}
          <svg style={{ position: "absolute", left: 0, top: 0, overflow: "visible" }} width={1920} height={1080}>
            <Draw d={beam.d} len={beam.len} p={outCubic(prog(s, t - 0.22, t))} color={C.green} width={4} glow={1} />
          </svg>
          {s >= CUE.request2 - 0.1 && <Request s={s} at={CUE.request2} />}
        </>
      )}
    </>
  );
};
