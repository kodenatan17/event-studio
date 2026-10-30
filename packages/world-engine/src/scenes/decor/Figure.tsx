import { useFrame } from '@react-three/fiber';
import { useLayoutEffect, useRef, useState } from 'react';
import { Quaternion, Vector3 } from 'three';
import type { Group, Object3D } from 'three';

import { createFigureAnimator, headTurnToward } from '../../avatar/animator';
import type { FigureAnimator } from '../../avatar/animator';
import { buildCharacter, figureSpec } from '../../avatar/buildCharacter';
import { figureClip } from '../../avatar/clips';
import { createCharacterSlot } from '../../avatar/useCharacter';
import { FIGURE_OUTFITS } from '../../avatar/wardrobe';
import { MAX_FRAME_DELTA } from '../../navigation/walk';
import type { RenderTier } from '../../renderer/capabilities';
import type { WorldStore } from '../../scene-manager/store';
import type { DecorItem } from '../../templates/types';
import { noRaycast } from '../input';
import { extraMaterials, geometries } from '../materials';

type FigureItem = Extract<DecorItem, { type: 'figure' }>;

interface FigureProps {
  item: FigureItem;
  store: WorldStore;
  tier: RenderTier;
  reducedMotion: boolean;
}

const SHADOW_SCALE = 1.05;
const HEAD_TURN_RATE = 4;
const UP = new Vector3(0, 1, 0);

/**
 * A template character standing in the scene (the bride and groom). It is decor like `janur`, so
 * the engine holds no wedding data: the template names an outfit and a place. Colliders are the
 * template's, and every mesh ignores raycasts. The head turns toward a guest in reach, on top of
 * the idle clip; reduced motion holds the pose and looks ahead.
 */
export function Figure({ item, store, tier, reducedMotion }: FigureProps) {
  const holder = useRef<Group>(null);
  const [slot] = useState(() => createCharacterSlot<FigureAnimator>());
  const head = useRef<Object3D | null>(null);
  const turn = useRef(0);
  const turnQuaternion = useRef(new Quaternion());
  const { nodeName, outfit, phase, position, rotationY } = item;
  const { physicalMaterials, textureSize } = tier;

  useLayoutEffect(() => {
    const parent = holder.current;
    if (!parent) return;
    const look = FIGURE_OUTFITS[outfit];
    const kit = buildCharacter(figureSpec(look), {
      tier: { bloom: false, physicalMaterials, textureSize },
    });
    const animator = createFigureAnimator(kit.root, figureClip(look.clip, look.body), {
      phase,
      reducedMotion,
    });
    slot.show(parent, { kit, animator });
    head.current = kit.root.getObjectByName('head') ?? null;
  }, [slot, outfit, phase, physicalMaterials, textureSize, reducedMotion]);

  useLayoutEffect(() => {
    store.getState().addFigure(nodeName);
    return () => {
      slot.clear();
      head.current = null;
      store.getState().removeFigure(nodeName);
    };
  }, [store, slot, nodeName]);

  useFrame((_, delta) => {
    slot.animator?.update(delta);
    const bone = head.current;
    if (!bone || reducedMotion) return;
    const guest = store.getState().avatarProbe;
    const goal = guest ? headTurnToward([position[0], position[2]], rotationY, guest) : 0;
    turn.current +=
      (goal - turn.current) * (1 - Math.exp(-HEAD_TURN_RATE * Math.min(delta, MAX_FRAME_DELTA)));
    // After the mixer, which has just written this bone.
    bone.quaternion.multiply(turnQuaternion.current.setFromAxisAngle(UP, turn.current));
  });

  return (
    <group name={nodeName} position={position} rotation={[0, rotationY, 0]}>
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
