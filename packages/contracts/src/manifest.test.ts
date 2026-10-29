import { describe, expect, it } from 'vitest';

import { demoWeddingManifest } from '../fixtures/demo-wedding';
import { WeddingManifestV1Schema } from './manifest';

/** Deep copy of the fixture as plain JSON so each test can mutate it freely. */
// eslint-disable-next-line @typescript-eslint/no-explicit-any -- tests mutate arbitrary JSON paths
function fixture(): Record<string, any> {
  return JSON.parse(JSON.stringify(demoWeddingManifest));
}

function issuePaths(raw: unknown): string[] {
  const result = WeddingManifestV1Schema.safeParse(raw);
  expect(result.success).toBe(false);
  return result.success ? [] : result.error.issues.map((issue) => issue.path.join('.'));
}

describe('WeddingManifestV1Schema', () => {
  it('[T-103] fixture parses', () => {
    const result = WeddingManifestV1Schema.safeParse(demoWeddingManifest);

    expect(result.error?.issues).toBeUndefined();
    expect(result.data?.world.scenes.map((scene) => scene.id)).toEqual([
      'entrance',
      'living-room',
      'wedding-garden',
      'reception-hall',
    ]);
  });

  it('[T-103] unknown action rejected', () => {
    const raw = fixture();
    raw.world.scenes[0].hotspots[0].action = 'run_script';

    expect(issuePaths(raw)).toContain('world.scenes.0.hotspots.0.action');
  });

  it('[T-103] portal to unlisted scene rejected', () => {
    const raw = fixture();
    raw.world.scenes[0].portals[0].toSceneId = 'secret-room';

    expect(issuePaths(raw)).toContain('world.scenes.0.portals.0.toSceneId');
  });

  it('[T-103] unlisted entry scene rejected', () => {
    const raw = fixture();
    raw.world.entrySceneId = 'lobby';

    expect(issuePaths(raw)).toContain('world.entrySceneId');
  });

  it('[T-103] duplicate scene id rejected', () => {
    const raw = fixture();
    raw.world.scenes[1].id = 'entrance';

    expect(issuePaths(raw)).toContain('world.scenes.1');
  });

  it('[T-103] schemaVersion 2 rejected', () => {
    const raw = fixture();
    raw.schemaVersion = 2;

    expect(issuePaths(raw)).toContain('schemaVersion');
  });

  it.each(['javascript:alert(1)', 'http://maps.google.com/?q=Pendopo'])(
    '[T-103] javascript:/http mapsUrl rejected (%s)',
    (mapsUrl) => {
      const raw = fixture();
      raw.events[0].mapsUrl = mapsUrl;

      expect(issuePaths(raw)).toContain('events.0.mapsUrl');
    },
  );

  it('[T-103] startIndex out of range rejected', () => {
    const raw = fixture();
    raw.world.scenes[1].hotspots[3].payload.startIndex = 3;

    expect(issuePaths(raw)).toContain('world.scenes.1.hotspots.3.payload.startIndex');
  });

  it('[T-103] unknown chapterId / eventId rejected', () => {
    const raw = fixture();
    raw.world.scenes[1].hotspots[0].payload = { chapterId: 'chapter-99' };
    raw.world.scenes[2].hotspots[0].payload.eventId = 'event-99';

    const paths = issuePaths(raw);
    expect(paths).toContain('world.scenes.1.hotspots.0.payload.chapterId');
    expect(paths).toContain('world.scenes.2.hotspots.0.payload.eventId');
  });

  it('[T-103] event ending before it starts rejected', () => {
    const raw = fixture();
    raw.events[0].endsAt = raw.events[0].startsAt;

    expect(issuePaths(raw)).toContain('events.0.endsAt');
  });

  it('[FR-03] story requires 1..30 chapters', () => {
    const empty = fixture();
    empty.story = [];
    expect(issuePaths(empty)).toContain('story');

    const tooMany = fixture();
    tooMany.story = Array.from({ length: 31 }, (_, index) => ({
      id: `chapter-${index + 1}`,
      title: `Bab ${index + 1}`,
      body: 'Isi contoh',
      imageSrc: null,
      order: index,
    }));
    // Hotspots no longer reference chapters, so `story` is the only failing path.
    expect(issuePaths(tooMany)).toEqual(['story']);

    const thirty = fixture();
    thirty.story = tooMany.story.slice(0, 30);
    expect(WeddingManifestV1Schema.safeParse(thirty).success).toBe(true);
  });

  it('[FR-02] gallery max 20', () => {
    const raw = fixture();
    raw.gallery = Array.from({ length: 21 }, (_, index) => ({
      id: `gallery-${index + 1}`,
      src: `https://media.example.invalid/foto-${index + 1}.webp`,
      alt: `Foto contoh ${index + 1}`,
    }));
    expect(issuePaths(raw)).toEqual(['gallery']);

    raw.gallery = raw.gallery.slice(0, 20);
    expect(WeddingManifestV1Schema.safeParse(raw).success).toBe(true);
  });

  it('[§7] extra private key (guests) rejected', () => {
    const raw = fixture();
    raw.guests = [{ name: 'Tamu Contoh', tokenHash: 'abc' }];

    const result = WeddingManifestV1Schema.safeParse(raw);
    expect(result.success).toBe(false);
    expect(result.error?.issues.some((issue) => issue.code === 'unrecognized_keys')).toBe(true);
  });

  it('[§7] extra key on a nested object rejected', () => {
    const raw = fixture();
    raw.world.scenes[0].hotspots[0].script = 'alert(1)';

    expect(WeddingManifestV1Schema.safeParse(raw).success).toBe(false);
  });

  it('[T-103] invalid timezone rejected', () => {
    const raw = fixture();
    raw.wedding.timezone = 'Mars/Olympus_Mons';
    raw.events[1].timezone = 'WIB';

    const paths = issuePaths(raw);
    expect(paths).toContain('wedding.timezone');
    expect(paths).toContain('events.1.timezone');
  });
});
