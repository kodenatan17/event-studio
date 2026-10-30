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

/** Longest collision sub-step (m); well under the 0.6 m width of a radius-expanded collider. */
const MAX_SUB_STEP = 0.2;
/** Bisections closing a head-on gap: ≤ 0.2 m / 64 ≈ 3 mm short of contact. */
const CONTACT_ITERATIONS = 6;

/**
 * Free movement (keyboard/joystick, FR-04) that never clips (§8.4): the clamped frame move is
 * split into sub-steps of ≤ 0.2 m; each tries the full step, then x only, then z only (sliding
 * along walls and furniture). When none is free the avatar closes the gap to the obstacle by
 * bisection and stops. `direction` sets the heading only.
 */
export function moveWithCollisions(
  position: Vec2,
  direction: Vec2,
  speed: number,
  delta: number,
  floor: Rect,
  colliders: readonly Collider[],
  radius: number,
): [number, number] {
  const dt = Math.min(Math.max(delta, 0), MAX_FRAME_DELTA);
  const length = Math.hypot(direction[0], direction[1]);
  let x = position[0];
  let z = position[1];
  const distance = Math.max(speed, 0) * dt;
  if (length < 1e-9 || distance <= 0) return [x, z];

  const steps = Math.ceil(distance / MAX_SUB_STEP);
  const sx = (direction[0] / length) * (distance / steps);
  const sz = (direction[1] / length) * (distance / steps);
  for (let step = 0; step < steps; step += 1) {
    const candidates: Vec2[] = [
      [x + sx, z + sz],
      [x + sx, z],
      [x, z + sz],
    ];
    let moved = false;
    for (const candidate of candidates) {
      const next = clampToFloor(candidate, floor, radius);
      if ((next[0] !== x || next[1] !== z) && !isBlocked(next, colliders, radius)) {
        [x, z] = next;
        moved = true;
        break;
      }
    }
    if (!moved) {
      // Head-on: the start is free and colliders are wider than a sub-step, so the free part of
      // the step is one interval from 0; bisect its end instead of stopping a sub-step short.
      let free = 0;
      let blocked = 1;
      for (let iteration = 0; iteration < CONTACT_ITERATIONS; iteration += 1) {
        const mid = (free + blocked) / 2;
        const probe = clampToFloor([x + sx * mid, z + sz * mid], floor, radius);
        if (isBlocked(probe, colliders, radius)) blocked = mid;
        else free = mid;
      }
      if (free > 0) [x, z] = clampToFloor([x + sx * free, z + sz * free], floor, radius);
      break;
    }
  }
  return clampToFloor([x, z], floor, radius);
}
