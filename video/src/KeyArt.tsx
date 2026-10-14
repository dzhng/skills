import React, { useEffect, useState } from "react";
import { AbsoluteFill, continueRender, delayRender } from "remotion";
import { C, MONO, SANS, fontsReady } from "./theme.ts";
import { World } from "./world/World.tsx";

// Key-art still for the headline, over the finished night factory.
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
    <AbsoluteFill style={{ background: C.night }}>
      <World s={24.5} />
      <AbsoluteFill style={{ background: "radial-gradient(ellipse at 50% 42%, rgba(10,16,48,0.2) 0%, rgba(10,16,48,0.75) 70%)" }} />
      <div style={{ position: "absolute", left: 0, right: 0, top: 200, textAlign: "center", fontFamily: SANS, fontWeight: 900, fontSize: 250, lineHeight: 0.95, letterSpacing: -11, color: "#fff", textShadow: "0 0 80px rgba(91,141,239,0.95)" }}>
        <div>The factory</div>
        <div style={{ color: C.periwinkle }}>runs itself.</div>
      </div>
      <div style={{ position: "absolute", left: 90, bottom: 80, fontFamily: SANS, fontWeight: 900, fontSize: 96, letterSpacing: -4, color: "#fff" }}>skills<span style={{ color: C.blue }}>.</span></div>
      <div style={{ position: "absolute", right: 90, bottom: 96, fontFamily: MONO, fontSize: 34, color: "#c9d4ff" }}>npx skills add dzhng/skills</div>
    </AbsoluteFill>
  );
};
