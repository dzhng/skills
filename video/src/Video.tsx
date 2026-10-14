import React, { useEffect, useState } from "react";
import { AbsoluteFill, Audio, continueRender, delayRender, staticFile, useCurrentFrame } from "remotion";
import { CUE, FPS, PREROLL } from "./cues.ts";
import { C, H, W, fontsReady } from "./theme.ts";
import { clamp, inCubic, inOutCubic, lerp, night, prog, shake } from "./anim.ts";
import { LOCKUP_BG, World } from "./world/World.tsx";
import { Choices, CommandTags, StepHeaders, DOT, Install, Lockup, Proof } from "./overlay/Type.tsx";

// Song time s = video time − PREROLL. The pre-roll holds the finished install
// over the aerial world as the feed thumbnail, then blows into the fog.
const POSTER_S = 7.95;

export const LaunchVideo: React.FC = () => {
  const frame = useCurrentFrame();
  const s = frame / FPS - PREROLL;
  const [handle] = useState(() => delayRender("fonts"));
  const [ready, setReady] = useState(false);
  useEffect(() => {
    fontsReady.then(() => {
      setReady(true);
      continueRender(handle);
    });
  }, [handle]);
  if (!ready) return null;

  const { x, y, r } = shake(s);
  const poster = s < 0;
  const posterOut = inCubic(prog(s, 0, 0.25));
  // Lockup: the camera climbs straight up, then the whole world shrinks into
  // the wordmark's period.
  const clipR = lerp(1300, 250, inOutCubic(prog(s, CUE.collapse[0], CUE.collapse[0] + 0.2)));
  const shrink = inOutCubic(prog(s, CUE.collapse[0] + 0.1, CUE.collapse[1]));
  const k = lerp(1, DOT.r / 235, shrink);
  const toBlue = prog(s, CUE.collapse[1] - 0.1, CUE.collapse[1]);
  const flatBg = prog(s, CUE.collapse[0] - 0.3, CUE.collapse[0]);
  const white = s < CUE.drop ? prog(s, 3.8, 3.98) : 1 - prog(s, CUE.drop, CUE.drop + 0.2);
  const flashes = [[CUE.slam, 0.12], [CUE.dawn, 0.5], [CUE.lockup, 0.3]].reduce((a, [t, g]) => a + (s >= t ? g * Math.exp(-(s - t) / 0.07) : 0), 0);
  return (
    <AbsoluteFill style={{ overflow: "hidden", background: "radial-gradient(ellipse at 50% 30%, #161c30 0%, #0b0e19 55%, #04050a 100%)" }}>
      <AbsoluteFill style={{ background: LOCKUP_BG, opacity: flatBg }} />
      <AbsoluteFill style={{ transform: `translate(${x}px, ${y}px) rotate(${r}deg) scale(1.03)` }}>
        {s < CUE.collapse[1] && (
          <AbsoluteFill style={{ zIndex: 0, isolation: "isolate", clipPath: s > CUE.collapse[0] ? `circle(${clipR}px at 960px 540px)` : undefined, transformOrigin: "960px 540px", transform: shrink > 0 ? `translate(${(DOT.x - 960) * shrink}px, ${(DOT.y - 540) * shrink}px) scale(${k})` : undefined }}>
            <World s={poster ? POSTER_S : s} />
            <AbsoluteFill style={{ background: C.blue, opacity: toBlue, borderRadius: "50%" }} />
            <AbsoluteFill style={{ background: "linear-gradient(0deg, rgba(6,10,36,0.85) 0%, rgba(6,10,36,0) 45%)", opacity: prog(s, CUE.timelapse[0] - 0.2, CUE.timelapse[0]) * (1 - prog(s, CUE.slam, CUE.slam + 0.1)) }} />
            <AbsoluteFill style={{ background: "radial-gradient(ellipse at 50% 45%, rgba(6,10,36,0.75) 0%, rgba(6,10,36,0.35) 70%)", opacity: prog(s, CUE.slam, CUE.slam + 0.2) * (1 - prog(s, CUE.dawn - 0.2, CUE.dawn)) }} />
          </AbsoluteFill>
        )}
        <AbsoluteFill style={{ zIndex: 1, willChange: "transform", transform: "translateZ(0)" }}>
        {poster || posterOut < 1 ? (
          <AbsoluteFill style={{ transform: `scale(${1 + posterOut * 0.5})`, opacity: 1 - posterOut, filter: `blur(${posterOut * 16}px)` }}>
            <Install s={POSTER_S} poster />
          </AbsoluteFill>
        ) : null}
        {!poster && (
          <>
            <Install s={s} />
            <CommandTags s={s} />
            <StepHeaders s={s} />
            <Proof s={s} />
            <Choices s={s} />
            <Lockup s={s} />
          </>
        )}
        </AbsoluteFill>
      </AbsoluteFill>
      <AbsoluteFill style={{ background: "#f6f8ff", opacity: clamp(white), pointerEvents: "none" }} />
      <AbsoluteFill style={{ background: "#ffffff", opacity: clamp(flashes * 0.7), mixBlendMode: "screen" }} />
      <AbsoluteFill style={{ background: `radial-gradient(ellipse at 50% 50%, transparent 55%, rgba(8,14,50,${0.12 + night(s) * 0.3}) 100%)` }} />
      <svg style={{ position: "absolute", inset: 0, mixBlendMode: "overlay", opacity: 0.2 }} width={W} height={H}>
        <filter id="grain">
          <feTurbulence type="fractalNoise" baseFrequency="0.85" numOctaves="2" seed={frame % 30} stitchTiles="stitch" />
          <feColorMatrix type="saturate" values="0" />
        </filter>
        <rect width={W} height={H} filter="url(#grain)" />
      </svg>
      <Audio src={staticFile("soundtrack.wav")} />
    </AbsoluteFill>
  );
};
