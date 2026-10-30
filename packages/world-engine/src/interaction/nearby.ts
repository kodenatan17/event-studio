import type { WorldAction } from '@undangan/contracts/world';

import type { Vec2 } from '../navigation/walk';
import type { Vec3 } from '../templates/types';
import type { InteractiveTag } from './registry';

/**
 * Reach (m) for "Buka" / E. The akad table's footprint edge is 1.7 m from the nearest free floor
 * point in front of the canopy; a blockout test guards that every interactable is reachable.
 */
export const INTERACT_RADIUS = 1.8;

/** A hotspot or portal with its floor footprint (axis-aligned box in `[x, z]`). */
export interface Interactable {
  tag: InteractiveTag;
  action: WorldAction;
  min: Vec2;
  max: Vec2;
}

/** Floor AABB of a box placed at `position` with `size`, rotated by `rotationY`. */
export function footprintAabb(
  position: Vec3,
  size: Vec3,
  rotationY = 0,
): { min: [number, number]; max: [number, number] } {
  const cos = Math.abs(Math.cos(rotationY));
  const sin = Math.abs(Math.sin(rotationY));
  const halfX = (cos * size[0] + sin * size[2]) / 2;
  const halfZ = (sin * size[0] + cos * size[2]) / 2;
  return {
    min: [position[0] - halfX, position[2] - halfZ],
    max: [position[0] + halfX, position[2] + halfZ],
  };
}

/** Distance from a floor point to a footprint (0 inside). */
export function distanceToFootprint(point: Vec2, box: { min: Vec2; max: Vec2 }): number {
  const dx = Math.max(box.min[0] - point[0], 0, point[0] - box.max[0]);
  const dz = Math.max(box.min[1] - point[1], 0, point[1] - box.max[1]);
  return Math.hypot(dx, dz);
}

/**
 * Closest interactable within `radius` of the avatar (§3.4); equal distances fall back to the
 * lower id, the same rule as `pickInteractive` for overlapping hotspots (§8.3).
 */
export function nearestInteractable(
  point: Vec2,
  list: readonly Interactable[],
  radius = INTERACT_RADIUS,
): Interactable | null {
  let best: Interactable | null = null;
  let bestDistance = Infinity;
  for (const item of list) {
    const distance = distanceToFootprint(point, item);
    if (distance > radius) continue;
    if (
      distance < bestDistance ||
      (distance === bestDistance && best !== null && item.tag.id < best.tag.id)
    ) {
      best = item;
      bestDistance = distance;
    }
  }
  return best;
}

/** Stable key of a tag (`hotspot:story-book`), for hover/nearby comparisons. */
export function tagKey(tag: InteractiveTag): string {
  return `${tag.kind}:${tag.id}`;
}
