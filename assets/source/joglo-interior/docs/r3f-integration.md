# R3F integration: Joglo Living Room

```tsx
'use client';
import { useGLTF } from '@react-three/drei';
import { useEffect, useMemo } from 'react';
import * as THREE from 'three';

type Props = { onAction: (name: string) => void };

export function JogloLivingRoom({ onAction }: Props) {
  const { scene: cachedScene } = useGLTF('/models/joglo_living_room_mobile_optimized.glb');
  const scene = useMemo(() => cachedScene.clone(true), [cachedScene]);

  useEffect(() => {
    scene.traverse((obj) => {
      if (!(obj instanceof THREE.Mesh)) return;
      if (obj.name.includes('SPAWN_')) { obj.visible = false; return; }
      if (obj.name.includes('HS_')) {
        // Keep the hit target in raycast while hiding pixels.
        obj.visible = true;
        obj.material = new THREE.MeshBasicMaterial({ transparent: true, opacity: 0,
          depthWrite: false, side: THREE.DoubleSide });
      }
    });
    return () => {
      scene.traverse(obj => {
        if (obj instanceof THREE.Mesh && obj.name.includes('HS_')) {
          (obj.material as THREE.Material).dispose();
        }
      });
    };
  }, [scene]);

  return <primitive object={scene} onClick={(e: any) => {
    const node = e.object as THREE.Object3D;
    if (node.name.includes('HS_')) { e.stopPropagation(); onAction(node.name); }
  }} />;
}

useGLTF.preload('/models/joglo_living_room_mobile_optimized.glb');
```

In production map the callback name through `scene-config.json`'s action registry, never execute arbitrary action names. Load CMS photos through `TextureLoader` and replace materials on meshes ending in `PHOTO_DISPLAY_MESH` (clone the material first; configure color space and CORS).

**Important:** The completed scene is not a full physics/navigation asset. Test obstacle collision and bake a walkable navmesh before enabling unrestricted avatar movement.
