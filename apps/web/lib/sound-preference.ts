/** Local, non-sensitive mute preference (architecture.md §3.4). */
export const SOUND_STORAGE_KEY = 'undangan.sound';

/** `null` means the guest has not chosen yet; an explicit off must survive reloads. */
export function readSoundPreferenceValue(): boolean | null {
  try {
    const value = window.localStorage.getItem(SOUND_STORAGE_KEY);
    return value === 'on' ? true : value === 'off' ? false : null;
  } catch {
    return null;
  }
}

export function readSoundPreference(): boolean {
  return readSoundPreferenceValue() === true;
}

export function writeSoundPreference(enabled: boolean): void {
  try {
    window.localStorage.setItem(SOUND_STORAGE_KEY, enabled ? 'on' : 'off');
  } catch {
    // Preference is best-effort only.
  }
}
