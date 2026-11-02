import { dampAngle } from './motion';
import { MAX_FRAME_DELTA, stepToward } from './walk';
import type { Vec2 } from './walk';

/** Unhurried guest pace (m/s), close enough to the walk clip's lowest speed not to slide. */
export const PATROL_SPEED = 1.5;
/** A guest closer than this stops a walker, who turns to them (m). */
export const YIELD_RADIUS = 1.1;
const MIN_PAUSE = 1;
const MAX_PAUSE = 3;
const TURN_RATE = 8;

export interface PatrolState {
  position: Vec2;
  yaw: number;
  /** Index of the waypoint it is walking to. */
  target: number;
  /** Seconds left standing at a waypoint. */
  pause: number;
}

export interface PatrolStep {
  state: PatrolState;
  /** m/s, for the walk blend. */
  speed: number;
}

/** Starts part way round the loop, so walkers of one room are never in step (`phase` 0..1). */
export function startPatrol(path: readonly Vec2[], phase: number, yaw: number): PatrolState {
  const start = Math.min(path.length - 1, Math.floor(phase * path.length));
  return {
    position: path[start] ?? [0, 0],
    yaw,
    target: (start + 1) % path.length,
    pause: phase * MAX_PAUSE,
  };
}

/**
 * One frame of a template walker on its closed waypoint loop, pure. Waypoints are authored clear of
 * colliders (checked in `blockout.test.ts`), so only the guest can interrupt it. A single-point path
 * stands. The guest is never blocked by a walker: nobody can be trapped in a doorway.
 */
export function stepPatrol(
  state: PatrolState,
  path: readonly Vec2[],
  guest: Vec2 | null,
  delta: number,
  random: () => number,
): PatrolStep {
  const dt = Math.min(Math.max(delta, 0), MAX_FRAME_DELTA);
  const goal = path[state.target];
  if (path.length < 2 || !goal) return { state, speed: 0 };

  const [x, z] = state.position;
  if (guest && Math.hypot(guest[0] - x, guest[1] - z) < YIELD_RADIUS) {
    const yaw = dampAngle(state.yaw, Math.atan2(guest[0] - x, guest[1] - z), TURN_RATE, dt);
    return { state: { ...state, yaw }, speed: 0 };
  }
  if (state.pause > 0) {
    return { state: { ...state, pause: Math.max(0, state.pause - dt) }, speed: 0 };
  }

  const step = stepToward(state.position, goal, dt, PATROL_SPEED, [], 0);
  const yaw = dampAngle(state.yaw, Math.atan2(goal[0] - x, goal[1] - z), TURN_RATE, dt);
  if (!step.arrived)
    return { state: { ...state, position: step.position, yaw }, speed: PATROL_SPEED };
  return {
    state: {
      position: step.position,
      yaw,
      target: (state.target + 1) % path.length,
      pause: MIN_PAUSE + random() * (MAX_PAUSE - MIN_PAUSE),
    },
    speed: 0,
  };
}
