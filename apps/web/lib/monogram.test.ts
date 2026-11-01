import { describe, expect, it } from 'vitest';

import { monogramLetters } from './monogram';

describe('monogramLetters', () => {
  it('[D-036] takes the first letter of each name in upper case', () => {
    expect(monogramLetters('natan', 'Nurul')).toEqual(['N', 'N']);
  });

  it('[D-036] ignores leading spaces', () => {
    expect(monogramLetters('  Bima', ' Sari')).toEqual(['B', 'S']);
  });

  it('[D-036] keeps a letter built from several code points whole', () => {
    expect(monogramLetters('élodie', 'Çelik')).toEqual(['É', 'Ç']);
  });

  it('[D-036] tolerates an empty name', () => {
    expect(monogramLetters('', 'Nurul')).toEqual(['', 'N']);
  });
});
