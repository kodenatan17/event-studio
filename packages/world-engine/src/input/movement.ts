import type { Vec2 } from '../navigation/walk';
import { keyBinding } from './keyboard';

/** Screen-space movement intent: x right, y up (camera forward), |v| ≤ 1. */
export interface MoveVector {
  x: number;
  y: number;
}

/** Held movement keys → unit vector; opposite keys cancel, diagonals are normalised. */
export function keyboardVector(keys: ReadonlySet<string>): MoveVector {
  let x = 0;
  let y = 0;
  const seen = new Set<string>();
  for (const code of keys) {
    const binding = keyBinding(code);
    // W and ArrowUp held together still count once.
    if (binding?.kind !== 'move' || seen.has(binding.direction)) continue;
    seen.add(binding.direction);
    if (binding.direction === 'up') y += 1;
    else if (binding.direction === 'down') y -= 1;
    else if (binding.direction === 'left') x -= 1;
    else x += 1;
  }
  const length = Math.hypot(x, y);
  return length > 1 ? { x: x / length, y: y / length } : { x, y };
}

/** Keyboard + joystick, summed and clamped to |v| ≤ 1. */
export function combineMovement(keyboard: MoveVector, joystick: MoveVector): MoveVector {
  const x = keyboard.x + joystick.x;
  const y = keyboard.y + joystick.y;
  const length = Math.hypot(x, y);
  return length > 1 ? { x: x / length, y: y / length } : { x, y };
}

/**
 * Camera-relative floor direction `[x, z]` with the intent's magnitude: up follows the camera's
 * forward projected onto the floor (−z when it looks straight down), right is perpendicular.
 */
export function toWorldDirection(v: MoveVector, cameraForwardXZ: Vec2): [number, number] {
  const length = Math.hypot(cameraForwardXZ[0], cameraForwardXZ[1]);
  const fx = length > 1e-6 ? cameraForwardXZ[0] / length : 0;
  const fz = length > 1e-6 ? cameraForwardXZ[1] / length : -1;
  // right = (−f.z, f.x): forward −z → right +x.
  return [-fz * v.x + fx * v.y + 0, fx * v.x + fz * v.y + 0];
}
