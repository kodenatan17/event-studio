import { useFrame } from '@react-three/fiber';
import { useRef } from 'react';
import type { RefObject } from 'react';
import { Vector3 } from 'three';
import type { Group, Mesh } from 'three';

import { useCharacter } from '../avatar/useCharacter';
import { combineMovement, keyboardVector, toWorldDirection } from '../input/movement';
import { nearestInteractable } from '../interaction/nearby';
import type { Interactable } from '../interaction/nearby';
import { dampAngle, JUMP_HEIGHT, stepMotion } from '../navigation/motion';
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
const PREVIEW_TURN_RATE = 14;

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
  /** Character quality tier. */
  tier: RenderTier;
}

/**
 * The guest's character (FR-07): tap-to-move, WASD/arrows and the joystick with clamped delta and
 * colliders (FR-04, §8.4), jump/wave/interact clips, the nearby hotspot for "Buka", and a contact
 * shadow. Input is read from the store's mutable bus; only `nearby` (on change) and the ≤ 4 Hz
 * probe are written back.
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
  tier,
}: AvatarProps) {
  const group = useRef<Group>(null);
  const lift = useRef<Group>(null);
  const body = useRef<Group>(null);
  const shadow = useRef<Mesh>(null);
  const appearance = useWorldStore(store, (state) => state.avatarAppearance);
  const character = useCharacter(store, body, appearance, tier, reducedMotion);
  const motion = useRef<MotionState>({ position: spawn, yaw: 0, height: 0, verticalSpeed: 0 });
  const probeElapsed = useRef(PROBE_INTERVAL);
  const forward = useRef(new Vector3());
  const shownYaw = useRef(0);
  const turning = useRef(false);

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
    // The avatar editor turns the character to the camera, plus the guest's own rotation; it
    // eases there and back, and walking keeps the facing `stepMotion` already damped.
    const previewing = state.activeOverlay?.type === 'avatar_editor';
    if (previewing) turning.current = true;
    const facing = previewing
      ? Math.atan2(camera.position.x - x, camera.position.z - z) + input.preview.yaw
      : step.state.yaw;
    if (turning.current && !reducedMotion) {
      shownYaw.current = dampAngle(shownYaw.current, facing, PREVIEW_TURN_RATE, delta);
      const left = Math.sin(shownYaw.current - facing);
      if (!previewing && Math.abs(left) < 0.01) turning.current = false;
    } else {
      shownYaw.current = facing;
    }
    avatar.rotation.y = shownYaw.current;
    if (lift.current) lift.current.position.y = step.state.height;
    if (shadow.current) {
      shadow.current.scale.setScalar(SHADOW_SCALE * (1 - 0.35 * (step.state.height / JUMP_HEIGHT)));
    }

    const anim = character.animator;
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
    <group ref={group} name="AVATAR" position={[spawn[0], floorY, spawn[1]]}>
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
        <group ref={body} />
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
