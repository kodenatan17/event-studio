import { describe, expect, it } from 'vitest';

import { getSceneLayout } from '../templates/blockout';
import type { Collider, Rect } from './walk';
import { clampToFloor, isBlocked, MAX_FRAME_DELTA, moveWithCollisions, stepToward } from './walk';

const floor: Rect = { minX: -5, maxX: 5, minZ: -5, maxZ: 5 };
const table: Collider = { id: 'TABLE', minX: -1, maxX: 1, minZ: -0.5, maxZ: 0.5 };
const RADIUS = 0.3;

/** mulberry32: deterministic random sequence for the property test. */
function random(seed: number): () => number {
  let state = seed >>> 0;
  return () => {
    state = (state + 0x6d2b79f5) >>> 0;
    let t = state;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

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

  it('[§8.4] moveWithCollisions slides per axis', () => {
    // Pushing diagonally into the table's near face slides along x, z stays at the face.
    const start: [number, number] = [0, table.maxZ + RADIUS + 0.01];
    const end = moveWithCollisions(start, [1, -1], 3, 0.1, floor, [table], RADIUS);
    expect(end[0]).toBeGreaterThan(0.15);
    expect(end[1]).toBeCloseTo(start[1]);
    expect(isBlocked(end, [table], RADIUS)).toBe(false);

    // Straight into the face: no free axis; the gap closes to contact, never inside.
    const headOn = moveWithCollisions(start, [0, -1], 3, 0.1, floor, [table], RADIUS);
    expect(headOn[0]).toBe(start[0]);
    expect(headOn[1]).toBeGreaterThanOrEqual(table.maxZ + RADIUS);
    expect(headOn[1]).toBeLessThan(table.maxZ + RADIUS + 0.005);

    // Along the floor edge: the outward component is clamped, the rest slides.
    const edge = moveWithCollisions([4.6, 0], [1, 1], 3, 0.1, floor, [], RADIUS);
    expect(edge[0]).toBeCloseTo(floor.maxX - RADIUS);
    expect(edge[1]).toBeGreaterThan(0.1);
  });

  it('[§8.4] 1000 seeded random steps never end inside an expanded collider', () => {
    const layout = getSceneLayout('blockout', 'wedding-garden');
    if (!layout) throw new Error('wedding-garden layout missing');
    const next = random(20261030);
    let position: [number, number] = [
      layout.spawnPoints.SPAWN_ENTRY?.[0] ?? 0,
      layout.spawnPoints.SPAWN_ENTRY?.[1] ?? 0,
    ];
    let direction: [number, number] = [0, -1];
    for (let step = 0; step < 1000; step += 1) {
      if (step % 7 === 0) {
        const angle = next() * Math.PI * 2;
        direction = [Math.cos(angle), Math.sin(angle)];
      }
      // Frame deltas up to 0.3 s (clamped) and speeds up to 1.5 × walking.
      position = moveWithCollisions(
        position,
        direction,
        2.6 * (0.2 + next() * 1.3),
        next() * 0.3,
        layout.floor,
        layout.colliders,
        RADIUS,
      );
      expect(isBlocked(position, layout.colliders, RADIUS), `step ${step}`).toBe(false);
      expect(clampToFloor(position, layout.floor, RADIUS)).toEqual(position);
    }
  });

  it('[§8.4] large delta clamped and sub-stepped', () => {
    const afterPause = moveWithCollisions([0, 4], [0, -1], 3, 30, floor, [], RADIUS);
    expect(afterPause[1]).toBeCloseTo(4 - 3 * MAX_FRAME_DELTA);
    expect(moveWithCollisions([0, 4], [0, -1], 3, -1, floor, [], RADIUS)).toEqual([0, 4]);

    // 3 m in one frame would jump a 5 cm wall; 0.2 m sub-steps stop in front of it.
    const wall: Collider = { id: 'THIN', minX: -3, maxX: 3, minZ: 1.975, maxZ: 2.025 };
    const end = moveWithCollisions([0, 4], [0, -1], 30, 0.1, floor, [wall], RADIUS);
    expect(end[1]).toBeGreaterThanOrEqual(wall.maxZ + RADIUS);
    expect(end[1]).toBeLessThan(wall.maxZ + RADIUS + 0.005);
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
