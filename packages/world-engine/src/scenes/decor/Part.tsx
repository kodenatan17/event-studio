import type { Material } from 'three';

import type { MaterialKey, Vec3 } from '../../templates/types';
import { geometries, materials } from '../materials';

export type GeometryKey = keyof typeof geometries;

interface PartProps {
  geometry?: GeometryKey;
  material: MaterialKey | Material;
  position?: Vec3;
  scale?: Vec3 | number;
  rotation?: Vec3;
}

/** Single primitive using shared geometry/material; never disposed with the scene. */
export function Part({ geometry = 'box', material, position, scale, rotation }: PartProps) {
  return (
    <mesh
      geometry={geometries[geometry]}
      material={typeof material === 'string' ? materials[material] : material}
      position={position}
      scale={scale}
      rotation={rotation}
      dispose={null}
    />
  );
}

/** Deterministic pseudo-random sequence so decor never shifts between renders. */
export function seeded(seed: number): () => number {
  let state = Math.floor(seed * 9973) >>> 0 || 1;
  return () => {
    state = (state + 0x6d2b79f5) >>> 0;
    let t = state;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
