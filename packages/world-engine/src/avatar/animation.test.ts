import { AnimationMixer, Quaternion } from 'three';
import type { Group } from 'three';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { JUMP_DURATION, WALK_SPEED } from '../navigation/motion';
import { createAnimator } from './animator';
import { characterClips, RESERVED_CLIPS } from './clips';
import { BONE_NAMES, BODY_DIMS, createRig } from './rig';

const NAMES = ['idle', 'walk', 'jump', 'wave', 'interact'] as const;

function character(body: 'pria' | 'wanita' = 'pria', skirted = false) {
  const rig = createRig(body);
  return { rig, clips: characterClips(body, skirted) };
}

const bone = (root: Group, name: string) => root.getObjectByName(name)!;

/** Peak rotation of `track` from identity (radians). */
function peakAngle(values: ArrayLike<number>): number {
  const identity = new Quaternion();
  const sample = new Quaternion();
  let peak = 0;
  for (let i = 0; i < values.length; i += 4) {
    sample.set(values[i]!, values[i + 1]!, values[i + 2]!, values[i + 3]!);
    peak = Math.max(peak, sample.angleTo(identity));
  }
  return peak;
}

afterEach(() => vi.restoreAllMocks());

describe('character clips', () => {
  it('[FR-07] clips idle/walk/jump/wave/interact exist and validate()', () => {
    for (const body of ['pria', 'wanita'] as const) {
      for (const skirted of [false, true]) {
        const clips = characterClips(body, skirted);
        for (const name of NAMES) {
          expect(clips[name].name).toBe(name);
          expect(clips[name].validate(), `${body} ${name}`).toBe(true);
          for (const track of clips[name].tracks) {
            expect(BONE_NAMES).toContain(track.name.split('.')[0]);
          }
        }
      }
    }
    const clips = characterClips('pria', false);
    expect(clips.idle.duration).toBeCloseTo(2.4);
    expect(clips.walk.duration).toBeCloseTo(0.62);
    expect(clips.jump.duration).toBeCloseTo(0.55);
    expect(clips.jump.duration).toBe(JUMP_DURATION);
    expect(clips.wave.duration).toBeCloseTo(1.6);
    expect(clips.interact.duration).toBeCloseTo(0.6);
    expect(RESERVED_CLIPS).toEqual(['run', 'pose_01', 'pose_02', 'pose_03']);
  });

  it('[FR-07] clips are cached per body and skirt', () => {
    expect(characterClips('pria', true)).toBe(characterClips('pria', true));
    expect(characterClips('pria', true)).not.toBe(characterClips('wanita', true));
    expect(characterClips('pria', true)).not.toBe(characterClips('pria', false));
  });

  it('[FR-07] thigh swing is ±26°, or ±16° in a skirt', () => {
    const thigh = (skirted: boolean) => {
      const walk = characterClips('wanita', skirted).walk;
      const track = walk.tracks.find((candidate) => candidate.name === 'hip_l.quaternion');
      return (peakAngle(track!.values) * 180) / Math.PI;
    };
    expect(thigh(false)).toBeCloseTo(26, 0);
    expect(thigh(true)).toBeCloseTo(16, 0);
  });

  it('[FR-07] the walk bob keeps the pelvis rest height; reduced motion drops it', () => {
    const track = characterClips('wanita', true).walk.tracks.find(
      (candidate) => candidate.name === 'pelvis.position',
    );
    const rest = BODY_DIMS.wanita.joints.pelvis[1];
    expect(track).toBeDefined();
    for (let i = 1; i < track!.values.length; i += 3) {
      expect(Math.abs(track!.values[i]! - rest)).toBeLessThan(0.02);
    }
    const calm = characterClips('wanita', true, true).walk.tracks;
    expect(calm.some((candidate) => candidate.name === 'pelvis.position')).toBe(false);
  });

  it('[FR-07] looping clips end where they start; one-shots return to rest', () => {
    const { idle, walk, wave, jump, interact } = characterClips('pria', false);
    for (const clip of [idle, walk]) {
      for (const track of clip.tracks) {
        const size = track.getValueSize();
        const first = Array.from(track.values.slice(0, size));
        const last = Array.from(track.values.slice(-size));
        first.forEach((value, index) => expect(value).toBeCloseTo(last[index]!, 4));
      }
    }
    for (const clip of [wave, jump, interact]) {
      for (const track of clip.tracks) {
        expect(peakAngle(track.values.slice(-4))).toBeLessThan(0.01);
      }
    }
  });
});

describe('character animator', () => {
  it('[FR-07] one AnimationMixer per character; dispose stops actions and uncaches root', () => {
    const stop = vi.spyOn(AnimationMixer.prototype, 'stopAllAction');
    const uncache = vi.spyOn(AnimationMixer.prototype, 'uncacheRoot');
    const remove = vi.spyOn(AnimationMixer.prototype, 'removeEventListener');
    const { rig, clips } = character();

    const animator = createAnimator(rig.root, clips);
    animator.update(1 / 60);
    animator.dispose();

    expect(stop).toHaveBeenCalledTimes(1);
    expect(uncache).toHaveBeenCalledWith(rig.root);
    expect(remove).toHaveBeenCalledWith('finished', expect.any(Function));
  });

  it('[FR-07] speed moves the character from idle to walking', () => {
    const { rig, clips } = character();
    const animator = createAnimator(rig.root, clips);
    const thigh = bone(rig.root, 'hip_l');
    const swing = () => {
      let peak = 0;
      for (let i = 0; i < 40; i += 1) {
        animator.update(1 / 60);
        peak = Math.max(peak, thigh.quaternion.angleTo(new Quaternion()));
      }
      return peak;
    };
    expect(swing()).toBeLessThan(0.01);
    animator.setLocomotion(WALK_SPEED);
    expect(swing()).toBeGreaterThan(0.3);
    animator.dispose();
  });

  it('[FR-07] wave raises the right arm, and moving cancels it', () => {
    const { rig, clips } = character();
    const animator = createAnimator(rig.root, clips);
    const arm = bone(rig.root, 'shoulder_r');
    const angle = () => arm.quaternion.angleTo(new Quaternion());

    animator.trigger('wave');
    for (let i = 0; i < 40; i += 1) animator.update(1 / 60);
    expect(angle()).toBeGreaterThan(1.5);

    animator.setLocomotion(WALK_SPEED);
    for (let i = 0; i < 40; i += 1) animator.update(1 / 60);
    expect(angle()).toBeLessThan(0.6);
    animator.dispose();
  });

  it('[FR-07] a one-shot ends by itself and can play again', () => {
    const { rig, clips } = character();
    const animator = createAnimator(rig.root, clips);
    const knee = bone(rig.root, 'knee_l');
    const run = (seconds: number) => {
      let peak = 0;
      for (let t = 0; t < seconds; t += 1 / 60) {
        animator.update(1 / 60);
        peak = Math.max(peak, knee.quaternion.angleTo(new Quaternion()));
      }
      return peak;
    };
    for (let round = 0; round < 2; round += 1) {
      animator.trigger('jump');
      expect(run(JUMP_DURATION)).toBeGreaterThan(0.5);
      run(0.3);
      expect(knee.quaternion.angleTo(new Quaternion())).toBeLessThan(0.03);
    }
    animator.dispose();
  });

  it('[FR-07] a jump while walking fades: the legs never snap to rest', () => {
    const { rig, clips } = character();
    const animator = createAnimator(rig.root, clips);
    const thigh = bone(rig.root, 'hip_l');
    animator.setLocomotion(WALK_SPEED);
    for (let i = 0; i < 49; i += 1) animator.update(1 / 60);
    let previous = thigh.quaternion.clone();
    animator.trigger('jump');
    for (let i = 0; i < 12; i += 1) {
      animator.update(1 / 60);
      expect(thigh.quaternion.angleTo(previous)).toBeLessThan(0.2);
      previous = thigh.quaternion.clone();
    }
    animator.dispose();
  });

  it('[§8.4] a long frame never skips a clip', () => {
    const { rig, clips } = character();
    const animator = createAnimator(rig.root, clips);
    animator.trigger('wave');
    animator.update(30);
    animator.update(0.1);
    expect(bone(rig.root, 'shoulder_r').quaternion.angleTo(new Quaternion())).toBeGreaterThan(0.3);
    animator.dispose();
  });
});
