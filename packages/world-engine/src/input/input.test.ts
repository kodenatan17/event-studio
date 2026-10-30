import { describe, expect, it } from 'vitest';

import { createInputBus, queueAction } from './bus';
import { joystickVector } from './joystick';
import { releasesHeldKeys, shouldHandleKeyDown } from './keyboard';
import type { KeyEventLike } from './keyboard';
import { combineMovement, keyboardVector, toWorldDirection } from './movement';

/** Element stand-in: `closest` matches when any selector in the list names one of `matches`. */
function element(matches: string[], tabIndex = -1) {
  return {
    tabIndex,
    closest: (selector: string) =>
      selector
        .split(',')
        .map((part) => part.trim())
        .some((part) => matches.includes(part))
        ? {}
        : null,
  };
}

function key(code: string, overrides: Partial<KeyEventLike> = {}): KeyEventLike {
  return {
    code,
    repeat: false,
    isComposing: false,
    altKey: false,
    ctrlKey: false,
    metaKey: false,
    target: element([]),
    ...overrides,
  };
}

const CAMERA_FORWARD_MINUS_Z = [0, -1] as const;

describe('input', () => {
  it('[FR-04] W/ArrowUp map to camera-forward (screen up)', () => {
    for (const code of ['KeyW', 'ArrowUp']) {
      const up = keyboardVector(new Set([code]));
      expect(up).toEqual({ x: 0, y: 1 });
      expect(toWorldDirection(up, CAMERA_FORWARD_MINUS_Z)).toEqual([0, -1]);
    }
    // D/ArrowRight are camera-right; a camera looking along +x turns W into +x.
    expect(toWorldDirection(keyboardVector(new Set(['KeyD'])), CAMERA_FORWARD_MINUS_Z)).toEqual([
      1, 0,
    ]);
    const [x, z] = toWorldDirection({ x: 0, y: 1 }, [3, 0]);
    expect(x).toBeCloseTo(1);
    expect(z).toBeCloseTo(0);
    // A camera looking straight down falls back to −z.
    expect(toWorldDirection({ x: 0, y: 1 }, [0, 0])).toEqual([0, -1]);
  });

  it('[FR-04] diagonal keys are normalised', () => {
    const diagonal = keyboardVector(new Set(['KeyW', 'KeyD']));
    expect(Math.hypot(diagonal.x, diagonal.y)).toBeCloseTo(1);
    expect(diagonal.x).toBeCloseTo(Math.SQRT1_2);
    // Opposite keys cancel; W + ArrowUp count once.
    expect(keyboardVector(new Set(['KeyA', 'KeyD']))).toEqual({ x: 0, y: 0 });
    expect(keyboardVector(new Set(['KeyW', 'ArrowUp']))).toEqual({ x: 0, y: 1 });
    // Keyboard + joystick never exceed full speed.
    const combined = combineMovement({ x: 0, y: 1 }, { x: 0.8, y: 0.6 });
    expect(Math.hypot(combined.x, combined.y)).toBeCloseTo(1);
  });

  it('[FR-04] joystick deadzone 0.15 and clamp 1', () => {
    expect(joystickVector(0, 0)).toEqual({ x: 0, y: 0, m: 0 });
    // 0.15 × 40 px = 6 px deadzone.
    expect(joystickVector(5.9, 0).m).toBe(0);
    const justOutside = joystickVector(0, -8);
    expect(justOutside.m).toBeCloseTo((0.2 - 0.15) / 0.85);
    expect(justOutside.y).toBeGreaterThan(0); // screen up → +y
    expect(joystickVector(400, 0)).toEqual({ x: 1, y: 0, m: 1 });
    const half = joystickVector(0, 40 * (0.15 + 0.85 * 0.5));
    expect(half.m).toBeCloseTo(0.5);
    expect(half.y).toBeCloseTo(-0.5);
  });

  it('[FR-04] keys ignored in inputs/dialogs/with modifiers; Space/Enter ignored on buttons', () => {
    expect(shouldHandleKeyDown(key('KeyW'), true)).toBe(true);
    expect(shouldHandleKeyDown(key('KeyW'), false)).toBe(false);
    expect(shouldHandleKeyDown(key('KeyZ'), true)).toBe(false);
    for (const modifier of ['altKey', 'ctrlKey', 'metaKey', 'isComposing'] as const) {
      expect(shouldHandleKeyDown(key('KeyW', { [modifier]: true }), true), modifier).toBe(false);
    }
    for (const container of ['input', 'textarea', 'dialog', '[role="dialog"]']) {
      expect(shouldHandleKeyDown(key('KeyW', { target: element([container]) }), true)).toBe(false);
    }
    const button = element(['button'], 0);
    expect(shouldHandleKeyDown(key('Space', { target: button }), true)).toBe(false);
    expect(shouldHandleKeyDown(key('Enter', { target: button }), true)).toBe(false);
    // Any focusable element keeps Space/Enter; tabindex=-1 (the world layer) does not.
    expect(shouldHandleKeyDown(key('Space', { target: element([], 0) }), true)).toBe(false);
    expect(shouldHandleKeyDown(key('Space', { target: element([], -1) }), true)).toBe(true);
    // Movement keys still work while a button has focus.
    expect(shouldHandleKeyDown(key('KeyW', { target: button }), true)).toBe(true);
    // Arrows belong to composite widgets.
    const tabs = element(['[role="tablist"]']);
    expect(shouldHandleKeyDown(key('ArrowLeft', { target: tabs }), true)).toBe(false);
    expect(shouldHandleKeyDown(key('KeyA', { target: tabs }), true)).toBe(true);
    // Auto-repeat never re-fires one-shot actions; held movement keys may repeat.
    expect(shouldHandleKeyDown(key('KeyE', { repeat: true }), true)).toBe(false);
    expect(shouldHandleKeyDown(key('KeyW', { repeat: true }), true)).toBe(true);
  });

  it('[FR-04] Meta releases held keys (macOS sends no key-up)', () => {
    expect(releasesHeldKeys('Meta')).toBe(true);
    for (const key of ['Shift', 'Control', 'Alt', 'w']) {
      expect(releasesHeldKeys(key), key).toBe(false);
    }
  });

  it('[FR-04] action queue is capped and reset clears everything', () => {
    const bus = createInputBus();
    for (let i = 0; i < 10; i += 1) queueAction(bus, 'jump');
    expect(bus.actions.length).toBe(4);
    bus.keys.add('KeyW');
    bus.joystick.x = 0.5;
    bus.preview.yaw = 1;
    bus.reset();
    expect(bus).toMatchObject({ actions: [], joystick: { x: 0, y: 0 }, preview: { yaw: 0 } });
    expect(bus.keys.size).toBe(0);
  });
});
