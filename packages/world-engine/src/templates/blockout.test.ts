// Dev-only test code: the fake demo fixture is the reference manifest for the blockout template.
import { demoWeddingManifest } from '@undangan/contracts/fixtures/demo-wedding';
import { PerspectiveCamera, Vector3 } from 'three';
import { describe, expect, it } from 'vitest';

import { distanceToFootprint, footprintAabb, INTERACT_RADIUS } from '../interaction/nearby';
import { portalNodeName, spawnNodeName } from '../interaction/registry';
import { clampToFloor, isBlocked } from '../navigation/walk';
import { followPose, framingFor } from '../renderer/FollowCamera';
import { MAX_CAMERA_ZOOM, MIN_CAMERA_ZOOM } from '../scene-manager/store';
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

  it('[FR-04] the hall camera stays under the roof eave at every viewport and zoom', () => {
    const layout = getSceneLayout(templateId, 'reception-hall');
    if (layout?.kind !== 'primitive') throw new Error('reception-hall must be primitive');
    const roof = layout.decor.find((item) => item.type === 'joglo');
    if (roof?.type !== 'joglo') throw new Error('reception-hall must have its joglo roof');
    const { offset, fov, maxHeight = Infinity } = layout.camera;

    const viewports = [
      [322, 690],
      [393, 742],
      [844, 390],
      [1280, 800],
    ] as const;
    for (const [width, height] of viewports) {
      const framing = framingFor(width / height, height, fov ?? 45);
      for (const zoom of [MIN_CAMERA_ZOOM, 1, MAX_CAMERA_ZOOM]) {
        const cameraY = Math.min(offset[1] * framing.distance * zoom * framing.lift, maxHeight);
        expect(cameraY, `${width}x${height} zoom ${zoom}`).toBeLessThan(roof.eaveHeight);
      }
    }
  });

  describe('[D-037] the portrait camera keeps the avatar in focus', () => {
    const PORTRAITS = [
      [322, 690],
      [393, 742],
    ] as const;

    /** Where the avatar lands on screen: x in -1..1, and its height in pixels. */
    function onScreen(layout: SceneLayout, width: number, height: number, x: number, z: number) {
      return (zoom: number) => {
        const { offset, lookHeight, lookAhead, fov = 45, maxHeight = Infinity } = layout.camera;
        const aspect = width / height;
        const framing = framingFor(aspect, height, fov);
        const y = layout.kind === 'gltf' ? layout.floor.y : 0;
        const avatar = new Vector3(x, y, z);
        const position = new Vector3();
        const look = new Vector3();
        const { minX, maxX } = layout.floor;
        followPose(position, look, avatar, { offset, lookHeight, lookAhead, maxHeight }, framing, {
          aspect,
          zoom,
          focusCenterX: (minX + maxX) / 2,
        });
        const camera = new PerspectiveCamera(framing.fov, aspect, 0.1, 200);
        camera.position.copy(position);
        camera.lookAt(look);
        camera.updateMatrixWorld();
        const feet = avatar.clone().project(camera);
        const head = avatar
          .clone()
          .setY(y + 1.7)
          .project(camera);
        return { x: feet.x, y: feet.y, pixels: ((head.y - feet.y) / 2) * height };
      };
    }

    const SCENE_IDS = ['entrance', 'living-room', 'wedding-garden', 'reception-hall'];

    it.each(SCENE_IDS)('%s: never drifts off the screen at the floor edges', (sceneId) => {
      const layout = getSceneLayout(templateId, sceneId);
      if (!layout) throw new Error(`${sceneId} has no layout`);
      const { minX, maxX, minZ, maxZ } = layout.floor;
      for (const [width, height] of PORTRAITS) {
        for (const x of [minX + AVATAR_RADIUS, maxX - AVATAR_RADIUS]) {
          for (const z of [minZ + AVATAR_RADIUS, maxZ - AVATAR_RADIUS]) {
            for (const zoom of [MIN_CAMERA_ZOOM, 1, MAX_CAMERA_ZOOM]) {
              const place = onScreen(layout, width, height, x, z)(zoom);
              expect(Math.abs(place.x), `${width}x${height} ${x},${z} zoom ${zoom}`).toBeLessThan(
                0.45,
              );
              expect(Math.abs(place.y), `${width}x${height} ${x},${z} zoom ${zoom}`).toBeLessThan(
                0.75,
              );
            }
          }
        }
      }
    });

    it.each(SCENE_IDS)('%s: the default view shows a large avatar', (sceneId) => {
      const layout = getSceneLayout(templateId, sceneId);
      if (!layout) throw new Error(`${sceneId} has no layout`);
      const spawn = layout.spawnPoints.SPAWN_ENTRY ?? [0, 0];
      const { pixels } = onScreen(layout, 393, 742, spawn[0], spawn[1])(1);
      expect(pixels).toBeGreaterThanOrEqual(90);
    });
  });

  describe('[D-037] template characters', () => {
    const npcItems = (sceneId: string) => {
      const layout = getSceneLayout(templateId, sceneId);
      if (!layout) throw new Error(`${sceneId} has no layout`);
      return layout.decor.flatMap((item) => (item.type === 'npc' ? [item] : []));
    };

    it('two greeters stand at the gate and every room has 3-4 walkers', () => {
      const gate = npcItems('entrance');
      expect(gate).toHaveLength(2);
      expect(gate.every((npc) => npc.path.length === 1 && npc.look.body === 'wanita')).toBe(true);
      for (const sceneId of ['living-room', 'wedding-garden', 'reception-hall']) {
        const walkers = npcItems(sceneId);
        expect(walkers.length).toBeGreaterThanOrEqual(3);
        expect(walkers.length).toBeLessThanOrEqual(4);
        expect(walkers.every((npc) => npc.path.length > 1)).toBe(true);
      }
    });

    it.each(scenes.map((scene) => scene.id))(
      '%s: routes stay on the floor and off colliders',
      (sceneId) => {
        const layout = getSceneLayout(templateId, sceneId);
        if (!layout) throw new Error(`${sceneId} has no layout`);
        for (const npc of npcItems(sceneId)) {
          npc.path.forEach((from, index) => {
            const to = npc.path[(index + 1) % npc.path.length] ?? from;
            for (let t = 0; t <= 1; t += 0.02) {
              const point = [
                from[0] + (to[0] - from[0]) * t,
                from[1] + (to[1] - from[1]) * t,
              ] as const;
              if (npc.path.length > 1) {
                expect(isBlocked(point, layout.colliders, AVATAR_RADIUS), npc.nodeName).toBe(false);
              }
              expect(clampToFloor(point, layout.floor, AVATAR_RADIUS), npc.nodeName).toEqual(point);
            }
          });
        }
      },
    );

    it('every line fits a short bubble and no name is repeated', () => {
      const all = ['entrance', 'living-room', 'wedding-garden', 'reception-hall'].flatMap(npcItems);
      expect(new Set(all.map((npc) => npc.nodeName)).size).toBe(all.length);
      for (const line of all.flatMap((npc) => npc.lines)) {
        expect(line.length).toBeLessThanOrEqual(30);
      }
    });
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
