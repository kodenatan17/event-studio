/**
 * Deterministic tap-to-move on a rectangular walkable floor with axis-aligned colliders
 * (architecture.md §8.4: MVP waypoint movement; never clip through furniture).
 * Coordinates are floor-plane `[x, z]` in meters.
 */
export type Vec2 = readonly [number, number];

export interface Rect {
  minX: number;
  maxX: number;
  minZ: number;
  maxZ: number;
}

export interface Collider extends Rect {
  /** Suffix of the authored `COLLIDER_*` node. */
  id: string;
}

/** Longest simulated frame; long inactive tabs resume without teleporting (§8.4). */
export const MAX_FRAME_DELTA = 0.1;

const ARRIVE_EPSILON = 0.02;

export function clampToFloor(point: Vec2, floor: Rect, radius = 0): [number, number] {
  return [
    Math.min(Math.max(point[0], floor.minX + radius), floor.maxX - radius),
    Math.min(Math.max(point[1], floor.minZ + radius), floor.maxZ - radius),
  ];
}

export function isBlocked(point: Vec2, colliders: readonly Collider[], radius: number): boolean {
  return colliders.some(
    (box) =>
      point[0] > box.minX - radius &&
      point[0] < box.maxX + radius &&
      point[1] > box.minZ - radius &&
      point[1] < box.maxZ + radius,
  );
}

export interface StepResult {
  position: [number, number];
  arrived: boolean;
  /** True when a collider stopped (or deflected) the step. */
  blocked: boolean;
}

/**
 * Moves at most `speed * min(delta, MAX_FRAME_DELTA)` toward `target`. A blocked step slides
 * along one axis when possible, otherwise the avatar stops before entering the collider.
 */
export function stepToward(
  position: Vec2,
  target: Vec2,
  delta: number,
  speed: number,
  colliders: readonly Collider[],
  radius: number,
): StepResult {
  const dt = Math.min(Math.max(delta, 0), MAX_FRAME_DELTA);
  const dx = target[0] - position[0];
  const dz = target[1] - position[1];
  const distance = Math.hypot(dx, dz);
  if (distance <= ARRIVE_EPSILON) {
    return { position: [target[0], target[1]], arrived: true, blocked: false };
  }

  const step = Math.min(speed * dt, distance);
  const next: [number, number] = [
    position[0] + (dx / distance) * step,
    position[1] + (dz / distance) * step,
  ];
  if (!isBlocked(next, colliders, radius)) {
    return { position: next, arrived: step >= distance, blocked: false };
  }

  const slides: [number, number][] = [
    [next[0], position[1]],
    [position[0], next[1]],
  ];
  for (const slide of slides) {
    const moved = slide[0] !== position[0] || slide[1] !== position[1];
    if (moved && !isBlocked(slide, colliders, radius)) {
      return { position: slide, arrived: false, blocked: true };
    }
  }
  return { position: [position[0], position[1]], arrived: false, blocked: true };
}
