// 2D type over the board, all driven by song time.
import React from "react";
import { COMMAND, CUE, INSTALL_CMD, STEPS, WEEK } from "../cues.ts";
import { CALLOUTS, LAYER_COUNT, PROBLEMS } from "../world/board.ts";
import { C, MONO, SANS } from "../theme.ts";
import { clamp, inCubic, inOutCubic, lerp, outCubic, prog, spring, squash } from "../anim.ts";

type S = { s: number };
const blur = (px: number) => (px > 0.05 ? `blur(${px}px)` : undefined);
const HALO = "0 0 40px rgba(4,6,16,0.9), 0 2px 16px rgba(4,6,16,0.85)";

// Mask-reveal word.
const Word: React.FC<S & { at: number; children: React.ReactNode; style?: React.CSSProperties }> = ({ s, at, children, style }) => {
  const p = spring(s, at, 2.6, 0.45);
  return (
    <span style={{ display: "inline-block", overflow: "hidden", verticalAlign: "bottom", padding: "0.08em 0.04em", margin: "-0.08em -0.04em" }}>
      <span style={{ display: "inline-block", transform: `translateY(${(1 - p) * 115}%)`, opacity: clamp((s - at) / 0.05), ...style }}>{children}</span>
    </span>
  );
};

// A number that rolls like an odometer when it changes.
const Roll: React.FC<{ value: number; changedAt: number; s: number; color?: string }> = ({ value, changedAt, s, color }) => {
  const p = outCubic(prog(s, changedAt, changedAt + 0.16));
  const kick = s >= changedAt ? Math.exp(-(s - changedAt) / 0.12) : 0;
  return (
    <span style={{ display: "inline-block", color, transform: `translateY(${(1 - p) * -18}px) scale(${1 + kick * 0.18})`, opacity: 0.4 + 0.6 * p }}>{value}</span>
  );
};
const lastAt = (times: number[], s: number) => times.filter((t) => s >= t).at(-1) ?? -1;

// ---------- 1 · the tug, and 7 · the tug again ----------
// "1 change → N places", counting the places the change drags along.
export const TugCount: React.FC<S> = ({ s }) => {
  const first = s >= CUE.tug + 0.2 && s < CUE.slack + 0.7;
  const second = s >= CUE.tug2 + 0.2 && s < CUE.weeks[0] - 0.05;
  if (!first && !second) return null;
  const at = first ? CUE.tug + 0.2 : CUE.tug2 + 0.2;
  const end = first ? CUE.slack + 0.7 : CUE.weeks[0] - 0.05;
  const times = first ? [at, ...CUE.yanks] : [at];
  const n = times.filter((t) => s >= t).length;
  const enter = spring(s, at, 2.4, 0.5);
  const exit = inCubic(prog(s, end - 0.25, end));
  const color = first ? (n > 1 ? C.red : C.fg) : C.green;
  return (
    <div style={{ position: "absolute", left: 110, top: 110, fontFamily: SANS, fontWeight: 900, fontSize: 104, letterSpacing: -4, lineHeight: 1.02, color: C.fg, textShadow: HALO, opacity: clamp(enter) * (1 - exit), transform: `translateY(${(1 - enter) * 40}px)`, filter: blur(exit * 10) }}>
      <div>1 change</div>
      <div style={{ color: C.muted }}>
        → <Roll value={n} changedAt={lastAt(times, s)} s={s} color={color} /> <span style={{ color }}>{n === 1 ? "place" : "places"}</span>
      </div>
    </div>
  );
};

// ---------- 2 · title ----------
export const Title: React.FC<S & { poster?: boolean }> = ({ s, poster }) => {
  if (!poster && (s < CUE.drop || s > CUE.clear + 0.5)) return null;
  const slam = poster ? 1 : clamp((s - CUE.drop) / 0.1);
  const [sx, sy] = poster ? [1, 1] : squash(s, CUE.drop + 0.1, 0.28);
  const clear = poster ? 0 : inCubic(prog(s, CUE.clear, CUE.clear + 0.4));
  const typed = poster ? COMMAND.length : CUE.typing.filter((t) => s >= t).length;
  const pill = poster ? 1 : spring(s, CUE.typing[0] - 0.15, 2.2, 0.5);
  const enter = poster ? 0 : s >= CUE.enter ? Math.exp(-(s - CUE.enter) / 0.15) : 0;
  const done = poster || s >= CUE.enter;
  const caret = !done && Math.floor(s * 4) % 2 === 0;
  return (
    <div style={{ position: "absolute", inset: 0, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 28, opacity: 1 - clear, filter: blur(clear * 14), transform: `scale(${1 + clear * 0.15})` }}>
      <div style={{ transform: `scale(${lerp(2.6, 1, slam) * sx}, ${lerp(2.6, 1, slam) * sy})`, opacity: slam, filter: blur((1 - slam) * 14), fontFamily: SANS, fontWeight: 900, fontSize: 176, letterSpacing: -8, color: C.fg, lineHeight: 1, textShadow: HALO, whiteSpace: "nowrap" }}>
        refactor<span style={{ color: C.periwinkle }}>-</span>codebase
      </div>
      <div style={{ fontFamily: SANS, fontWeight: 700, fontSize: 58, letterSpacing: -1.5, color: C.fg, textShadow: HALO, whiteSpace: "nowrap" }}>
        {poster ? <>De-slop your codebase.</> : <Word s={s} at={CUE.tagWords[0]}>De-slop your codebase.</Word>}
      </div>
      <div style={{ marginTop: 26, opacity: clamp(pill * 2), transform: `translateY(${(1 - pill) * 30}px) scale(${1 + enter * 0.06})`, fontFamily: MONO, fontWeight: 500, fontSize: 46, color: C.fg, padding: "22px 40px", borderRadius: 20, background: `rgba(14,20,44,${0.78 + enter * 0.2})`, border: `2px solid ${done ? C.blue : "rgba(143,176,255,0.35)"}`, boxShadow: `0 0 ${30 + enter * 80}px rgba(43,82,245,${0.35 + enter * 0.5}), 0 20px 60px rgba(0,0,0,0.5)`, minWidth: 620 }}>
        <span style={{ color: C.periwinkle }}>❯ </span>
        {COMMAND.slice(0, typed)}
        <span style={{ opacity: caret ? 1 : 0, color: C.periwinkle }}>▍</span>
      </div>
    </div>
  );
};

// ---------- the findings feed ----------
// Each slop pattern the scan hits slams in top-left; older ones step down and fade.
export const Findings: React.FC<S> = ({ s }) => {
  const live = CALLOUTS.filter((p) => s >= p.tagAt && s < p.tagAt + 2.4 && s < (p.layer === 1 ? CUE.reveal + 0.6 : CUE.fixes[3].lift)).reverse();
  if (!live.length) return null;
  return (
    <div style={{ position: "absolute", left: 100, top: 96 }}>
      {live.map((p, i) => {
        const pop = spring(s, p.tagAt, 2.8, 0.42);
        const out = inCubic(prog(s, p.tagAt + 2.0, p.tagAt + 2.4));
        const y = live.slice(0, i).reduce((a, q) => a + 104 * outCubic(prog(s, q.tagAt, q.tagAt + 0.12)), 0);
        const hit = Math.exp(-(s - p.tagAt) / 0.15);
        const deep = p.layer === 2;
        return (
          <div key={p.id} style={{ position: "absolute", left: 0, top: y, transform: `translate(${(1 - pop) * -120}px, ${(1 - clamp(pop)) * -30}px) scale(${(i === 0 ? 1 : 0.86) * (1 + hit * 0.08)})`, transformOrigin: "left center", opacity: clamp(pop * 2) * (1 - out) * (i === 0 ? 1 : 0.55), display: "flex", alignItems: "center", gap: 20, padding: "14px 34px 14px 26px", borderRadius: 60, background: deep ? "rgba(255,77,94,0.95)" : "rgba(255,255,255,0.96)", boxShadow: `0 10px 40px rgba(0,0,0,0.45), 0 0 ${hit * 60}px rgba(255,77,94,${hit})`, whiteSpace: "nowrap" }}>
            <div style={{ width: 26, height: 26, borderRadius: 13, background: deep ? "#fff" : C.red, boxShadow: `0 0 ${10 + hit * 20}px ${C.red}` }} />
            <div style={{ fontFamily: SANS, fontWeight: 800, fontSize: 56, letterSpacing: -1.5, color: deep ? "#fff" : "#0b1022" }}>{p.label}</div>
          </div>
        );
      })}
    </div>
  );
};

// ---------- section headers ----------
const found = (layer: 1 | 2, s: number) => PROBLEMS.filter((p) => p.layer === layer && s >= p.tagAt).length;
const cleared = (layer: 1 | 2, s: number) => PROBLEMS.filter((p) => p.layer === layer && s >= CUE.fixes[p.fix].land).length;

export const StepHeader: React.FC<S> = ({ s }) => {
  const step = STEPS.find((t) => s >= t.at && s < t.until);
  if (!step) return null;
  const i = STEPS.indexOf(step);
  const enter = spring(s, step.at + 0.05, 2.4, 0.55);
  const exit = inCubic(prog(s, step.until - 0.25, step.until));
  // The live counter: slop found, then slop left, then the week.
  let value: number, changed: number, caption: string, color: string;
  if (i < 2) {
    const layer = (i + 1) as 1 | 2;
    const fixes = layer === 1 ? [0, 1, 2] : [3, 4];
    const cleaning = s >= CUE.fixes[fixes[0]].lift;
    if (!cleaning) {
      value = found(layer, s);
      changed = lastAt(PROBLEMS.filter((p) => p.layer === layer).map((p) => p.tagAt), s);
      caption = "found";
    } else {
      value = LAYER_COUNT[layer] - cleared(layer, s);
      changed = lastAt(fixes.map((f) => CUE.fixes[f].land), s);
      caption = value === 0 ? "clean" : "left";
    }
    color = value === 0 && cleaning ? C.green : value > 0 ? C.red : C.fg;
  } else {
    const w = CUE.weeks.filter((t) => s >= t).length;
    value = w;
    changed = lastAt([...CUE.weeks], s);
    const swept = s >= CUE.weeks[w - 1] + WEEK.sweep[1];
    caption = swept ? "week · clean" : "week";
    color = swept ? C.green : C.fg;
  }
  return (
    <div style={{ position: "absolute", left: 0, right: 0, bottom: 0, height: 330, opacity: 1 - exit, filter: blur(exit * 8) }}>
      <div style={{ position: "absolute", inset: 0, background: "linear-gradient(0deg, rgba(4,6,14,0.82) 0%, rgba(4,6,14,0) 100%)", opacity: clamp(enter) }} />
      <div style={{ position: "absolute", left: 100, bottom: 80, transform: `translateX(${(1 - enter) * -60}px)`, opacity: clamp(enter * 1.5) }}>
        <div style={{ fontFamily: MONO, fontWeight: 700, fontSize: 30, color: i === 1 ? "#ff8a96" : C.periwinkle, letterSpacing: 3 }}>{step.n}</div>
        <div style={{ fontFamily: SANS, fontWeight: 800, fontSize: 80, letterSpacing: -2.5, color: C.fg, textShadow: HALO, whiteSpace: "nowrap" }}>{step.label}</div>
      </div>
      <div style={{ position: "absolute", right: 110, bottom: 74, textAlign: "right", opacity: clamp(enter * 1.5), transform: `translateX(${(1 - enter) * 60}px)` }}>
        <div style={{ fontFamily: SANS, fontWeight: 900, fontSize: 168, lineHeight: 0.9, letterSpacing: -6, fontVariantNumeric: "tabular-nums", textShadow: HALO }}>
          <Roll value={value} changedAt={changed} s={s} color={color} />
        </div>
        <div style={{ fontFamily: MONO, fontSize: 28, color: C.muted, marginTop: 6 }}>{caption}</div>
      </div>
    </div>
  );
};

// ---------- 7 · the claim ----------
export const Claim: React.FC<S> = ({ s }) => {
  if (s < CUE.slam || s > CUE.lockup) return null;
  const out = inOutCubic(prog(s, CUE.lockup - 0.4, CUE.lockup));
  const line = (at: number, text: string, color: string) => {
    const p = clamp((s - at) / 0.08);
    const [sx, sy] = squash(s, at + 0.08, 0.25);
    return (
      <div style={{ transform: `scale(${lerp(2.2, 1, p) * sx}, ${lerp(2.2, 1, p) * sy})`, opacity: p, filter: blur((1 - p) * 12), color }}>{text}</div>
    );
  };
  return (
    <div style={{ position: "absolute", left: 0, right: 0, top: 70, display: "flex", flexDirection: "column", alignItems: "center", fontFamily: SANS, fontWeight: 900, fontSize: 168, letterSpacing: -9, lineHeight: 1, textShadow: "0 0 70px rgba(4,6,16,0.95), 0 0 30px rgba(4,6,16,0.8)", opacity: 1 - out, transform: `scale(${1 - out * 0.1})`, filter: blur(out * 10) }}>
      {line(CUE.slam, "Run it regularly.", C.fg)}
      {line(CUE.slam2, "Keep the slop out.", C.periwinkle)}
    </div>
  );
};

// ---------- 8 · lockup ----------
export const Lockup: React.FC<S> = ({ s }) => {
  if (s < CUE.lockup) return null;
  const p = spring(s, CUE.lockup, 2.2, 0.5);
  const tag = spring(s, CUE.lockTag, 2.6, 0.5);
  const cmd = spring(s, CUE.lockCmd, 2.6, 0.5);
  const inst = spring(s, CUE.lockInstall, 2.6, 0.5);
  const hit = s >= CUE.finalHit ? Math.exp(-(s - CUE.finalHit) / 0.2) : 0;
  return (
    <div style={{ position: "absolute", inset: 0, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 34 }}>
      <div style={{ fontFamily: SANS, fontWeight: 900, fontSize: 168, letterSpacing: -8, color: C.fg, transform: `scale(${lerp(0.85, 1, clamp(p)) * (1 + hit * 0.03)})`, opacity: clamp(p * 2), filter: blur((1 - clamp(p)) * 10), textShadow: `0 0 ${60 + hit * 80}px rgba(43,82,245,${0.45 + hit * 0.4})` }}>
        refactor<span style={{ color: C.periwinkle }}>-</span>codebase
      </div>
      <div style={{ fontFamily: SANS, fontWeight: 700, fontSize: 56, letterSpacing: -1.5, color: C.fg, marginTop: -14, opacity: clamp(tag * 2), transform: `translateY(${(1 - tag) * 20}px)` }}>De-slop your codebase.</div>
      <div style={{ fontFamily: MONO, fontWeight: 500, fontSize: 46, color: C.fg, padding: "18px 36px", borderRadius: 18, background: "rgba(14,20,44,0.85)", border: `2px solid ${C.blue}`, boxShadow: "0 0 40px rgba(43,82,245,0.45)", opacity: clamp(cmd * 2), transform: `translateY(${(1 - cmd) * 24}px)` }}>
        <span style={{ color: C.periwinkle }}>❯ </span>{COMMAND}
      </div>
      <div style={{ fontFamily: MONO, fontSize: 32, color: C.muted, opacity: clamp(inst * 2), transform: `translateY(${(1 - inst) * 20}px)` }}>{INSTALL_CMD}</div>
    </div>
  );
};
