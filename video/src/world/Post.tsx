// The lens: ambient occlusion, depth of field, bloom, chromatic aberration,
// filmic tone mapping, vignette and grain, all driven by song time.
// Built imperatively and rendered from our own frame callback, because
// Remotion advances R3F manually and a React-assembled composer draws nothing.
import { useMemo } from "react";
import * as THREE from "three";
import { useFrame, useThree } from "@react-three/fiber";
import {
  BlendFunction, BloomEffect, ChromaticAberrationEffect, DepthOfFieldEffect, EffectComposer, EffectPass,
  NoiseEffect, RenderPass, ToneMappingEffect, ToneMappingMode, VignetteEffect,
} from "postprocessing";
import { N8AOPostPass } from "n8ao";
import { CUE } from "../cues.ts";
import { IMPACTS, kick, lerp, prog } from "../anim.ts";
import { cameraAt } from "./camera.ts";
import { H, W } from "../theme.ts";

export const Post: React.FC<{ s: number; n: number }> = ({ s, n }) => {
  const { gl, scene, camera } = useThree();
  const fx = useMemo(() => {
    const composer = new EffectComposer(gl, { frameBufferType: THREE.HalfFloatType });
    composer.addPass(new RenderPass(scene, camera));
    const ao = new N8AOPostPass(scene, camera, W, H);
    ao.configuration.aoRadius = 1.6;
    ao.configuration.distanceFalloff = 1.2;
    ao.configuration.halfRes = true;
    ao.setQualityMode("High");
    composer.addPass(ao);
    const dof = new DepthOfFieldEffect(camera, { focalLength: 0.02, bokehScale: 0, height: 540 });
    const bloom = new BloomEffect({ mipmapBlur: true, intensity: 1, luminanceThreshold: 0.8, luminanceSmoothing: 0.2, radius: 0.75 });
    const ca = new ChromaticAberrationEffect({ offset: new THREE.Vector2(), radialModulation: true, modulationOffset: 0.35 });
    const tone = new ToneMappingEffect({ mode: ToneMappingMode.NEUTRAL });
    const vignette = new VignetteEffect({ offset: 0.32, darkness: 0.4 });
    const noise = new NoiseEffect({ premultiply: true, blendFunction: BlendFunction.SOFT_LIGHT });
    noise.blendMode.opacity.value = 0.1;
    // Depth of field needs its own pass; chromatic aberration must not share one with convolution effects.
    composer.addPass(new EffectPass(camera, dof));
    composer.addPass(new EffectPass(camera, bloom));
    composer.addPass(new EffectPass(camera, ca, tone, vignette, noise));
    composer.setSize(W, H);
    return { composer, ao, dof, bloom, ca, vignette };
  }, [gl, scene, camera]);

  // Per-frame parameters from song time.
  const hit = IMPACTS.reduce((a, [t, g]) => a + (s >= t ? g * Math.exp(-(s - t) / 0.18) : 0), 0);
  const lockup = prog(s, CUE.collapse[0] - 0.3, CUE.collapse[0]);
  const { look, pos } = cameraAt(s);
  const low = Math.exp(-Math.max(0, pos[1] - 4) / 5);
  fx.ao.configuration.intensity = lerp(2.6, 1.6, n) * (1 - lockup);
  fx.dof.target = new THREE.Vector3(look[0], look[1], look[2]);
  fx.dof.bokehScale = lerp(0, 2.5, low) * prog(s, CUE.drop, CUE.drop + 0.1) * (1 - prog(s, CUE.dawn - 0.3, CUE.dawn));
  fx.bloom.intensity = lerp(0.5, 0.9, n) + hit * 0.8 + kick(s) * 0.12 * n;
  fx.bloom.luminanceMaterial.threshold = lerp(0.92, 0.8, n);
  const ca = 0.0005 + hit * 0.004 + kick(s) * 0.0004;
  fx.ca.offset.set(ca, ca * 0.6);
  fx.vignette.darkness = lerp(0.35, 0.65, n) * (1 - lockup);

  useFrame(() => {
    fx.composer.render();
  }, 1);
  return null;
};
