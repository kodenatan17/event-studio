import { describe, expect, it } from 'vitest';

import { getSceneLayout } from '../templates/blockout';
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

  it('[FR-04] living-room: avatar cannot enter saka guru, sofa or table colliders', () => {
    const layout = getSceneLayout('blockout', 'living-room');
    if (!layout) throw new Error('living-room layout missing');
    const byId = new Map(layout.colliders.map((box) => [box.id, box]));
    // Footprints from the GLB build (`build_joglo_interior.py`): umpak 0.56 m, sofas, story table.
    const furniture: [string, number, number, number, number][] = [
      ['SAKA_GURU_1', -2.3, -2.35, 0.56, 0.56],
      ['SAKA_GURU_2', -2.3, 2.35, 0.56, 0.56],
      ['SAKA_GURU_3', 2.3, -2.35, 0.56, 0.56],
      ['SAKA_GURU_4', 2.3, 2.35, 0.56, 0.56],
      ['SOFA_LEFT', -4.5, 1.4, 0.84, 2.55],
      ['SOFA_RIGHT', 4.5, 1.4, 0.84, 2.55],
      ['STORY_TABLE', 0, 0.4, 2.1, 1.2],
    ];
    const colliders: Collider[] = furniture.map(([id, cx, cz, width, depth]) => {
      const box = byId.get(id);
      if (!box) throw new Error(`collider ${id} missing`);
      // The collider covers the solid furniture footprint.
      expect(box.minX, id).toBeLessThanOrEqual(cx - width / 2);
      expect(box.maxX, id).toBeGreaterThanOrEqual(cx + width / 2);
      expect(box.minZ, id).toBeLessThanOrEqual(cz - depth / 2);
      expect(box.maxZ, id).toBeGreaterThanOrEqual(cz + depth / 2);
      return box;
    });

    const starts = Object.values(layout.spawnPoints);
    for (const start of [...starts, [0, -3.6] as const, [-6, 0] as const, [6, 3] as const]) {
      for (const box of colliders) {
        const target = clampToFloor(
          [(box.minX + box.maxX) / 2, (box.minZ + box.maxZ) / 2],
          layout.floor,
          RADIUS,
        );
        let position: [number, number] = [start[0], start[1]];
        for (let frame = 0; frame < 450; frame += 1) {
          position = stepToward(position, target, 1 / 30, 2.6, layout.colliders, RADIUS).position;
          expect(isBlocked(position, [box], RADIUS), `${box.id} from ${start.join(',')}`).toBe(
            false,
          );
        }
      }
    }
  });
});
