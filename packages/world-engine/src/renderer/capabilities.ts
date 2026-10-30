import { useSyncExternalStore } from 'react';

import type { QualityProfile } from '../scene-manager/store';

/** Upper bound for the canvas pixel ratio on high-DPR phones (architecture.md §8.1, §12). */
export const MAX_DPR = 1.75;

/** three.js r163+ renders through WebGL 2 only; probe it before mounting the canvas (FR-01). */
export function detectWebGL(): boolean {
  if (typeof document === 'undefined') return false;
  try {
    const canvas = document.createElement('canvas');
    const gl = canvas.getContext('webgl2');
    if (!gl) return false;
    // Release the probe context right away; browsers cap live contexts.
    gl.getExtension('WEBGL_lose_context')?.loseContext();
    return true;
  } catch {
    return false;
  }
}

/** Low tier renders at DPR 1; otherwise adaptive between 1 and the device ratio, capped. */
export function resolveDpr(quality: QualityProfile): number | [number, number] {
  if (quality === 'low') return 1;
  const deviceRatio = typeof window === 'undefined' ? 1 : window.devicePixelRatio || 1;
  return [1, Math.max(1, Math.min(deviceRatio, MAX_DPR))];
}

const REDUCED_MOTION_QUERY = '(prefers-reduced-motion: reduce)';
const COARSE_POINTER_QUERY = '(pointer: coarse)';

function subscribeMedia(media: string, onChange: () => void): () => void {
  if (typeof window === 'undefined' || !window.matchMedia) return () => {};
  const query = window.matchMedia(media);
  query.addEventListener('change', onChange);
  return () => query.removeEventListener('change', onChange);
}

function matchesMedia(media: string): boolean {
  return typeof window !== 'undefined' && !!window.matchMedia?.(media).matches;
}

const subscribeReducedMotion = (onChange: () => void) =>
  subscribeMedia(REDUCED_MOTION_QUERY, onChange);
const getReducedMotion = () => matchesMedia(REDUCED_MOTION_QUERY);
const subscribeCoarsePointer = (onChange: () => void) =>
  subscribeMedia(COARSE_POINTER_QUERY, onChange);
const getCoarsePointer = () => matchesMedia(COARSE_POINTER_QUERY);

/** `prefers-reduced-motion` (architecture.md §12); false during SSR. */
export function usePrefersReducedMotion(): boolean {
  return useSyncExternalStore(subscribeReducedMotion, getReducedMotion, () => false);
}

/** Touch-first device (`pointer: coarse`): phones and tablets get the base tier; false during SSR. */
export function usePointerCoarse(): boolean {
  return useSyncExternalStore(subscribeCoarsePointer, getCoarsePointer, () => false);
}

/** What the renderer may afford (architecture.md §12 quality tiers). */
export interface RenderTier {
  /** UnrealBloom post-processing. */
  bloom: boolean;
  /** MeshPhysical materials (sheen, clearcoat) instead of MeshStandard. */
  physicalMaterials: boolean;
  /** Generated texture size (px). */
  textureSize: 256 | 512;
}

export interface RenderTierInput {
  quality: QualityProfile;
  coarsePointer: boolean;
  reducedMotion: boolean;
  /** SwiftShader/llvmpipe: too slow for post-processing unless quality is forced `high`. */
  softwareRenderer: boolean;
}

/**
 * Bloom only on capable desktops: never on `low`, touch-first devices or reduced motion, and on a
 * software renderer only when quality is explicitly `high`. Physical materials and 512 px
 * textures follow the same rule without the reduced-motion term.
 */
export function resolveRenderTier({
  quality,
  coarsePointer,
  reducedMotion,
  softwareRenderer,
}: RenderTierInput): RenderTier {
  const capable = quality !== 'low' && !coarsePointer && (quality === 'high' || !softwareRenderer);
  return {
    bloom: capable && !reducedMotion,
    physicalMaterials: capable,
    textureSize: capable ? 512 : 256,
  };
}

const SOFTWARE_RENDERER = /swiftshader|llvmpipe|software/i;

/** The part of `WebGLRenderer` the probe needs (a fake in tests). */
interface RendererLike {
  getContext(): {
    getExtension(name: string): unknown;
    getParameter(parameter: number): unknown;
    readonly RENDERER: number;
  };
}

/** True for software rasterisers; a masked renderer string (e.g. Firefox) counts as hardware. */
export function isSoftwareRenderer(renderer: RendererLike): boolean {
  try {
    const context = renderer.getContext();
    const info = context.getExtension('WEBGL_debug_renderer_info') as {
      UNMASKED_RENDERER_WEBGL: number;
    } | null;
    const name = context.getParameter(info ? info.UNMASKED_RENDERER_WEBGL : context.RENDERER);
    return typeof name === 'string' && SOFTWARE_RENDERER.test(name);
  } catch {
    return false;
  }
}
