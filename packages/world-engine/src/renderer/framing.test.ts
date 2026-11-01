import { describe, expect, it } from 'vitest';

import { framingFor } from './FollowCamera';

describe('follow camera framing', () => {
  it('[D-033] a wide-but-short viewport pulls in and flattens; a tall one keeps the rig', () => {
    expect(framingFor(1.6, 900, 45)).toEqual({ fov: 45, distance: 1, lift: 1, centerPull: 0 });
    const short = framingFor(844 / 390, 390, 45);
    expect(short.distance).toBeLessThan(1);
    expect(short.lift).toBeLessThan(1);
    // Halfway through the range, not yet the full tighten.
    const halfway = framingFor(1.2, 510, 45);
    expect(halfway.distance).toBeGreaterThan(short.distance);
    expect(halfway.distance).toBeLessThan(1);
  });

  it('[D-033] landscape tighten is exact and ramps from 620 px down to 400 px', () => {
    // At or above the short-viewport threshold nothing moves.
    expect(framingFor(1.6, 620, 45)).toMatchObject({ distance: 1, lift: 1 });
    expect(framingFor(1.6, 1200, 45)).toMatchObject({ distance: 1, lift: 1 });
    // Full tighten at 400 px and below: distance x0.75, lift x0.7.
    expect(framingFor(1.6, 400, 45)).toMatchObject({ distance: 0.75, lift: 0.7 });
    expect(framingFor(1.6, 200, 45)).toMatchObject({ distance: 0.75, lift: 0.7 });
    // Linear ramp in between: 510 px is halfway -> 0.875 / 0.85.
    expect(framingFor(1.2, 510, 45)).toMatchObject({ distance: 0.875, lift: 0.85 });
  });

  it('[D-033] portrait framing is unchanged', () => {
    const portrait = framingFor(0.5, 900, 45);
    // Pre-change portrait contract: distance 1 + (1 - aspect) * 0.7, lift 1.6, centerPull 0.85.
    expect(portrait.distance).toBe(1.35);
    expect(portrait.lift).toBe(1.6);
    expect(portrait.centerPull).toBe(0.85);
    expect(portrait.fov).toBe(
      (2 * Math.atan(Math.tan((45 * Math.PI) / 360) / Math.pow(0.5, 0.75)) * 180) / Math.PI,
    );
    // Portrait ignores the short-viewport branch entirely.
    expect(framingFor(0.5, 390, 45)).toEqual(portrait);
  });
});
