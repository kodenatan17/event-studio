import { describe, expect, it } from 'vitest';

import type { Interactable } from './nearby';
import { footprintAabb, INTERACT_RADIUS, nearestInteractable } from './nearby';

function item(id: string, minX: number, minZ: number, maxX: number, maxZ: number): Interactable {
  return {
    tag: { kind: 'hotspot', id },
    action: { type: 'open_welcome' },
    min: [minX, minZ],
    max: [maxX, maxZ],
  };
}

describe('nearby', () => {
  it('[§3.4] nearest within 1.8 m wins, ties → lower id', () => {
    expect(INTERACT_RADIUS).toBe(1.8);
    const table = item('ceremony-info', -0.75, -5.1, 0.75, -4.3);
    const booth = item('photo-booth', 4.4, -4, 6.6, -2.8);

    // Akad table front edge 1.7 m away: in reach.
    expect(nearestInteractable([0, -2.6], [table, booth])?.tag.id).toBe('ceremony-info');
    expect(nearestInteractable([0, -2.4], [table, booth])).toBeNull();
    expect(nearestInteractable([4, -2.4], [table, booth])?.tag.id).toBe('photo-booth');

    const left = item('b-left', -2, 0, -1, 1);
    const right = item('a-right', 1, 0, 2, 1);
    expect(nearestInteractable([0, 0.5], [left, right])?.tag.id).toBe('a-right');
    expect(nearestInteractable([0, 0.5], [right, left])?.tag.id).toBe('a-right');
    // Inside a footprint the distance is 0.
    expect(nearestInteractable([1.5, 0.5], [left, right])?.tag.id).toBe('a-right');
  });

  it('[§3.4] footprint of a rotated node', () => {
    expect(footprintAabb([1, 0, 2], [2, 1, 0.5])).toEqual({ min: [0, 1.75], max: [2, 2.25] });
    const quarter = footprintAabb([0, 0, 0], [2, 1, 0.5], Math.PI / 2);
    expect(quarter.min[0]).toBeCloseTo(-0.25);
    expect(quarter.max[1]).toBeCloseTo(1);
  });
});
