import { AnimationMixer, Quaternion, SkinnedMesh, Texture } from 'three';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { isBlocked } from '../navigation/walk';
import type { RenderTier } from '../renderer/capabilities';
import { noRaycast } from '../scenes/input';
import { getSceneLayout } from '../templates/blockout';
import type { DecorItem, PrimitiveLayout } from '../templates/types';
import { createFigureAnimator, headTurnToward } from './animator';
import { defaultAppearance, normalizeAppearance, randomAppearance, withSlot } from './appearance';
import { buildCharacter, figureSpec, MAX_DRAW_CALLS, MAX_TRIANGLES } from './buildCharacter';
import type { CharacterKit } from './buildCharacter';
import { figureClip } from './clips';
import { createCharacterMaterials } from './materials';
import { ITEM_BUILDERS } from './parts';
import { createRig } from './rig';
import { createCharacterTextures } from './textures';
import { FIGURE_OUTFITS, wardrobeItem, wardrobeItems } from './wardrobe';
import type { FigureOutfitId } from './wardrobe';

const HIGH: RenderTier = { bloom: true, physicalMaterials: true, textureSize: 512 };
const BASE: RenderTier = { bloom: false, physicalMaterials: false, textureSize: 256 };
const IDS = Object.keys(FIGURE_OUTFITS) as FigureOutfitId[];

function build(id: FigureOutfitId, tier: RenderTier = HIGH): CharacterKit {
  const materials = createCharacterMaterials(
    createCharacterTextures({ create: () => new Texture() }),
  );
  return buildCharacter(figureSpec(FIGURE_OUTFITS[id]), { tier, materials });
}

const meshes = (kit: CharacterKit) => kit.root.children.filter((c) => c instanceof SkinnedMesh);

type FigureItem = Extract<DecorItem, { type: 'figure' }>;

function garden() {
  const layout = getSceneLayout('blockout', 'wedding-garden') as PrimitiveLayout;
  const figures = layout.decor.filter((item): item is FigureItem => item.type === 'figure');
  return { layout, figures };
}

afterEach(() => vi.restoreAllMocks());

describe('couple figures', () => {
  it('[§3.3] garden places COUPLE_GROOM/COUPLE_BRIDE on the platform inside the canopy collider', () => {
    const { layout, figures } = garden();
    expect(figures.map((figure) => figure.nodeName)).toEqual(['COUPLE_GROOM', 'COUPLE_BRIDE']);
    const [groom, bride] = figures;
    expect(groom?.outfit).toBe('groom-jawa');
    expect(bride?.outfit).toBe('bride-jawa');
    // The groom stands on the viewer's left; both face the guests.
    expect(groom!.position[0]).toBeLessThan(bride!.position[0]);
    for (const { position, rotationY } of figures) {
      expect(position[1]).toBeCloseTo(0.2);
      expect(Math.abs(rotationY)).toBeLessThan(0.3);
      expect(position[2]).toBeGreaterThan(-3.6);
      // A guest can never walk into them.
      expect(isBlocked([position[0], position[2]], layout.colliders, 0.3)).toBe(true);
    }
    expect(groom!.phase).not.toBe(bride!.phase);
  });

  it('[§3.3] the train ends before the table and the figures clear the front pillars', () => {
    const { figures } = garden();
    const kit = build('bride-jawa');
    let back = Infinity;
    for (const mesh of meshes(kit)) {
      mesh.geometry.computeBoundingBox();
      back = Math.min(back, mesh.geometry.boundingBox!.min.z);
    }
    expect(back).toBeLessThan(-0.4);
    const bride = figures.find((figure) => figure.outfit === 'bride-jawa');
    expect(bride!.position[2] + back).toBeGreaterThan(-4.3);
    for (const { position } of figures) expect(Math.abs(position[0])).toBeLessThan(1.6 - 0.3);
    kit.dispose();
  });

  it('[FR-06] couple figures ≤ 15k tris with clip names idle_groom/idle_bride', () => {
    for (const id of IDS) {
      for (const tier of [HIGH, BASE]) {
        const kit = build(id, tier);
        expect(kit.triangles, id).toBeLessThanOrEqual(MAX_TRIANGLES);
        expect(kit.drawCalls, id).toBeLessThanOrEqual(MAX_DRAW_CALLS);
        kit.dispose();
      }
      const { clip, body } = FIGURE_OUTFITS[id];
      const animation = figureClip(clip, body);
      expect(animation.name).toBe(clip);
      expect(animation.validate()).toBe(true);
    }
    expect(FIGURE_OUTFITS['groom-jawa'].clip).toBe('idle_groom');
    expect(FIGURE_OUTFITS['bride-jawa'].clip).toBe('idle_bride');
  });

  it('[§3.3] figure meshes never raycast', () => {
    for (const id of IDS) {
      const kit = build(id);
      expect(meshes(kit).length).toBeGreaterThan(0);
      for (const mesh of meshes(kit)) expect(mesh.raycast).toBe(noRaycast);
      kit.dispose();
    }
  });

  it('[§3.3] every outfit item has a builder and suits its body', () => {
    for (const { body, items } of Object.values(FIGURE_OUTFITS)) {
      for (const { item } of items) {
        expect(ITEM_BUILDERS[item], item).toBeDefined();
        expect(wardrobeItem(item)?.bodies, item).toContain(body);
      }
    }
  });

  it('[FR-07] wedding attire is never open to guests', () => {
    const outfitOnly = Object.values(FIGURE_OUTFITS)
      .flatMap(({ items }) => items.map(({ item }) => wardrobeItem(item)))
      .filter((item) => item?.guestSelectable === false);
    expect(outfitOnly.length).toBeGreaterThan(10);

    for (const item of outfitOnly) {
      if (!item || item.slot === 'ornament') continue;
      for (const body of item.bodies) {
        expect(wardrobeItems(body, item.slot).map((entry) => entry.id)).not.toContain(item.id);
        const look = normalizeAppearance(
          withSlot(defaultAppearance(body), item.slot, { item: item.id }),
        );
        expect(look.slots[item.slot]?.item).not.toBe(item.id);
      }
    }
    const look = randomAppearance(() => 0.9, 'wanita');
    expect(JSON.stringify(look)).not.toContain('pengantin');
  });

  it('[§3.3] idle clips loop without a jump and hold the hands in place', () => {
    for (const { clip, body } of Object.values(FIGURE_OUTFITS)) {
      const animation = figureClip(clip, body);
      expect(figureClip(clip, body)).toBe(animation);
      for (const track of animation.tracks) {
        const size = track.getValueSize();
        const first = Array.from(track.values.slice(0, size));
        const last = Array.from(track.values.slice(-size));
        first.forEach((value, index) => expect(value).toBeCloseTo(last[index]!, 4));
      }
      const held = animation.tracks.find((track) => track.name === 'elbow_r.quaternion');
      const bend = new Quaternion().fromArray(Array.from(held!.values.slice(0, 4)));
      expect(bend.angleTo(new Quaternion())).toBeGreaterThan(1);
    }
  });

  it('[§3.3] the figure animator starts at its phase, and reduced motion holds the pose', () => {
    const stop = vi.spyOn(AnimationMixer.prototype, 'stopAllAction');
    const uncache = vi.spyOn(AnimationMixer.prototype, 'uncacheRoot');
    const { root } = createRig('wanita');
    const clip = figureClip('idle_bride', 'wanita');
    const head = root.getObjectByName('head')!;

    const held = createFigureAnimator(root, clip, { phase: 0.25, reducedMotion: true });
    held.update(1 / 60);
    const pose = head.quaternion.clone();
    held.update(1);
    expect(head.quaternion.angleTo(pose)).toBeCloseTo(0);
    expect(root.getObjectByName('elbow_r')!.quaternion.angleTo(new Quaternion())).toBeGreaterThan(
      1,
    );
    held.dispose();
    expect(stop).toHaveBeenCalledTimes(1);
    expect(uncache).toHaveBeenCalledWith(root);

    const live = createFigureAnimator(root, clip, { phase: 0.25, reducedMotion: false });
    live.update(1 / 60);
    const start = head.quaternion.clone();
    live.update(0.1);
    live.update(0.1);
    expect(head.quaternion.angleTo(start)).toBeGreaterThan(0);
    live.dispose();
  });

  it('[§3.3] a figure looks at a nearby guest, within ±35°', () => {
    const limit = (35 * Math.PI) / 180;
    const figure = [0, 0] as const;
    expect(headTurnToward(figure, 0, [0, 2])).toBeCloseTo(0);
    expect(headTurnToward(figure, 0, [0.5, 2])).toBeCloseTo(Math.atan2(0.5, 2));
    expect(headTurnToward(figure, 0, [-0.5, 2])).toBeCloseTo(Math.atan2(-0.5, 2));
    // Far to the side: the turn stops at the limit.
    expect(headTurnToward(figure, 0, [2, 0.5])).toBeCloseTo(limit);
    expect(headTurnToward(figure, 0, [-2, 0.5])).toBeCloseTo(-limit);
    // Out of reach, or behind the figure: it looks ahead.
    expect(headTurnToward(figure, 0, [0, 3.2])).toBe(0);
    expect(headTurnToward(figure, 0, [0, -2])).toBe(0);
    // Relative to the way the figure faces.
    expect(headTurnToward(figure, 0.3, [Math.sin(0.3) * 2, Math.cos(0.3) * 2])).toBeCloseTo(0);
  });
});
