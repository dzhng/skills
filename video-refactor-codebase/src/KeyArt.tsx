import React, { useEffect, useState } from "react";
import { AbsoluteFill, continueRender, delayRender } from "remotion";
import { CUE, COMMAND } from "./cues.ts";
import { C, MONO, SANS, fontsReady } from "./theme.ts";
import { World } from "./world/World.tsx";

// Key-art still for the headline, over the untangled board, the feature lifted as one piece.
export const KeyArt: React.FC = () => {
  const [handle] = useState(() => delayRender("fonts"));
  const [ready, setReady] = useState(false);
  useEffect(() => {
    fontsReady.then(() => {
      setReady(true);
      continueRender(handle);
    });
  }, [handle]);
  if (!ready) return null;
  return (
    <AbsoluteFill style={{ background: C.bg }}>
      <World s={CUE.slam + 1.4} />
      <AbsoluteFill style={{ background: "radial-gradient(ellipse at 50% 42%, rgba(4,6,14,0.35) 0%, rgba(4,6,14,0.8) 75%)" }} />
      <div style={{ position: "absolute", left: 0, right: 0, top: 210, textAlign: "center", fontFamily: SANS, fontWeight: 900, fontSize: 230, lineHeight: 0.98, letterSpacing: -10, color: "#fff", textShadow: "0 0 80px rgba(4,6,16,0.95)" }}>
        <div>One change.</div>
        <div style={{ color: C.periwinkle }}>One place.</div>
      </div>
      <div style={{ position: "absolute", left: 90, bottom: 80, fontFamily: SANS, fontWeight: 900, fontSize: 84, letterSpacing: -4, color: "#fff" }}>refactor<span style={{ color: C.periwinkle }}>-</span>codebase</div>
      <div style={{ position: "absolute", right: 90, bottom: 96, fontFamily: MONO, fontSize: 36, color: "#c9d4ff" }}>❯ {COMMAND}</div>
    </AbsoluteFill>
  );
};
