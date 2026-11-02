import { describe, expect, it } from 'vitest';

import { PATROL_SPEED, startPatrol, stepPatrol, YIELD_RADIUS } from './patrol';
import type { PatrolState } from './patrol';
import type { Vec2 } from './walk';

const LOOP: readonly Vec2[] = [
  [0, 0],
  [2, 0],
  [2, 2],
];
const FRAME = 1 / 30;
const never = () => 0;

function run(state: PatrolState, seconds: number, guest: Vec2 | null = null): PatrolState {
  let current = state;
  for (let t = 0; t < seconds; t += FRAME) {
    current = stepPatrol(current, LOOP, guest, FRAME, never).state;
  }
  return current;
}

describe('stepPatrol', () => {
  it('[D-037] walks to the next waypoint at the patrol speed', () => {
    const start = startPatrol(LOOP, 0, 0);
    const { state, speed } = stepPatrol(start, LOOP, null, FRAME, never);
    expect(speed).toBe(PATROL_SPEED);
    expect(state.position[0]).toBeCloseTo(PATROL_SPEED * FRAME);
    expect(state.position[1]).toBeCloseTo(0);
  });

  it('[D-037] pauses at a waypoint, then goes on to the next and round the loop', () => {
    const arrived = run(startPatrol(LOOP, 0, 0), 2 / PATROL_SPEED + 0.05);
    expect(arrived.position).toEqual([2, 0]);
    expect(arrived.target).toBe(2);
    expect(arrived.pause).toBeGreaterThan(0.5);
    expect(stepPatrol(arrived, LOOP, null, FRAME, never).speed).toBe(0);
    const targets = new Set<number>();
    let lapping = arrived;
    for (let t = 0; t < 14; t += FRAME) {
      lapping = stepPatrol(lapping, LOOP, null, FRAME, never).state;
      targets.add(lapping.target);
    }
    expect(targets).toEqual(new Set([0, 1, 2]));
  });

  it('[D-037] stops and turns to a guest in reach, and walks on when they leave', () => {
    const walking = run(startPatrol(LOOP, 0, 0), 0.4);
    const guest: Vec2 = [walking.position[0], walking.position[1] + YIELD_RADIUS - 0.1];
    const held = run(walking, 1, guest);
    expect(held.position).toEqual(walking.position);
    expect(Math.abs(held.yaw)).toBeLessThan(0.05);
    expect(stepPatrol(held, LOOP, [9, 9], FRAME, never).speed).toBe(PATROL_SPEED);
  });

  it('[D-037] a one-point path stands still', () => {
    const path: readonly Vec2[] = [[1, 1]];
    const state = startPatrol(path, 0.5, 0.4);
    expect(state.position).toEqual([1, 1]);
    expect(stepPatrol(state, path, [1, 1.5], FRAME, never)).toEqual({ state, speed: 0 });
  });

  it('[D-037] a long frame never jumps past the clamp', () => {
    const { state } = stepPatrol(startPatrol(LOOP, 0, 0), LOOP, null, 30, never);
    expect(state.position[0]).toBeCloseTo(PATROL_SPEED * 0.1);
  });

  it('[D-037] phase starts walkers apart on the loop', () => {
    expect(startPatrol(LOOP, 0.7, 0).position).toEqual([2, 2]);
    expect(startPatrol(LOOP, 0.7, 0).target).toBe(0);
    expect(startPatrol(LOOP, 1, 0).position).toEqual([2, 2]);
  });
});
