// Dev-only test code: the fake demo fixture is the reference manifest for the blockout template.
import { demoWeddingManifest } from '@undangan/contracts/fixtures/demo-wedding';
import { describe, expect, it } from 'vitest';

import { portalNodeName, spawnNodeName } from '../interaction/registry';
import { clampToFloor, isBlocked } from '../navigation/walk';
import { getPrimitiveLayout } from './blockout';

const AVATAR_RADIUS = 0.3;
const { scenes, templateId } = demoWeddingManifest.world;

describe('blockout template', () => {
  it('[T-103] every fixture HS_/PORTAL_/SPAWN_ node exists in the blockout layout', () => {
    for (const scene of scenes) {
      const layout = getPrimitiveLayout(templateId, scene.id);
      expect(layout, scene.id).not.toBeNull();
      if (!layout) continue;

      expect(layout.spawnPoints).toHaveProperty('SPAWN_ENTRY');
      for (const hotspot of scene.hotspots) {
        expect(layout.hotspots, `${scene.id} ${hotspot.nodeName}`).toHaveProperty(hotspot.nodeName);
      }
      for (const portal of scene.portals) {
        expect(layout.portals, `${scene.id} ${portal.id}`).toHaveProperty(
          portalNodeName(portal.id),
        );
      }
    }
    // Every portal's destination spawn point exists in the target scene.
    for (const portal of scenes.flatMap((scene) => scene.portals)) {
      const target = getPrimitiveLayout(templateId, portal.toSceneId);
      expect(target?.spawnPoints, portal.id).toHaveProperty(spawnNodeName(portal.spawnPointId));
    }
  });

  it('[FR-04] every spawn point is walkable', () => {
    for (const scene of scenes) {
      const layout = getPrimitiveLayout(templateId, scene.id);
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
    expect(getPrimitiveLayout('classic-garden', 'entrance')).toBeNull();
    expect(getPrimitiveLayout('blockout', 'secret-room')).toBeNull();
    expect(getPrimitiveLayout('toString', 'entrance')).toBeNull();
    expect(getPrimitiveLayout('blockout', 'constructor')).toBeNull();
  });
});
