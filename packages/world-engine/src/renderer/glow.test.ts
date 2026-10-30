import { Color } from 'three';
import { describe, expect, it } from 'vitest';

import { registerGlowMaterial, setGlowGain } from './glow';

describe('glow', () => {
  it('[§12] glow gain lifts registered accents only while bloom runs, then restores them', () => {
    const lantern = { color: new Color(1, 0.5, 0.2) };
    const melati = { color: new Color(1, 1, 1) };
    registerGlowMaterial(lantern);
    registerGlowMaterial(melati, 0.5);

    setGlowGain(1.8);
    expect(lantern.color.r).toBeCloseTo(1.8);
    expect(lantern.color.g).toBeCloseTo(0.9);
    expect(melati.color.r).toBeCloseTo(1.4);

    setGlowGain(1);
    expect(lantern.color.toArray()).toEqual([1, 0.5, 0.2]);
    expect(melati.color.toArray()).toEqual([1, 1, 1]);
  });
});
