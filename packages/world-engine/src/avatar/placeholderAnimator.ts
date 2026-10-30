import type { Object3D } from 'three';

import { JUMP_DURATION, WALK_SPEED } from '../navigation/motion';

/** One-shot clips triggered by input; the character animator (T-401) keeps the same names. */
export type AvatarClip = 'jump' | 'wave' | 'interact';

/** Animator seam shared by the capsule placeholder and the rigged character (Phase 2). */
export interface AvatarAnimator {
  /** Planar speed (m/s) that weights idle vs. walk. */
  setLocomotion(speed: number): void;
  trigger(clip: AvatarClip): void;
  update(delta: number): void;
  dispose(): void;
}

const DURATIONS: Readonly<Record<AvatarClip, number>> = {
  jump: JUMP_DURATION,
  wave: 1.6,
  interact: 0.6,
};
const MAX_LEAN = 0.14;
const BOB_HEIGHT = 0.03;
const SMOOTHING = 10;

/**
 * Capsule placeholder (ENGINEERING_DONE / ART_PENDING): leans into walking with a small bob,
 * stretches on a jump, wiggles to wave and bows to interact. Animates `body` only; position and
 * facing stay with the avatar controller. Reduced motion drops the walking bob.
 */
export function createPlaceholderAnimator(
  body: Object3D,
  options: { reducedMotion: boolean },
): AvatarAnimator {
  let speed = 0;
  let smoothSpeed = 0;
  let stride = 0;
  let clip: AvatarClip | null = null;
  let clipTime = 0;

  const reset = () => {
    body.position.y = 0;
    body.rotation.set(0, 0, 0);
    body.scale.set(1, 1, 1);
  };

  return {
    setLocomotion(next) {
      speed = next;
      // Moving cancels a wave (the character animator does the same).
      if (clip === 'wave' && next > 0.1) clip = null;
    },
    trigger(next) {
      clip = next;
      clipTime = 0;
    },
    update(delta) {
      const dt = Math.min(Math.max(delta, 0), 0.1);
      smoothSpeed += (speed - smoothSpeed) * (1 - Math.exp(-SMOOTHING * dt));
      const walk = Math.min(smoothSpeed / WALK_SPEED, 1);
      stride += dt * smoothSpeed * 4.2;

      let lean = MAX_LEAN * walk;
      let roll = 0;
      let stretch = 0;
      if (clip) {
        clipTime += dt;
        const duration = DURATIONS[clip];
        const t = Math.min(clipTime / duration, 1);
        const envelope = Math.sin(Math.PI * t);
        if (clip === 'wave') roll = 0.12 * Math.sin(clipTime * 14) * envelope;
        else if (clip === 'interact') lean += 0.3 * envelope;
        else stretch = 0.08 * envelope;
        if (clipTime >= duration) clip = null;
      }

      body.position.y = options.reducedMotion ? 0 : BOB_HEIGHT * walk * Math.abs(Math.sin(stride));
      body.rotation.set(lean, 0, roll);
      body.scale.set(1 - stretch / 2, 1 + stretch, 1 - stretch / 2);
    },
    dispose() {
      clip = null;
      reset();
    },
  };
}
