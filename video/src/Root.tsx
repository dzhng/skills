import React from "react";
import { Composition, Still } from "remotion";
import { DURATION, FPS } from "./cues.ts";
import { H, W } from "./theme.ts";
import { LaunchVideo } from "./Video.tsx";
import { KeyArt } from "./KeyArt.tsx";

export const Root: React.FC = () => (
  <>
    <Composition id="LaunchVideo" component={LaunchVideo} durationInFrames={Math.round(DURATION * FPS)} fps={FPS} width={W} height={H} />
    <Still id="KeyArt" component={KeyArt} width={W} height={H} />
  </>
);
