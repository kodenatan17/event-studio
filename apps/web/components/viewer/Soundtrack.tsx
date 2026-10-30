'use client';

import { Button } from '@undangan/ui';
import type { WorldStore } from '@undangan/world-engine';
import { useWorldStore } from '@undangan/world-engine';
import { useEffect, useRef, useState } from 'react';
import type { RefObject } from 'react';

import { readSoundPreferenceValue, writeSoundPreference } from '@/lib/sound-preference';
import { createSoundtrackController } from '@/lib/soundtrack';
import type { SoundtrackController, SoundtrackState } from '@/lib/soundtrack';

interface SoundtrackProps {
  url: string;
  store: WorldStore;
  controllerRef: RefObject<SoundtrackController | null>;
}

/** One media element for the whole viewer; no scene-specific mount or per-frame React work. */
export function Soundtrack({ url, store, controllerRef }: SoundtrackProps) {
  const audio = useRef<HTMLAudioElement>(null);
  const [state, setState] = useState<SoundtrackState>('pending');
  const is2D = useWorldStore(store, (world) => world.status === 'FALLBACK_2D');

  useEffect(() => {
    const media = audio.current;
    if (!media) return;
    media.src = url;
    media.volume = 0.45;
    const controller = createSoundtrackController({
      media,
      gestures: document,
      preference: readSoundPreferenceValue(),
      savePreference: writeSoundPreference,
      onState(next) {
        setState(next);
        store.getState().setSound(next === 'playing');
      },
    });
    controllerRef.current = controller;
    return () => {
      controller.dispose();
      controllerRef.current = null;
      store.getState().setSound(false);
      // Cancel download and release the media resource, including StrictMode's rehearsal mount.
      media.removeAttribute('src');
      media.load();
    };
  }, [url, store, controllerRef]);

  return (
    <div data-testid="soundtrack" data-audio-state={state}>
      <audio ref={audio} data-testid="viewer-audio" loop preload="auto" />
      {state === 'blocked' || state === 'error' ? (
        <div className="pointer-events-none absolute inset-x-0 top-1/2 z-10 flex justify-center">
          <Button
            data-sound-control="true"
            className="pointer-events-auto shadow-lg"
            onClick={() => controllerRef.current?.setEnabled(true)}
          >
            {state === 'blocked' ? 'Putar musik' : 'Coba putar musik'}
          </Button>
        </div>
      ) : null}
      {is2D ? (
        <Button
          variant="secondary"
          data-sound-control="true"
          aria-pressed={state === 'playing'}
          className="absolute right-3 bottom-3 z-10 shadow-lg"
          onClick={() => controllerRef.current?.setEnabled(state !== 'playing')}
        >
          Suara
        </Button>
      ) : null}
    </div>
  );
}
