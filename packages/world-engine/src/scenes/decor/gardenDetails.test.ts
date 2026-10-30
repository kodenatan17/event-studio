import { Mesh, Raycaster, Vector3 } from 'three';
import { describe, expect, it, vi } from 'vitest';

import { getSceneLayout } from '../../templates/blockout';
import { noRaycast } from '../input';
import { createGardenDetails } from './gardenDetails';

describe('garden canopy detail layer', () => {
  it('[FR-08] adds finite, bounded smooth details in six draw calls without interactive meshes', () => {
    const kit = createGardenDetails();
    kit.retain();
    expect(kit.drawCalls).toBeLessThanOrEqual(6);
    expect(kit.triangles).toBeLessThanOrEqual(12_000);
    expect(kit.triangles).toBeGreaterThan(0);
    let triangles = 0;
    const raycaster = new Raycaster(new Vector3(0, 2, 2), new Vector3(0, 0, -1));
    for (const child of kit.root.children) {
      expect(child).toBeInstanceOf(Mesh);
      if (!(child instanceof Mesh)) throw new Error('Expected garden mesh');
      expect(child.raycast).toBe(noRaycast);
      expect(child.castShadow).toBe(false);
      expect(raycaster.intersectObject(child)).toEqual([]);
      const geometry = child.geometry;
      for (const attribute of Object.values(geometry.attributes)) {
        expect(Array.from(attribute.array).every(Number.isFinite)).toBe(true);
      }
      const bounds = geometry.boundingBox;
      expect(bounds).not.toBeNull();
      // Tall details remain within the existing stage footprint; the shallow fascia is flush.
      expect(bounds!.min.x).toBeGreaterThanOrEqual(-2.31);
      expect(bounds!.max.x).toBeLessThanOrEqual(2.31);
      expect(bounds!.min.z).toBeGreaterThanOrEqual(-6.5);
      expect(bounds!.max.z).toBeLessThanOrEqual(-2.87);
      expect(bounds!.min.y).toBeGreaterThanOrEqual(0);
      expect(bounds!.max.y).toBeLessThanOrEqual(2.95);
      triangles += (geometry.index?.count ?? geometry.getAttribute('position').count) / 3;
    }
    expect(triangles).toBe(kit.triangles);
    kit.dispose();
  });

  it('[FR-04] releases GPU resources after the final user and can remount the shared CPU geometry', () => {
    const first = createGardenDetails();
    const second = createGardenDetails();
    first.retain();
    second.retain();
    const mesh = first.root.children[0] as Mesh;
    const geometry = vi.spyOn(mesh.geometry, 'dispose');
    const material = vi.spyOn(
      Array.isArray(mesh.material) ? mesh.material[0]! : mesh.material,
      'dispose',
    );
    const stone = first.root.children.find((child) => child.name === 'GARDEN_DETAIL_STONE') as Mesh;
    const stoneMaterial = Array.isArray(stone.material) ? stone.material[0]! : stone.material;
    if (!('map' in stoneMaterial) || !stoneMaterial.map) throw new Error('Missing stone grain');
    const texture = vi.spyOn(stoneMaterial.map, 'dispose');
    first.dispose();
    expect(geometry).not.toHaveBeenCalled();
    expect(material).not.toHaveBeenCalled();
    second.dispose();
    expect(geometry).toHaveBeenCalledTimes(1);
    expect(material).toHaveBeenCalledTimes(1);
    expect(texture).toHaveBeenCalledTimes(1);
    second.dispose();
    expect(geometry).toHaveBeenCalledTimes(1);
    const remounted = createGardenDetails();
    remounted.retain();
    expect((remounted.root.children[0] as Mesh).geometry).toBe(mesh.geometry);
    expect(mesh.geometry.getAttribute('position').count).toBeGreaterThan(0);
    remounted.dispose();
    expect(geometry).toHaveBeenCalledTimes(2);
    vi.restoreAllMocks();
  });

  it('[FR-08] enables the detail prefab only for the garden and preserves its canopy/portal bounds', () => {
    for (const id of ['entrance', 'living-room', 'reception-hall']) {
      expect(
        getSceneLayout('blockout', id)?.decor.some((item) => item.type === 'gardenDetails'),
      ).toBe(false);
    }
    const garden = getSceneLayout('blockout', 'wedding-garden');
    if (garden?.kind !== 'primitive') throw new Error('Expected primitive garden');
    expect(garden.decor.filter((item) => item.type === 'gardenDetails')).toHaveLength(1);
    expect(garden.colliders.find((box) => box.id === 'AKAD_CANOPY')).toEqual({
      id: 'AKAD_CANOPY',
      minX: -2.3,
      maxX: 2.3,
      minZ: -6.5,
      maxZ: -2.9000000000000004,
    });
    expect(garden.hotspots.HS_EVENT_CEREMONY?.position).toEqual([0, 0.6, -4.7]);
    expect(garden.portals.PORTAL_BACK_TO_LIVING?.position).toEqual([-7.6, 1.45, -0.6]);
  });
});
