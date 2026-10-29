import type { WeddingManifestV1 } from '@undangan/contracts';

/** Published manifest slices the overlays render (api-contracts.md §7); never draft data. */
export type WeddingContent = Pick<
  WeddingManifestV1,
  'wedding' | 'gallery' | 'story' | 'events' | 'features'
>;

export type GalleryItem = WeddingManifestV1['gallery'][number];
export type StoryChapter = WeddingManifestV1['story'][number];
export type WeddingEvent = WeddingManifestV1['events'][number];
