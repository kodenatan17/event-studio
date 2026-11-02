import { describe, expect, it } from 'vitest';

import { MAX_BUBBLES, startSpeech, stepSpeech } from './speech';
import type { SpeechInput } from './speech';

const input: SpeechInput = {
  delta: 0.1,
  lineCount: 3,
  canSpeak: true,
  active: 0,
  random: () => 0,
};

describe('stepSpeech', () => {
  it('[D-037] shows a line after the opening gap, then falls quiet', () => {
    const ready = { line: null, last: null, timer: 0.05 };
    const showing = stepSpeech(ready, input);
    expect(showing.line).toBe(0);
    const quiet = stepSpeech({ ...showing, timer: 0.05 }, input);
    expect(quiet.line).toBeNull();
    expect(quiet.last).toBe(0);
    expect(quiet.timer).toBeGreaterThanOrEqual(5);
  });

  it('[D-037] never repeats a line at once', () => {
    const next = stepSpeech({ line: null, last: 0, timer: 0 }, input);
    expect(next.line).toBe(1);
  });

  it('[D-037] waits for a free bubble', () => {
    const ready = { line: null, last: null, timer: 0 };
    expect(stepSpeech(ready, { ...input, active: MAX_BUBBLES }).line).toBeNull();
    expect(stepSpeech(ready, { ...input, active: MAX_BUBBLES - 1 }).line).toBe(0);
  });

  it('[D-037] stops at once when it can no longer speak', () => {
    const showing = { line: 1, last: null, timer: 3 };
    expect(stepSpeech(showing, { ...input, canSpeak: false }).line).toBeNull();
    expect(stepSpeech({ line: null, last: 1, timer: 0 }, { ...input, canSpeak: false }).line).toBe(
      null,
    );
  });

  it('[D-037] a character with no lines stays quiet', () => {
    const start = startSpeech(0);
    expect(stepSpeech({ ...start, timer: 0 }, { ...input, lineCount: 0 }).line).toBeNull();
  });
});
