import { AVATAR_STORAGE_KEY, WARDROBE, randomAppearance } from '@undangan/world-engine';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { readAvatarPreference, writeAvatarPreference } from './avatar-preference';

function stubStorage(initial: Record<string, string> = {}) {
  const data = new Map(Object.entries(initial));
  vi.stubGlobal('window', {
    localStorage: {
      getItem: (key: string) => data.get(key) ?? null,
      setItem: (key: string, value: string) => data.set(key, value),
    },
  });
  return data;
}

afterEach(() => vi.unstubAllGlobals());

describe('avatar preference', () => {
  it('[§3.4] avatar preference stores only catalog ids', () => {
    const data = stubStorage();
    const look = randomAppearance(() => 0.3, 'wanita');
    writeAvatarPreference(look);

    expect([...data.keys()]).toEqual([AVATAR_STORAGE_KEY]);
    const stored = JSON.parse(data.get(AVATAR_STORAGE_KEY) ?? '{}') as {
      v: number;
      body: string;
      skin: string;
      slots: Record<string, { item: string; variant?: string }>;
    };
    expect(Object.keys(stored).sort()).toEqual(['body', 'skin', 'slots', 'v']);
    const ids = new Set(WARDROBE.map((item) => item.id));
    for (const choice of Object.values(stored.slots)) {
      expect(ids.has(choice.item)).toBe(true);
      expect(Object.keys(choice).every((key) => key === 'item' || key === 'variant')).toBe(true);
    }
    expect(data.get(AVATAR_STORAGE_KEY)?.length).toBeLessThan(2048);
  });

  it('[FR-07] a saved look reads back the same', () => {
    stubStorage();
    const look = randomAppearance(() => 0.7, 'pria');
    writeAvatarPreference(look);
    expect(readAvatarPreference()).toEqual(look);
  });

  it('[FR-07] nothing stored, or storage blocked, leaves the default look', () => {
    stubStorage();
    expect(readAvatarPreference()).toBeNull();
    vi.stubGlobal('window', {
      get localStorage(): never {
        throw new Error('blocked');
      },
    });
    expect(readAvatarPreference()).toBeNull();
    expect(() => writeAvatarPreference(randomAppearance(() => 0.5, 'pria'))).not.toThrow();
  });
});
