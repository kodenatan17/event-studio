import { useFrame } from '@react-three/fiber';
import { useRef } from 'react';
import type { RefObject } from 'react';
import type { Group, Vector3 } from 'three';

import type { Collider, Vec2 } from '../navigation/walk';
import { stepToward } from '../navigation/walk';
import { selectInputEnabled } from '../scene-manager/store';
import type { WorldStore } from '../scene-manager/store';
import { useWorldStore } from '../scene-manager/useWorldStore';
import { noRaycast } from './input';
import { extraMaterials, geometries } from './materials';

export const AVATAR_RADIUS = 0.3;
const WALK_SPEED = 2.6;

/** Capsule placeholder avatar (until T-401) walking toward the marker with clamped delta. */
export function Avatar({
  store,
  colliders,
  floorY = 0,
  spawn,
  position,
}: {
  store: WorldStore;
  colliders: readonly Collider[];
  /** Height of the walkable floor; the avatar stands on it. */
  floorY?: number;
  spawn: Vec2;
  position: RefObject<Vector3>;
}) {
  const group = useRef<Group>(null);

  useFrame((_, delta) => {
    const avatar = group.current;
    if (!avatar) return;
    const state = store.getState();
    const target = state.marker;
    const current = position.current;
    if (target && selectInputEnabled(state)) {
      const result = stepToward(
        [current.x, current.z],
        target,
        delta,
        WALK_SPEED,
        colliders,
        AVATAR_RADIUS,
      );
      const dx = result.position[0] - current.x;
      const dz = result.position[1] - current.z;
      const moved = Math.abs(dx) + Math.abs(dz) > 1e-6;
      if (moved) {
        avatar.rotation.y = Math.atan2(dx, dz);
        current.set(result.position[0], floorY, result.position[1]);
      }
      if (result.arrived || !moved) state.setMarker(null);
    }
    avatar.position.copy(current);
  });

  return (
    <group ref={group} name="AVATAR_PLACEHOLDER" position={[spawn[0], floorY, spawn[1]]}>
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
