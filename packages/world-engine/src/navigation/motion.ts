import type { Collider, Rect, Vec2 } from './walk';
import { MAX_FRAME_DELTA, moveWithCollisions, stepToward } from './walk';

/** Avatar walking speed (m/s) at full stick or key input. */
export const WALK_SPEED = 2.6;
/** Jump apex (m) and airtime (s): v0 = 4H/T, g = 8H/T², so h(T) = 0. */
export const JUMP_HEIGHT = 0.45;
export const JUMP_DURATION = 0.55;
const JUMP_VELOCITY = (4 * JUMP_HEIGHT) / JUMP_DURATION;
const GRAVITY = (8 * JUMP_HEIGHT) / (JUMP_DURATION * JUMP_DURATION);
/** Facing damping rate (1/s). */
const TURN_RATE = 14;

export interface MotionState {
  /** Ground position `[x, z]`; the follow camera tracks it, so jumps never bob the view. */
  position: Vec2;
  /** Facing (rad); 0 faces +z. */
  yaw: number;
  /** Jump height above the floor (m). */
  height: number;
  verticalSpeed: number;
}

export interface MotionInput {
  /** Camera-relative floor direction with magnitude 0..1 (keyboard + joystick). */
  direction: Vec2;
  /** Tap-to-move target, or `null`. */
  marker: Vec2 | null;
  /** A jump was requested this frame. */
  jump: boolean;
}

export interface MotionEnv {
  floor: Rect;
  colliders: readonly Collider[];
  radius: number;
  /** Snap the facing instead of easing it (`prefers-reduced-motion`). */
  reducedMotion: boolean;
}

export interface MotionStep {
  state: MotionState;
  /** Planar speed this frame (m/s), for the animator. */
  speed: number;
  /** The marker was reached, blocked or overridden by directional input. */
  clearMarker: boolean;
  jumped: boolean;
  landed: boolean;
}

/** Shortest-arc exponential damping toward `target`, result in (−π, π]. */
function dampAngle(current: number, target: number, rate: number, dt: number): number {
  const turn = Math.atan2(Math.sin(target - current), Math.cos(target - current));
  const next = current + turn * (1 - Math.exp(-rate * dt));
  return Math.atan2(Math.sin(next), Math.cos(next));
}

/**
 * One avatar frame (FR-04, §8.4), pure. Directional input wins over the tap marker; horizontal
 * motion always goes through the colliders (they are floor footprints, so a jump never clears
 * furniture). Jumps start only from the ground; there is no double jump.
 */
export function stepMotion(
  state: MotionState,
  input: MotionInput,
  env: MotionEnv,
  delta: number,
): MotionStep {
  const dt = Math.min(Math.max(delta, 0), MAX_FRAME_DELTA);
  const [dx, dz] = input.direction;
  const magnitude = Math.min(1, Math.hypot(dx, dz));

  let position: Vec2 = state.position;
  let heading: number | null = null;
  let clearMarker = false;
  if (magnitude > 0) {
    position = moveWithCollisions(
      state.position,
      input.direction,
      WALK_SPEED * magnitude,
      dt,
      env.floor,
      env.colliders,
      env.radius,
    );
    heading = Math.atan2(dx, dz);
    clearMarker = input.marker !== null;
  } else if (input.marker) {
    const result = stepToward(
      state.position,
      input.marker,
      dt,
      WALK_SPEED,
      env.colliders,
      env.radius,
    );
    const mx = result.position[0] - state.position[0];
    const mz = result.position[1] - state.position[1];
    const moved = Math.abs(mx) + Math.abs(mz) > 1e-6;
    position = result.position;
    if (moved) heading = Math.atan2(mx, mz);
    clearMarker = result.arrived || !moved;
  }

  let yaw = state.yaw;
  if (heading !== null) {
    yaw = env.reducedMotion ? heading : dampAngle(state.yaw, heading, TURN_RATE, dt);
  }

  let { height, verticalSpeed } = state;
  let jumped = false;
  let landed = false;
  if (input.jump && height <= 0 && verticalSpeed === 0) {
    verticalSpeed = JUMP_VELOCITY;
    jumped = true;
  }
  if (height > 0 || verticalSpeed !== 0) {
    height += verticalSpeed * dt - 0.5 * GRAVITY * dt * dt;
    verticalSpeed -= GRAVITY * dt;
    if (height <= 0 && verticalSpeed <= 0) {
      height = 0;
      verticalSpeed = 0;
      landed = true;
    }
  }

  const travelled = Math.hypot(position[0] - state.position[0], position[1] - state.position[1]);
  return {
    state: { position, yaw, height, verticalSpeed },
    speed: dt > 0 ? travelled / dt : 0,
    clearMarker,
    jumped,
    landed,
  };
}
