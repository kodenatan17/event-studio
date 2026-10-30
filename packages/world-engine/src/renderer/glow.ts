import type { Color } from 'three';

/**
 * HDR accents for bloom (§12): registered unlit materials (lantern glow, melati, hotspot
 * indicators) are pushed above 1.0 only while bloom runs, so the threshold-1 bloom picks up just
 * these. Without bloom the gain is 1 and colours are unchanged.
 */
interface GlowEntry {
  material: { color: Color };
  base: Color;
  /** Share of the gain this material takes (bright near-white accents need less). */
  weight: number;
}

const entries: GlowEntry[] = [];
let gain = 1;

function apply({ material, base, weight }: GlowEntry): void {
  material.color.copy(base).multiplyScalar(1 + (gain - 1) * weight);
}

export function registerGlowMaterial(material: { color: Color }, weight = 1): void {
  if (entries.some((entry) => entry.material === material)) return;
  const entry = { material, base: material.color.clone(), weight };
  entries.push(entry);
  apply(entry);
}

/** For materials that can be freed; the module-level scene accents stay registered for good. */
export function unregisterGlowMaterial(material: { color: Color }): void {
  const index = entries.findIndex((entry) => entry.material === material);
  if (index < 0) return;
  material.color.copy(entries[index]!.base);
  entries.splice(index, 1);
}

export function setGlowGain(next: number): void {
  gain = next;
  entries.forEach(apply);
}
