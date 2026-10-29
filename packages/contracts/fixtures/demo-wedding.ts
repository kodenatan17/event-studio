import type { WeddingManifestV1Input } from '../src/manifest';

/**
 * Development/test-only manifest for slug `demo-wedding` (D-009). FAKE couple and content —
 * never a real wedding. Media and asset hosts use the reserved `.invalid` TLD (D-016); the
 * `blockout` template is rendered from code and never fetches these URLs (D-008).
 */
const ASSET_BASE = 'https://cdn.example.invalid/templates/blockout/0.1.0';
const MEDIA_BASE = 'https://media.example.invalid/demo-wedding';

function sceneAssets(name: string) {
  return {
    assetUrl: `${ASSET_BASE}/${name}.glb`,
    navmeshUrl: `${ASSET_BASE}/${name}-nav.glb`,
    cameraPreset: 'entry' as const,
  };
}

export const demoWeddingManifest = {
  schemaVersion: 1,
  publicationVersion: 1,
  wedding: {
    slug: 'demo-wedding',
    title: 'Raka & Sekar',
    couple: { groom: 'Raka', bride: 'Sekar' },
    timezone: 'Asia/Jakarta',
    locale: 'id-ID',
  },
  world: {
    templateId: 'blockout',
    templateVersion: '0.1.0',
    entrySceneId: 'entrance',
    theme: {
      paletteId: 'jawa-sunset',
      lightingId: 'warm-sunset',
      decorations: {
        'entrance.gate': 'janur',
        'entrance.lantern': 'teak',
        'living.gebyok': 'carved',
        'living.table': 'teak',
        'garden.flowers': 'melati',
        'hall.centerpiece': 'gold',
      },
    },
    scenes: [
      {
        id: 'entrance',
        ...sceneAssets('entrance'),
        portals: [{ id: 'front-door', toSceneId: 'living-room', spawnPointId: 'from-entrance' }],
        hotspots: [{ id: 'welcome-sign', nodeName: 'HS_WELCOME', action: 'open_welcome' }],
      },
      {
        id: 'living-room',
        ...sceneAssets('living'),
        portals: [
          { id: 'garden-door', toSceneId: 'wedding-garden', spawnPointId: 'from-living' },
          { id: 'hall-door', toSceneId: 'reception-hall', spawnPointId: 'from-living' },
          { id: 'back-to-entrance', toSceneId: 'entrance', spawnPointId: 'from-living' },
        ],
        hotspots: [
          { id: 'story-book', nodeName: 'HS_STORY', action: 'open_story' },
          {
            id: 'photo-frame-01',
            nodeName: 'HS_GALLERY_01',
            action: 'open_gallery',
            payload: { startIndex: 0 },
          },
          {
            id: 'photo-frame-02',
            nodeName: 'HS_GALLERY_02',
            action: 'open_gallery',
            payload: { startIndex: 1 },
          },
          {
            id: 'photo-frame-03',
            nodeName: 'HS_GALLERY_03',
            action: 'open_gallery',
            payload: { startIndex: 2 },
          },
        ],
      },
      {
        id: 'wedding-garden',
        ...sceneAssets('garden'),
        portals: [{ id: 'back-to-living', toSceneId: 'living-room', spawnPointId: 'from-garden' }],
        hotspots: [
          {
            id: 'ceremony-info',
            nodeName: 'HS_EVENT_CEREMONY',
            action: 'open_event_info',
            payload: { eventId: 'ceremony-1' },
          },
          { id: 'photo-booth', nodeName: 'HS_PHOTO', action: 'open_photo_booth' },
        ],
      },
      {
        id: 'reception-hall',
        ...sceneAssets('hall'),
        portals: [{ id: 'back-to-living', toSceneId: 'living-room', spawnPointId: 'from-hall' }],
        hotspots: [
          {
            id: 'reception-info',
            nodeName: 'HS_EVENT_RECEPTION',
            action: 'open_event_info',
            payload: { eventId: 'reception-1' },
          },
          { id: 'rsvp-booth', nodeName: 'HS_RSVP', action: 'open_rsvp' },
          { id: 'wish-book', nodeName: 'HS_GUESTBOOK', action: 'open_guestbook' },
        ],
      },
    ],
  },
  gallery: [
    {
      id: 'gallery-1',
      src: `${MEDIA_BASE}/foto-1.webp`,
      alt: 'Foto contoh pasangan di bawah gapura janur',
      caption: 'Foto contoh pertama',
    },
    {
      id: 'gallery-2',
      src: `${MEDIA_BASE}/foto-2.webp`,
      alt: 'Foto contoh pasangan di taman melati',
      caption: 'Foto contoh kedua',
    },
    {
      id: 'gallery-3',
      src: `${MEDIA_BASE}/foto-3.webp`,
      alt: 'Foto contoh pasangan di pendopo',
    },
  ],
  story: [
    {
      id: 'chapter-1',
      title: 'Pertama Bertemu',
      body: 'Ini adalah kisah contoh. Dua tokoh rekaan bertemu di sebuah perpustakaan kota.',
      imageSrc: null,
      date: '2021-06-12',
      order: 0,
    },
    {
      id: 'chapter-2',
      title: 'Saling Mengenal',
      body: 'Kisah contoh berlanjut dengan obrolan panjang dan secangkir teh hangat.',
      imageSrc: null,
      order: 1,
    },
    {
      id: 'chapter-3',
      title: 'Lamaran',
      body: 'Bagian contoh terakhir: sebuah lamaran sederhana bersama keluarga.',
      imageSrc: `${MEDIA_BASE}/lamaran.webp`,
      order: 2,
    },
  ],
  events: [
    {
      id: 'ceremony-1',
      kind: 'ceremony',
      title: 'Akad Nikah',
      startsAt: '2027-02-14T02:00:00Z',
      endsAt: '2027-02-14T04:00:00Z',
      timezone: 'Asia/Jakarta',
      venueName: 'Pendopo Contoh',
      address: 'Alamat contoh',
      mapsUrl: 'https://maps.google.com/?q=Pendopo+Contoh',
    },
    {
      id: 'reception-1',
      kind: 'reception',
      title: 'Resepsi',
      startsAt: '2027-02-14T05:00:00Z',
      endsAt: '2027-02-14T08:00:00Z',
      timezone: 'Asia/Jakarta',
      venueName: 'Pendopo Contoh',
      address: 'Alamat contoh',
      mapsUrl: 'https://maps.google.com/?q=Pendopo+Contoh',
    },
  ],
  features: {
    guestbookEnabled: true,
    rsvpEnabled: true,
    photoBoothEnabled: true,
  },
} satisfies WeddingManifestV1Input;
