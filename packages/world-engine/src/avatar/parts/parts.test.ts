import { describe, expect, it } from 'vitest';

import { BODY_DIMS, BONE_NAMES } from '../rig';
import { triangleCount } from '../shapes';
import { WARDROBE } from '../wardrobe';
import type { BodyType, CoverRegion } from '../wardrobe';
import { bodyParts, headParts, ITEM_BUILDERS } from './index';
import type { Part, PartContext } from './index';

function context(
  body: BodyType,
  options: Partial<Omit<PartContext, 'dims' | 'covers'>> & { covers?: CoverRegion[] } = {},
): PartContext {
  return {
    dims: BODY_DIMS[body],
    skirted: options.skirted ?? false,
    hairCrownHidden: options.hairCrownHidden ?? false,
    covers: new Set(options.covers ?? []),
  };
}

function expectSkinned(parts: readonly Part[]) {
  for (const { geometry } of parts) {
    const position = geometry.getAttribute('position');
    const weight = geometry.getAttribute('skinWeight');
    const index = geometry.getAttribute('skinIndex');
    expect(position.count).toBeGreaterThan(0);
    expect(weight.count).toBe(position.count);
    for (let i = 0; i < weight.count; i += 1) {
      const sum = weight.getX(i) + weight.getY(i) + weight.getZ(i) + weight.getW(i);
      expect(sum).toBeCloseTo(1, 4);
      for (const bone of [index.getX(i), index.getY(i), index.getZ(i), index.getW(i)]) {
        expect(bone).toBeLessThan(BONE_NAMES.length);
      }
    }
    for (let i = 0; i < position.count * 3; i += 1) {
      expect(Number.isFinite(position.array[i])).toBe(true);
    }
    // One attribute set everywhere: parts of a material must merge.
    expect(Object.keys(geometry.attributes).sort()).toEqual(
      ['color', 'normal', 'position', 'skinIndex', 'skinWeight', 'uv', 'uv1'].sort(),
    );
  }
}

const triangles = (parts: readonly Part[]) =>
  parts.reduce((sum, part) => sum + triangleCount(part.geometry), 0);

describe('character parts', () => {
  it('[FR-07] body and head build for both bodies; vertex weights sum to 1', () => {
    for (const body of ['pria', 'wanita'] as const) {
      expectSkinned(bodyParts(context(body)));
      expectSkinned(headParts(BODY_DIMS[body]));
    }
  });

  it('[FR-07] every hair item builds for its bodies; vertex weights sum to 1', () => {
    const hair = WARDROBE.filter((item) => item.slot === 'hair');
    expect(hair.length).toBe(6);
    for (const item of hair) {
      for (const body of item.bodies) {
        for (const hairCrownHidden of [false, true]) {
          const builder = ITEM_BUILDERS[item.id];
          expect(builder, item.id).toBeDefined();
          const parts = builder!(context(body, { hairCrownHidden }), undefined);
          expect(parts.length).toBeGreaterThan(0);
          expectSkinned(parts);
        }
      }
    }
  });

  it('[FR-07] covered skin is skipped; a skirt keeps only ankle stubs', () => {
    const skin = (options: Parameters<typeof context>[1]) =>
      triangles(bodyParts(context('pria', options)));
    const bare = skin({});
    expect(skin({ covers: ['torso'] })).toBeLessThan(bare);
    expect(skin({ covers: ['arms'] })).toBeLessThan(bare);
    expect(skin({ covers: ['neck'] })).toBeLessThan(bare);
    const trousers = skin({ covers: ['legs'] });
    expect(trousers).toBeLessThan(bare);
    expect(skin({ covers: ['legs'], skirted: true })).toBeGreaterThan(trousers);
  });

  it('[FR-07] hidden crown drops the hair over it', () => {
    for (const id of ['belah-samping', 'rapi', 'ikal']) {
      const full = ITEM_BUILDERS[id]!(context('pria'), undefined);
      const band = ITEM_BUILDERS[id]!(context('pria', { hairCrownHidden: true }), undefined);
      expect(triangles(band), id).toBeLessThan(triangles(full));
    }
  });

  it('[FR-07] stands about 7 heads tall', () => {
    for (const dims of Object.values(BODY_DIMS)) {
      expect(dims.height / (dims.head.ry * 2)).toBeGreaterThan(6.8);
      expect(dims.height / (dims.head.ry * 2)).toBeLessThan(7.4);
      const parts = headParts(dims);
      let top = -Infinity;
      for (const { geometry } of parts) {
        geometry.computeBoundingBox();
        top = Math.max(top, geometry.boundingBox!.max.y);
      }
      expect(top).toBeCloseTo(dims.height, 1);
    }
  });
});
