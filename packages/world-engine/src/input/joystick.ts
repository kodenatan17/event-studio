export interface JoystickVector {
  /** Right-positive. */
  x: number;
  /** Up-positive (screen up = camera forward). */
  y: number;
  /** Magnitude after the deadzone, 0..1. */
  m: number;
}

/**
 * Virtual analog stick (FR-04): pointer offset from the stick center in CSS px → direction.
 * The deadzone is radial and rescaled, so speed ramps from 0 just outside it; the result is
 * clamped to 1 at `radiusPx`.
 */
export function joystickVector(
  dxPx: number,
  dyPx: number,
  radiusPx = 40,
  deadzone = 0.15,
): JoystickVector {
  if (!(radiusPx > 0)) return { x: 0, y: 0, m: 0 };
  const rx = dxPx / radiusPx;
  const ry = -dyPx / radiusPx;
  const raw = Math.hypot(rx, ry);
  if (!(raw > deadzone)) return { x: 0, y: 0, m: 0 };
  const m = Math.min(1, (raw - deadzone) / (1 - deadzone));
  // `+ 0` turns -0 into 0.
  return { x: (rx / raw) * m + 0, y: (ry / raw) * m + 0, m };
}
