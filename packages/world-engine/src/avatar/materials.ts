import {
  Color,
  DoubleSide,
  MeshBasicMaterial,
  MeshPhysicalMaterial,
  MeshStandardMaterial,
} from 'three';
import type { Material, MeshStandardMaterialParameters, Texture } from 'three';

import type { RenderTier } from '../renderer/capabilities';
import { registerGlowMaterial, unregisterGlowMaterial } from '../renderer/glow';
import type { CharacterTextures, EmbroideryKind } from './textures';
import type { BatikPattern } from './wardrobe';

/** Skin, cloth, metal and so on; every kind reads the parts' vertex colours (`finalize`). */
export type MaterialKind =
  | 'skin'
  | 'eye'
  | 'faceDetail'
  | 'hair'
  | 'velvet'
  | 'cloth'
  | 'lace'
  | 'gold'
  | 'leather'
  | 'melati'
  | 'paes';

export interface MaterialSpec {
  kind: MaterialKind;
  /** sRGB hex; white when omitted. */
  colour?: string;
  /** Batik motif (cloth) or embroidery design (velvet). */
  pattern?: BatikPattern | EmbroideryKind;
}

const GOLD = '#d4ab52';
const WHITE = '#ffffff';
const PEACH_SHEEN = '#ffb899';

const isEmbroidery = (pattern: MaterialSpec['pattern']): pattern is EmbroideryKind =>
  pattern === 'beskap' || pattern === 'kebaya';

/** `kind:colour|pattern:tier`. Tier: `high` (physical) or `base` (coarse, low, software). */
export function materialKey(spec: MaterialSpec, tier: RenderTier): string {
  const look = `${spec.colour ?? ''}|${spec.pattern ?? ''}`;
  return `${spec.kind}:${look}:${tier.physicalMaterials ? 'high' : 'base'}`;
}

/** Physical only where the tier allows it; the base tier keeps the maps and drops the layers. */
function surface(
  tier: RenderTier,
  shared: MeshStandardMaterialParameters,
  physical: ConstructorParameters<typeof MeshPhysicalMaterial>[0] = {},
): MeshStandardMaterial {
  const parameters = { vertexColors: true, ...shared };
  return tier.physicalMaterials
    ? new MeshPhysicalMaterial({ ...parameters, ...physical })
    : new MeshStandardMaterial(parameters);
}

function build(spec: MaterialSpec, tier: RenderTier, textures: CharacterTextures): Material {
  const { kind, pattern } = spec;
  const colour = spec.colour ?? WHITE;
  const size = tier.textureSize;
  switch (kind) {
    case 'skin':
      return surface(
        tier,
        { color: colour, roughness: 0.58, metalness: 0 },
        { sheen: 0.25, sheenRoughness: 0.6, sheenColor: new Color(PEACH_SHEEN) },
      );
    case 'eye':
      return surface(tier, { roughness: 0.15, metalness: 0 }, { clearcoat: 1 });
    case 'faceDetail':
      return surface(tier, { color: colour, roughness: 0.65, metalness: 0 });
    case 'hair':
      return surface(tier, { color: colour, roughness: 0.48, metalness: 0 });
    case 'velvet': {
      const sheen = {
        sheen: 1,
        sheenRoughness: 0.3,
        sheenColor: new Color(colour).lerp(new Color(WHITE), 0.35),
      };
      if (!isEmbroidery(pattern)) {
        return surface(tier, { color: colour, roughness: 0.9, metalness: 0 }, sheen);
      }
      const { map, data } = textures.embroidery(pattern, colour, size);
      // Both scalars multiply the data map, so they stay at 1.
      return surface(
        tier,
        { map, roughnessMap: data, metalnessMap: data, roughness: 1, metalness: 1 },
        sheen,
      );
    }
    case 'cloth':
      return pattern && !isEmbroidery(pattern)
        ? surface(tier, {
            map: textures.batik(pattern, colour, size),
            roughness: 0.82,
            metalness: 0,
          })
        : surface(tier, { color: colour, roughness: 0.82, metalness: 0 });
    case 'lace':
      return surface(tier, {
        color: colour,
        alphaMap: textures.lace(size),
        alphaTest: 0.5,
        side: DoubleSide,
        roughness: 0.75,
        metalness: 0,
      });
    case 'gold':
      return surface(tier, {
        color: spec.colour ?? GOLD,
        metalness: 0.85,
        roughness: 0.3,
        emissive: new Color(spec.colour ?? GOLD).multiplyScalar(0.22),
      });
    case 'leather':
      return surface(tier, { color: colour, roughness: 0.42, metalness: 0 });
    case 'melati': {
      const melati = new MeshBasicMaterial({ color: colour, vertexColors: true });
      registerGlowMaterial(melati, 0.5);
      return melati;
    }
    case 'paes':
      return surface(tier, {
        color: colour,
        alphaMap: textures.paes(size),
        alphaTest: 0.5,
        polygonOffset: true,
        polygonOffsetFactor: -2,
        polygonOffsetUnits: -2,
        roughness: 0.7,
        metalness: 0,
      });
  }
}

/** Every texture a material samples (a data map may fill two slots; it counts once). */
function texturesOf(material: Material): Texture[] {
  const { map, alphaMap, roughnessMap, metalnessMap } = material as MeshStandardMaterial;
  return [...new Set([map, alphaMap, roughnessMap, metalnessMap])].filter(
    (texture): texture is Texture => !!texture,
  );
}

export interface CharacterMaterials {
  get(spec: MaterialSpec, tier: RenderTier): Material;
  retain(material: Material): void;
  /** The last release frees the program and GPU textures; the material stays cached. */
  release(material: Material): void;
  /** Frees everything and forgets every material (canvas unmount). */
  clear(): void;
}

export function createCharacterMaterials(textures: CharacterTextures): CharacterMaterials {
  const cache = new Map<string, Material>();
  const users = new Map<Material, number>();

  const free = (material: Material) => {
    texturesOf(material).forEach((texture) => textures.release(texture));
    material.dispose();
  };

  return {
    get(spec, tier) {
      const key = materialKey(spec, tier);
      let material = cache.get(key);
      if (!material) {
        material = build(spec, tier, textures);
        material.name = key;
        cache.set(key, material);
      }
      return material;
    },
    retain(material) {
      const count = users.get(material) ?? 0;
      if (count === 0) texturesOf(material).forEach((texture) => textures.retain(texture));
      users.set(material, count + 1);
    },
    release(material) {
      const count = users.get(material) ?? 0;
      if (count === 0) return;
      if (count > 1) {
        users.set(material, count - 1);
        return;
      }
      users.delete(material);
      free(material);
    },
    clear() {
      for (const material of cache.values()) {
        if (material instanceof MeshBasicMaterial) unregisterGlowMaterial(material);
        material.dispose();
      }
      cache.clear();
      users.clear();
      textures.clear();
    },
  };
}
