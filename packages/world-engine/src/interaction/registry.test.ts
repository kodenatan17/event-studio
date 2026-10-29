import type { HotspotDefinition } from '@undangan/contracts/world';
import { afterEach, describe, expect, it, vi } from 'vitest';

import {
  pickInteractive,
  portalAction,
  portalNodeName,
  resolveHotspotAction,
  spawnNodeName,
  toUpperSnake,
} from './registry';

const base = { id: 'h', nodeName: 'HS_X' };

describe('interaction registry', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('[§8.3] each action maps', () => {
    const cases: [HotspotDefinition, unknown][] = [
      [{ ...base, action: 'open_welcome' }, { type: 'open_welcome' }],
      [{ ...base, action: 'open_gallery' }, { type: 'open_gallery' }],
      [
        { ...base, action: 'open_gallery', payload: { startIndex: 2 } },
        { type: 'open_gallery', startIndex: 2 },
      ],
      [{ ...base, action: 'open_story' }, { type: 'open_story' }],
      [
        { ...base, action: 'open_story', payload: { chapterId: 'chapter-1' } },
        { type: 'open_story', chapterId: 'chapter-1' },
      ],
      [
        { ...base, action: 'open_event_info', payload: { eventId: 'ceremony-1' } },
        { type: 'open_event_info', eventId: 'ceremony-1' },
      ],
      [{ ...base, action: 'open_rsvp' }, { type: 'open_rsvp' }],
      [{ ...base, action: 'open_guestbook' }, { type: 'open_guestbook' }],
      [{ ...base, action: 'open_photo_booth' }, { type: 'open_photo_booth' }],
    ];
    for (const [hotspot, expected] of cases) {
      expect(resolveHotspotAction(hotspot)).toEqual(expected);
    }

    expect(portalAction({ id: 'front-door', toSceneId: 'living-room' })).toEqual({
      type: 'navigate',
      sceneId: 'living-room',
    });
    expect(
      portalAction({ id: 'front-door', toSceneId: 'living-room', spawnPointId: 'from-entrance' }),
    ).toEqual({ type: 'navigate', sceneId: 'living-room', spawnPointId: 'from-entrance' });
  });

  it('[§8.3] unknown action → null + warn', () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
    const forged = { ...base, action: 'eval_code' } as unknown as HotspotDefinition;

    expect(resolveHotspotAction(forged)).toBeNull();
    expect(warn).toHaveBeenCalledOnce();
  });

  it('[D-003] spawn/portal node names', () => {
    expect(toUpperSnake('from-living')).toBe('FROM_LIVING');
    expect(spawnNodeName('from-living')).toBe('SPAWN_FROM_LIVING');
    expect(spawnNodeName(undefined)).toBe('SPAWN_ENTRY');
    expect(spawnNodeName(null)).toBe('SPAWN_ENTRY');
    expect(portalNodeName('back-to-entrance')).toBe('PORTAL_BACK_TO_ENTRANCE');
  });

  it('[§8.3] overlapping hotspots: nearest wins, ties by id', () => {
    const node = (interactive?: { kind: 'hotspot' | 'portal'; id: string }) => ({
      userData: interactive ? { interactive } : {},
      parent: null,
    });
    const child = { userData: {}, parent: node({ kind: 'portal', id: 'front-door' }) };

    expect(
      pickInteractive([
        { distance: 1, object: node() },
        { distance: 4, object: node({ kind: 'hotspot', id: 'b' }) },
        { distance: 3, object: child },
      ]),
    ).toEqual({ kind: 'portal', id: 'front-door' });
    expect(
      pickInteractive([
        { distance: 2, object: node({ kind: 'hotspot', id: 'photo-frame-02' }) },
        { distance: 2, object: node({ kind: 'hotspot', id: 'photo-frame-01' }) },
      ]),
    ).toEqual({ kind: 'hotspot', id: 'photo-frame-01' });
    expect(pickInteractive([{ distance: 1, object: node() }])).toBeNull();
  });
});
