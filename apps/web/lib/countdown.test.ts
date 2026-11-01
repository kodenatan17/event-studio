import { describe, expect, it } from 'vitest';

import { countdownParts } from './countdown';

describe('countdownParts', () => {
  it('[D-035] splits the remaining time into days, hours, minutes and seconds', () => {
    const left = (2 * 86_400 + 3 * 3_600 + 4 * 60 + 5) * 1000;
    expect(countdownParts(left, 0)).toEqual({ days: 2, hours: 3, minutes: 4, seconds: 5 });
  });

  it('[D-035] is null at or after the event, and for an unparseable date', () => {
    expect(countdownParts(1000, 1000)).toBeNull();
    expect(countdownParts(0, 1000)).toBeNull();
    expect(countdownParts(Number.NaN, 0)).toBeNull();
  });
});
