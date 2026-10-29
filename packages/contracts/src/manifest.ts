import { z } from 'zod';

import { HttpsUrlSchema, IdSchema, SceneSchema } from './world';

export * from './world';

/** Highest manifest `schemaVersion` this build understands (api-contracts.md §7.1). */
export const MANIFEST_SCHEMA_VERSION = 1;

/** IANA timezone accepted by the runtime `Intl` implementation. */
export function isValidTimeZone(timeZone: string): boolean {
  try {
    new Intl.DateTimeFormat('en', { timeZone });
    return true;
  } catch {
    return false;
  }
}

const TimeZoneSchema = z.string().min(1).max(64).refine(isValidTimeZone, 'Invalid IANA timezone');
const NameSchema = z.string().trim().min(1).max(80);
const SlugSchema = z
  .string()
  .min(3)
  .max(64)
  .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/);
const DateTimeSchema = z.iso.datetime({ offset: true });

const WeddingSchema = z.strictObject({
  slug: SlugSchema,
  title: z.string().trim().min(1).max(120),
  couple: z.strictObject({ groom: NameSchema, bride: NameSchema }),
  timezone: TimeZoneSchema,
  locale: z.literal('id-ID'),
});

const ThemeSchema = z.strictObject({
  paletteId: IdSchema,
  lightingId: IdSchema,
  /** Decoration slot (`entrance.gate`) → variant id (`janur`). */
  decorations: z.record(z.string().regex(/^[a-z0-9-]+\.[a-z0-9-]+$/), IdSchema),
});

const WorldSchema = z.strictObject({
  templateId: IdSchema,
  templateVersion: z.string().regex(/^\d+\.\d+\.\d+$/),
  entrySceneId: IdSchema,
  theme: ThemeSchema,
  scenes: z.array(SceneSchema).min(1),
});

/** FR-02: up to 20 gallery images. */
const GalleryItemSchema = z.strictObject({
  id: IdSchema,
  src: HttpsUrlSchema,
  alt: z.string().trim().min(1).max(300),
  caption: z.string().max(300).optional(),
});

/** FR-03: chapter with optional date (D-006). */
const StoryChapterSchema = z.strictObject({
  id: IdSchema,
  title: z.string().trim().min(1).max(120),
  body: z.string().min(1).max(5000),
  imageSrc: HttpsUrlSchema.nullable(),
  date: z.iso.date().optional(),
  order: z.int().min(0),
});

/** FR-05; `kind` limited by D-011. */
const EventSchema = z.strictObject({
  id: IdSchema,
  kind: z.enum(['ceremony', 'reception']),
  title: z.string().trim().min(1).max(120),
  startsAt: DateTimeSchema,
  endsAt: DateTimeSchema,
  timezone: TimeZoneSchema,
  venueName: z.string().trim().min(1).max(200),
  address: z.string().trim().min(1).max(500),
  mapsUrl: HttpsUrlSchema,
});

const FeaturesSchema = z.strictObject({
  guestbookEnabled: z.boolean(),
  rsvpEnabled: z.boolean(),
  photoBoothEnabled: z.boolean(),
});

function addDuplicateIssues(
  ctx: z.RefinementCtx,
  ids: readonly string[],
  path: (string | number)[],
  label: string,
): void {
  const seen = new Set<string>();
  ids.forEach((id, index) => {
    if (seen.has(id)) {
      ctx.addIssue({
        code: 'custom',
        path: [...path, index],
        message: `Duplicate ${label} "${id}"`,
      });
    }
    seen.add(id);
  });
}

/** Public published manifest, schema version 1 (api-contracts.md §7; strict per D-012). */
export const WeddingManifestV1Schema = z
  .strictObject({
    schemaVersion: z.literal(MANIFEST_SCHEMA_VERSION),
    publicationVersion: z.int().min(1),
    wedding: WeddingSchema,
    world: WorldSchema,
    gallery: z.array(GalleryItemSchema).max(20),
    story: z.array(StoryChapterSchema).min(1).max(30),
    events: z.array(EventSchema),
    features: FeaturesSchema,
  })
  .superRefine((manifest, ctx) => {
    const { scenes } = manifest.world;
    const sceneIds = new Set(scenes.map((scene) => scene.id));
    const chapterIds = new Set(manifest.story.map((chapter) => chapter.id));
    const eventIds = new Set(manifest.events.map((event) => event.id));

    addDuplicateIssues(
      ctx,
      scenes.map((scene) => scene.id),
      ['world', 'scenes'],
      'scene id',
    );
    addDuplicateIssues(
      ctx,
      manifest.gallery.map((item) => item.id),
      ['gallery'],
      'gallery id',
    );
    addDuplicateIssues(
      ctx,
      manifest.story.map((chapter) => chapter.id),
      ['story'],
      'chapter id',
    );
    addDuplicateIssues(
      ctx,
      manifest.events.map((event) => event.id),
      ['events'],
      'event id',
    );

    if (!sceneIds.has(manifest.world.entrySceneId)) {
      ctx.addIssue({
        code: 'custom',
        path: ['world', 'entrySceneId'],
        message: 'Entry scene is not listed',
      });
    }

    scenes.forEach((scene, sceneIndex) => {
      const scenePath = ['world', 'scenes', sceneIndex];
      // Portal and hotspot ids share one namespace per scene (they become HTML control ids).
      addDuplicateIssues(
        ctx,
        [...scene.portals.map((portal) => portal.id), ...scene.hotspots.map((h) => h.id)],
        scenePath,
        'portal/hotspot id',
      );
      addDuplicateIssues(
        ctx,
        scene.hotspots.map((hotspot) => hotspot.nodeName),
        [...scenePath, 'hotspots'],
        'hotspot nodeName',
      );

      scene.portals.forEach((portal, portalIndex) => {
        if (!sceneIds.has(portal.toSceneId)) {
          ctx.addIssue({
            code: 'custom',
            path: [...scenePath, 'portals', portalIndex, 'toSceneId'],
            message: `Portal target "${portal.toSceneId}" is not listed`,
          });
        }
      });

      scene.hotspots.forEach((hotspot, hotspotIndex) => {
        const payloadPath = [...scenePath, 'hotspots', hotspotIndex, 'payload'];
        if (hotspot.action === 'open_gallery' && hotspot.payload) {
          if (hotspot.payload.startIndex >= manifest.gallery.length) {
            ctx.addIssue({
              code: 'custom',
              path: [...payloadPath, 'startIndex'],
              message: 'Gallery startIndex out of range',
            });
          }
        } else if (hotspot.action === 'open_story' && hotspot.payload) {
          if (!chapterIds.has(hotspot.payload.chapterId)) {
            ctx.addIssue({
              code: 'custom',
              path: [...payloadPath, 'chapterId'],
              message: 'Unknown story chapter',
            });
          }
        } else if (hotspot.action === 'open_event_info' && hotspot.payload) {
          if (!eventIds.has(hotspot.payload.eventId)) {
            ctx.addIssue({
              code: 'custom',
              path: [...payloadPath, 'eventId'],
              message: 'Unknown event',
            });
          }
        }
      });
    });

    manifest.events.forEach((event, index) => {
      if (Date.parse(event.endsAt) <= Date.parse(event.startsAt)) {
        ctx.addIssue({
          code: 'custom',
          path: ['events', index, 'endsAt'],
          message: 'endsAt must be after startsAt',
        });
      }
    });
  });

export type WeddingManifestV1 = z.infer<typeof WeddingManifestV1Schema>;
export type WeddingManifestV1Input = z.input<typeof WeddingManifestV1Schema>;
