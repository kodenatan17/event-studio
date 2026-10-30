// Dev-only test code: the fake demo fixture is the reference manifest for the blockout template.
// Reads the served GLB with Node `fs` (no three.js); Node types come from the workspace root.
/// <reference types="node" />
import { readFileSync } from 'node:fs';

import { demoWeddingManifest } from '@undangan/contracts/fixtures/demo-wedding';
import { describe, expect, it } from 'vitest';

import { portalNodeName, spawnNodeName } from '../interaction/registry';
import { getSceneLayout } from './blockout';
import type { GltfLayout } from './types';

const { scenes, templateId } = demoWeddingManifest.world;

function livingRoomLayout(): GltfLayout {
  const layout = getSceneLayout(templateId, 'living-room');
  if (layout?.kind !== 'gltf') throw new Error('living-room is not a gltf layout');
  return layout;
}

interface GltfJson {
  asset: { version: string };
  extensionsUsed?: string[];
  extensionsRequired?: string[];
  nodes: { name?: string; mesh?: number }[];
  meshes: { primitives: { attributes: { POSITION: number } }[] }[];
  accessors: { min?: number[]; max?: number[] }[];
}

/** JSON chunk of the GLB served by `apps/web` at `url` (glTF 2.0 binary container). */
function readGlbJson(url: string): GltfJson {
  const file = readFileSync(new URL(`../../../../apps/web/public${url}`, import.meta.url));
  expect(file.toString('ascii', 0, 4)).toBe('glTF');
  expect(file.readUInt32LE(4)).toBe(2);
  const jsonLength = file.readUInt32LE(12);
  expect(file.toString('ascii', 16, 20)).toBe('JSON');
  return JSON.parse(file.toString('utf8', 20, 20 + jsonLength)) as GltfJson;
}

describe('living-room gltf layout', () => {
  it('[T-103] every living-room fixture HS_/PORTAL_/SPAWN_ node resolves via nodeMap', () => {
    const layout = livingRoomLayout();
    const scene = scenes.find((candidate) => candidate.id === 'living-room');
    if (!scene) throw new Error('fixture has no living-room');

    const names = [
      ...scene.hotspots.map((hotspot) => hotspot.nodeName),
      ...scene.portals.map((portal) => portalNodeName(portal.id)),
    ];
    for (const name of names) {
      expect(layout.nodeMap, name).toHaveProperty(name);
    }
    // Every portal leading into the living room lands on a spawn point.
    for (const portal of scenes.flatMap((candidate) => candidate.portals)) {
      if (portal.toSceneId !== 'living-room') continue;
      expect(layout.spawnPoints, portal.id).toHaveProperty(spawnNodeName(portal.spawnPointId));
    }
    expect(layout.spawnPoints).toHaveProperty('SPAWN_ENTRY');
    // Mapped targets are unique, so a GLB hit resolves to exactly one manifest node.
    const targets = Object.values(layout.nodeMap);
    expect(new Set(targets).size).toBe(targets.length);
  });

  it('[T-504] living-room GLB contains mapped nodes', () => {
    const layout = livingRoomLayout();
    const gltf = readGlbJson(layout.url);

    expect(gltf.asset.version).toBe('2.0');
    // Plain GLTFLoader only: no Draco/Meshopt/KTX2 decoders are shipped (architecture.md §8.5).
    expect(gltf.extensionsRequired ?? []).toEqual([]);
    expect(gltf.extensionsUsed ?? []).toEqual([]);

    const nodeNames = new Set(gltf.nodes.map((node) => node.name));
    for (const [manifestNode, target] of Object.entries(layout.nodeMap)) {
      if (Object.hasOwn(layout.triggers, target)) continue;
      expect(nodeNames.has(target), `${manifestNode} → ${target}`).toBe(true);
    }
    expect(nodeNames.has(layout.floor.nodeName)).toBe(true);

    // `SPAWN_ENTRY` in code matches the authored marker (vertices are baked in world space).
    const spawn = gltf.nodes.find((node) => node.name === 'SPAWN_ENTRY');
    const accessorIndex =
      spawn?.mesh === undefined ? undefined : gltf.meshes[spawn.mesh]?.primitives[0]?.attributes;
    const accessor = accessorIndex ? gltf.accessors[accessorIndex.POSITION] : undefined;
    if (!accessor?.min || !accessor.max) throw new Error('SPAWN_ENTRY has no bounds');
    const [x, z] = layout.spawnPoints.SPAWN_ENTRY ?? [NaN, NaN];
    expect(((accessor.min[0] ?? 0) + (accessor.max[0] ?? 0)) / 2).toBeCloseTo(x, 1);
    expect(((accessor.min[2] ?? 0) + (accessor.max[2] ?? 0)) / 2).toBeCloseTo(z, 1);
  });
});
