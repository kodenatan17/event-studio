// Dev-only test code: the fake demo fixture is the reference manifest for the blockout template.
import { demoWeddingManifest } from '@undangan/contracts/fixtures/demo-wedding';
import { describe, expect, it } from 'vitest';

import { distanceToFootprint, footprintAabb, INTERACT_RADIUS } from '../interaction/nearby';
import { portalNodeName, spawnNodeName } from '../interaction/registry';
import { clampToFloor, isBlocked } from '../navigation/walk';
import { getSceneLayout } from './blockout';
import type { SceneLayout } from './types';

const AVATAR_RADIUS = 0.3;
const { scenes, templateId } = demoWeddingManifest.world;

/** Primitive layouts place nodes directly; GLB layouts resolve them through `nodeMap`. */
function nodeNames(layout: SceneLayout): readonly string[] {
  return layout.kind === 'primitive'
    ? [...Object.keys(layout.hotspots), ...Object.keys(layout.portals)]
    : Object.keys(layout.nodeMap);
}

describe('blockout template', () => {
  it('[T-103] every fixture HS_/PORTAL_/SPAWN_ node exists in the blockout layout', () => {
    for (const scene of scenes) {
      const layout = getSceneLayout(templateId, scene.id);
      expect(layout, scene.id).not.toBeNull();
      if (!layout) continue;

      expect(layout.spawnPoints).toHaveProperty('SPAWN_ENTRY');
      const names = nodeNames(layout);
      for (const hotspot of scene.hotspots) {
        expect(names, `${scene.id} ${hotspot.nodeName}`).toContain(hotspot.nodeName);
      }
      for (const portal of scene.portals) {
        expect(names, `${scene.id} ${portal.id}`).toContain(portalNodeName(portal.id));
      }
    }
    // Every portal's destination spawn point exists in the target scene.
    for (const portal of scenes.flatMap((scene) => scene.portals)) {
      const target = getSceneLayout(templateId, portal.toSceneId);
      expect(target?.spawnPoints, portal.id).toHaveProperty(spawnNodeName(portal.spawnPointId));
    }
  });

  it('[FR-04] every spawn point is walkable', () => {
    for (const scene of scenes) {
      const layout = getSceneLayout(templateId, scene.id);
      for (const [name, point] of Object.entries(layout?.spawnPoints ?? {})) {
        if (!layout) continue;
        expect(clampToFloor(point, layout.floor, AVATAR_RADIUS), `${scene.id} ${name}`).toEqual([
          point[0],
          point[1],
        ]);
        expect(isBlocked(point, layout.colliders, AVATAR_RADIUS), `${scene.id} ${name}`).toBe(
          false,
        );
      }
    }
  });

  it('[T-103] unknown template or scene has no layout', () => {
    expect(getSceneLayout('classic-garden', 'entrance')).toBeNull();
    expect(getSceneLayout('blockout', 'secret-room')).toBeNull();
    expect(getSceneLayout('toString', 'entrance')).toBeNull();
    expect(getSceneLayout('blockout', 'constructor')).toBeNull();
  });
});

describe('blockout interactables', () => {
  it('[§3.4] every blockout interactable reachable from a free floor point', () => {
    for (const scene of scenes) {
      const layout = getSceneLayout(templateId, scene.id);
      if (layout?.kind !== 'primitive') continue;
      // Free floor points the avatar can stand on, on a 5 cm grid.
      const free: [number, number][] = [];
      for (
        let x = layout.floor.minX + AVATAR_RADIUS;
        x <= layout.floor.maxX - AVATAR_RADIUS;
        x += 0.05
      ) {
        for (
          let z = layout.floor.minZ + AVATAR_RADIUS;
          z <= layout.floor.maxZ - AVATAR_RADIUS;
          z += 0.05
        ) {
          if (!isBlocked([x, z], layout.colliders, AVATAR_RADIUS)) free.push([x, z]);
        }
      }
      const placements = { ...layout.hotspots, ...layout.portals };
      for (const [name, placement] of Object.entries(placements)) {
        const footprint = footprintAabb(placement.position, placement.size, placement.rotationY);
        const closest = Math.min(...free.map((point) => distanceToFootprint(point, footprint)));
        expect(closest, `${scene.id} ${name}`).toBeLessThanOrEqual(INTERACT_RADIUS);
      }
    }
  });

  it('[§3.4] garden: the akad table is in reach from in front of the canopy', () => {
    const layout = getSceneLayout(templateId, 'wedding-garden');
    if (layout?.kind !== 'primitive') throw new Error('wedding-garden is not primitive');
    const table = layout.hotspots.HS_EVENT_CEREMONY;
    if (!table) throw new Error('HS_EVENT_CEREMONY missing');
    const canopy = layout.colliders.find((box) => box.id === 'AKAD_CANOPY');
    // Walking straight up the aisle stops at the canopy's expanded edge.
    const stop: [number, number] = [0, (canopy?.maxZ ?? NaN) + AVATAR_RADIUS];
    expect(isBlocked(stop, layout.colliders, AVATAR_RADIUS)).toBe(false);
    const distance = distanceToFootprint(stop, footprintAabb(table.position, table.size));
    expect(distance).toBeCloseTo(1.7);
    expect(distance).toBeLessThanOrEqual(INTERACT_RADIUS);
  });
});
