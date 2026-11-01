/** Local, non-sensitive camera zoom preference (architecture.md §3.4, D-033). */
export const CAMERA_ZOOM_STORAGE_KEY = 'undangan.camera-zoom';

/** `1` (the authored framing) when nothing usable was saved; the store clamps the range. */
export function readCameraZoomPreference(): number {
  try {
    const value = Number(window.localStorage.getItem(CAMERA_ZOOM_STORAGE_KEY));
    return Number.isFinite(value) && value > 0 ? value : 1;
  } catch {
    return 1;
  }
}

export function writeCameraZoomPreference(zoom: number): void {
  try {
    window.localStorage.setItem(CAMERA_ZOOM_STORAGE_KEY, String(zoom));
  } catch {
    // Preference is best-effort only.
  }
}
