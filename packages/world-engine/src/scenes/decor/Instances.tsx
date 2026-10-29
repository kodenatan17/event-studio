import { useLayoutEffect, useRef } from 'react';
import { Euler, Matrix4, Quaternion, Vector3 } from 'three';
import type { BufferGeometry, InstancedMesh, Material } from 'three';

import type { Vec3 } from '../../templates/types';

export interface InstanceTransform {
  position: Vec3;
  rotation?: Vec3;
  scale?: Vec3 | number;
}

interface InstancesProps {
  geometry: BufferGeometry;
  material: Material;
  /** Must be referentially stable (memoized); matrices are rebuilt when it changes. */
  items: readonly InstanceTransform[];
}

/**
 * One draw call for repeated decor (architecture.md §8.1). Geometry and material are shared
 * module-level resources; R3F only disposes the InstancedMesh (its instance buffers) on unmount.
 */
export function Instances({ geometry, material, items }: InstancesProps) {
  const ref = useRef<InstancedMesh>(null);

  useLayoutEffect(() => {
    const mesh = ref.current;
    if (!mesh) return;
    const matrix = new Matrix4();
    const position = new Vector3();
    const quaternion = new Quaternion();
    const euler = new Euler();
    const scale = new Vector3();
    items.forEach((item, index) => {
      position.set(...item.position);
      quaternion.setFromEuler(euler.set(...(item.rotation ?? [0, 0, 0])));
      if (typeof item.scale === 'number' || item.scale === undefined) {
        scale.setScalar(item.scale ?? 1);
      } else {
        scale.set(...item.scale);
      }
      mesh.setMatrixAt(index, matrix.compose(position, quaternion, scale));
    });
    mesh.instanceMatrix.needsUpdate = true;
    mesh.computeBoundingSphere();
  }, [items]);

  if (items.length === 0) return null;
  return <instancedMesh key={items.length} ref={ref} args={[geometry, material, items.length]} />;
}
