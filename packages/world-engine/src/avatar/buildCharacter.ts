import { Matrix4, SkinnedMesh } from 'three';
import type { BufferGeometry, Group, Material, Skeleton } from 'three';
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js';

import type { RenderTier } from '../renderer/capabilities';
import { noRaycast } from '../scenes/input';
import { visibleItems } from './appearance';
import type { AvatarAppearance } from './appearance';
import { cachedParts, characterMaterials } from './caches';
import type { CharacterMaterials, MaterialSpec } from './materials';
import { materialKey } from './materials';
import { bodyParts, headParts, ITEM_BUILDERS } from './parts';
import type { Part, PartContext } from './parts';
import { BODY_DIMS, createRig } from './rig';
import { triangleCount } from './shapes';
import { SLOTS, skinSwatch, wardrobeItem } from './wardrobe';
import type { BodyType, CoverRegion, FigureOutfit, Slot, WardrobeVariant } from './wardrobe';

/** Budget per character (§12); enforced by a test. */
export const MAX_TRIANGLES = 15_000;
export const MAX_DRAW_CALLS = 12;

/** One worn item; generic over guest appearances and template outfits (couple figures). */
export interface WornItem {
  item: string;
  variant?: string;
}

export interface CharacterSpec {
  body: BodyType;
  /** Skin tone (sRGB hex). */
  skin: string;
  items: readonly WornItem[];
  /** Headwear sits on the crown; `hides` is resolved before this point. */
  hairCrownHidden: boolean;
}

/** The character an appearance renders: worn items after `hides`. */
export function appearanceSpec(appearance: AvatarAppearance): CharacterSpec {
  const { slots, hairCrownHidden } = visibleItems(appearance);
  const items = SLOTS.flatMap((slot: Slot) => {
    const choice = slots[slot];
    return choice ? [{ item: choice.item, variant: choice.variant }] : [];
  });
  return { body: appearance.body, skin: skinSwatch(appearance.skin), items, hairCrownHidden };
}

/** The character of a template figure. */
export function figureSpec(outfit: FigureOutfit): CharacterSpec {
  const { body, skin, items, hairCrownHidden } = outfit;
  return { body, skin: skinSwatch(skin), items, hairCrownHidden };
}

export interface CharacterKit {
  root: Group;
  skeleton: Skeleton;
  triangles: number;
  drawCalls: number;
  dispose(): void;
}

export interface BuildOptions {
  tier: RenderTier;
  /** Shared by default; tests inject one over a stub texture provider. */
  materials?: CharacterMaterials;
}

function variantOf(worn: WornItem): WardrobeVariant | undefined {
  const variants = wardrobeItem(worn.item)?.variants;
  return variants?.find((variant) => variant.id === worn.variant) ?? variants?.[0];
}

function contextOf(spec: CharacterSpec): PartContext {
  const covers = new Set<CoverRegion>();
  let skirted = false;
  for (const worn of spec.items) {
    const item = wardrobeItem(worn.item);
    item?.covers?.forEach((region) => covers.add(region));
    if (item?.tags?.includes('skirted')) skirted = true;
  }
  return { dims: BODY_DIMS[spec.body], covers, skirted, hairCrownHidden: spec.hairCrownHidden };
}

function allParts(spec: CharacterSpec): Part[] {
  const context = contextOf(spec);
  const flags = `${[...context.covers].sort().join('+')}|${context.skirted}|${context.hairCrownHidden}`;
  const parts: Part[] = [
    ...cachedParts(`body:${spec.body}:${flags}`, () => bodyParts(context)),
    ...cachedParts(`head:${spec.body}`, () => headParts(context.dims)),
  ];
  for (const worn of spec.items) {
    const builder = ITEM_BUILDERS[worn.item];
    if (!builder) continue;
    const variant = variantOf(worn);
    parts.push(
      ...cachedParts(`${worn.item}:${variant?.id ?? ''}:${spec.body}:${flags}`, () =>
        builder(context, variant),
      ),
    );
  }
  return parts;
}

/**
 * Builds a character: parts are grouped by material and merged, one SkinnedMesh per material over
 * one shared skeleton. The kit owns its merged geometry and skeleton and shares materials and
 * textures through user counts, so `dispose` frees GPU memory without touching the caches.
 */
export function buildCharacter(spec: CharacterSpec, options: BuildOptions): CharacterKit {
  const { tier, materials = characterMaterials } = options;
  const rig = createRig(spec.body);

  const groups = new Map<string, { material: MaterialSpec; geometries: BufferGeometry[] }>();
  for (const part of allParts(spec)) {
    const material: MaterialSpec =
      part.material.kind === 'skin' ? { kind: 'skin', colour: spec.skin } : part.material;
    const key = materialKey(material, tier);
    const group = groups.get(key);
    if (group) group.geometries.push(part.geometry);
    else groups.set(key, { material, geometries: [part.geometry] });
  }

  const merged: BufferGeometry[] = [];
  const used: Material[] = [];
  let triangles = 0;
  for (const { material: spec, geometries } of groups.values()) {
    const geometry = mergeGeometries(geometries, false);
    if (!geometry) throw new Error('character parts do not merge');
    merged.push(geometry);
    triangles += triangleCount(geometry);
    const material = materials.get(spec, tier);
    materials.retain(material);
    used.push(material);
    const mesh = new SkinnedMesh(geometry, material);
    mesh.name = material.name;
    mesh.frustumCulled = false;
    mesh.raycast = noRaycast;
    mesh.bind(rig.skeleton, new Matrix4());
    rig.root.add(mesh);
  }

  let disposed = false;
  return {
    root: rig.root,
    skeleton: rig.skeleton,
    triangles,
    drawCalls: merged.length,
    dispose() {
      if (disposed) return;
      disposed = true;
      merged.forEach((geometry) => geometry.dispose());
      used.forEach((material) => materials.release(material));
      rig.skeleton.dispose();
    },
  };
}
