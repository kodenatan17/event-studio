import { describe, expect, it } from 'vitest';

import type { Collider, Rect } from './walk';
import { clampToFloor, isBlocked, MAX_FRAME_DELTA, stepToward } from './walk';

const floor: Rect = { minX: -5, maxX: 5, minZ: -5, maxZ: 5 };
const table: Collider = { id: 'TABLE', minX: -1, maxX: 1, minZ: -0.5, maxZ: 0.5 };
const RADIUS = 0.3;

describe('walk', () => {
  it('[FR-04] never enters collider', () => {
    let position: [number, number] = [0, 4];
    const target: [number, number] = [0, -4];

    for (let frame = 0; frame < 600; frame += 1) {
      const result = stepToward(position, target, 1 / 30, 3, [table], RADIUS);
      expect(isBlocked(result.position, [table], RADIUS)).toBe(false);
      position = result.position;
    }
    // Straight through is blocked: the avatar waits at the table's near edge.
    expect(position[1]).toBeGreaterThanOrEqual(table.maxZ + RADIUS);
  });

  it('[FR-04] slides along a collider edge', () => {
    const result = stepToward([0, 0.81], [3, 0.5], 1 / 30, 3, [table], RADIUS);

    expect(result.blocked).toBe(true);
    expect(result.position[0]).toBeGreaterThan(0);
    expect(isBlocked(result.position, [table], RADIUS)).toBe(false);
  });

  it('[FR-04] target clamped to floor', () => {
    expect(clampToFloor([12, -9], floor)).toEqual([5, -5]);
    expect(clampToFloor([12, -9], floor, RADIUS)).toEqual([5 - RADIUS, -5 + RADIUS]);
    expect(clampToFloor([1, 2], floor)).toEqual([1, 2]);
  });

  it('[§8.4] delta clamped', () => {
    const afterLongPause = stepToward([0, 4], [0, -4], 30, 3, [], RADIUS);
    expect(afterLongPause.position[1]).toBeCloseTo(4 - 3 * MAX_FRAME_DELTA);

    const negative = stepToward([0, 4], [0, -4], -1, 3, [], RADIUS);
    expect(negative.position).toEqual([0, 4]);
  });

  it('[FR-04] arrives exactly at the target', () => {
    let position: [number, number] = [0, 0];
    let arrived = false;
    for (let frame = 0; frame < 100 && !arrived; frame += 1) {
      ({ position, arrived } = stepToward(position, [2, 2], 1 / 60, 3, [], RADIUS));
    }
    expect(arrived).toBe(true);
    expect(position).toEqual([2, 2]);
  });
});
