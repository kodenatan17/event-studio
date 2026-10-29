import type { HotspotDefinition, PortalDefinition, WorldAction } from '@undangan/contracts/world';

import { devWarn } from '../dev';

/**
 * Maps a validated manifest hotspot to its typed `WorldAction` (architecture.md §8.3).
 * Unknown actions fail safely: developer warning, no action.
 */
export function resolveHotspotAction(hotspot: HotspotDefinition): WorldAction | null {
  switch (hotspot.action) {
    case 'open_welcome':
      return { type: 'open_welcome' };
    case 'open_gallery':
      return hotspot.payload
        ? { type: 'open_gallery', startIndex: hotspot.payload.startIndex }
        : { type: 'open_gallery' };
    case 'open_story':
      return hotspot.payload
        ? { type: 'open_story', chapterId: hotspot.payload.chapterId }
        : { type: 'open_story' };
    case 'open_event_info':
      return hotspot.payload
        ? { type: 'open_event_info', eventId: hotspot.payload.eventId }
        : { type: 'open_event_info' };
    case 'open_rsvp':
      return { type: 'open_rsvp' };
    case 'open_guestbook':
      return { type: 'open_guestbook' };
    case 'open_photo_booth':
      return { type: 'open_photo_booth' };
    default: {
      const unknown: never = hotspot;
      devWarn('Unknown hotspot action', (unknown as { action?: unknown }).action);
      return null;
    }
  }
}

/** Portals always navigate; the spawn point is optional (D-003 fallback to SPAWN_ENTRY). */
export function portalAction(portal: PortalDefinition): WorldAction {
  return portal.spawnPointId
    ? { type: 'navigate', sceneId: portal.toSceneId, spawnPointId: portal.spawnPointId }
    : { type: 'navigate', sceneId: portal.toSceneId };
}

/** `from-living` → `FROM_LIVING`. */
export function toUpperSnake(id: string): string {
  return id
    .replace(/[^A-Za-z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '')
    .toUpperCase();
}

/** D-003: `SPAWN_<UPPER_SNAKE(id)>`, or `SPAWN_ENTRY` without a spawn point. */
export function spawnNodeName(spawnPointId?: string | null): string {
  return spawnPointId ? `SPAWN_${toUpperSnake(spawnPointId)}` : 'SPAWN_ENTRY';
}

/** D-003: `PORTAL_<UPPER_SNAKE(id)>`. */
export function portalNodeName(portalId: string): string {
  return `PORTAL_${toUpperSnake(portalId)}`;
}

/** Tag stored in `userData.interactive` on raycastable hotspot/portal meshes. */
export interface InteractiveTag {
  kind: 'hotspot' | 'portal';
  id: string;
}

interface IntersectionLike {
  distance: number;
  object: { userData: Record<string, unknown>; parent: IntersectionLike['object'] | null };
}

function findTag(object: IntersectionLike['object'] | null): InteractiveTag | null {
  for (let node = object; node; node = node.parent) {
    const tag = node.userData.interactive as InteractiveTag | undefined;
    if (tag && (tag.kind === 'hotspot' || tag.kind === 'portal')) return tag;
  }
  return null;
}

/**
 * Resolves overlapping interactables consistently (architecture.md §8.3):
 * nearest tagged hit wins; equal distances fall back to the lower id.
 */
export function pickInteractive(intersections: readonly IntersectionLike[]): InteractiveTag | null {
  let best: { tag: InteractiveTag; distance: number } | null = null;
  for (const hit of intersections) {
    const tag = findTag(hit.object);
    if (!tag) continue;
    if (
      !best ||
      hit.distance < best.distance ||
      (hit.distance === best.distance && tag.id < best.tag.id)
    ) {
      best = { tag, distance: hit.distance };
    }
  }
  return best?.tag ?? null;
}
