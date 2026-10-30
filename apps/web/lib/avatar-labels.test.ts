import { SKIN_TONES, SLOTS, WARDROBE } from '@undangan/world-engine';
import { describe, expect, it } from 'vitest';

import { BODY_LABELS, itemLabel, SKIN_LABELS, SLOT_LABELS, variantLabel } from './avatar-labels';

describe('avatar labels', () => {
  it('[D-010] every wardrobe item, variant, slot and skin tone has an Indonesian label', () => {
    for (const item of WARDROBE) {
      expect(itemLabel(item.id), item.id).not.toBe(item.id);
      for (const variant of item.variants ?? []) {
        expect(variantLabel(variant.id), variant.id).not.toBe(variant.id);
      }
    }
    for (const slot of SLOTS) expect(SLOT_LABELS[slot]).toBeTruthy();
    for (const tone of SKIN_TONES) expect(SKIN_LABELS[tone.id]).toBeTruthy();
    expect(BODY_LABELS).toEqual({ pria: 'Pria', wanita: 'Wanita' });
  });

  it('[D-010] unknown ids fall back to the id', () => {
    expect(itemLabel('constructor')).toBe('constructor');
    expect(variantLabel('toString')).toBe('toString');
  });
});
