import {
  AnimationClip,
  Euler,
  InterpolateLinear,
  Quaternion,
  QuaternionKeyframeTrack,
  VectorKeyframeTrack,
} from 'three';
import type { KeyframeTrack } from 'three';

import { JUMP_DURATION } from '../navigation/motion';
import { BODY_DIMS } from './rig';
import type { BoneName } from './rig';
import { smoothstep } from './shapes';
import type { BodyType } from './wardrobe';

/**
 * Procedural clips sampled from pose functions (FR-07), shared by every character of one body.
 * Signs follow the rig: facing +z, a limb hanging along −y swings forward with −x, a spine leans
 * forward with +x, and the right arm (−x side) lifts sideways with −z.
 */

/** Euler angles (radians) per bone at one moment; bones left out stay at rest. */
type Pose = Partial<Record<BoneName, readonly [x: number, y: number, z: number]>>;

const TAU = Math.PI * 2;
const DEGREE = Math.PI / 180;

interface ClipSource {
  name: string;
  duration: number;
  keys: number;
  /** Pose at normalized time 0..1. Looping clips must end where they start. */
  pose: (t: number) => Pose;
  /** Pelvis height offset (m) from its rest position. */
  lift?: (t: number) => number;
}

function buildClip(source: ClipSource, body: BodyType): AnimationClip {
  const { name, duration, keys, pose, lift } = source;
  const times = Array.from({ length: keys + 1 }, (_, i) => (i / keys) * duration);
  const samples = times.map((time) => pose(time / duration));
  const bones = [...new Set(samples.flatMap((sample) => Object.keys(sample)))] as BoneName[];
  const euler = new Euler();
  const quaternion = new Quaternion();
  const tracks: KeyframeTrack[] = bones.map((bone) => {
    const values = samples.flatMap((sample) => {
      const [x, y, z] = sample[bone] ?? [0, 0, 0];
      quaternion.setFromEuler(euler.set(x, y, z));
      return [quaternion.x, quaternion.y, quaternion.z, quaternion.w];
    });
    return new QuaternionKeyframeTrack(`${bone}.quaternion`, times, values, InterpolateLinear);
  });
  if (lift) {
    const [x, y, z] = BODY_DIMS[body].joints.pelvis;
    const values = times.flatMap((time) => [x, y + lift(time / duration), z]);
    tracks.push(new VectorKeyframeTrack('pelvis.position', times, values, InterpolateLinear));
  }
  return new AnimationClip(name, duration, tracks);
}

function idle(): ClipSource {
  return {
    name: 'idle',
    duration: 2.4,
    keys: 12,
    pose: (t) => {
      const breath = Math.sin(t * TAU);
      const sway = Math.sin(t * TAU + 1);
      return {
        chest: [0.012 * breath, 0, 0],
        spine: [0, 0.012 * sway, 0],
        head: [0.01 * sway, 0.03 * sway, 0],
        shoulder_l: [0, 0, 0.012 * breath],
        shoulder_r: [0, 0, -0.012 * breath],
        elbow_l: [-0.1, 0, 0],
        elbow_r: [-0.1, 0, 0],
      };
    },
  };
}

function walk(skirted: boolean, bob: boolean): ClipSource {
  const stride = (skirted ? 16 : 26) * DEGREE;
  const lift = (skirted ? 26 : 46) * DEGREE;
  const swing = 20 * DEGREE;
  return {
    name: 'walk',
    duration: 0.62,
    keys: 16,
    pose: (t) => {
      const phase = t * TAU;
      const left = Math.sin(phase);
      // The knee folds while its leg swings forward through.
      const kneeLeft = lift * Math.max(0, Math.cos(phase - 0.6));
      const kneeRight = lift * Math.max(0, -Math.cos(phase - 0.6));
      return {
        pelvis: [0, 0.07 * left, 0],
        chest: [0.03, -0.1 * left, 0],
        head: [-0.02, 0.03 * left, 0],
        hip_l: [-stride * left, 0, 0],
        hip_r: [stride * left, 0, 0],
        knee_l: [kneeLeft, 0, 0],
        knee_r: [kneeRight, 0, 0],
        ankle_l: [0.3 * left, 0, 0],
        ankle_r: [-0.3 * left, 0, 0],
        shoulder_l: [swing * left, 0, 0.03],
        shoulder_r: [-swing * left, 0, -0.03],
        elbow_l: [-0.22 - 0.16 * Math.max(0, -left), 0, 0],
        elbow_r: [-0.22 - 0.16 * Math.max(0, left), 0, 0],
      };
    },
    lift: bob ? (t) => 0.012 * Math.abs(Math.sin(t * TAU)) - 0.006 : undefined,
  };
}

function jump(): ClipSource {
  return {
    name: 'jump',
    duration: JUMP_DURATION,
    keys: 10,
    pose: (t) => {
      const tuck = Math.sin(Math.PI * t);
      return {
        spine: [0.1 * tuck, 0, 0],
        hip_l: [-0.5 * tuck, 0, 0],
        hip_r: [-0.3 * tuck, 0, 0],
        knee_l: [0.9 * tuck, 0, 0],
        knee_r: [0.6 * tuck, 0, 0],
        shoulder_l: [-0.5 * tuck, 0, 0.3 * tuck],
        shoulder_r: [-0.5 * tuck, 0, -0.3 * tuck],
        elbow_l: [-0.4 * tuck, 0, 0],
        elbow_r: [-0.4 * tuck, 0, 0],
      };
    },
  };
}

function wave(): ClipSource {
  return {
    name: 'wave',
    duration: 1.6,
    keys: 32,
    pose: (t) => {
      const raised = smoothstep(0, 0.16, t) * (1 - smoothstep(0.84, 1, t));
      const hello = Math.sin(t * TAU * 4) * raised;
      return {
        shoulder_r: [-0.2 * raised, 0, -2.45 * raised],
        elbow_r: [-0.25 * raised, 0, -0.34 + 0.34 * (1 - raised) + 0.36 * hello],
        head: [0, -0.2 * raised, 0.06 * raised],
        chest: [0, 0, 0.04 * raised],
      };
    },
  };
}

function interact(): ClipSource {
  return {
    name: 'interact',
    duration: 0.6,
    keys: 10,
    pose: (t) => {
      const reach = Math.sin(Math.PI * t);
      return {
        spine: [0.1 * reach, 0, 0],
        chest: [0.08 * reach, 0, 0],
        head: [0.1 * reach, 0, 0],
        shoulder_r: [-0.95 * reach, 0, 0],
        elbow_r: [-0.3 * reach, 0, 0],
      };
    },
  };
}

/** Right hand resting on the ronce, with a slow shift of weight. */
function idleGroom(): ClipSource {
  return {
    name: 'idle_groom',
    duration: 3.2,
    keys: 14,
    pose: (t) => {
      const shift = Math.sin(t * TAU);
      const breath = Math.sin(t * TAU * 2);
      return {
        pelvis: [0, 0, 0.012 * shift],
        chest: [0.012 * breath, 0.015 * shift, -0.01 * shift],
        head: [0.012 * breath, 0.04 * shift, 0.012 * shift],
        shoulder_r: [-0.22, 1.05, -0.25],
        elbow_r: [-1.62, 0, 0],
        shoulder_l: [0.02, 0, 0.06 + 0.012 * breath],
        elbow_l: [-0.14, 0, 0],
      };
    },
  };
}

/** Hands clasped at the waist, with a gentle tilt of the head. */
function idleBride(): ClipSource {
  return {
    name: 'idle_bride',
    duration: 3.6,
    keys: 14,
    pose: (t) => {
      const sway = Math.sin(t * TAU);
      const breath = Math.sin(t * TAU * 2);
      return {
        chest: [0.012 * breath, -0.012 * sway, 0],
        head: [0.03, -0.05 * sway, 0.06 + 0.02 * sway],
        shoulder_l: [-0.14, -1, 0.2],
        elbow_l: [-1.34, 0, 0],
        shoulder_r: [-0.14, 1, -0.2],
        elbow_r: [-1.34, 0, 0],
      };
    },
  };
}

export type FigureClipName = 'idle_groom' | 'idle_bride';

const figureClips = new Map<string, AnimationClip>();

/** Idle clip of a template figure; shared by every instance of that figure. */
export function figureClip(name: FigureClipName, body: BodyType): AnimationClip {
  const key = `${name}:${body}`;
  let clip = figureClips.get(key);
  if (!clip) {
    clip = buildClip(name === 'idle_groom' ? idleGroom() : idleBride(), body);
    figureClips.set(key, clip);
  }
  return clip;
}

export interface CharacterClips {
  idle: AnimationClip;
  walk: AnimationClip;
  jump: AnimationClip;
  wave: AnimationClip;
  interact: AnimationClip;
}

/** Names kept free for later (T-403 poses, a run gait). */
export const RESERVED_CLIPS = ['run', 'pose_01', 'pose_02', 'pose_03'] as const;

const cache = new Map<string, CharacterClips>();

/** Clips of one body. Reduced motion keeps the gait and drops the vertical bob. */
export function characterClips(
  body: BodyType,
  skirted: boolean,
  reducedMotion = false,
): CharacterClips {
  const key = `${body}:${skirted}:${reducedMotion}`;
  let clips = cache.get(key);
  if (!clips) {
    clips = {
      idle: buildClip(idle(), body),
      walk: buildClip(walk(skirted, !reducedMotion), body),
      jump: buildClip(jump(), body),
      wave: buildClip(wave(), body),
      interact: buildClip(interact(), body),
    };
    cache.set(key, clips);
  }
  return clips;
}
