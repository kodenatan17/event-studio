import { createCharacterMaterials } from './materials';
import type { Part } from './parts';
import { createCharacterTextures } from './textures';

/** Shared by every character on the canvas; the first use draws, later ones reuse. */
export const characterTextures = createCharacterTextures();
export const characterMaterials = createCharacterMaterials(characterTextures);

/** CPU geometry per item and body: rebuilding a look in the editor reuses unchanged parts. */
const partCache = new Map<string, readonly Part[]>();

export function cachedParts(key: string, build: () => readonly Part[]): readonly Part[] {
  let parts = partCache.get(key);
  if (!parts) {
    parts = build();
    partCache.set(key, parts);
  }
  return parts;
}

/** Frees all character GPU resources and CPU data; WorldCanvas calls this on unmount. */
export function clearCharacterCaches(): void {
  characterMaterials.clear();
  partCache.clear();
}
