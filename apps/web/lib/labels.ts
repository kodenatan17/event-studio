import type { ActiveOverlay } from '@undangan/world-engine';

/** Indonesian labels for scenes and HTML controls; the manifest carries no labels (D-010). */
const SCENE_LABELS: Readonly<Record<string, string>> = {
  entrance: 'Gerbang',
  'living-room': 'Ruang Tamu',
  'wedding-garden': 'Taman Pernikahan',
  'reception-hall': 'Pendopo Resepsi',
};

const CONTROL_LABELS: Readonly<Record<string, string>> = {
  'welcome-sign': 'Papan sambutan',
  'story-book': 'Buku kisah kami',
  'photo-frame-01': 'Foto 1',
  'photo-frame-02': 'Foto 2',
  'photo-frame-03': 'Foto 3',
  'ceremony-info': 'Info akad nikah',
  'reception-info': 'Info resepsi',
  'photo-booth': 'Photo booth',
  'rsvp-booth': 'RSVP',
  'wish-book': 'Buku tamu',
  'front-door': 'Masuk ke Ruang Tamu',
  'garden-door': 'Ke Taman',
  'hall-door': 'Ke Pendopo',
  'back-to-entrance': 'Kembali ke Gerbang',
  'back-to-living': 'Kembali ke Ruang Tamu',
};

const OVERLAY_LABELS: Readonly<Record<ActiveOverlay['type'], string>> = {
  open_welcome: 'Sambutan',
  open_gallery: 'Galeri foto',
  open_story: 'Buku kisah',
  open_event_info: 'Info acara',
  open_rsvp: 'RSVP',
  open_guestbook: 'Buku tamu',
  open_photo_booth: 'Photo booth',
  quick_map: 'Peta',
};

function lookup(labels: Readonly<Record<string, string>>, id: string): string {
  return Object.hasOwn(labels, id) ? (labels[id] ?? id) : id;
}

export function sceneLabel(sceneId: string): string {
  return lookup(SCENE_LABELS, sceneId);
}

/** Label for a hotspot or portal id; unknown ids fall back to the id itself. */
export function controlLabel(id: string): string {
  return lookup(CONTROL_LABELS, id);
}

export function overlayLabel(overlay: ActiveOverlay): string {
  return OVERLAY_LABELS[overlay.type];
}
