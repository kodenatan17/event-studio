import {
  MeshBasicMaterial,
  MeshPhysicalMaterial,
  MeshStandardMaterial,
  NoColorSpace,
  SRGBColorSpace,
  Texture,
} from 'three';
import { describe, expect, it, vi } from 'vitest';

import type { RenderTier } from '../renderer/capabilities';
import { createCharacterMaterials, materialKey } from './materials';
import type { MaterialKind, MaterialSpec } from './materials';
import { createCharacterTextures } from './textures';
import type { DrawRoutine, TextureProvider } from './textures';

const HIGH: RenderTier = { bloom: true, physicalMaterials: true, textureSize: 512 };
const BASE: RenderTier = { bloom: false, physicalMaterials: false, textureSize: 256 };

/** Canvas 2D stand-in: records every call and assignment, so drawings can be compared in Node. */
function recordingContext(log: string[]): CanvasRenderingContext2D {
  const gradient = {
    addColorStop: (offset: number, colour: string) => log.push(`stop ${offset} ${colour}`),
  };
  return new Proxy({} as CanvasRenderingContext2D, {
    get:
      (_, name) =>
      (...args: unknown[]) => {
        log.push(`${String(name)}(${args.join(',')})`);
        return String(name) === 'createRadialGradient' ? gradient : undefined;
      },
    set: (_, name, value: unknown) => {
      log.push(`${String(name)}=${typeof value === 'object' ? 'gradient' : String(value)}`);
      return true;
    },
  });
}

/** Keeps a stand-in "canvas" (`image`) on each texture, as `CanvasTexture` keeps the real one. */
function stubProvider() {
  const logs = new Map<Texture, string[]>();
  const create = vi.fn((size: number, draw: DrawRoutine) => {
    const log: string[] = [];
    draw(recordingContext(log));
    const texture = new Texture({ width: size, height: size } as unknown as HTMLCanvasElement);
    logs.set(texture, log);
    return texture;
  });
  const provider: TextureProvider = { create };
  return { provider, create, logs };
}

function setup() {
  const stub = stubProvider();
  const textures = createCharacterTextures(stub.provider);
  return { ...stub, textures, materials: createCharacterMaterials(textures) };
}

describe('character textures', () => {
  it('[FR-07] the provider stub works in Node and textures are cached by design and size', () => {
    const { textures, create } = setup();
    const parang = textures.batik('parang', '#5b3b22', 256);
    expect(textures.batik('parang', '#5b3b22', 256)).toBe(parang);
    expect(textures.batik('parang', '#5b3b22', 512)).not.toBe(parang);
    expect(textures.batik('kawung', '#5b3b22', 256)).not.toBe(parang);
    expect(textures.batik('parang', '#3e2a1c', 256)).not.toBe(parang);
    expect(create).toHaveBeenCalledTimes(4);
    expect(textures.contactShadow()).toBe(textures.contactShadow());
    expect(create).toHaveBeenLastCalledWith(64, expect.any(Function));
  });

  it('[FR-07] every generator draws deterministically', () => {
    const first = setup();
    const second = setup();
    const generate = (textures: ReturnType<typeof setup>['textures']) => [
      textures.batik('parang', '#5b3b22', 256),
      textures.batik('kawung', '#6a4527', 256),
      textures.batik('truntum', '#3e2a1c', 256),
      textures.batik('sekar', '#1f2b4d', 256),
      textures.embroidery('beskap', '#1f1b1a', 256).map,
      textures.embroidery('kebaya', '#6a1f2a', 256).data,
      textures.lace(256),
      textures.paes(256),
      textures.contactShadow(),
    ];
    const a = generate(first.textures);
    const b = generate(second.textures);
    a.forEach((texture, index) => {
      const log = first.logs.get(texture) ?? [];
      expect(log.length).toBeGreaterThan(4);
      expect(log).toEqual(second.logs.get(b[index]!));
    });
  });

  it('[FR-07] embroidery colour and data canvases trace the same vines', () => {
    const { textures, logs } = setup();
    const { map, data } = textures.embroidery('beskap', '#1f1b1a', 512);
    const paths = (texture: Texture) =>
      (logs.get(texture) ?? []).filter((entry) => !entry.includes('Style='));
    expect(paths(map)).toEqual(paths(data));
    expect(map.colorSpace).toBe(SRGBColorSpace);
    expect(data.colorSpace).toBe(NoColorSpace);
    // One data map per design: only the colour map depends on the velvet colour.
    expect(textures.embroidery('beskap', '#6a1f2a', 512).data).toBe(data);
    expect(textures.embroidery('beskap', '#6a1f2a', 512).map).not.toBe(map);
  });

  it('[FR-07] lace is an alpha map sampled through uv1', () => {
    const { textures } = setup();
    const lace = textures.lace(256);
    expect(lace.colorSpace).toBe(NoColorSpace);
    expect(lace.channel).toBe(1);
  });

  it('[FR-07] the last release frees the GPU copy but keeps the canvas and the cache entry', () => {
    const { textures, create } = setup();
    const texture = textures.batik('truntum', '#3e2a1c', 256);
    const canvas = texture.image as unknown;
    const onDispose = vi.fn();
    texture.addEventListener('dispose', onDispose);

    textures.retain(texture);
    textures.retain(texture);
    textures.release(texture);
    expect(onDispose).not.toHaveBeenCalled();
    textures.release(texture);
    expect(onDispose).toHaveBeenCalledTimes(1);

    expect(texture.image).toBe(canvas);
    expect(textures.batik('truntum', '#3e2a1c', 256)).toBe(texture);
    expect(create).toHaveBeenCalledTimes(1);
  });

  it('[FR-07] clear frees every GPU copy and forgets the textures', () => {
    const { textures, create } = setup();
    const texture = textures.paes(256);
    const onDispose = vi.fn();
    texture.addEventListener('dispose', onDispose);
    textures.clear();
    expect(onDispose).toHaveBeenCalledTimes(1);
    expect(textures.paes(256)).not.toBe(texture);
    expect(create).toHaveBeenCalledTimes(2);
  });
});

describe('character materials', () => {
  const ALL: readonly MaterialSpec[] = (
    [
      { kind: 'skin', colour: '#c98f63' },
      { kind: 'eye' },
      { kind: 'faceDetail' },
      { kind: 'hair', colour: '#1a1412' },
      { kind: 'velvet', colour: '#1f1b1a', pattern: 'beskap' },
      { kind: 'velvet', colour: '#6a1f2a' },
      { kind: 'cloth', colour: '#5b3b22', pattern: 'parang' },
      { kind: 'cloth', colour: '#24221f' },
      { kind: 'lace', colour: '#efe6d6' },
      { kind: 'gold' },
      { kind: 'leather', colour: '#5a3420' },
      { kind: 'melati', colour: '#fffaf0' },
      { kind: 'paes', colour: '#1a120d' },
    ] as const
  ).slice();

  it('[FR-07] cache identity follows kind, colour, pattern and tier', () => {
    const { materials } = setup();
    const velvet: MaterialSpec = { kind: 'velvet', colour: '#1f1b1a', pattern: 'beskap' };
    const high = materials.get(velvet, HIGH);
    expect(materials.get({ ...velvet }, HIGH)).toBe(high);
    expect(materials.get(velvet, BASE)).not.toBe(high);
    expect(materials.get({ ...velvet, colour: '#6a1f2a' }, HIGH)).not.toBe(high);
    expect(materials.get({ ...velvet, pattern: 'kebaya' }, HIGH)).not.toBe(high);
    expect(materialKey(velvet, HIGH)).toBe('velvet:#1f1b1a|beskap:high');
    expect(materialKey(velvet, BASE)).toBe('velvet:#1f1b1a|beskap:base');
  });

  it('[§12] high tier is physical; base tier is standard with the same maps', () => {
    const { materials } = setup();
    for (const spec of ALL) {
      const high = materials.get(spec, HIGH);
      const base = materials.get(spec, BASE);
      if (spec.kind === 'melati') {
        expect(high).toBeInstanceOf(MeshBasicMaterial);
        continue;
      }
      expect(high, spec.kind).toBeInstanceOf(MeshPhysicalMaterial);
      expect(base, spec.kind).toBeInstanceOf(MeshStandardMaterial);
      expect(base, spec.kind).not.toBeInstanceOf(MeshPhysicalMaterial);
      for (const slot of ['map', 'alphaMap', 'roughnessMap', 'metalnessMap'] as const) {
        expect(!!(base as MeshStandardMaterial)[slot], `${spec.kind}.${slot}`).toBe(
          !!(high as MeshStandardMaterial)[slot],
        );
      }
    }
  });

  it('[FR-07] each kind is set up per the design', () => {
    const { materials } = setup();
    const get = (kind: MaterialKind, extra: Partial<MaterialSpec> = {}) =>
      materials.get({ kind, ...extra }, HIGH) as MeshPhysicalMaterial;
    expect(get('skin')).toMatchObject({ sheen: 0.25, sheenRoughness: 0.6, roughness: 0.58 });
    expect(get('eye')).toMatchObject({ roughness: 0.15, clearcoat: 1, vertexColors: true });
    expect(get('velvet', { pattern: 'beskap', colour: '#1f1b1a' })).toMatchObject({
      sheen: 1,
      sheenRoughness: 0.3,
    });
    const embroidered = get('velvet', { pattern: 'kebaya', colour: '#6a1f2a' });
    expect(embroidered.roughnessMap).toBe(embroidered.metalnessMap);
    expect(embroidered.map?.colorSpace).toBe(SRGBColorSpace);
    expect(get('cloth', { pattern: 'kawung', colour: '#6a4527' }).roughness).toBe(0.82);
    expect(get('lace', { colour: '#efe6d6' })).toMatchObject({ alphaTest: 0.5, side: 2 });
    expect(get('gold')).toMatchObject({ metalness: 0.85, roughness: 0.3 });
    expect(get('paes', { colour: '#1a120d' }).polygonOffset).toBe(true);
    // The map carries the fabric colour, so the base colour must not tint it again.
    expect(get('cloth', { pattern: 'kawung', colour: '#6a4527' }).color.getHexString()).toBe(
      'ffffff',
    );
  });

  it('[FR-07] a released material frees its GPU textures only after the last user', () => {
    const { materials } = setup();
    const material = materials.get({ kind: 'velvet', colour: '#1f1b1a', pattern: 'beskap' }, HIGH);
    const { map, roughnessMap } = material as MeshStandardMaterial;
    const onMaterial = vi.fn();
    const onMap = vi.fn();
    const onData = vi.fn();
    material.addEventListener('dispose', onMaterial);
    map?.addEventListener('dispose', onMap);
    roughnessMap?.addEventListener('dispose', onData);

    materials.retain(material);
    materials.retain(material);
    materials.release(material);
    expect(onMaterial).not.toHaveBeenCalled();
    materials.release(material);
    expect(onMaterial).toHaveBeenCalledTimes(1);
    expect(onMap).toHaveBeenCalledTimes(1);
    // Roughness and metalness share one data map: it is released once.
    expect(onData).toHaveBeenCalledTimes(1);
    // Still cached for the next character.
    expect(materials.get({ kind: 'velvet', colour: '#1f1b1a', pattern: 'beskap' }, HIGH)).toBe(
      material,
    );
  });

  it('[FR-07] a texture shared by two materials survives until both are released', () => {
    const { materials, textures } = setup();
    const high = materials.get({ kind: 'lace', colour: '#efe6d6' }, HIGH);
    const other = materials.get({ kind: 'lace', colour: '#74202f' }, HIGH);
    const onDispose = vi.fn();
    textures.lace(HIGH.textureSize).addEventListener('dispose', onDispose);
    materials.retain(high);
    materials.retain(other);
    materials.release(high);
    expect(onDispose).not.toHaveBeenCalled();
    materials.release(other);
    expect(onDispose).toHaveBeenCalledTimes(1);
  });

  it('[FR-07] clear frees materials and textures and forgets them', () => {
    const { materials } = setup();
    const spec: MaterialSpec = { kind: 'melati', colour: '#fffaf0' };
    const melati = materials.get(spec, BASE);
    const onDispose = vi.fn();
    melati.addEventListener('dispose', onDispose);
    materials.clear();
    expect(onDispose).toHaveBeenCalledTimes(1);
    expect(materials.get(spec, BASE)).not.toBe(melati);
  });
});
