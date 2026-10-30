/**
 * Guest avatar wardrobe (FR-07), after the user's reference `apps/assets/avatar-customize.png`
 * (D-020, ART_PENDING). Pure data, no three.js: the store, the editor UI and the character
 * builder all read it. Labels live in apps/web (D-010 pattern); ids are kebab-case ascii.
 */

export type BodyType = 'pria' | 'wanita';

export const BODY_TYPES: readonly BodyType[] = ['pria', 'wanita'];

export type Slot =
  | 'hair'
  | 'headwear'
  | 'top'
  | 'bottom'
  | 'selendang'
  | 'shoes'
  | 'earrings'
  | 'glasses'
  | 'bag'
  | 'brooch';

/** Every slot, in a fixed order (appearance keys, editor lists). */
export const SLOTS: readonly Slot[] = [
  'hair',
  'headwear',
  'top',
  'bottom',
  'selendang',
  'shoes',
  'earrings',
  'glasses',
  'bag',
  'brooch',
];

/** A character always wears these; the others may be empty. */
export const REQUIRED_SLOTS: readonly Slot[] = ['hair', 'top', 'bottom', 'shoes'];

/** What an item hides while worn; applied at render time only (`visibleItems`). */
export type HideTarget = 'hair' | 'hairCrown' | 'earrings';

/** Skin regions an item covers; covered skin is not built (fewer triangles, no poke-through). */
export type CoverRegion = 'neck' | 'torso' | 'arms' | 'legs' | 'feet';

/** Generated batik motifs (`textures.ts`). */
export type BatikPattern = 'parang' | 'kawung' | 'truntum' | 'sekar';

export interface WardrobeVariant {
  id: string;
  /** Fabric/material colour (sRGB hex), also the editor swatch. */
  swatch: string;
  pattern?: BatikPattern;
}

export interface WardrobeItem {
  id: string;
  slot: Slot;
  bodies: readonly BodyType[];
  /** The first variant is the default. */
  variants?: readonly WardrobeVariant[];
  tags?: readonly string[];
  hides?: readonly HideTarget[];
  /** The item is only valid while `slot` holds an item tagged `tag`. */
  requires?: { slot: Slot; tag: string };
  covers?: readonly CoverRegion[];
  /** `false`: template/wedding-only items (couple figures), never in the guest editor. */
  guestSelectable: boolean;
}

export type SkinToneId = 'langsat' | 'kuning' | 'sawo-terang' | 'sawo-matang' | 'cokelat';

export const SKIN_TONES: readonly { id: SkinToneId; swatch: string }[] = [
  { id: 'langsat', swatch: '#f0c8a4' },
  { id: 'kuning', swatch: '#e2b088' },
  { id: 'sawo-terang', swatch: '#c98f63' },
  { id: 'sawo-matang', swatch: '#a8714a' },
  { id: 'cokelat', swatch: '#7f5134' },
];

export const DEFAULT_SKIN: SkinToneId = 'sawo-terang';

const BOTH: readonly BodyType[] = ['pria', 'wanita'];
const PRIA: readonly BodyType[] = ['pria'];
const WANITA: readonly BodyType[] = ['wanita'];

const JARIK_VARIANTS: readonly WardrobeVariant[] = [
  { id: 'parang', swatch: '#5b3b22', pattern: 'parang' },
  { id: 'kawung', swatch: '#6a4527', pattern: 'kawung' },
  { id: 'truntum', swatch: '#3e2a1c', pattern: 'truntum' },
];

const HEAD_CLOTH: readonly WardrobeVariant[] = [
  { id: 'sogan', swatch: '#5b3b22', pattern: 'parang' },
];

export const WARDROBE: readonly WardrobeItem[] = [
  // Pria hair
  { id: 'belah-samping', slot: 'hair', bodies: PRIA, guestSelectable: true },
  { id: 'rapi', slot: 'hair', bodies: PRIA, guestSelectable: true },
  { id: 'ikal', slot: 'hair', bodies: PRIA, guestSelectable: true },
  // Pria headwear: all sit on the crown, so the hair crown is hidden under them.
  {
    id: 'peci',
    slot: 'headwear',
    bodies: PRIA,
    variants: [{ id: 'hitam', swatch: '#1c1918' }],
    hides: ['hairCrown'],
    guestSelectable: true,
  },
  {
    id: 'blangkon-solo',
    slot: 'headwear',
    bodies: PRIA,
    variants: HEAD_CLOTH,
    hides: ['hairCrown'],
    guestSelectable: true,
  },
  {
    id: 'blangkon-yogya',
    slot: 'headwear',
    bodies: PRIA,
    variants: [{ id: 'sogan', swatch: '#4f321d', pattern: 'kawung' }],
    hides: ['hairCrown'],
    guestSelectable: true,
  },
  {
    id: 'iket',
    slot: 'headwear',
    bodies: PRIA,
    variants: [{ id: 'sogan', swatch: '#3b2618', pattern: 'truntum' }],
    hides: ['hairCrown'],
    guestSelectable: true,
  },
  // Pria tops
  {
    id: 'beskap',
    slot: 'top',
    bodies: PRIA,
    variants: [
      { id: 'hitam', swatch: '#1f1b1a' },
      { id: 'krem', swatch: '#e4d8bf' },
      { id: 'hijau', swatch: '#4b5a3a' },
      { id: 'marun', swatch: '#6a1f2a' },
    ],
    tags: ['beskap'],
    covers: ['torso', 'arms'],
    guestSelectable: true,
  },
  {
    id: 'batik-panjang',
    slot: 'top',
    bodies: PRIA,
    variants: [{ id: 'navy', swatch: '#1f2b4d', pattern: 'sekar' }],
    tags: ['batik'],
    covers: ['torso', 'arms'],
    guestSelectable: true,
  },
  {
    id: 'batik-pendek',
    slot: 'top',
    bodies: PRIA,
    variants: [{ id: 'navy', swatch: '#1f2b4d', pattern: 'sekar' }],
    tags: ['batik'],
    covers: ['torso'],
    guestSelectable: true,
  },
  // Bottoms
  {
    id: 'jarik',
    slot: 'bottom',
    bodies: BOTH,
    variants: JARIK_VARIANTS,
    tags: ['skirted'],
    covers: ['legs'],
    guestSelectable: true,
  },
  {
    id: 'celana',
    slot: 'bottom',
    bodies: PRIA,
    variants: [{ id: 'hitam', swatch: '#24221f' }],
    covers: ['legs'],
    guestSelectable: true,
  },
  // Shoes
  {
    id: 'selop',
    slot: 'shoes',
    bodies: PRIA,
    variants: [{ id: 'hitam', swatch: '#191615' }],
    covers: ['feet'],
    guestSelectable: true,
  },
  {
    id: 'loafer',
    slot: 'shoes',
    bodies: PRIA,
    variants: [{ id: 'cokelat', swatch: '#5a3420' }],
    covers: ['feet'],
    guestSelectable: true,
  },
  {
    id: 'heels',
    slot: 'shoes',
    bodies: WANITA,
    variants: [
      { id: 'nude', swatch: '#d9b394' },
      { id: 'marun', swatch: '#6d1f2b' },
      { id: 'emas', swatch: '#c9a24a' },
      { id: 'hitam', swatch: '#1b1817' },
    ],
    covers: ['feet'],
    guestSelectable: true,
  },
  // Wanita hair
  { id: 'sanggul-ukel', slot: 'hair', bodies: WANITA, guestSelectable: true },
  { id: 'sanggul-cepol', slot: 'hair', bodies: WANITA, guestSelectable: true },
  { id: 'sanggul-tekuk', slot: 'hair', bodies: WANITA, guestSelectable: true },
  {
    id: 'hijab',
    slot: 'headwear',
    bodies: WANITA,
    variants: [
      { id: 'krem', swatch: '#e2d2bf' },
      { id: 'merah-muda', swatch: '#d9a7a6' },
      { id: 'biru', swatch: '#6f86b3' },
      { id: 'hijau', swatch: '#4f6a4a' },
      { id: 'marun', swatch: '#7a2232' },
    ],
    hides: ['hair', 'earrings'],
    covers: ['neck'],
    guestSelectable: true,
  },
  // Wanita tops
  {
    id: 'kebaya-kutubaru',
    slot: 'top',
    bodies: WANITA,
    variants: [
      { id: 'merah-muda', swatch: '#e1aeb0' },
      { id: 'hijau', swatch: '#5d7350' },
      { id: 'biru', swatch: '#a7b8d8' },
    ],
    tags: ['kebaya'],
    covers: ['torso', 'arms'],
    guestSelectable: true,
  },
  {
    id: 'kebaya-brokat',
    slot: 'top',
    bodies: WANITA,
    variants: [
      { id: 'marun', swatch: '#74202f' },
      { id: 'putih', swatch: '#efe6d6' },
    ],
    tags: ['kebaya'],
    covers: ['torso', 'arms'],
    guestSelectable: true,
  },
  {
    id: 'selendang',
    slot: 'selendang',
    bodies: WANITA,
    variants: [
      { id: 'merah-muda', swatch: '#dba3a8' },
      { id: 'biru', swatch: '#a3b6d6' },
      { id: 'marun', swatch: '#7a2433' },
      { id: 'krem', swatch: '#e8dcc8' },
    ],
    requires: { slot: 'top', tag: 'kebaya' },
    guestSelectable: true,
  },
  {
    id: 'anting',
    slot: 'earrings',
    bodies: WANITA,
    variants: [{ id: 'emas', swatch: '#d4ab52' }],
    guestSelectable: true,
  },
  // Shared accessories
  {
    id: 'kacamata',
    slot: 'glasses',
    bodies: BOTH,
    variants: [
      { id: 'hitam', swatch: '#1b1918' },
      { id: 'cokelat', swatch: '#6b4428' },
    ],
    guestSelectable: true,
  },
  {
    id: 'tas',
    slot: 'bag',
    bodies: BOTH,
    variants: [
      { id: 'krem', swatch: '#e6d6bd' },
      { id: 'hitam', swatch: '#1d1a19' },
      { id: 'emas', swatch: '#c7a25a' },
      { id: 'cokelat', swatch: '#6a4127' },
    ],
    guestSelectable: true,
  },
  {
    id: 'bros',
    slot: 'brooch',
    bodies: BOTH,
    variants: [{ id: 'emas', swatch: '#d4ab52' }],
    guestSelectable: true,
  },
];

const BY_ID = new Map(WARDROBE.map((item) => [item.id, item]));

export function wardrobeItem(id: string): WardrobeItem | undefined {
  return BY_ID.get(id);
}

/** Guest-selectable items for one body and slot, in catalog order (editor lists). */
export function wardrobeItems(body: BodyType, slot: Slot): WardrobeItem[] {
  return WARDROBE.filter(
    (item) => item.slot === slot && item.guestSelectable && item.bodies.includes(body),
  );
}

export function skinSwatch(id: SkinToneId): string {
  return (SKIN_TONES.find((tone) => tone.id === id) ?? SKIN_TONES[2]!).swatch;
}
