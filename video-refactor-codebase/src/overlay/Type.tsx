// Type over the world, all driven by song time.
import React from "react";
import { COMMAND, CUE, FINDS, INSTALL_CMD, SECTIONS } from "../cues.ts";
import { guardLines } from "../scenes/Guards.tsx";
import { largestK } from "../scenes/Giant.tsx";
import { C, MONO, SANS } from "../theme.ts";
import { clamp, inCubic, inOutCubic, lastAt, lerp, outCubic, passed, prog, spring, squash } from "../anim.ts";

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
const Roll: React.FC<{ value: number | string; changedAt: number; s: number; color?: string }> = ({ value, changedAt, s, color }) => {
  const p = outCubic(prog(s, changedAt, changedAt + 0.16));
  const kick = s >= changedAt ? Math.exp(-(s - changedAt) / 0.12) : 0;
  return (
    <span style={{ display: "inline-block", color, transform: `translateY(${(1 - p) * -18}px) scale(${1 + kick * 0.18})`, opacity: 0.4 + 0.6 * p }}>{value}</span>
  );
};

// ---------- title ----------
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

// ---------- the header ----------
// One per shot, bottom-left: what is happening, with a live count on the right.
type Head = { key: string; at: number; until: number; kicker: string; sub?: string; label: string; labelAt?: number; value: string | number; changed: number; caption: string; color: string };

function headAt(s: number): Head | null {
  const { hits, request, sessions } = CUE;
  if (s >= 0 && s < SECTIONS.open[1] - 0.2) {
    const asked = s >= request;
    const n = passed(hits, s);
    return asked
      ? { key: "change", at: request, until: SECTIONS.open[1] - 0.2, kicker: "the problem", label: "One small change", value: n || "?", changed: lastAt(hits, s), caption: n === 1 ? "place to edit" : "places to edit", color: n > 1 ? C.red : C.fg }
      : { key: "sessions", at: 0, until: request, kicker: "the problem", label: "40 AI sessions later", value: Math.max(1, passed(sessions, s)) * 10, changed: lastAt(sessions, s), caption: "sessions", color: C.fg };
  }
  if (s >= CUE.matchCut + 0.1 && s < SECTIONS.payoff[1] - 0.2) {
    return { key: "payoff", at: CUE.matchCut + 0.1, until: SECTIONS.payoff[1] - 0.2, kicker: "after /refactor-codebase", label: "Same change", value: s >= CUE.hit2 ? 1 : "?", changed: CUE.hit2, caption: "place to edit", color: C.green };
  }
  const f = FINDS.find((x) => s >= x.at && s < x.until);
  if (!f) return null;
  const fixed = f.fixed !== null && s >= f.fixAt;
  const base = { key: fixed ? f.fixed! : f.label, at: f.at, until: f.until, kicker: f.skill === null ? "every week" : "/refactor-codebase", sub: f.skill || undefined, label: fixed ? f.fixed! : f.label, labelAt: fixed ? f.fixAt : f.at + 0.05 };
  switch (FINDS.indexOf(f)) {
    case 0: {
      const { found, land } = CUE.scatter;
      return s >= land
        ? { ...base, value: 1, changed: land, caption: "folder per feature", color: C.green }
        : { ...base, value: Math.max(1, passed(found, s)), changed: lastAt(found, s), caption: "folders for one feature", color: passed(found, s) > 1 ? C.red : C.fg };
    }
    case 1: {
      const n = guardLines(s);
      const done = s >= CUE.guards.peel[5];
      return { ...base, value: n, changed: lastAt([...CUE.guards.wrap, ...CUE.guards.peel].sort((x, y) => x - y), s), caption: n === 1 ? "line" : "lines", color: done ? C.green : n > 1 ? C.red : C.fg };
    }
    case 2: {
      const { collapse, jam } = CUE.states;
      return s >= collapse + 0.3
        ? { ...base, value: 1, changed: collapse + 0.3, caption: "state machine", color: C.green }
        : { ...base, value: 4, changed: s >= jam ? jam : -1, caption: "flags, 4 files", color: s >= jam ? C.red : C.fg };
    }
    case 3: {
      const k = largestK(s);
      const split = s >= CUE.giant.split + 0.3;
      return { ...base, value: `${k}k`, changed: split ? CUE.giant.split + 0.3 : -1, caption: split ? "tokens, largest file" : "tokens in one file", color: split ? C.green : k > 8 ? C.red : C.fg };
    }
    case 4: {
      const n = s >= CUE.tests.caught ? 1 : 0;
      return { ...base, value: n, changed: CUE.tests.caught, caption: "bugs caught", color: n ? C.green : s >= CUE.tests.bug[0] ? C.red : C.fg };
    }
    default: {
      const w = passed(CUE.weeks, s);
      return { ...base, value: w, changed: lastAt(CUE.weeks, s), caption: "week", color: C.fg };
    }
  }
}

export const Header: React.FC<S> = ({ s }) => {
  const h = headAt(s);
  if (!h) return null;
  const enter = spring(s, h.at + 0.05, 2.4, 0.55);
  const exit = inCubic(prog(s, h.until - 0.25, h.until));
  return (
    <div style={{ position: "absolute", left: 0, right: 0, bottom: 0, height: 330, opacity: 1 - exit, filter: blur(exit * 8) }}>
      <div style={{ position: "absolute", inset: 0, background: "linear-gradient(0deg, rgba(4,6,14,0.9) 0%, rgba(4,6,14,0.6) 45%, rgba(4,6,14,0) 100%)", opacity: clamp(enter) }} />
      <div style={{ position: "absolute", left: 100, bottom: 80, transform: `translateX(${(1 - enter) * -60}px)`, opacity: clamp(enter * 1.5) }}>
        <div style={{ fontFamily: MONO, fontWeight: 700, fontSize: 34, color: C.periwinkle, letterSpacing: h.kicker.includes("/") ? 0 : 3, textTransform: h.kicker.includes("/") ? "none" : "uppercase", whiteSpace: "nowrap" }}>
          {h.kicker}
          {h.sub && <span style={{ color: "#fff" }}> › {h.sub}</span>}
        </div>
        <div style={{ fontFamily: SANS, fontWeight: 800, fontSize: 84, letterSpacing: -2.5, color: C.fg, textShadow: HALO, whiteSpace: "nowrap" }}>
          <Word key={h.key} s={s} at={h.labelAt ?? h.at + 0.05}>{h.label}</Word>
        </div>
      </div>
      <div style={{ position: "absolute", right: 110, bottom: 74, textAlign: "right", opacity: clamp(enter * 1.5), transform: `translateX(${(1 - enter) * 60}px)` }}>
        <div style={{ fontFamily: SANS, fontWeight: 900, fontSize: 168, lineHeight: 0.9, letterSpacing: -6, fontVariantNumeric: "tabular-nums", textShadow: HALO }}>
          <Roll value={h.value} changedAt={h.changed} s={s} color={h.color} />
        </div>
        <div style={{ fontFamily: MONO, fontWeight: 500, fontSize: 34, color: "#aeb8dc", marginTop: 6 }}>{h.caption}</div>
      </div>
    </div>
  );
};

// ---------- the claim ----------
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

// ---------- lockup ----------
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
      <div style={{ fontFamily: MONO, fontWeight: 500, fontSize: 42, color: "#c9d4ff", opacity: clamp(inst * 2), transform: `translateY(${(1 - inst) * 20}px)` }}>{INSTALL_CMD}</div>
    </div>
  );
};
