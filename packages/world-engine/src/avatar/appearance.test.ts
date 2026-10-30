import { describe, expect, it } from 'vitest';

import {
  appearanceKey,
  AVATAR_STORAGE_KEY,
  defaultAppearance,
  normalizeAppearance,
  parseAvatarAppearance,
  randomAppearance,
  visibleItems,
  withBody,
  withSlot,
} from './appearance';
import { REQUIRED_SLOTS, SLOTS, WARDROBE, wardrobeItem } from './wardrobe';

/** Small deterministic generator (keeps this test free of three.js imports). */
function lcg(seed: number): () => number {
  let state = seed >>> 0;
  return () => {
    state = (Math.imul(state, 1664525) + 1013904223) >>> 0;
    return state / 4294967296;
  };
}

describe('avatar appearance', () => {
  it('[FR-07] defaults wear every required slot with valid items', () => {
    for (const body of ['pria', 'wanita'] as const) {
      const appearance = defaultAppearance(body);
      for (const slot of REQUIRED_SLOTS) {
        const item = wardrobeItem(appearance.slots[slot]?.item ?? '');
        expect(item?.bodies).toContain(body);
      }
      expect(normalizeAppearance(appearance)).toEqual(appearance);
    }
    expect(AVATAR_STORAGE_KEY).toBe('undangan.avatar.v1');
  });

  it('[FR-07] invalid stored appearance falls back per slot', () => {
    const parsed = parseAvatarAppearance({
      v: 1,
      body: 'wanita',
      skin: 'hijau-lumut',
      slots: {
        hair: { item: 'sanggul-cepol' },
        top: { item: 'beskap', variant: 'hitam' }, // not for wanita → default kebaya
        bottom: { item: 'jarik', variant: 'ungu' }, // unknown variant → first
        shoes: { item: 'heels', variant: 'marun' },
        glasses: { item: 'no-such-item' }, // optional, unknown → empty
        extra: { item: 'peci' }, // unknown slot → dropped
      },
      token: 'secret',
    });
    expect(parsed).toEqual({
      v: 1,
      body: 'wanita',
      skin: 'sawo-terang',
      slots: {
        hair: { item: 'sanggul-cepol' },
        top: { item: 'kebaya-kutubaru', variant: 'hijau' },
        bottom: { item: 'jarik', variant: 'parang' },
        shoes: { item: 'heels', variant: 'marun' },
      },
    });
    // Same through the stored JSON string.
    expect(parseAvatarAppearance(JSON.stringify(parsed))).toEqual(parsed);
  });

  it('[FR-07] parse rejects >2 KB / non-v1', () => {
    const fallback = defaultAppearance('pria');
    const wanita = JSON.stringify(defaultAppearance('wanita'));
    expect(parseAvatarAppearance(wanita).body).toBe('wanita');
    expect(parseAvatarAppearance(wanita + ' '.repeat(2048))).toEqual(fallback);
    expect(parseAvatarAppearance({ ...defaultAppearance('wanita'), v: 2 })).toEqual(fallback);
    expect(parseAvatarAppearance('{not json')).toEqual(fallback);
    expect(parseAvatarAppearance(null)).toEqual(fallback);
    expect(parseAvatarAppearance([1])).toEqual(fallback);
    expect(parseAvatarAppearance(42)).toEqual(fallback);
  });

  it('[FR-07] hijab hides hair+earrings; sanggul returns when removed', () => {
    const base = defaultAppearance('wanita');
    const covered = withSlot(base, 'headwear', { item: 'hijab', variant: 'biru' });
    // Stored choices stay; only rendering hides them.
    expect(covered.slots.hair).toEqual({ item: 'sanggul-ukel' });
    expect(covered.slots.earrings).toEqual({ item: 'anting', variant: 'emas' });
    const visible = visibleItems(covered);
    expect(visible.slots.hair).toBeUndefined();
    expect(visible.slots.earrings).toBeUndefined();
    expect(visible.slots.headwear).toEqual({ item: 'hijab', variant: 'biru' });

    const uncovered = withSlot(covered, 'headwear', null);
    expect(visibleItems(uncovered).slots.hair).toEqual({ item: 'sanggul-ukel' });
    expect(visibleItems(uncovered).slots.earrings).toEqual({ item: 'anting', variant: 'emas' });

    const peci = visibleItems(withSlot(defaultAppearance('pria'), 'headwear', { item: 'peci' }));
    expect(peci.slots.hair).toEqual({ item: 'belah-samping' });
    expect(peci.hairCrownHidden).toBe(true);
  });

  it('[FR-07] switching body resets body-specific slots', () => {
    const pria = withSlot(
      withSlot(defaultAppearance('pria'), 'headwear', { item: 'blangkon-solo' }),
      'glasses',
      { item: 'kacamata', variant: 'cokelat' },
    );
    const wanita = withBody({ ...pria, skin: 'cokelat' }, 'wanita');
    expect(wanita.body).toBe('wanita');
    expect(wanita.skin).toBe('cokelat');
    expect(wanita.slots.hair?.item).toBe('sanggul-ukel');
    expect(wanita.slots.top).toEqual({ item: 'kebaya-kutubaru', variant: 'hijau' });
    expect(wanita.slots.shoes).toEqual({ item: 'heels', variant: 'nude' });
    expect(wanita.slots.headwear).toBeUndefined();
    // Shared items stay.
    expect(wanita.slots.bottom).toEqual({ item: 'jarik', variant: 'parang' });
    expect(wanita.slots.glasses).toEqual({ item: 'kacamata', variant: 'cokelat' });
    expect(wanita.slots.brooch).toEqual({ item: 'bros', variant: 'emas' });
  });

  it('[FR-07] selendang requires a kebaya', () => {
    const wanita = withSlot(defaultAppearance('wanita'), 'selendang', {
      item: 'selendang',
      variant: 'marun',
    });
    expect(wanita.slots.selendang).toEqual({ item: 'selendang', variant: 'marun' });
    // The default kebaya counts; a top without the tag empties the slot.
    const parsed = parseAvatarAppearance({
      v: 1,
      body: 'pria',
      skin: 'kuning',
      slots: { selendang: { item: 'selendang' } },
    });
    expect(parsed.slots.selendang).toBeUndefined();
  });

  it('[FR-07] random looks are valid and keys are stable', () => {
    const random = lcg(7);
    for (let i = 0; i < 200; i += 1) {
      const body = i % 2 === 0 ? 'pria' : 'wanita';
      const look = randomAppearance(random, body);
      expect(look.body).toBe(body);
      expect(normalizeAppearance(look)).toEqual(look);
      for (const slot of REQUIRED_SLOTS) expect(look.slots[slot]).toBeDefined();
    }
    const a = defaultAppearance('pria');
    const reordered = { ...a, slots: Object.fromEntries(Object.entries(a.slots).reverse()) };
    expect(appearanceKey(reordered)).toBe(appearanceKey(a));
    expect(appearanceKey(a)).toBe(
      'v1|pria|sawo-terang|hair=belah-samping,top=beskap:hitam,bottom=jarik:parang,shoes=selop:hitam,brooch=bros:emas',
    );
  });

  it('[FR-07] catalog ids are kebab-case ascii and slots are known', () => {
    const ids = new Set<string>();
    for (const item of WARDROBE) {
      expect(item.id).toMatch(/^[a-z0-9]+(?:-[a-z0-9]+)*$/);
      expect(ids.has(item.id)).toBe(false);
      ids.add(item.id);
      expect(SLOTS).toContain(item.slot);
      for (const variant of item.variants ?? []) {
        expect(variant.id).toMatch(/^[a-z0-9]+(?:-[a-z0-9]+)*$/);
        expect(variant.swatch).toMatch(/^#[0-9a-f]{6}$/);
      }
    }
  });
});
