// Engine API without three.js: safe to import outside the client-only canvas chunk.
// The renderer lives at `@undangan/world-engine/canvas` (loaded with `ssr: false`).
export {
  createWorldStore,
  selectInputEnabled,
  selectTransitionStatus,
} from './scene-manager/store';
export type {
  ActiveOverlay,
  FallbackReason,
  FloorPoint,
  QualityProfile,
  TransitionStatus,
  WorldActions,
  WorldState,
  WorldStateData,
  WorldStatus,
  WorldStore,
  WorldStoreOptions,
} from './scene-manager/store';
export { useWorldStore } from './scene-manager/useWorldStore';
export {
  pickInteractive,
  portalAction,
  portalNodeName,
  resolveHotspotAction,
  spawnNodeName,
  toUpperSnake,
} from './interaction/registry';
export type { InteractiveTag } from './interaction/registry';
export { clampToFloor, isBlocked, MAX_FRAME_DELTA, stepToward } from './navigation/walk';
export type { Collider, Rect, StepResult, Vec2 } from './navigation/walk';
export { detectWebGL, MAX_DPR, resolveDpr, usePrefersReducedMotion } from './renderer/capabilities';
export { getPrimitiveLayout, templates } from './templates/blockout';
export type {
  CameraRig,
  DecorItem,
  MaterialKey,
  NodePlacement,
  PrimitiveLayout,
  TemplateDefinition,
  Vec3,
} from './templates/types';
