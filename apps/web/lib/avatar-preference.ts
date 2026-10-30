import { AVATAR_STORAGE_KEY, parseAvatarAppearance } from '@undangan/world-engine';
import type { AvatarAppearance } from '@undangan/world-engine';

/** Local avatar look: catalog ids only, nothing personal (architecture.md §3.4). */
export function readAvatarPreference(): AvatarAppearance | null {
  try {
    const stored = window.localStorage.getItem(AVATAR_STORAGE_KEY);
    return stored === null ? null : parseAvatarAppearance(stored);
  } catch {
    // Storage blocked (private mode, disabled cookies): the default look stays.
    return null;
  }
}

export function writeAvatarPreference(appearance: AvatarAppearance): void {
  try {
    window.localStorage.setItem(AVATAR_STORAGE_KEY, JSON.stringify(appearance));
  } catch {
    // Preference is best-effort only.
  }
}
