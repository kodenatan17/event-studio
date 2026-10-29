import { z } from 'zod';

/**
 * World contracts shared by the manifest and `@undangan/world-engine`
 * (architecture.md §8.3, api-contracts.md §7). The engine imports types from here only.
 */

/** Stable kebab-case identifier (scene, portal, hotspot, spawn point, content items). */
export const IdSchema = z
  .string()
  .min(1)
  .max(64)
  .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/);

/** External URLs are https-only (architecture.md §14, D-008). */
export const HttpsUrlSchema = z.url({ protocol: /^https$/ });

/** Authored 3D hotspot node name (architecture.md §8.5, D-002). */
export const HotspotNodeNameSchema = z.string().regex(/^HS_[A-Z0-9_]+$/);

export const PortalSchema = z.strictObject({
  id: IdSchema,
  toSceneId: IdSchema,
  spawnPointId: IdSchema.optional(),
});

const hotspotBase = {
  id: IdSchema,
  nodeName: HotspotNodeNameSchema,
};

/** Manifest hotspot: `action` is an allowlist (architecture.md §8.3, api-contracts.md §7.1). */
export const HotspotSchema = z.discriminatedUnion('action', [
  z.strictObject({ ...hotspotBase, action: z.literal('open_welcome') }),
  z.strictObject({
    ...hotspotBase,
    action: z.literal('open_gallery'),
    payload: z.strictObject({ startIndex: z.int().min(0) }).optional(),
  }),
  z.strictObject({
    ...hotspotBase,
    action: z.literal('open_story'),
    payload: z.strictObject({ chapterId: IdSchema }).optional(),
  }),
  z.strictObject({
    ...hotspotBase,
    action: z.literal('open_event_info'),
    payload: z.strictObject({ eventId: IdSchema }).optional(),
  }),
  z.strictObject({ ...hotspotBase, action: z.literal('open_rsvp') }),
  z.strictObject({ ...hotspotBase, action: z.literal('open_guestbook') }),
  z.strictObject({ ...hotspotBase, action: z.literal('open_photo_booth') }),
]);

export const SceneSchema = z.strictObject({
  id: IdSchema,
  assetUrl: HttpsUrlSchema,
  navmeshUrl: HttpsUrlSchema,
  /** `entry` maps to node `CAMERA_ENTRY` (D-005). */
  cameraPreset: z.literal('entry'),
  portals: z.array(PortalSchema),
  hotspots: z.array(HotspotSchema),
});

/** Typed action emitted by the engine (architecture.md §8.3). */
export const WorldActionSchema = z.discriminatedUnion('type', [
  z.strictObject({
    type: z.literal('navigate'),
    sceneId: IdSchema,
    spawnPointId: IdSchema.optional(),
  }),
  z.strictObject({ type: z.literal('open_welcome') }),
  z.strictObject({ type: z.literal('open_gallery'), startIndex: z.int().min(0).optional() }),
  z.strictObject({ type: z.literal('open_story'), chapterId: IdSchema.optional() }),
  z.strictObject({ type: z.literal('open_event_info'), eventId: IdSchema.optional() }),
  z.strictObject({ type: z.literal('open_rsvp') }),
  z.strictObject({ type: z.literal('open_guestbook') }),
  z.strictObject({ type: z.literal('open_photo_booth') }),
]);

export type PortalDefinition = z.infer<typeof PortalSchema>;
export type HotspotDefinition = z.infer<typeof HotspotSchema>;
export type HotspotActionType = HotspotDefinition['action'];
export type SceneDefinition = z.infer<typeof SceneSchema>;
export type WorldAction = z.infer<typeof WorldActionSchema>;
export type WorldActionType = WorldAction['type'];
/** Every action except `navigate` opens an HTML overlay. */
export type OverlayAction = Exclude<WorldAction, { type: 'navigate' }>;
