import { useFrame } from '@react-three/fiber';
import { useLayoutEffect, useRef, useState } from 'react';
import { PerspectiveCamera, Quaternion, Vector3 } from 'three';
import type { Group, Object3D } from 'three';

import { createAnimator, headTurnToward } from '../../avatar/animator';
import { appearanceSpec, buildCharacter } from '../../avatar/buildCharacter';
import { characterClips } from '../../avatar/clips';
import { createCharacterSlot } from '../../avatar/useCharacter';
import { wardrobeItem } from '../../avatar/wardrobe';
import { startPatrol, stepPatrol } from '../../navigation/patrol';
import { MAX_FRAME_DELTA } from '../../navigation/walk';
import type { RenderTier } from '../../renderer/capabilities';
import type { WorldStore } from '../../scene-manager/store';
import type { DecorItem } from '../../templates/types';
import { noRaycast } from '../input';
import { extraMaterials, geometries } from '../materials';
import { SPEECH_REACH, startSpeech, stepSpeech } from './speech';
import { createSpeechBubble } from './SpeechBubble';
import type { SpeechBubble } from './SpeechBubble';

type NpcItem = Extract<DecorItem, { type: 'npc' }>;

interface NpcProps {
  item: NpcItem;
  store: WorldStore;
  tier: RenderTier;
  reducedMotion: boolean;
}

const SHADOW_SCALE = 0.95;
const HEAD_TURN_RATE = 4;
/** Bubble foot above the floor (m): just over a character's head. */
const BUBBLE_HEIGHT = 1.85;
const BUBBLE_MAX_WIDTH_PX = 250;
const BUBBLE_SCREEN_SHARE = 0.62;
const UP = new Vector3(0, 1, 0);

/**
 * A template character among the guests (D-037): standing where its path has one point, walking
 * its loop otherwise, with random short lines over its head. Decor like `Figure`: the template
 * names the look, route and lines, and every mesh ignores raycasts. Reduced motion stands it where
 * its loop starts, with the lines still shown.
 */
export function Npc({ item, store, tier, reducedMotion }: NpcProps) {
  const { nodeName, look, path, y = 0, rotationY = 0, phase, lines } = item;
  const root = useRef<Group>(null);
  const holder = useRef<Group>(null);
  const [slot] = useState(() => createCharacterSlot());
  const [start] = useState(() => startPatrol(path, phase, rotationY));
  const head = useRef<Object3D | null>(null);
  const patrol = useRef(start);
  const speech = useRef(startSpeech(phase));
  const bubble = useRef<SpeechBubble | null>(null);
  const turn = useRef(0);
  const turnQuaternion = useRef(new Quaternion());
  const [route] = useState(() => (reducedMotion ? path.slice(0, 1) : path));
  const { physicalMaterials, textureSize } = tier;

  useLayoutEffect(() => {
    const parent = holder.current;
    if (!parent) return;
    const spec = appearanceSpec(look);
    const kit = buildCharacter(spec, { tier: { bloom: false, physicalMaterials, textureSize } });
    const skirted = spec.items.some((worn) => wardrobeItem(worn.item)?.tags?.includes('skirted'));
    const clips = characterClips(spec.body, skirted, reducedMotion);
    slot.show(parent, { kit, animator: createAnimator(kit.root, clips) });
    head.current = kit.root.getObjectByName('head') ?? null;
  }, [slot, look, physicalMaterials, textureSize, reducedMotion]);

  useLayoutEffect(() => {
    const { addFigure, input, removeFigure, setNpcBubbles } = store.getState();
    addFigure(nodeName);
    return () => {
      slot.clear();
      head.current = null;
      if (speech.current.line !== null) setNpcBubbles((input.speech.active -= 1));
      speech.current = startSpeech(phase);
      bubble.current?.dispose();
      bubble.current = null;
      removeFigure(nodeName);
    };
  }, [store, slot, nodeName, phase]);

  useFrame(({ camera, size }, delta) => {
    const group = root.current;
    if (!group) return;
    const state = store.getState();
    const guest = state.avatarProbe;
    const step = stepPatrol(patrol.current, route, guest, delta, Math.random);
    patrol.current = step.state;
    const [x, z] = step.state.position;
    group.position.set(x, y, z);
    group.rotation.y = step.state.yaw;
    const animator = slot.animator;
    animator?.setLocomotion(step.speed);
    animator?.update(delta);

    const bone = head.current;
    if (bone && !reducedMotion) {
      const goal = guest && step.speed === 0 ? headTurnToward([x, z], step.state.yaw, guest) : 0;
      turn.current +=
        (goal - turn.current) * (1 - Math.exp(-HEAD_TURN_RATE * Math.min(delta, MAX_FRAME_DELTA)));
      // After the mixer, which has just written this bone.
      bone.quaternion.multiply(turnQuaternion.current.setFromAxisAngle(UP, turn.current));
    }

    const near = guest !== null && Math.hypot(guest[0] - x, guest[1] - z) < SPEECH_REACH;
    const before = speech.current.line;
    const { speech: bubbles } = state.input;
    speech.current = stepSpeech(speech.current, {
      delta: Math.min(delta, MAX_FRAME_DELTA),
      lineCount: lines.length,
      canSpeak: near && state.activeOverlay === null,
      active: bubbles.active,
      random: Math.random,
    });
    const { line } = speech.current;
    if (line !== before) {
      if (before === null) bubbles.active += 1;
      if (line === null) bubbles.active -= 1;
      if (line !== null) bubble.current ??= createSpeechBubble(group, BUBBLE_HEIGHT);
      bubble.current?.say(line === null ? null : (lines[line] ?? null));
      if (line !== null && path.length === 1 && !reducedMotion) animator?.trigger('wave');
      state.setNpcBubbles(bubbles.active);
    }
    if (line !== null && camera instanceof PerspectiveCamera) {
      const width = Math.min(BUBBLE_MAX_WIDTH_PX, size.width * BUBBLE_SCREEN_SHARE);
      bubble.current?.fit(width, size.height, camera.fov);
    }
  });

  return (
    <group
      ref={root}
      name={nodeName}
      position={[start.position[0], y, start.position[1]]}
      rotation={[0, start.yaw, 0]}
    >
      <mesh
        geometry={geometries.disc}
        material={extraMaterials.contactShadow}
        position={[0, 0.02, 0]}
        scale={SHADOW_SCALE}
        raycast={noRaycast}
        dispose={null}
      />
      <group ref={holder} />
    </group>
  );
}
