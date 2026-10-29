import type { Collider, Rect, Vec2 } from '../navigation/walk';

export type Vec3 = readonly [number, number, number];

/** Shared material slots of the primitive palette (`scenes/materials.ts`). */
export type MaterialKey =
  | 'roof'
  | 'teak'
  | 'teakDark'
  | 'teakCarved'
  | 'teakFloor'
  | 'stone'
  | 'stoneDark'
  | 'paving'
  | 'pavingDark'
  | 'grass'
  | 'janur'
  | 'cream'
  | 'white'
  | 'cloth'
  | 'gold'
  | 'red'
  | 'carpet'
  | 'photo'
  | 'terracotta'
  | 'leaf'
  | 'water';

/** Placement of an authored node rendered as one primitive (`HS_*`, `PORTAL_*`). */
export interface NodePlacement {
  /** Center of the primitive. */
  position: Vec3;
  size: Vec3;
  rotationY?: number;
  material: MaterialKey;
  shape?: 'box' | 'cylinder';
}

/** `CAMERA_ENTRY`: 3/4 elevated follow offset relative to the avatar (D-005, §8.1). */
export interface CameraRig {
  offset: Vec3;
  lookHeight: number;
  /** Look this far past the avatar (toward -z) so the scene ahead stays in frame. */
  lookAhead: number;
}

/** Procedural decor primitives and prefabs; `scenes/decor` renders each `type`. */
export type DecorItem =
  | { type: 'ground'; material: MaterialKey; center: Vec2; size: Vec2; y?: number }
  | { type: 'box'; material: MaterialKey; position: Vec3; size: Vec3; rotationY?: number }
  | {
      type: 'cylinder';
      material: MaterialKey;
      position: Vec3;
      radius: number;
      height: number;
    }
  | { type: 'wall'; start: Vec2; end: Vec2; height: number; thickness: number }
  | {
      type: 'gapura';
      position: Vec3;
      rotationY?: number;
      doorWidth: number;
      pillarWidth: number;
      height: number;
    }
  | { type: 'janur'; position: Vec3; rotationY: number; scale?: number }
  | { type: 'lanterns'; positions: readonly Vec2[] }
  | { type: 'mandala'; center: Vec2; radius: number }
  | { type: 'pond'; center: Vec2; size: Vec2 }
  | { type: 'plumerias'; positions: readonly Vec2[] }
  | { type: 'trees'; positions: readonly Vec2[] }
  | {
      type: 'joglo';
      center: Vec2;
      size: Vec2;
      eaveHeight: number;
      pillars: readonly Vec2[];
    }
  | { type: 'gebyok'; position: Vec3; width: number; height: number; rotationY?: number }
  | { type: 'roundTables'; positions: readonly Vec2[] }
  | { type: 'drapes'; positions: readonly Vec2[]; height: number }
  | { type: 'chandelier'; position: Vec3; scale?: number }
  | { type: 'pointLight'; position: Vec3; intensity: number; distance: number }
  | { type: 'flowers'; positions: readonly Vec3[] }
  | { type: 'gentong'; positions: readonly Vec2[] };

/** Code-side scene layout mirroring the GLB node contract (architecture.md §8.5). */
export interface PrimitiveLayout {
  /** `FLOOR_WALKABLE` at y = 0. */
  floor: Rect & { material: MaterialKey };
  /** `COLLIDER_<id>` boxes on the floor plane. */
  colliders: readonly Collider[];
  /** `SPAWN_ENTRY`, `SPAWN_FROM_*` → floor point. */
  spawnPoints: Readonly<Record<string, Vec2>>;
  /** `HS_*` → placement. */
  hotspots: Readonly<Record<string, NodePlacement>>;
  /** `PORTAL_*` → placement. */
  portals: Readonly<Record<string, NodePlacement>>;
  camera: CameraRig;
  decor: readonly DecorItem[];
}

/** Trusted template catalog entry (D-008). */
export type TemplateDefinition =
  | { kind: 'primitive'; layouts: Readonly<Record<string, PrimitiveLayout>> }
  /** T-501: Blender GLB scenes from the trusted catalog/CDN — not implemented yet. */
  | { kind: 'gltf' };
