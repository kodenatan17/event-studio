import { AnimationMixer, LoopOnce } from 'three';
import type { AnimationAction, AnimationClip, Object3D } from 'three';

import { WALK_SPEED } from '../navigation/motion';
import type { CharacterClips } from './clips';

/** One-shot clips triggered by input. */
export type AvatarClip = 'jump' | 'wave' | 'interact';

export interface AvatarAnimator {
  /** Planar speed (m/s) that weights idle vs. walk; moving cancels a wave. */
  setLocomotion(speed: number): void;
  trigger(clip: AvatarClip): void;
  update(delta: number): void;
  dispose(): void;
}

const FADE_IN = 0.12;
const FADE_OUT = 0.15;
const SMOOTHING = 12;
/** Longest step: a hidden tab must not jump every clip to its end (§8.4). */
const MAX_DELTA = 0.1;
/** Speed (m/s) at which walking fully replaces idle. */
const WALK_FULL = 1;
const MOVING = 0.1;
/** Locomotion left under a wave or interact; a jump takes all of it. */
const UNDER_ONE_SHOT = 0.15;

export interface FigureAnimator {
  update(delta: number): void;
  dispose(): void;
}

/**
 * A template figure's one looping clip. `phase` (0..1) keeps a couple from breathing in step;
 * reduced motion holds the pose (the hand on the ronce, the clasped hands) without moving.
 */
export function createFigureAnimator(
  root: Object3D,
  clip: AnimationClip,
  options: { phase: number; reducedMotion: boolean },
): FigureAnimator {
  const mixer = new AnimationMixer(root);
  const action = mixer.clipAction(clip).play();
  action.time = options.phase * clip.duration;
  action.paused = options.reducedMotion;
  return {
    update(delta) {
      mixer.update(Math.min(Math.max(delta, 0), MAX_DELTA));
    },
    dispose() {
      mixer.stopAllAction();
      mixer.uncacheRoot(root);
    },
  };
}

/** How far a figure looks at the guest, and from where. */
const LOOK_REACH = 3;
const LOOK_LIMIT = (35 * Math.PI) / 180;
/** Past this a guest is behind the figure: it keeps looking ahead. */
const LOOK_SIDE = (110 * Math.PI) / 180;

/** Head turn (radians, relative to the figure) toward a guest within reach; else 0. */
export function headTurnToward(
  figure: readonly [number, number],
  yaw: number,
  guest: readonly [number, number],
): number {
  const dx = guest[0] - figure[0];
  const dz = guest[1] - figure[1];
  if (Math.hypot(dx, dz) > LOOK_REACH) return 0;
  const away = Math.atan2(dx, dz) - yaw;
  const turn = Math.atan2(Math.sin(away), Math.cos(away));
  if (Math.abs(turn) > LOOK_SIDE) return 0;
  return Math.max(-LOOK_LIMIT, Math.min(LOOK_LIMIT, turn));
}

/** One mixer for one character: idle and walk always run, weighted by speed; one-shots on top. */
export function createAnimator(root: Object3D, clips: CharacterClips): AvatarAnimator {
  const mixer = new AnimationMixer(root);
  const idle = mixer.clipAction(clips.idle).play();
  const walk = mixer.clipAction(clips.walk).play();
  const shots: Record<AvatarClip, AnimationAction> = {
    jump: mixer.clipAction(clips.jump),
    wave: mixer.clipAction(clips.wave),
    interact: mixer.clipAction(clips.interact),
  };
  for (const action of Object.values(shots)) {
    action.setLoop(LoopOnce, 1);
    // Holds the last frame (the rest pose) for the fade-out instead of cutting to it.
    action.clampWhenFinished = true;
  }

  let speed = 0;
  let smoothSpeed = 0;
  let share = 1;
  let active: AvatarClip | null = null;

  const end = (clip: AvatarClip) => {
    shots[clip].fadeOut(FADE_OUT);
    if (active === clip) active = null;
  };
  const handleFinished = ({ action }: { action: AnimationAction }) => {
    if (active && shots[active] === action) end(active);
  };
  mixer.addEventListener('finished', handleFinished);

  return {
    setLocomotion(next) {
      speed = next;
      if (active === 'wave' && next > MOVING) end('wave');
    },
    trigger(clip) {
      if (active && active !== clip) end(active);
      active = clip;
      shots[clip].reset().setLoop(LoopOnce, 1).fadeIn(FADE_IN).play();
    },
    update(delta) {
      const dt = Math.min(Math.max(delta, 0), MAX_DELTA);
      const ease = 1 - Math.exp(-SMOOTHING * dt);
      smoothSpeed += (speed - smoothSpeed) * ease;
      const walking = Math.min(smoothSpeed / WALK_FULL, 1);
      // Fades with the one-shot: cutting it would drop the pose to rest for a frame.
      share += ((active === 'jump' ? 0 : active ? UNDER_ONE_SHOT : 1) - share) * ease;
      idle.setEffectiveWeight((1 - walking) * share);
      walk.setEffectiveWeight(walking * share);
      walk.setEffectiveTimeScale(Math.min(1.25, Math.max(0.6, smoothSpeed / WALK_SPEED)));
      mixer.update(dt);
    },
    dispose() {
      mixer.removeEventListener('finished', handleFinished);
      mixer.stopAllAction();
      mixer.uncacheRoot(root);
    },
  };
}
