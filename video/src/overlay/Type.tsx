// 2D type and graphic layers over the world, all driven by song time.
import React from "react";
import { random } from "remotion";
import { CUE, INSTALL_CMD, SKILLS, STEP_TAGS, timerSeconds } from "../cues.ts";
import { HEXES, LANDS, PROPS, revealAt } from "../world/grid.ts";
import { C, MONO, SANS } from "../theme.ts";
import { clamp, inCubic, inOutCubic, kick, lerp, outCubic, outExpo, prog, spring, squash } from "../anim.ts";

type S = { s: number };

// Mask-reveal word.
const Word: React.FC<S & { at: number; children: React.ReactNode; style?: React.CSSProperties }> = ({ s, at, children, style }) => {
  const p = spring(s, at, 2.6, 0.45);
  return (
    <span style={{ display: "inline-block", overflow: "hidden", verticalAlign: "bottom", padding: "0.06em 0.04em", margin: "-0.06em -0.04em" }}>
      <span style={{ display: "inline-block", transform: `translateY(${(1 - p) * 115}%)`, opacity: clamp((s - at) / 0.05), ...style }}>{children}</span>
    </span>
  );
};

// Per-letter cascade.
const Letters: React.FC<S & { at: number; text: string; stagger?: number; style?: React.CSSProperties }> = ({ s, at, text, stagger = 0.022, style }) => (
  <span style={{ display: "inline-block", whiteSpace: "pre" }}>
    {[...text].map((ch, i) => {
      const p = spring(s, at + i * stagger, 3, 0.4);
      return (
        <span key={i} style={{ display: "inline-block", transform: `translateY(${(1 - p) * 0.6}em) scale(${0.4 + 0.6 * clamp(p, 0, 1.2)})`, opacity: clamp(p * 3), ...style }}>{ch}</span>
      );
    })}
  </span>
);

const blur = (px: number) => (px > 0.05 ? `blur(${px}px)` : undefined);

const pad = (v: number) => String(v).padStart(2, "0");
export const fmtRun = (secs: number) => {
  const d = Math.floor(secs / 86400), h = Math.floor((secs % 86400) / 3600), m = Math.floor((secs % 3600) / 60), x = Math.floor(secs % 60);
  return `${d}d ${pad(h)}h ${pad(m)}m ${pad(x)}s`;
};

// ---------- 2 · the drop and install ----------
// The wordmark slams and clears; then the real command types and the skills
// rain onto the board. `poster` is the finished state for the feed thumbnail.
export const Install: React.FC<S & { poster?: boolean }> = ({ s, poster }) => {
  if (!poster && (s < CUE.drop || s > CUE.explore + 0.2)) return null;
  const slam = poster ? 1 : clamp((s - CUE.drop) / 0.1);
  const [sx, sy] = poster ? [1, 1] : squash(s, CUE.drop + 0.1, 0.28);
  const clear = poster ? 0 : inCubic(prog(s, 5.35, 5.65));
  const pill = poster ? 1 : spring(s, 5.5, 2, 0.5);
  const dock = poster ? 1 : inOutCubic(prog(s, CUE.enter, CUE.enter + 0.25));
  const exit = poster ? 0 : inCubic(prog(s, 7.9, 8.15));
  const typed = poster ? INSTALL_CMD.length : CUE.typing.filter((t) => s >= t).length;
  const landed = poster ? SKILLS.length : CUE.rain.filter((t) => s >= t).length;
  const enter = poster ? 0 : s >= CUE.enter ? Math.exp(-(s - CUE.enter) / 0.12) : 0;
  const halo = "0 0 40px rgba(4,6,16,0.9), 0 2px 16px rgba(4,6,16,0.85)";
  // Poster: wordmark parked above the finished command.
  const markY = poster ? 230 : 470 - clear * 650;
  const markScale = poster ? 0.62 : 1;
  const pillY = poster ? 790 : lerp(560, 900, dock) + exit * 300;
  return (
    <>
      {clear < 1 && (
        <div style={{ position: "absolute", left: 0, right: 0, top: markY, display: "flex", flexDirection: "column", alignItems: "center", transform: `translateY(-50%) scale(${markScale})`, filter: blur(clear * 12), opacity: 1 - clear }}>
          <div style={{ transform: `scale(${lerp(3, 1, slam) * sx}, ${lerp(3, 1, slam) * sy})`, opacity: slam, filter: blur((1 - slam) * 14), fontFamily: SANS, fontWeight: 900, fontSize: 300, letterSpacing: -15, color: C.fg, lineHeight: 1, textShadow: halo }}>
            skills<span style={{ color: C.blue }}>.</span>
          </div>
          <div style={{ fontFamily: SANS, fontWeight: 800, fontSize: 70, letterSpacing: -2, color: C.fg, marginTop: 8, textShadow: halo, whiteSpace: "nowrap" }}>
            {poster ? (
              <>AI skills for building software <span style={{ color: C.blue }}>factories.</span></>
            ) : (
              <>
                <Word s={s} at={CUE.tagWords[0]}>
                  AI skills for building software <span style={{ color: C.blue }}>factories.</span>
                </Word>
              </>
            )}
          </div>
        </div>
      )}
      {(poster || s >= 5.45) && (
        <div style={{ position: "absolute", left: 960, top: pillY, transform: `translate(-50%,-50%) translateY(${(1 - pill) * 400}px) scale(${lerp(1.15, 0.85, dock) * (1 + enter * 0.05)})`, display: "flex", flexDirection: "column", alignItems: "center", gap: 18, filter: blur(exit * 10), opacity: 1 - exit }}>
          <div style={{ display: "flex", alignItems: "center", gap: 24, padding: "30px 52px", borderRadius: 30, background: "#1a2350", border: "1px solid rgba(143,176,255,0.35)", boxShadow: `0 30px 80px rgba(10,16,48,0.35), 0 0 ${enter * 60}px rgba(43,82,245,0.9)`, whiteSpace: "nowrap" }}>
            <span style={{ fontFamily: MONO, fontSize: 60, color: "#7c9bff" }}>$</span>
            <span style={{ fontFamily: MONO, fontSize: 60, color: "#fff", minWidth: 1000 }}>
              {INSTALL_CMD.slice(0, typed)}
              {typed < INSTALL_CMD.length && <span style={{ display: "inline-block", width: 30, height: 60, background: "#8fb0ff", verticalAlign: "middle", marginLeft: 6, opacity: Math.floor(s * 3) % 2 ? 0.3 : 1 }} />}
            </span>
          </div>
          <div style={{ fontFamily: MONO, fontWeight: 700, fontSize: 46, color: C.green, opacity: landed > 0 ? 1 : 0, textShadow: halo, transform: `scale(${landed > 0 ? 1 + 0.06 * kick(s) : 1})` }}>
            ✓ {landed} skill{landed === 1 ? "" : "s"} installed
          </div>
        </div>
      )}
    </>
  );
};

// ---------- 3–5 · the step's real command, typed bottom-left ----------
// One header per mechanism shot, with a live count that ticks with the action.
const SLICE_COUNTS = [2, 4, 6, 7]; // territories grouped by each cut
const REVEALS = PROPS.map((p) => revealAt(HEXES[p.hex], CUE.pulses));
const PASSES = LANDS.map((_, land) => CUE.visits.filter((v) => v.land === land && v.ok).at(-1)!.t);
const HEADERS = [
  {
    ...STEP_TAGS[0],
    count: (s: number) => REVEALS.filter((t) => t > s).length,
    ticks: REVEALS,
    render: (n: React.ReactNode) => <>Survey the land <span style={{ color: "#aeb8dc", fontWeight: 700 }}>· {n} unknowns left</span></>,
  },
  {
    ...STEP_TAGS[1],
    count: (s: number) => SLICE_COUNTS[CUE.lasers.filter((t) => t <= s).length - 1] ?? 0,
    ticks: [...CUE.lasers],
    render: (n: React.ReactNode) => <>Zone the plots <span style={{ color: "#aeb8dc", fontWeight: 700 }}>· {n} plots zoned</span></>,
  },
  {
    ...STEP_TAGS[2],
    count: (s: number) => PASSES.filter((t) => t <= s).length,
    ticks: PASSES,
    render: (n: React.ReactNode) => <>Build &amp; inspect <span style={{ color: "#aeb8dc", fontWeight: 700 }}>· {n}/{LANDS.length} passed</span></>,
  },
];
export const StepHeaders: React.FC<S> = ({ s }) => (
  <>
    {HEADERS.map((h) => {
      if (s < h.at || s > h.until) return null;
      const n = h.count(s);
      const last = Math.max(-Infinity, ...h.ticks.filter((t) => t <= s));
      const bump = s - last < 0.3 ? Math.exp(-(s - last) / 0.08) : 0;
      const out = inCubic(prog(s, h.until - 0.2, h.until));
      return (
        <div key={h.cmd} style={{ position: "absolute", left: 80, top: 70, fontFamily: SANS, fontWeight: 900, fontSize: 76, letterSpacing: -2.5, color: C.fg, textShadow: "0 4px 24px rgba(4,6,16,0.95), 0 0 60px rgba(4,6,16,0.8)", opacity: 1 - out, transform: `translateY(${out * -40}px)`, whiteSpace: "nowrap" }}>
          <Word s={s} at={h.at + 0.05}>
            {h.render(<span style={{ display: "inline-block", color: C.periwinkle, minWidth: "1.2ch", textAlign: "right", fontVariantNumeric: "tabular-nums", transform: `scale(${1 + bump * 0.25})` }}>{n}</span>)}
          </Word>
        </div>
      );
    })}
  </>
);

export const CommandTags: React.FC<S> = ({ s }) => (
  <>
    {STEP_TAGS.map((t, i) => {
      if (s < t.at || s > t.until) return null;
      const dark = i === 2;
      const p = spring(s, t.at, 2.4, 0.5);
      const out = inCubic(prog(s, t.until - 0.2, t.until));
      const typed = t.keys.filter((k) => s >= k).length;
      return (
        <div key={t.cmd} style={{ position: "absolute", left: 80, bottom: 80, transform: `translateY(${(1 - p) * 60 + out * 60}px)`, opacity: clamp(p * 2) * (1 - out) }}>
          <div style={{ display: "inline-flex", alignItems: "center", gap: 18, padding: "18px 30px", borderRadius: 20, background: dark ? "rgba(43,82,245,0.95)" : "#1a2350", border: "1px solid rgba(143,176,255,0.35)", boxShadow: "0 18px 50px rgba(4,6,16,0.5)" }}>
            <span style={{ fontFamily: MONO, fontSize: 46, color: dark ? "#dfe6ff" : "#7c9bff" }}>$</span>
            <span style={{ fontFamily: MONO, fontWeight: 700, fontSize: 46, color: "#fff", minWidth: 580 }}>
              {t.cmd.slice(0, typed)}
              <span style={{ display: "inline-block", width: 22, height: 44, background: "#fff", verticalAlign: "middle", marginLeft: 6, opacity: typed < t.cmd.length || Math.floor(s * 2.5) % 2 ? 0.9 : 0 }} />
            </span>
          </div>
        </div>
      );
    })}
  </>
);

// ---------- 5–6 · the timer races, then slams ----------
export const Proof: React.FC<S> = ({ s }) => {
  const [a] = CUE.timelapse;
  if (s < a - 0.1 || s > CUE.dawn + 0.1) return null;
  const secs = Math.floor(timerSeconds(s));
  const dock = inOutCubic(prog(s, CUE.proofSub[0] - 0.2, CUE.proofSub[0] + 0.2));
  const inP = spring(s, a, 2.2, 0.45);
  const slammed = s >= CUE.slam;
  const slamP = clamp((s - CUE.slam) / 0.08);
  const [sx, sy] = squash(s, CUE.slam + 0.08, 0.3);
  const exit = inCubic(prog(s, CUE.dawn - 0.25, CUE.dawn));
  const k = kick(s);
  const lapse = prog(s, a, CUE.slam);
  const push = lerp(1, 0.92, outCubic(prog(s, CUE.slam + 0.8, CUE.dawn)));
  const slam2P = clamp((s - CUE.slam2) / 0.08);
  const [s2x, s2y] = squash(s, CUE.slam2 + 0.08, 0.3);
  return (
    <div style={{ position: "absolute", inset: 0, opacity: 1 - exit, transform: `scale(${1 + exit * 0.4})`, filter: blur(exit * 12) }}>
      {/* One counter throughout: hours in the time-lapse, days under the headline. */}
      <div style={{ position: "absolute", left: 960, top: slammed ? lerp(880, 800, dock) : 870, transform: `translate(-50%,-50%) scale(${inP * (slammed ? lerp(1.15, 0.9, dock) : 1 + lapse * 0.15)})`, textAlign: "center" }}>
        <div style={{ display: "inline-flex", alignItems: "center", gap: 14, fontFamily: MONO, fontWeight: 700, fontSize: 30, color: "#ffb3b5", letterSpacing: 6, padding: "8px 20px", borderRadius: 999, background: "rgba(60,12,24,0.85)" }}>
          <span style={{ width: 16, height: 16, borderRadius: 8, background: C.red, opacity: Math.floor(s * 4) % 2 ? 0.35 : 1 }} />
          UNATTENDED
        </div>
        <div style={{ fontFamily: MONO, fontWeight: 700, fontSize: 116, color: "#fff", marginTop: 8, textShadow: `0 0 ${30 + lapse * 60}px rgba(143,176,255,0.9), 0 4px 30px rgba(5,10,40,0.9)`, whiteSpace: "nowrap", fontVariantNumeric: "tabular-nums" }}>{fmtRun(secs)}</div>
      </div>
      {slammed && (
        <>
          <Shards s={s} at={CUE.slam} x={960} y={430} />
          <div style={{ position: "absolute", left: 0, right: 0, top: 380, textAlign: "center", transform: `translateY(-50%) scale(${lerp(2.4, 1, slamP) * sx * (1 + k * 0.015) * push}, ${lerp(2.4, 1, slamP) * sy * (1 + k * 0.015) * push})`, opacity: slamP }}>
            <div style={{ fontFamily: SANS, fontWeight: 900, fontSize: 250, lineHeight: 0.95, letterSpacing: -11, color: "#fff", textShadow: `0 0 ${70 + k * 50}px rgba(91,141,239,0.95), 0 10px 60px rgba(5,10,40,0.6)` }}>
              <div>The factory</div>
              <div style={{ color: C.periwinkle, transform: `scale(${lerp(2.2, 1, slam2P) * s2x}, ${lerp(2.2, 1, slam2P) * s2y})`, opacity: slam2P, filter: blur((1 - slam2P) * 12) }}>runs itself.</div>
            </div>
          </div>
          <Rings s={s} at={CUE.slam} x={960} y={270} />
          <Rings s={s} at={CUE.slam2} x={960} y={500} />
        </>
      )}
    </div>
  );
};

const Rings: React.FC<S & { at: number; x: number; y: number }> = ({ s, at, x, y }) => {
  const t = s - at;
  if (t < 0 || t > 1) return null;
  return (
    <>
      {[0, 0.1, 0.2].map((d, i) => {
        const q = outExpo(clamp((t - d) / 0.9));
        const size = 2600 * q;
        return <div key={i} style={{ position: "absolute", left: x - size / 2, top: y - size / 2, width: size, height: size, borderRadius: "50%", border: `${(1 - q) * 30 + 1}px solid rgba(143,176,255,${(1 - q) * 0.8})` }} />;
      })}
    </>
  );
};

const Shards: React.FC<S & { at: number; x: number; y: number }> = ({ s, at, x, y }) => {
  const t = s - at;
  if (t < 0 || t > 2.6) return null;
  return (
    <>
      {Array.from({ length: 110 }, (_, i) => {
        const a = random(`sa${i}`) * Math.PI * 2;
        const v = 600 + random(`sv${i}`) * 1700;
        const drag = (1 - Math.exp(-t * 2.4)) / 2.4;
        const px = x + Math.cos(a) * v * drag;
        const py = y + Math.sin(a) * v * drag * 0.8 + 600 * t * t;
        const w = 10 + random(`sw${i}`) * 22;
        return <div key={i} style={{ position: "absolute", left: px, top: py, width: w, height: w * 0.5, background: C.lands[i % 7], borderRadius: i % 3 ? 2 : w, transform: `rotate(${t * (random(`sr${i}`) - 0.5) * 1600}deg) scaleY(${Math.cos(t * (6 + random(`sf${i}`) * 10))})`, opacity: clamp(2.6 - t) }} />;
      })}
    </>
  );
};

// ---------- 7 · review the choices (the card itself is in the world) ----------
export const Choices: React.FC<S> = ({ s }) => {
  if (s < CUE.dawn || s > CUE.collapse[0] + 0.2) return null;
  const out = inCubic(prog(s, CUE.collapse[0] - 0.2, CUE.collapse[0] + 0.1));
  const strike = outCubic(prog(s, CUE.choiceWords[2] + 0.35, CUE.choiceWords[2] + 0.6));
  const halo = "0 0 40px rgba(4,6,16,0.9), 0 2px 16px rgba(4,6,16,0.85)";
  return (
    <div style={{ position: "absolute", inset: 0, opacity: 1 - out, transform: `translateY(${out * 80}px)`, filter: blur(out * 10) }}>
      <div style={{ position: "absolute", left: 110, top: 110, textAlign: "left", fontFamily: SANS, fontWeight: 900, letterSpacing: -4, lineHeight: 1, color: C.fg, textShadow: halo, fontSize: 100 }}>
        <div>
          <Word s={s} at={CUE.choiceWords[0]}>Review the</Word> <Word s={s} at={CUE.choiceWords[1]} style={{ color: C.green }}>choices,</Word>
        </div>
        <div>
          <Word s={s} at={CUE.choiceWords[2]}>not the</Word>{" "}
          <span style={{ position: "relative", display: "inline-block" }}>
            <Word s={s} at={CUE.choiceWords[2] + 0.12}>diff.</Word>
            <span style={{ position: "absolute", left: -8, top: "52%", height: 14, borderRadius: 7, width: `${strike * 105}%`, background: C.red }} />
          </span>
        </div>
      </div>
      <div style={{ position: "absolute", left: 110, bottom: 80, display: "flex", alignItems: "center", gap: 20, fontFamily: SANS, fontWeight: 700, fontSize: 42, color: C.fg }}>
        <span style={{ opacity: clamp((s - CUE.harness[0]) / 0.1), textShadow: halo }}>runs in</span>
        {["Claude Code", "Codex", "+70 harnesses"].map((h, i) => {
          const p = spring(s, CUE.harness[i], 2.8, 0.4);
          return (
            <span key={h} style={{ padding: "14px 28px", borderRadius: 999, background: i === 2 ? C.blue : "#fff", color: i === 2 ? "#fff" : C.ink, boxShadow: "0 12px 30px rgba(26,42,99,0.18)", transform: `translateY(${(1 - clamp(p)) * 80}px)`, opacity: clamp(p * 3), whiteSpace: "nowrap" }}>{h}</span>
          );
        })}
      </div>
    </div>
  );
};

// ---------- 8 · lockup: the world collapses into the period ----------
export const DOT = { x: 1290, y: 432, r: 30 };
export const Lockup: React.FC<S> = ({ s }) => {
  if (s < CUE.collapse[0]) return null;
  const size = 270;
  const slam = outCubic(prog(s, CUE.lockup - 0.25, CUE.lockup));
  const [sx, sy] = squash(s, CUE.lockup, 0.2);
  const cmd = spring(s, CUE.lockCmd, 2.4, 0.42);
  const url = spring(s, CUE.lockUrl, 2.4, 0.42);
  const final = s >= CUE.finalHit ? Math.exp(-(s - CUE.finalHit) / 0.3) : 0;
  const k = kick(s);
  const baseline = DOT.y + DOT.r;
  const drift = lerp(1, 1.05, prog(s, CUE.lockup, 33.5));
  return (
    <div style={{ position: "absolute", inset: 0, transformOrigin: `${DOT.x - 330}px 600px`, transform: `scale(${drift})` }}>
      <Rings s={s} at={CUE.finalHit} x={DOT.x} y={DOT.y} />
      <div style={{ position: "absolute", right: 1920 - (DOT.x - DOT.r - 10), top: baseline - 0.864 * size, fontFamily: SANS, fontWeight: 900, fontSize: size, letterSpacing: -12, lineHeight: 1, color: C.fg, transformOrigin: `${DOT.x}px ${baseline}px`, transform: `translateX(${(1 - slam) * -260}px) scale(${sx}, ${sy})`, opacity: slam, filter: blur((1 - slam) * 10) }}>
        skills
      </div>
      {s >= CUE.lockup && (
        <div style={{ position: "absolute", left: DOT.x - DOT.r, top: DOT.y - DOT.r, width: DOT.r * 2, height: DOT.r * 2, borderRadius: "50%", background: C.blue, transform: `scale(${1 + final * 0.6 + k * 0.08})`, boxShadow: `0 0 ${20 + final * 60}px rgba(43,82,245,0.6)` }} />
      )}
      <div style={{ position: "absolute", left: 0, right: 0, top: 560, textAlign: "center", fontFamily: SANS, fontWeight: 800, fontSize: 68, letterSpacing: -2, color: C.fg }}>
        <Word s={s} at={CUE.lockTag}>
          AI skills for building software <span style={{ color: C.blue }}>factories.</span>
        </Word>
      </div>
      <div style={{ position: "absolute", left: 960, top: 740, transform: `translate(-50%,0) scale(${cmd})`, opacity: clamp(cmd * 2), display: "flex", alignItems: "center", gap: 22, padding: "26px 46px", borderRadius: 26, background: "#1a2350", border: "1px solid rgba(143,176,255,0.35)", boxShadow: `0 24px 60px rgba(26,42,99,0.3), 0 0 ${k * 30}px rgba(43,82,245,0.5)`, whiteSpace: "nowrap" }}>
        <span style={{ fontFamily: MONO, fontSize: 48, color: "#7c9bff" }}>$</span>
        <span style={{ fontFamily: MONO, fontSize: 48, color: "#fff" }}>{INSTALL_CMD}</span>
      </div>
      <div style={{ position: "absolute", left: 0, right: 0, top: 900, textAlign: "center", fontFamily: MONO, fontSize: 36, color: "#9aa6cc", transform: `scale(${url})`, opacity: clamp(url * 2) }}>github.com/dzhng/skills</div>
    </div>
  );
};
