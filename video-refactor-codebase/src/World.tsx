// The world under the camera: a parallax grid, and each scene at its origin.
// Fast camera moves get a motion blur along their direction.
import React from "react";
import { AbsoluteFill } from "remotion";
import { FPS } from "./cues.ts";
import { C, H, W } from "./theme.ts";
import { ORIGIN, camera, placesAt, type Place } from "./camera.ts";
import { Atlas } from "./scenes/Atlas.tsx";
import { Scatter } from "./scenes/Scatter.tsx";
import { Guards } from "./scenes/Guards.tsx";
import { States } from "./scenes/States.tsx";
import { Giant } from "./scenes/Giant.tsx";
import { Tests } from "./scenes/Tests.tsx";
import { Weeks } from "./scenes/Weeks.tsx";

const SCENES: Record<Place, React.FC<{ s: number }>> = { atlas: Atlas, scatter: Scatter, guards: Guards, states: States, giant: Giant, tests: Tests, weeks: Weeks };

export const World: React.FC<{ s: number }> = ({ s }) => {
  const cam = camera(s);
  const prev = camera(s - 1 / FPS);
  const vx = (cam.x - prev.x) * cam.z, vy = (cam.y - prev.y) * cam.z;
  const blur = [Math.min(40, Math.abs(vx) * 0.35), Math.min(40, Math.abs(vy) * 0.35)];
  const moving = blur[0] > 0.6 || blur[1] > 0.6;
  // Two grid layers: dots at the world's depth, and larger crosses behind it.
  const grid = (size: number, depth: number) => {
    const z = 1 + (cam.z - 1) * depth;
    const g = size * z;
    return { size: g, x: W / 2 - cam.x * z * depth, y: H / 2 - cam.y * z * depth };
  };
  const near = grid(48, 1), far = grid(240, 0.45);
  return (
    <AbsoluteFill style={{ background: `radial-gradient(ellipse at 50% 40%, #0c1230 0%, ${C.bg} 75%)` }}>
      <AbsoluteFill style={{ backgroundImage: "linear-gradient(rgba(143,176,255,0.05) 2px, transparent 2px), linear-gradient(90deg, rgba(143,176,255,0.05) 2px, transparent 2px)", backgroundSize: `${far.size}px ${far.size}px`, backgroundPosition: `${far.x}px ${far.y}px` }} />
      <AbsoluteFill style={{ backgroundImage: "radial-gradient(circle, rgba(143,176,255,0.16) 1.6px, transparent 2px)", backgroundSize: `${near.size}px ${near.size}px`, backgroundPosition: `${near.x}px ${near.y}px` }} />
      {moving && (
        <svg width={0} height={0} style={{ position: "absolute" }}>
          <filter id="motion" x="-10%" y="-10%" width="120%" height="120%">
            <feGaussianBlur stdDeviation={`${blur[0].toFixed(2)} ${blur[1].toFixed(2)}`} />
          </filter>
        </svg>
      )}
      <AbsoluteFill style={{ filter: moving ? "url(#motion)" : undefined }}>
        <div style={{ position: "absolute", left: 0, top: 0, transformOrigin: "0 0", transform: `translate(${W / 2}px, ${H / 2}px) scale(${cam.z}) translate(${-cam.x}px, ${-cam.y}px)` }}>
          {placesAt(s).map((p) => {
            const Scene = SCENES[p];
            return (
              <div key={p} style={{ position: "absolute", left: ORIGIN[p][0], top: ORIGIN[p][1], width: W, height: H }}>
                <Scene s={s} />
              </div>
            );
          })}
        </div>
      </AbsoluteFill>
    </AbsoluteFill>
  );
};
