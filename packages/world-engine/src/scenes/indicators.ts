import type { Mesh } from 'three';

import type { Vec3 } from '../templates/types';

/** Floating lantern-glow marker above every hotspot and portal. */
export const INDICATOR_SCALE: Vec3 = [0.2, 0.3, 0.2];
/** Emphasis when the avatar is within reach ("Buka") or the pointer hovers the hotspot. */
const NEARBY_EMPHASIS = 1.35;
const HOVER_EMPHASIS = 1.25;
const EMPHASIS_RATE = 12;

/**
 * Per-frame indicator motion: bob and spin (frozen on reduced motion) plus the nearby/hover
 * emphasis. Meshes carry `userData.baseY` and `userData.tagKey`; nothing re-renders React.
 */
export function updateIndicators(
  meshes: readonly (Mesh | null)[],
  time: number,
  delta: number,
  nearbyKey: string | null,
  hoverKey: string | null,
  reducedMotion: boolean,
): void {
  const blend = reducedMotion ? 1 : 1 - Math.exp(-EMPHASIS_RATE * Math.min(delta, 0.1));
  for (const mesh of meshes) {
    if (!mesh) continue;
    const baseY = mesh.userData.baseY as number;
    mesh.position.y = reducedMotion ? baseY : baseY + 0.08 * Math.sin(time * 2);
    mesh.rotation.y = reducedMotion ? 0 : time;
    const key = mesh.userData.tagKey as string | undefined;
    const target =
      key !== undefined && key === nearbyKey
        ? NEARBY_EMPHASIS
        : key !== undefined && key === hoverKey
          ? HOVER_EMPHASIS
          : 1;
    const current = (mesh.userData.emphasis as number | undefined) ?? 1;
    const emphasis = current + (target - current) * blend;
    mesh.userData.emphasis = emphasis;
    mesh.scale.set(
      INDICATOR_SCALE[0] * emphasis,
      INDICATOR_SCALE[1] * emphasis,
      INDICATOR_SCALE[2] * emphasis,
    );
  }
}
