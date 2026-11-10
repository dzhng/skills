import React, { useEffect, useState } from "react";
import { AbsoluteFill, Audio, continueRender, delayRender, staticFile, useCurrentFrame } from "remotion";
import { CUE, FPS, PREROLL } from "./cues.ts";
import { C, H, W, fontsReady } from "./theme.ts";
import { clamp, inCubic, prog, shake, xray } from "./anim.ts";
import { World } from "./world/World.tsx";
import { Claim, Findings, Lockup, StepHeader, Title, TugCount } from "./overlay/Type.tsx";

// Song time s = video time − PREROLL. The pre-roll holds the finished title
// card over the tangled board as the feed thumbnail, then blows into the tug.
export const POSTER_S = 9.2;

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
  const white = s < CUE.drop ? prog(s, CUE.drop - 0.2, CUE.drop - 0.02) : 1 - prog(s, CUE.drop, CUE.drop + 0.25);
  const flashes = [[CUE.slam, 0.2], [CUE.lockup, 0.25], [CUE.matchCut, 0.15], [CUE.xray, 0.2], ...CUE.fixes.slice(3).map((f) => [f.land, 0.12])].reduce((a, [t, g]) => a + (s >= t ? g * Math.exp(-(s - t) / 0.07) : 0), 0);
  const lockDark = prog(s, CUE.lockup - 0.05, CUE.lockup + 0.4);
  const titleDark = poster ? 0.45 : 0.45 * prog(s, CUE.drop, CUE.drop + 0.3) * (1 - prog(s, CUE.clear, CUE.clear + 0.4));
  return (
    <AbsoluteFill style={{ overflow: "hidden", background: C.bg }}>
      <AbsoluteFill style={{ transform: `translate(${x}px, ${y}px) rotate(${r}deg) scale(1.03)` }}>
        <World s={poster ? POSTER_S : s} />
        <AbsoluteFill style={{ background: "rgba(4,6,14,1)", opacity: titleDark + (CUE.slam <= s && s < CUE.lockup ? 0.2 * prog(s, CUE.slam, CUE.slam + 0.2) : 0) }} />
        <AbsoluteFill style={{ background: C.bg, opacity: lockDark * 0.82 }} />
        <AbsoluteFill style={{ willChange: "transform", transform: "translateZ(0)" }}>
          {poster || posterOut < 1 ? (
            <AbsoluteFill style={{ transform: `scale(${1 + posterOut * 0.4})`, opacity: 1 - posterOut, filter: `blur(${posterOut * 16}px)`, background: `rgba(4,6,14,${0.45 * (1 - posterOut)})` }}>
              <Title s={POSTER_S} poster />
            </AbsoluteFill>
          ) : null}
          {!poster && (
            <>
              <TugCount s={s} />
              <Title s={s} />
              <StepHeader s={s} />
              <Findings s={s} />
              <Claim s={s} />
              <Lockup s={s} />
            </>
          )}
        </AbsoluteFill>
      </AbsoluteFill>
      <AbsoluteFill style={{ background: "#f6f8ff", opacity: clamp(white), pointerEvents: "none" }} />
      <AbsoluteFill style={{ background: "#ffffff", opacity: clamp(flashes * 0.7), mixBlendMode: "screen" }} />
      <AbsoluteFill style={{ background: `radial-gradient(ellipse at 50% 50%, transparent 55%, rgba(2,3,10,${0.25 + xray(s) * 0.3}) 100%)` }} />
      <svg style={{ position: "absolute", inset: 0, mixBlendMode: "overlay", opacity: 0.18 }} width={W} height={H}>
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
