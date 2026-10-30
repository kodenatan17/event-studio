// Dev-only test code: the fake demo fixture is the reference manifest for the blockout template.
import { demoWeddingManifest } from '@undangan/contracts/fixtures/demo-wedding';
import { describe, expect, it } from 'vitest';

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
