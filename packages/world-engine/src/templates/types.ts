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
  /** Landscape vertical field of view in degrees (default 45); portrait widens it. */
  fov?: number;
  /** Highest camera point above the avatar's floor, e.g. to stay below an interior's beams. */
  maxHeight?: number;
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
  kind: 'primitive';
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

/** Engine-defined invisible hit box for a manifest node the GLB does not author. */
export interface TriggerBox {
  /** Center of the box. */
  position: Vec3;
  size: Vec3;
}

/**
 * GLB scene from the trusted code-side catalog (D-008, T-501). The manifest `assetUrl` stays a
 * locator and is never fetched; `url` is the only file loaded. Coordinates: meters, Y-up.
 */
export interface GltfLayout {
  kind: 'gltf';
  /** Same-origin GLB path; plain `GLTFLoader` (no Draco/Meshopt/KTX2 extensions). */
  url: string;
  /**
   * Manifest node (`HS_*`, `PORTAL_*`) → GLB node name, or a `triggers` key. Only mapped nodes
   * are interactive; unknown GLB names never resolve to an action (architecture.md §8.3).
   */
  nodeMap: Readonly<Record<string, string>>;
  /** Engine trigger boxes referenced from `nodeMap` (e.g. an open edge without a door node). */
  triggers: Readonly<Record<string, TriggerBox>>;
  /** Walkable rect at height `y`; `nodeName` is the GLB mesh used as tap-to-move target. */
  floor: Rect & { y: number; nodeName: string };
  /** `COLLIDER_*` boxes on the floor plane (the GLB carries no colliders). */
  colliders: readonly Collider[];
  /** `SPAWN_ENTRY`, `SPAWN_FROM_*` → floor point. */
  spawnPoints: Readonly<Record<string, Vec2>>;
  camera: CameraRig;
  /** Shared-primitive surroundings outside the GLB (ground, skyline). */
  decor: readonly DecorItem[];
}

export type SceneLayout = PrimitiveLayout | GltfLayout;

/** Trusted template catalog entry (D-008): one layout per scene id. */
export interface TemplateDefinition {
  layouts: Readonly<Record<string, SceneLayout>>;
}
