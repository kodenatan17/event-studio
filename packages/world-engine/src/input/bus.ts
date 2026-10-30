/** One-shot avatar actions from keys and on-screen buttons (FR-04, FR-07). */
export type InputAction = 'jump' | 'interact' | 'wave';

/**
 * Mutable per-viewer input written by keyboard, joystick and buttons and read by the avatar
 * controller every frame. It lives in the store as `state.input` but is never replaced through
 * `set()`, so 60 Hz writes cause no React renders.
 */
export interface InputBus {
  /** Held movement keys (`KeyboardEvent.code`). */
  readonly keys: Set<string>;
  /** Virtual joystick: x right, y up, |v| ≤ 1. */
  readonly joystick: { x: number; y: number };
  /** Queued one-shot actions, drained by the avatar every frame. */
  readonly actions: InputAction[];
  /** Avatar-editor preview: extra yaw (rad) and panel insets as viewport fractions. */
  readonly preview: { yaw: number; insetRight: number; insetBottom: number };
  /** Drops held keys, the stick, queued actions and the preview (transition, overlay, 2D). */
  reset(): void;
}

/** Taps while the avatar cannot act (loading, error) must not pile up. */
const MAX_QUEUED_ACTIONS = 4;

export function createInputBus(): InputBus {
  const bus: InputBus = {
    keys: new Set(),
    joystick: { x: 0, y: 0 },
    actions: [],
    preview: { yaw: 0, insetRight: 0, insetBottom: 0 },
    reset() {
      bus.keys.clear();
      bus.joystick.x = 0;
      bus.joystick.y = 0;
      bus.actions.length = 0;
      bus.preview.yaw = 0;
      bus.preview.insetRight = 0;
      bus.preview.insetBottom = 0;
    },
  };
  return bus;
}

/** Same queue for keys and buttons (E / "Buka", Space / "Lompat", Q / "Sapa"). */
export function queueAction(bus: InputBus, action: InputAction): void {
  if (bus.actions.length < MAX_QUEUED_ACTIONS) bus.actions.push(action);
}
