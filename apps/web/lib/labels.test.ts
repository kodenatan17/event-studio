import { describe, expect, it } from 'vitest';

import { controlLabel, overlayLabel, sceneLabel } from './labels';

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
});
