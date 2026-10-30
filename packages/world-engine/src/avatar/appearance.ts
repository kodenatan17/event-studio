import {
  BODY_TYPES,
  DEFAULT_SKIN,
  REQUIRED_SLOTS,
  SKIN_TONES,
  SLOTS,
  wardrobeItem,
  wardrobeItems,
} from './wardrobe';
import type { BodyType, SkinToneId, Slot, WardrobeItem } from './wardrobe';

/** What one slot wears: a catalog item and, for items with variants, one variant id. */
export interface SlotChoice {
  item: string;
  variant?: string;
}

/**
 * Guest avatar look (FR-07). Holds catalog ids only, so it is safe to persist locally
 * (architecture.md §3.4: no personal data in localStorage).
 */
export interface AvatarAppearance {
  v: 1;
  body: BodyType;
  skin: SkinToneId;
  slots: Partial<Record<Slot, SlotChoice>>;
}

/** Local storage key; the value is `JSON.stringify(AvatarAppearance)`. */
export const AVATAR_STORAGE_KEY = 'undangan.avatar.v1';

/** Stored values above this size are rejected unparsed. */
const MAX_STORED_LENGTH = 2048;
const ID_PATTERN = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

const DEFAULT_SLOTS: Readonly<Record<BodyType, Partial<Record<Slot, SlotChoice>>>> = {
  pria: {
    hair: { item: 'belah-samping' },
    top: { item: 'beskap', variant: 'hitam' },
    bottom: { item: 'jarik', variant: 'parang' },
    shoes: { item: 'selop', variant: 'hitam' },
    brooch: { item: 'bros', variant: 'emas' },
  },
  wanita: {
    hair: { item: 'sanggul-ukel' },
    top: { item: 'kebaya-kutubaru', variant: 'hijau' },
    bottom: { item: 'jarik', variant: 'parang' },
    shoes: { item: 'heels', variant: 'nude' },
    earrings: { item: 'anting', variant: 'emas' },
  },
};

export function defaultAppearance(body: BodyType = 'pria'): AvatarAppearance {
  const slots: Partial<Record<Slot, SlotChoice>> = {};
  for (const [slot, choice] of Object.entries(DEFAULT_SLOTS[body])) {
    slots[slot as Slot] = { ...choice };
  }
  return { v: 1, body, skin: DEFAULT_SKIN, slots };
}

const isBody = (value: unknown): value is BodyType =>
  typeof value === 'string' && (BODY_TYPES as readonly string[]).includes(value);

const isSkin = (value: unknown): value is SkinToneId =>
  typeof value === 'string' && SKIN_TONES.some((tone) => tone.id === value);

function allowed(item: WardrobeItem | undefined, slot: Slot, body: BodyType): boolean {
  return !!item && item.slot === slot && item.guestSelectable && item.bodies.includes(body);
}

function withVariant(item: WardrobeItem, variant: string | undefined): SlotChoice {
  if (!item.variants?.length) return { item: item.id };
  const known = item.variants.some((candidate) => candidate.id === variant);
  return { item: item.id, variant: known ? variant : item.variants[0]!.id };
}

/**
 * Makes any appearance renderable for its body: an item that is unknown or not allowed for the
 * body becomes the body default in a required slot and is dropped from an optional one; an
 * unknown variant becomes the first variant; an item whose `requires` is not met is dropped.
 * `hides` is not applied here (see `visibleItems`), so taking off a hijab restores the sanggul.
 */
export function normalizeAppearance(appearance: AvatarAppearance): AvatarAppearance {
  const body = isBody(appearance.body) ? appearance.body : 'pria';
  const skin = isSkin(appearance.skin) ? appearance.skin : DEFAULT_SKIN;
  const slots: Partial<Record<Slot, SlotChoice>> = {};
  for (const slot of SLOTS) {
    const choice = Object.hasOwn(appearance.slots, slot) ? appearance.slots[slot] : undefined;
    const item = choice ? wardrobeItem(choice.item) : undefined;
    if (item && allowed(item, slot, body)) {
      slots[slot] = withVariant(item, choice?.variant);
    } else if (REQUIRED_SLOTS.includes(slot)) {
      const fallback = DEFAULT_SLOTS[body][slot];
      if (fallback) slots[slot] = { ...fallback };
    }
  }
  for (const slot of SLOTS) {
    const requires = slots[slot] && wardrobeItem(slots[slot].item)?.requires;
    if (!requires) continue;
    const host = slots[requires.slot];
    const hostTags = host ? (wardrobeItem(host.item)?.tags ?? []) : [];
    if (!hostTags.includes(requires.tag)) delete slots[slot];
  }
  return { v: 1, body, skin, slots };
}

/** Same look on another body: body-specific items reset to that body's defaults. */
export function withBody(appearance: AvatarAppearance, body: BodyType): AvatarAppearance {
  return normalizeAppearance({ ...appearance, body });
}

/** Puts `choice` into `slot` (or empties it with `null`), then normalises. */
export function withSlot(
  appearance: AvatarAppearance,
  slot: Slot,
  choice: SlotChoice | null,
): AvatarAppearance {
  const slots = { ...appearance.slots };
  if (choice) slots[slot] = choice;
  else delete slots[slot];
  return normalizeAppearance({ ...appearance, slots });
}

function parseChoice(value: unknown): SlotChoice | null {
  if (typeof value !== 'object' || value === null || Array.isArray(value)) return null;
  const { item, variant } = value as Record<string, unknown>;
  if (typeof item !== 'string' || !ID_PATTERN.test(item) || item.length > 64) return null;
  if (typeof variant === 'string' && ID_PATTERN.test(variant) && variant.length <= 64) {
    return { item, variant };
  }
  return { item };
}

/**
 * Reads a stored or untrusted appearance without a schema library (no zod in the client
 * bundle). A string over 2 KB, invalid JSON, a non-object or `v !== 1` gives the default;
 * otherwise each field falls back on its own, unknown keys are dropped, and the result is
 * normalised.
 */
export function parseAvatarAppearance(raw: unknown): AvatarAppearance {
  let value: unknown = raw;
  if (typeof raw === 'string') {
    if (raw.length > MAX_STORED_LENGTH) return defaultAppearance();
    try {
      value = JSON.parse(raw);
    } catch {
      return defaultAppearance();
    }
  }
  if (typeof value !== 'object' || value === null || Array.isArray(value)) {
    return defaultAppearance();
  }
  const record = value as Record<string, unknown>;
  if (record.v !== 1) return defaultAppearance();
  const body = isBody(record.body) ? record.body : 'pria';
  const skin = isSkin(record.skin) ? record.skin : DEFAULT_SKIN;
  const slots: Partial<Record<Slot, SlotChoice>> = {};
  const rawSlots = record.slots;
  if (typeof rawSlots === 'object' && rawSlots !== null && !Array.isArray(rawSlots)) {
    for (const slot of SLOTS) {
      if (!Object.hasOwn(rawSlots, slot)) continue;
      const choice = parseChoice((rawSlots as Record<string, unknown>)[slot]);
      if (choice) slots[slot] = choice;
    }
  }
  return normalizeAppearance({ v: 1, body, skin, slots });
}

/** Random look for `body` (editor "Acak"); `random` returns [0, 1). */
export function randomAppearance(random: () => number, body: BodyType): AvatarAppearance {
  const pick = <T>(list: readonly T[]): T | undefined =>
    list[Math.min(list.length - 1, Math.floor(random() * list.length))];
  const slots: Partial<Record<Slot, SlotChoice>> = {};
  for (const slot of SLOTS) {
    const items = wardrobeItems(body, slot);
    if (!items.length) continue;
    if (!REQUIRED_SLOTS.includes(slot) && random() < 0.5) continue;
    const item = pick(items);
    if (!item) continue;
    slots[slot] = { item: item.id, variant: item.variants ? pick(item.variants)?.id : undefined };
  }
  return normalizeAppearance({ v: 1, body, skin: pick(SKIN_TONES)?.id ?? DEFAULT_SKIN, slots });
}

/** Stable identity string (slots in catalog order); also the `data-avatar` test hook. */
export function appearanceKey(appearance: AvatarAppearance): string {
  const slots = SLOTS.flatMap((slot) => {
    const choice = appearance.slots[slot];
    return choice ? [`${slot}=${choice.item}${choice.variant ? `:${choice.variant}` : ''}`] : [];
  });
  return `v${appearance.v}|${appearance.body}|${appearance.skin}|${slots.join(',')}`;
}

/** What the character renders: the worn items after `hides`, plus whether the crown is hidden. */
export interface VisibleItems {
  slots: Partial<Record<Slot, SlotChoice>>;
  /** Hair is drawn without its crown (headwear sits on it). */
  hairCrownHidden: boolean;
}

export function visibleItems(appearance: AvatarAppearance): VisibleItems {
  const hidden = new Set<string>();
  for (const slot of SLOTS) {
    const choice = appearance.slots[slot];
    for (const target of (choice && wardrobeItem(choice.item)?.hides) ?? []) hidden.add(target);
  }
  const slots: Partial<Record<Slot, SlotChoice>> = {};
  for (const slot of SLOTS) {
    const choice = appearance.slots[slot];
    if (!choice) continue;
    if (slot === 'hair' && hidden.has('hair')) continue;
    if (slot === 'earrings' && hidden.has('earrings')) continue;
    slots[slot] = choice;
  }
  return { slots, hairCrownHidden: hidden.has('hairCrown') && !hidden.has('hair') };
}
