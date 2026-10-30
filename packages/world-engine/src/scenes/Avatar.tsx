import { useFrame } from '@react-three/fiber';
import { useEffect, useRef } from 'react';
import type { RefObject } from 'react';
import { Vector3 } from 'three';
import type { Group, Mesh } from 'three';

import { createPlaceholderAnimator } from '../avatar/placeholderAnimator';
import type { AvatarAnimator } from '../avatar/placeholderAnimator';
import { combineMovement, keyboardVector, toWorldDirection } from '../input/movement';
import { nearestInteractable } from '../interaction/nearby';
import type { Interactable } from '../interaction/nearby';
import { JUMP_HEIGHT, stepMotion } from '../navigation/motion';
import type { MotionState } from '../navigation/motion';
import type { Collider, Rect, Vec2 } from '../navigation/walk';
import type { RenderTier } from '../renderer/capabilities';
import { selectInputEnabled } from '../scene-manager/store';
import type { WorldStore } from '../scene-manager/store';
import { useWorldStore } from '../scene-manager/useWorldStore';
import { noRaycast } from './input';
import { extraMaterials, geometries } from './materials';

export const AVATAR_RADIUS = 0.3;
/** `avatarProbe` sample interval (s): ≤ 4 Hz store writes. */
const PROBE_INTERVAL = 0.25;
const SHADOW_SCALE = 0.9;

interface AvatarProps {
  store: WorldStore;
  colliders: readonly Collider[];
  /** Walkable rect; keyboard/joystick movement stays on it. */
  floor: Rect;
  /** Height of the walkable floor; the avatar stands on it. */
  floorY?: number;
  spawn: Vec2;
  /** Ground position read by the follow camera; mutated every frame. */
  position: RefObject<Vector3>;
  /** Hotspots/portals reachable with "Buka" / E (same actions as their HTML controls). */
  interactables: readonly Interactable[];
  reducedMotion: boolean;
  /** Character quality tier; the rigged character (T-401) builds from it. */
  tier: RenderTier;
}

/**
 * Capsule placeholder avatar (until T-401): tap-to-move, WASD/arrows and the joystick with
 * clamped delta and colliders (FR-04, §8.4), jump/wave/interact through the animator seam, the
 * nearby hotspot for "Buka", and a contact shadow. Input is read from the store's mutable bus;
 * only `nearby` (on change) and the ≤ 4 Hz probe are written back.
 */
export function Avatar({
  store,
  colliders,
  floor,
  floorY = 0,
  spawn,
  position,
  interactables,
  reducedMotion,
}: AvatarProps) {
  const group = useRef<Group>(null);
  const lift = useRef<Group>(null);
  const body = useRef<Group>(null);
  const shadow = useRef<Mesh>(null);
  const animator = useRef<AvatarAnimator | null>(null);
  const motion = useRef<MotionState>({ position: spawn, yaw: 0, height: 0, verticalSpeed: 0 });
  const probeElapsed = useRef(PROBE_INTERVAL);
  const forward = useRef(new Vector3());

  // One animator per mounted avatar; StrictMode's extra mount/unmount leaves exactly one.
  useEffect(() => {
    if (!body.current) return;
    const created = createPlaceholderAnimator(body.current, { reducedMotion });
    animator.current = created;
    return () => {
      created.dispose();
      if (animator.current === created) animator.current = null;
    };
  }, [reducedMotion]);

  useFrame(({ camera }, delta) => {
    const avatar = group.current;
    if (!avatar) return;
    const state = store.getState();
    const enabled = selectInputEnabled(state);
    const { input } = state;
    // Drained every frame; taps while input is suspended are dropped.
    const actions = input.actions.splice(0);

    let direction: Vec2 = [0, 0];
    if (enabled) {
      camera.getWorldDirection(forward.current);
      direction = toWorldDirection(combineMovement(keyboardVector(input.keys), input.joystick), [
        forward.current.x,
        forward.current.z,
      ]);
    }
    const step = stepMotion(
      motion.current,
      {
        direction,
        marker: enabled ? state.marker : null,
        jump: enabled && actions.includes('jump'),
      },
      { floor, colliders, radius: AVATAR_RADIUS, reducedMotion },
      delta,
    );
    motion.current = step.state;
    if (enabled && step.clearMarker && state.marker) state.setMarker(null);

    const [x, z] = step.state.position;
    position.current.set(x, floorY, z);
    avatar.position.copy(position.current);
    avatar.rotation.y = step.state.yaw;
    if (lift.current) lift.current.position.y = step.state.height;
    if (shadow.current) {
      shadow.current.scale.setScalar(SHADOW_SCALE * (1 - 0.35 * (step.state.height / JUMP_HEIGHT)));
    }

    const anim = animator.current;
    anim?.setLocomotion(step.speed);
    if (step.jumped) anim?.trigger('jump');
    if (enabled) {
      const nearest = nearestInteractable([x, z], interactables);
      for (const action of actions) {
        if (action === 'wave') anim?.trigger('wave');
        if (action === 'interact' && nearest) {
          anim?.trigger('interact');
          // Same WorldAction as the 3D hotspot and its HTML control (§3.4, §8.3).
          state.dispatch(nearest.action);
          break;
        }
      }
      if (selectInputEnabled(store.getState())) state.setNearby(nearest?.tag ?? null);
    }
    anim?.update(delta);

    probeElapsed.current += delta;
    if (probeElapsed.current >= PROBE_INTERVAL) {
      probeElapsed.current = 0;
      state.setAvatarProbe([x, z]);
    }
  });

  return (
    <group ref={group} name="AVATAR_PLACEHOLDER" position={[spawn[0], floorY, spawn[1]]}>
      <mesh
        ref={shadow}
        geometry={geometries.disc}
        material={extraMaterials.contactShadow}
        position={[0, 0.02, 0]}
        scale={SHADOW_SCALE}
        raycast={noRaycast}
        dispose={null}
      />
      <group ref={lift}>
        <group ref={body}>
          <mesh
            geometry={geometries.capsule}
            material={extraMaterials.avatar}
            position={[0, 0.61, 0]}
            dispose={null}
          />
          <mesh
            geometry={geometries.sphere}
            material={extraMaterials.skin}
            position={[0, 1.42, 0]}
            scale={0.36}
            dispose={null}
          />
          <mesh
            geometry={geometries.cylinder}
            material={extraMaterials.blangkon}
            position={[0, 1.58, 0]}
            scale={[0.38, 0.1, 0.38]}
            dispose={null}
          />
        </group>
      </group>
    </group>
  );
}

export function Marker({ store, floorY = 0 }: { store: WorldStore; floorY?: number }) {
  const marker = useWorldStore(store, (state) => state.marker);
  if (!marker) return null;
  return (
    <mesh
      geometry={geometries.marker}
      material={extraMaterials.marker}
      position={[marker[0], floorY + 0.045, marker[1]]}
      raycast={noRaycast}
      dispose={null}
    />
  );
}
