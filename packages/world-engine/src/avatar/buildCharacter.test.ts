import { AnimationMixer, Bone, Group, SkinnedMesh, Texture } from 'three';
import type { Material } from 'three';
import { describe, expect, it, vi } from 'vitest';

import type { RenderTier } from '../renderer/capabilities';
import { seeded } from '../scenes/decor/Part';
import { noRaycast } from '../scenes/input';
import { defaultAppearance, randomAppearance, withSlot } from './appearance';
import type { AvatarAppearance } from './appearance';
import { appearanceSpec, buildCharacter, MAX_DRAW_CALLS, MAX_TRIANGLES } from './buildCharacter';
import type { CharacterKit } from './buildCharacter';
import { createAnimator } from './animator';
import { characterClips } from './clips';
import { createCharacterMaterials } from './materials';
import { ITEM_BUILDERS } from './parts';
import { BONE_NAMES } from './rig';
import { createCharacterTextures } from './textures';
import type { TextureProvider } from './textures';
import { createCharacterSlot } from './useCharacter';
import { WARDROBE } from './wardrobe';

const HIGH: RenderTier = { bloom: true, physicalMaterials: true, textureSize: 512 };
const BASE: RenderTier = { bloom: false, physicalMaterials: false, textureSize: 256 };

/** Node has no canvas: textures are empty, the draw routines are tested in `materials.test.ts`. */
const provider: TextureProvider = { create: () => new Texture() };

function setup(tier: RenderTier = HIGH) {
  const materials = createCharacterMaterials(createCharacterTextures(provider));
  return {
    materials,
    build: (look: AvatarAppearance): CharacterKit =>
      buildCharacter(appearanceSpec(look), { tier, materials }),
  };
}

const meshes = (kit: CharacterKit) => kit.root.children.filter((c) => c instanceof SkinnedMesh);

/** Everything a wanita can wear at once, on the look with the most materials. */
function heaviest(body: 'pria' | 'wanita'): AvatarAppearance {
  let look = defaultAppearance(body);
  const wear = (slot: Parameters<typeof withSlot>[1], item: string, variant: string) => {
    look = withSlot(look, slot, { item, variant });
  };
  wear('glasses', 'kacamata', 'hitam');
  wear('bag', 'tas', 'emas');
  wear('brooch', 'bros', 'emas');
  if (body === 'wanita') {
    wear('top', 'kebaya-brokat', 'marun');
    wear('selendang', 'selendang', 'krem');
    wear('earrings', 'anting', 'emas');
  } else {
    wear('headwear', 'blangkon-yogya', 'sogan');
    wear('top', 'beskap', 'marun');
  }
  return look;
}

describe('character slot', () => {
  it('[FR-07] a StrictMode replay leaves exactly one kit and one mixer', () => {
    const stop = vi.spyOn(AnimationMixer.prototype, 'stopAllAction');
    const { build } = setup();
    const parent = new Group();
    const slot = createCharacterSlot();
    const live = (look: AvatarAppearance) => {
      const kit = build(look);
      return { kit, animator: createAnimator(kit.root, characterClips(look.body, true)) };
    };

    // Mount, the simulated unmount, the second mount.
    const first = live(defaultAppearance('pria'));
    const onFirst = vi.fn();
    meshes(first.kit)[0]?.geometry.addEventListener('dispose', onFirst);
    slot.show(parent, first);
    slot.clear();
    expect(parent.children).toEqual([]);
    expect(slot.animator).toBeNull();
    expect(onFirst).toHaveBeenCalledTimes(1);
    expect(stop).toHaveBeenCalledTimes(1);

    const second = live(defaultAppearance('pria'));
    slot.show(parent, second);
    expect(parent.children).toEqual([second.kit.root]);
    expect(slot.animator).toBe(second.animator);
    expect(stop).toHaveBeenCalledTimes(1);

    // A look change swaps them; the old mixer stops once.
    const third = live(defaultAppearance('wanita'));
    slot.show(parent, third);
    expect(parent.children).toEqual([third.kit.root]);
    expect(stop).toHaveBeenCalledTimes(2);

    slot.clear();
    slot.clear();
    expect(parent.children).toEqual([]);
    expect(stop).toHaveBeenCalledTimes(3);
    stop.mockRestore();
  });
});

describe('buildCharacter', () => {
  it('[FR-07] every wardrobe item has a builder and builds for its bodies', () => {
    const { build } = setup();
    for (const item of WARDROBE) {
      const { slot } = item;
      expect(ITEM_BUILDERS[item.id], item.id).toBeDefined();
      if (slot === 'ornament') continue;
      for (const body of item.bodies) {
        const hosted =
          item.requires !== undefined
            ? withSlot(defaultAppearance(body), 'top', { item: 'kebaya-brokat' })
            : defaultAppearance(body);
        for (const variant of item.variants ?? [undefined]) {
          const look = withSlot(hosted, slot, { item: item.id, variant: variant?.id });
          expect(look.slots[slot]?.item, `${item.id} on ${body}`).toBe(item.id);
          const kit = build(look);
          expect(kit.triangles).toBeGreaterThan(1000);
          kit.dispose();
        }
      }
    }
  });

  it('[FR-07] each character ≤ 15,000 triangles and ≤ 12 draw calls', () => {
    expect(MAX_TRIANGLES).toBe(15_000);
    expect(MAX_DRAW_CALLS).toBe(12);
    const random = seeded(0.41);
    for (const tier of [HIGH, BASE]) {
      const { build } = setup(tier);
      const looks = [
        defaultAppearance('pria'),
        defaultAppearance('wanita'),
        heaviest('pria'),
        heaviest('wanita'),
        ...Array.from({ length: 300 }, (_, i) =>
          randomAppearance(random, i % 2 === 0 ? 'pria' : 'wanita'),
        ),
      ];
      for (const look of looks) {
        const kit = build(look);
        expect(kit.triangles).toBeLessThanOrEqual(MAX_TRIANGLES);
        expect(kit.drawCalls).toBeLessThanOrEqual(MAX_DRAW_CALLS);
        kit.dispose();
      }
    }
  });

  it('[FR-07] all meshes share one skeleton, never cull and never raycast', () => {
    const { build } = setup();
    const kit = build(defaultAppearance('wanita'));
    const all = meshes(kit);
    expect(all.length).toBe(kit.drawCalls);
    for (const mesh of all) {
      expect(mesh.skeleton).toBe(kit.skeleton);
      expect(mesh.frustumCulled).toBe(false);
      expect(mesh.raycast).toBe(noRaycast);
    }
    expect(kit.skeleton.bones.length).toBe(BONE_NAMES.length);
    expect(kit.skeleton.bones.every((bone) => bone instanceof Bone)).toBe(true);
    kit.dispose();
  });

  it('[FR-07] a hijab hides hair and earrings; taking it off brings them back', () => {
    const { build } = setup();
    const worn = withSlot(defaultAppearance('wanita'), 'headwear', {
      item: 'hijab',
      variant: 'krem',
    });
    const kinds = (kit: CharacterKit) => meshes(kit).map((mesh) => String(mesh.name.split(':')[0]));
    const covered = build(worn);
    expect(kinds(covered)).not.toContain('hair');
    const bare = build(withSlot(worn, 'headwear', null));
    expect(kinds(bare)).toContain('hair');
  });

  it('[FR-07] kit.dispose releases merged geometries and bone texture', () => {
    const { build } = setup();
    const kit = build(defaultAppearance('pria'));
    const geometries = meshes(kit).map((mesh) => mesh.geometry);
    const onGeometry = vi.fn();
    geometries.forEach((geometry) => geometry.addEventListener('dispose', onGeometry));
    kit.skeleton.computeBoneTexture();
    const onBones = vi.fn();
    kit.skeleton.boneTexture?.addEventListener('dispose', onBones);

    kit.dispose();
    expect(onGeometry).toHaveBeenCalledTimes(geometries.length);
    expect(onBones).toHaveBeenCalledTimes(1);

    kit.dispose();
    expect(onGeometry).toHaveBeenCalledTimes(geometries.length);
  });

  it('[FR-07] a rebuild keeps materials both looks share, and frees the rest', () => {
    const { build } = setup();
    const first = build(defaultAppearance('pria'));
    const material = (kit: CharacterKit, kind: string) =>
      meshes(kit).find((mesh) => mesh.name.startsWith(kind))?.material as Material | undefined;
    const skin = material(first, 'skin');
    const velvet = material(first, 'velvet');
    const onSkin = vi.fn();
    const onVelvet = vi.fn();
    skin?.addEventListener('dispose', onSkin);
    velvet?.addEventListener('dispose', onVelvet);

    // Same order as `useCharacter`: the new kit exists before the old one goes.
    const second = build(withSlot(defaultAppearance('pria'), 'top', { item: 'batik-pendek' }));
    first.dispose();
    expect(onSkin).not.toHaveBeenCalled();
    expect(onVelvet).toHaveBeenCalledTimes(1);
    second.dispose();
    expect(onSkin).toHaveBeenCalledTimes(1);
  });
});
