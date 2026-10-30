import { describe, expect, it } from 'vitest';

import {
  avatarActionLabel,
  controlLabel,
  interactLabel,
  interactShortLabel,
  KEYBOARD_HINTS,
  overlayLabel,
  sceneLabel,
} from './labels';

describe('labels', () => {
  it('[D-010] scenes and controls have Indonesian labels', () => {
    expect(sceneLabel('living-room')).toBe('Ruang Tamu');
    expect(controlLabel('front-door')).toBe('Masuk ke Ruang Tamu');
    expect(overlayLabel({ type: 'open_story' })).toBe('Buku kisah');
  });

  it('[D-010] unknown ids fall back to the id', () => {
    expect(sceneLabel('rooftop')).toBe('rooftop');
    expect(controlLabel('constructor')).toBe('constructor');
  });

  it('[FR-04] avatar actions and keyboard hint are Indonesian', () => {
    expect(avatarActionLabel('jump')).toBe('Lompat');
    expect(avatarActionLabel('interact')).toBe('Buka');
    expect(avatarActionLabel('wave')).toBe('Sapa');
    expect(KEYBOARD_HINTS.map((hint) => hint.label)).toEqual(['Jalan', 'Lompat', 'Buka', 'Sapa']);
  });

  it('[§3.4] portals keep their own verb; hotspots read "Buka …"', () => {
    expect(interactLabel({ kind: 'hotspot', id: 'ceremony-info' })).toBe('Buka Info akad nikah');
    expect(interactShortLabel({ kind: 'hotspot', id: 'ceremony-info' })).toBe('Buka');
    expect(interactShortLabel(null)).toBe('Buka');

    const portals = {
      'front-door': 'Masuk',
      'garden-door': 'Ke Taman',
      'hall-door': 'Ke Pendopo',
      'back-to-entrance': 'Kembali',
      'back-to-living': 'Kembali',
    };
    for (const [id, short] of Object.entries(portals)) {
      const tag = { kind: 'portal', id } as const;
      expect(interactLabel(tag)).toBe(controlLabel(id));
      expect(interactLabel(tag)).not.toContain('Buka');
      expect(interactShortLabel(tag)).toBe(short);
      // The visible text is part of the accessible name (WCAG 2.5.3).
      expect(interactLabel(tag).startsWith(short)).toBe(true);
    }
  });
});
