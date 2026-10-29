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

function subscribeReducedMotion(onChange: () => void): () => void {
  if (typeof window === 'undefined' || !window.matchMedia) return () => {};
  const query = window.matchMedia(REDUCED_MOTION_QUERY);
  query.addEventListener('change', onChange);
  return () => query.removeEventListener('change', onChange);
}

function getReducedMotion(): boolean {
  return typeof window !== 'undefined' && !!window.matchMedia?.(REDUCED_MOTION_QUERY).matches;
}

/** `prefers-reduced-motion` (architecture.md §12); false during SSR. */
export function usePrefersReducedMotion(): boolean {
  return useSyncExternalStore(subscribeReducedMotion, getReducedMotion, () => false);
}
