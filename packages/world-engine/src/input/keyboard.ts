import type { InputAction } from './bus';

export type MoveDirection = 'up' | 'down' | 'left' | 'right';

export type KeyBinding =
  { kind: 'move'; direction: MoveDirection } | { kind: 'action'; action: InputAction };

const move = (direction: MoveDirection): KeyBinding => ({ kind: 'move', direction });
const act = (action: InputAction): KeyBinding => ({ kind: 'action', action });

/** Bound by `KeyboardEvent.code`, so the physical keys are the same on every layout. */
const BINDINGS: Readonly<Record<string, KeyBinding>> = {
  KeyW: move('up'),
  ArrowUp: move('up'),
  KeyS: move('down'),
  ArrowDown: move('down'),
  KeyA: move('left'),
  ArrowLeft: move('left'),
  KeyD: move('right'),
  ArrowRight: move('right'),
  Space: act('jump'),
  KeyE: act('interact'),
  Enter: act('interact'),
  NumpadEnter: act('interact'),
  KeyQ: act('wave'),
};

export function keyBinding(code: string): KeyBinding | null {
  return Object.hasOwn(BINDINGS, code) ? (BINDINGS[code] ?? null) : null;
}

/** Keys whose browser default (page scroll) is suppressed once the world handles them. */
export function preventsDefault(code: string): boolean {
  return code === 'Space' || code.startsWith('Arrow');
}

/** macOS sends no key-up for keys released while Meta is down, so they would stick. */
export function releasesHeldKeys(key: string): boolean {
  return key === 'Meta';
}

/** Typing, dialogs: the world never steals these keys. */
const TEXT_OR_DIALOG =
  'input, textarea, select, [contenteditable]:not([contenteditable="false"]), dialog, [role="dialog"]';
/** Space/Enter activate these natively. */
const ACTIVATABLE = 'button, a[href], summary, [role="button"]';
/** Arrow keys move focus or values inside these widgets. */
const ARROW_WIDGETS =
  '[role="tablist"], [role="slider"], [role="listbox"], [role="menu"], [role="radiogroup"]';

/** The part of `KeyboardEvent` the rules read; `target` is narrowed at runtime (tests run without a DOM). */
export interface KeyEventLike {
  code: string;
  repeat: boolean;
  isComposing: boolean;
  altKey: boolean;
  ctrlKey: boolean;
  metaKey: boolean;
  target: unknown;
}

interface ElementLike {
  closest(selector: string): unknown;
  tabIndex?: number;
}

function asElement(target: unknown): ElementLike | null {
  return typeof target === 'object' &&
    target !== null &&
    typeof (target as { closest?: unknown }).closest === 'function'
    ? (target as ElementLike)
    : null;
}

/**
 * Whether a key-down belongs to the avatar (FR-04). Key-up is always processed. Ignored: input
 * suspended (overlay, loading, §8.2), Ctrl/Alt/Meta shortcuts, IME composition, typing and
 * dialogs, Space/Enter on anything focusable (they activate it), arrows inside composite
 * widgets, and auto-repeat of one-shot actions.
 */
export function shouldHandleKeyDown(event: KeyEventLike, inputEnabled: boolean): boolean {
  const binding = keyBinding(event.code);
  if (!binding || !inputEnabled) return false;
  if (event.altKey || event.ctrlKey || event.metaKey || event.isComposing) return false;
  if (binding.kind === 'action' && event.repeat) return false;
  const target = asElement(event.target);
  if (!target) return true;
  if (target.closest(TEXT_OR_DIALOG)) return false;
  const activates =
    event.code === 'Space' || event.code === 'Enter' || event.code === 'NumpadEnter';
  if (activates && (target.closest(ACTIVATABLE) || (target.tabIndex ?? -1) >= 0)) return false;
  if (event.code.startsWith('Arrow') && target.closest(ARROW_WIDGETS)) return false;
  return true;
}
