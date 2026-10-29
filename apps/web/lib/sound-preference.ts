/** Local, non-sensitive mute preference (architecture.md §3.4); default off (§12). */
export const SOUND_STORAGE_KEY = 'undangan.sound';

export function readSoundPreference(): boolean {
  try {
    return window.localStorage.getItem(SOUND_STORAGE_KEY) === 'on';
  } catch {
    // Storage blocked (private mode, disabled cookies): stay muted.
    return false;
  }
}

export function writeSoundPreference(enabled: boolean): void {
  try {
    window.localStorage.setItem(SOUND_STORAGE_KEY, enabled ? 'on' : 'off');
  } catch {
    // Preference is best-effort only.
  }
}
