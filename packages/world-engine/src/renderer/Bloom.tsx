import { useFrame, useThree } from '@react-three/fiber';
import { useEffect, useRef } from 'react';
import { HalfFloatType, Vector2, WebGLRenderTarget } from 'three';
import { EffectComposer } from 'three/examples/jsm/postprocessing/EffectComposer.js';
import { OutputPass } from 'three/examples/jsm/postprocessing/OutputPass.js';
import { RenderPass } from 'three/examples/jsm/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/examples/jsm/postprocessing/UnrealBloomPass.js';

import { setGlowGain } from './glow';

const BLOOM_STRENGTH = 0.55;
const BLOOM_RADIUS = 0.4;
/** Only HDR accents (> 1.0 after the glow gain) bloom; the lit scene stays below it. */
const BLOOM_THRESHOLD = 1.0;
const GLOW_GAIN = 1.8;

/**
 * High-tier bloom (architecture.md §12): one composer per canvas, created once and kept across
 * scene switches. RenderPass → UnrealBloomPass → OutputPass on a 4× MSAA half-float target;
 * the canvas is `flat` (no tone mapping), so OutputPass only converts to sRGB. Priority 1 takes
 * over R3F's own render. Unmounting disposes every pass, the composer and its targets.
 */
export function Bloom() {
  const gl = useThree((state) => state.gl);
  const scene = useThree((state) => state.scene);
  const camera = useThree((state) => state.camera);
  const get = useThree((state) => state.get);
  const size = useThree((state) => state.size);
  const dpr = useThree((state) => state.viewport.dpr);
  const composer = useRef<EffectComposer | null>(null);

  useEffect(() => {
    const target = new WebGLRenderTarget(1, 1, { type: HalfFloatType, samples: 4 });
    const created = new EffectComposer(gl, target);
    const passes = [
      new RenderPass(scene, camera),
      new UnrealBloomPass(new Vector2(1, 1), BLOOM_STRENGTH, BLOOM_RADIUS, BLOOM_THRESHOLD),
      new OutputPass(),
    ];
    for (const pass of passes) created.addPass(pass);
    const { size: current, viewport } = get();
    created.setPixelRatio(viewport.dpr);
    created.setSize(current.width, current.height);
    composer.current = created;
    setGlowGain(GLOW_GAIN);
    return () => {
      if (composer.current === created) composer.current = null;
      setGlowGain(1);
      for (const pass of passes) pass.dispose();
      created.dispose();
    };
  }, [gl, scene, camera, get]);

  useEffect(() => {
    composer.current?.setPixelRatio(dpr);
    composer.current?.setSize(size.width, size.height);
  }, [size, dpr]);

  useFrame((_, delta) => {
    if (composer.current) composer.current.render(delta);
    else gl.render(scene, camera);
  }, 1);

  return null;
}
