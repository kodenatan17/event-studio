import { describe, expect, it } from 'vitest';

import type { MotionEnv, MotionState } from './motion';
import { JUMP_DURATION, JUMP_HEIGHT, stepMotion, WALK_SPEED } from './motion';

const env: MotionEnv = {
  floor: { minX: -5, maxX: 5, minZ: -5, maxZ: 5 },
  colliders: [],
  radius: 0.3,
  reducedMotion: false,
};
const idle: MotionState = { position: [0, 0], yaw: 0, height: 0, verticalSpeed: 0 };
const FRAME = 1 / 60;

describe('motion', () => {
  it('[FR-04] directional input cancels the marker', () => {
    const step = stepMotion(idle, { direction: [1, 0], marker: [0, -3], jump: false }, env, 0.1);
    expect(step.clearMarker).toBe(true);
    expect(step.state.position[0]).toBeCloseTo(WALK_SPEED * 0.1);
    expect(step.state.position[1]).toBeCloseTo(0);
    expect(step.speed).toBeCloseTo(WALK_SPEED);

    // Without directional input the marker is followed and kept until arrival.
    const tap = stepMotion(idle, { direction: [0, 0], marker: [0, -3], jump: false }, env, 0.1);
    expect(tap.clearMarker).toBe(false);
    expect(tap.state.position[1]).toBeCloseTo(-WALK_SPEED * 0.1);

    // Half stick, half speed; the facing turns toward the heading, snapping on reduced motion.
    const half = stepMotion(idle, { direction: [0, 0.5], marker: null, jump: false }, env, 0.1);
    expect(half.speed).toBeCloseTo(WALK_SPEED / 2);
    const turned = stepMotion(
      idle,
      { direction: [1, 0], marker: null, jump: false },
      { ...env, reducedMotion: true },
      FRAME,
    );
    expect(turned.state.yaw).toBeCloseTo(Math.PI / 2);
    const eased = stepMotion(idle, { direction: [1, 0], marker: null, jump: false }, env, FRAME);
    expect(eased.state.yaw).toBeGreaterThan(0);
    expect(eased.state.yaw).toBeLessThan(Math.PI / 2);
  });

  it('[FR-04] jump only when grounded; returns to floor after 0.55 s', () => {
    let state = idle;
    let peak = 0;
    let landedAt = -1;
    const frames = Math.round(JUMP_DURATION / FRAME) + 2;
    for (let frame = 0; frame < frames; frame += 1) {
      // Jump is held every frame: only the grounded first frame starts one (no double jump).
      const step = stepMotion(state, { direction: [0, 0], marker: null, jump: true }, env, FRAME);
      if (frame === 0) expect(step.jumped).toBe(true);
      else if (landedAt < 0) expect(step.jumped).toBe(false);
      if (step.landed && landedAt < 0) landedAt = (frame + 1) * FRAME;
      state = step.state;
      peak = Math.max(peak, state.height);
      if (landedAt >= 0) break;
    }
    expect(peak).toBeCloseTo(JUMP_HEIGHT, 2);
    expect(landedAt).toBeGreaterThan(JUMP_DURATION - 2 * FRAME);
    expect(landedAt).toBeLessThanOrEqual(JUMP_DURATION + 2 * FRAME);
    expect(state).toMatchObject({ height: 0, verticalSpeed: 0 });

    // A zero-length frame right after take-off does not land.
    const takeOff = stepMotion(idle, { direction: [0, 0], marker: null, jump: true }, env, 0);
    expect(takeOff).toMatchObject({ jumped: true, landed: false });
    expect(takeOff.state.verticalSpeed).toBeGreaterThan(0);
  });
});
