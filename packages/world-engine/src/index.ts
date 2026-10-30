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
  PostFx,
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
  appearanceKey,
  AVATAR_STORAGE_KEY,
  parseAvatarAppearance,
  randomAppearance,
  withBody,
  withSlot,
} from './avatar/appearance';
export type { AvatarAppearance, SlotChoice } from './avatar/appearance';
export { SKIN_TONES, SLOTS, WARDROBE, wardrobeItems } from './avatar/wardrobe';
export type { BodyType, SkinToneId, Slot, WardrobeItem } from './avatar/wardrobe';
export { queueAction } from './input/bus';
export type { InputAction, InputBus } from './input/bus';
export { joystickVector } from './input/joystick';
export type { JoystickVector } from './input/joystick';
export { INTERACT_RADIUS } from './interaction/nearby';
export type { Interactable } from './interaction/nearby';
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
export type { RenderTier } from './renderer/capabilities';
export { getSceneLayout, templates } from './templates/blockout';
export type {
  CameraRig,
  DecorItem,
  GltfLayout,
  MaterialKey,
  NodePlacement,
  PrimitiveLayout,
  SceneLayout,
  TemplateDefinition,
  TriggerBox,
  Vec3,
} from './templates/types';
