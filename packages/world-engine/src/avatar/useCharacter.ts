import { useLayoutEffect, useState } from 'react';
import type { RefObject } from 'react';
import type { Object3D } from 'three';

import type { RenderTier } from '../renderer/capabilities';
import type { WorldStore } from '../scene-manager/store';
import { createAnimator } from './animator';
import type { AvatarAnimator } from './animator';
import { appearanceKey } from './appearance';
import type { AvatarAppearance } from './appearance';
import { appearanceSpec, buildCharacter } from './buildCharacter';
import type { CharacterKit } from './buildCharacter';
import { characterClips } from './clips';
import { wardrobeItem } from './wardrobe';

export interface LiveCharacter<Animator extends { dispose(): void } = AvatarAnimator> {
  kit: CharacterKit;
  animator: Animator;
}

export interface CharacterSlot<Animator extends { dispose(): void } = AvatarAnimator> {
  /** The animator of what is shown; read every frame. */
  readonly animator: Animator | null;
  /**
   * Shows `next` in `parent`. The new kit is up before the old one goes, so the materials and
   * textures both looks share stay on the GPU while the look changes.
   */
  show(parent: Object3D, next: LiveCharacter<Animator>): void;
  clear(): void;
}

/** Holds at most one character, whatever order effects replay in. */
export function createCharacterSlot<
  Animator extends { dispose(): void } = AvatarAnimator,
>(): CharacterSlot<Animator> {
  let live: (LiveCharacter<Animator> & { parent: Object3D }) | null = null;
  const release = (old: NonNullable<typeof live>) => {
    old.animator.dispose();
    old.parent.remove(old.kit.root);
    old.kit.dispose();
  };
  return {
    get animator() {
      return live?.animator ?? null;
    },
    show(parent, next) {
      parent.add(next.kit.root);
      const previous = live;
      live = { ...next, parent };
      if (previous) release(previous);
    },
    clear() {
      if (live) release(live);
      live = null;
    },
  };
}

/**
 * Keeps one character inside `holder`, rebuilt when the look or tier changes (the store only
 * replaces `appearance` when it really differs). Built in a layout effect, not during render:
 * StrictMode then leaves exactly one kit and one mixer (FR-07 AC5), and nothing is created for a
 * render React throws away. A scene switch unmounts the avatar, so that rebuild, behind the
 * loading veil, re-uploads what the look-change path keeps.
 */
export function useCharacter(
  store: WorldStore,
  holder: RefObject<Object3D | null>,
  appearance: AvatarAppearance,
  tier: RenderTier,
  reducedMotion: boolean,
): CharacterSlot {
  const [slot] = useState(() => createCharacterSlot());
  const { physicalMaterials, textureSize } = tier;

  useLayoutEffect(() => {
    const parent = holder.current;
    if (!parent) return;
    const spec = appearanceSpec(appearance);
    const kit = buildCharacter(spec, { tier: { bloom: false, physicalMaterials, textureSize } });
    const skirted = spec.items.some((worn) => wardrobeItem(worn.item)?.tags?.includes('skirted'));
    const clips = characterClips(spec.body, skirted, reducedMotion);
    slot.show(parent, { kit, animator: createAnimator(kit.root, clips) });
    store.getState().setCharacterKey(appearanceKey(appearance));
  }, [store, slot, holder, appearance, physicalMaterials, textureSize, reducedMotion]);

  useLayoutEffect(
    () => () => {
      slot.clear();
      store.getState().setCharacterKey(null);
    },
    [store, slot],
  );

  return slot;
}
