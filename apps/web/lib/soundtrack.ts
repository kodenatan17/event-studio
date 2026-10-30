/** Playback policy for the demo soundtrack, isolated from React and browser media for tests. */
export type SoundtrackState = 'pending' | 'playing' | 'paused' | 'blocked' | 'error';

export interface SoundtrackMedia extends EventTarget {
  play(): Promise<void>;
  pause(): void;
  readonly paused: boolean;
}

export interface SoundtrackController {
  /** Called directly from the click handler, preserving the browser's user activation. */
  setEnabled(enabled: boolean): void;
  dispose(): void;
}

interface SoundtrackOptions {
  media: SoundtrackMedia;
  gestures: EventTarget;
  /** An absent preference attempts playback; an explicit off suppresses all automatic retries. */
  preference: boolean | null;
  onState: (state: SoundtrackState) => void;
  savePreference: (enabled: boolean) => void;
}

function isPlaybackGesture(event: Event): boolean {
  // A sound button owns its click. Retrying on its preceding pointerdown could start playback
  // before the toggle reads the current state, accidentally turning the music straight off.
  if (
    typeof Element !== 'undefined' &&
    event.target instanceof Element &&
    event.target.closest('[data-sound-control]')
  ) {
    return false;
  }
  if (event.type === 'keydown') {
    const key = event as KeyboardEvent;
    if (key.repeat || key.metaKey || key.ctrlKey || key.altKey) return false;
    if (['Shift', 'Control', 'Alt', 'Meta', 'Escape'].includes(key.key)) return false;
  }
  return true;
}

/**
 * Attempts audible playback as the viewer loads. Browsers can refuse autoplay; retain the
 * request and retry only on a real interaction, while always honoring an explicit mute choice.
 * This controller belongs to the viewer, so scene transitions never restart the track.
 */
export function createSoundtrackController({
  media,
  gestures,
  preference,
  onState,
  savePreference,
}: SoundtrackOptions): SoundtrackController {
  let desired = preference !== false;
  let disposed = false;
  let attempt = 0;
  let inFlight = false;
  let retryOnGesture = false;

  const report = (state: SoundtrackState) => {
    if (!disposed) onState(state);
  };
  const play = () => {
    if (disposed || !desired || inFlight) return;
    const id = ++attempt;
    inFlight = true;
    report('pending');
    // Calling play synchronously is essential when this path comes from a user gesture.
    let promise: Promise<void>;
    try {
      promise = media.play();
    } catch (error) {
      promise = Promise.reject(error);
    }
    void promise.then(
      () => {
        if (disposed || !desired) {
          media.pause();
          return;
        }
        if (id !== attempt) return;
        inFlight = false;
        retryOnGesture = false;
        report(media.paused ? 'paused' : 'playing');
      },
      (error: unknown) => {
        if (disposed || !desired || id !== attempt) return;
        inFlight = false;
        const blocked =
          typeof error === 'object' && error !== null && 'name' in error &&
          error.name === 'NotAllowedError';
        retryOnGesture = blocked;
        report(blocked ? 'blocked' : 'error');
      },
    );
  };
  const onGesture = (event: Event) => {
    if (retryOnGesture && desired && isPlaybackGesture(event)) play();
  };
  const onPlaying = () => {
    if (!desired || disposed) {
      media.pause();
      return;
    }
    retryOnGesture = false;
    report('playing');
  };
  const onPause = () => report('paused');
  const onError = () => {
    inFlight = false;
    retryOnGesture = false;
    report('error');
  };
  gestures.addEventListener('pointerdown', onGesture, true);
  gestures.addEventListener('keydown', onGesture, true);
  media.addEventListener('playing', onPlaying);
  media.addEventListener('pause', onPause);
  media.addEventListener('error', onError);
  if (desired) play();
  else report('paused');

  return {
    setEnabled(enabled) {
      if (disposed) return;
      desired = enabled;
      savePreference(enabled);
      if (enabled) {
        play();
      } else {
        attempt += 1;
        inFlight = false;
        retryOnGesture = false;
        media.pause();
        report('paused');
      }
    },
    dispose() {
      if (disposed) return;
      disposed = true;
      desired = false;
      attempt += 1;
      gestures.removeEventListener('pointerdown', onGesture, true);
      gestures.removeEventListener('keydown', onGesture, true);
      media.removeEventListener('playing', onPlaying);
      media.removeEventListener('pause', onPause);
      media.removeEventListener('error', onError);
      media.pause();
    },
  };
}
