import { ACCESSORY_BUILDERS } from './accessories';
import { CLOTHING_BUILDERS } from './clothing';
import { HAIR_BUILDERS } from './hair';
import type { ItemBuilder } from './types';
import { WEDDING_BUILDERS } from './wedding';

export { bodyParts } from './body';
export { headParts } from './head';
export type { ItemBuilder, Part, PartContext } from './types';

/** Geometry per wardrobe item id. */
export const ITEM_BUILDERS: Readonly<Record<string, ItemBuilder>> = {
  ...HAIR_BUILDERS,
  ...CLOTHING_BUILDERS,
  ...ACCESSORY_BUILDERS,
  ...WEDDING_BUILDERS,
};
