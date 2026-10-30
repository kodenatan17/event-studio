'use client';

import type { WorldStore } from '@undangan/world-engine';
import { useWorldStore } from '@undangan/world-engine';
import { Button, buttonClassName } from '@undangan/ui';
import type { MouseEvent } from 'react';

import { INTERACTIONS_LABEL } from '@/lib/labels';
import { writeSoundPreference } from '@/lib/sound-preference';

interface GlobalNavProps {
  store: WorldStore;
  rsvpEnabled: boolean;
  /** Id of the scene-actions list the mobile "Interaksi" toggle discloses. */
  interactionsId: string;
  interactionsOpen: boolean;
  onToggleInteractions: () => void;
}

/** Pressed toggles (sound, "Interaksi") read as filled. */
const ITEM =
  'flex-1 whitespace-nowrap px-1 text-xs sm:px-2 sm:text-sm ' +
  'aria-pressed:bg-[#7a4a2a] aria-pressed:text-[#fbf7ee] aria-pressed:hover:bg-[#6a3d22] ' +
  'aria-expanded:bg-[#7a4a2a] aria-expanded:text-[#fbf7ee] aria-expanded:hover:bg-[#6a3d22]';

/** Short visible label below sm; the accessible name stays the full label (WCAG 2.5.3). */
function ShortLabel({ short, full }: { short: string; full: string }) {
  return (
    <>
      <span className="sm:hidden">{short}</span>
      <span className="max-sm:hidden">{full}</span>
    </>
  );
}

/**
 * Always-available bottom bar (FR-04 map, FR-05 event info/RSVP from global UI, T-108 manual
 * 2D, T-201 sound). Sound is a stored preference only: no audio asset yet, and playback must
 * still wait for a user gesture (architecture.md §12). On phones, in either orientation, it also
 * holds the "Interaksi" toggle for the scene's hotspot controls.
 */
export function GlobalNav({
  store,
  rsvpEnabled,
  interactionsId,
  interactionsOpen,
  onToggleInteractions,
}: GlobalNavProps) {
  const soundEnabled = useWorldStore(store, (state) => state.soundEnabled);
  const api = () => store.getState();

  // A real link so "Mode 2D" works before hydration or without JS (FR-01 2D link); with JS it
  // switches in place, keeping modified clicks (new tab) to the browser.
  const enter2D = (event: MouseEvent<HTMLAnchorElement>) => {
    if (event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) {
      return;
    }
    event.preventDefault();
    api().enterFallback('manual');
  };

  const toggleSound = () => {
    const next = !soundEnabled;
    api().setSound(next);
    writeSoundPreference(next);
  };

  return (
    <nav
      aria-label="Navigasi undangan"
      className="pointer-events-auto mx-auto flex w-full max-w-xl gap-1 rounded-2xl bg-[#fbf7ee]/95 p-1 shadow-lg"
    >
      <Button
        variant="ghost"
        className={`${ITEM} roomy:hidden`}
        aria-expanded={interactionsOpen}
        aria-controls={interactionsId}
        onClick={onToggleInteractions}
      >
        {INTERACTIONS_LABEL}
      </Button>
      <Button
        variant="ghost"
        className={ITEM}
        onClick={() => api().openOverlay({ type: 'quick_map' })}
      >
        Peta
      </Button>
      <Button
        variant="ghost"
        className={ITEM}
        aria-label="Info Acara"
        onClick={() => api().dispatch({ type: 'open_event_info' })}
      >
        <ShortLabel short="Acara" full="Info Acara" />
      </Button>
      {rsvpEnabled ? (
        <Button
          variant="ghost"
          className={ITEM}
          onClick={() => api().dispatch({ type: 'open_rsvp' })}
        >
          RSVP
        </Button>
      ) : null}
      <a
        href="?mode=2d"
        aria-label="Mode 2D"
        className={buttonClassName('ghost', ITEM)}
        onClick={enter2D}
      >
        <ShortLabel short="2D" full="Mode 2D" />
      </a>
      <Button variant="ghost" className={ITEM} aria-pressed={soundEnabled} onClick={toggleSound}>
        Suara
      </Button>
    </nav>
  );
}
