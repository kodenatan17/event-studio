'use client';

import type { WorldStore } from '@undangan/world-engine';
import { queueAction, useWorldStore } from '@undangan/world-engine';

import { avatarActionLabel, interactLabel, KEYBOARD_HINTS } from '@/lib/labels';

const KEY =
  'rounded border border-[#fbf7ee]/40 bg-[#fbf7ee]/15 px-1 font-sans text-[0.7rem] leading-4';

/**
 * Desktop (`pointer: fine`) key hint above the bottom controls, plus a prompt ("Buka …", or the
 * portal's own label) while something is in reach; it queues the same interact action as E
 * (FR-04, §3.4). The prompt stays mounted, hidden and out of the tab order, with nothing in reach:
 * an overlay clears `nearby` until the frame after it closes, and focus must return here (§3.4).
 */
export function KeyboardHint({ store }: { store: WorldStore }) {
  const nearby = useWorldStore(store, (state) => state.nearby);

  return (
    <div className="pointer-events-none absolute inset-x-3 bottom-full mb-2 hidden flex-col items-center gap-2 pointer-fine:flex">
      <button
        type="button"
        aria-disabled={nearby ? undefined : 'true'}
        tabIndex={nearby ? undefined : -1}
        className="pointer-events-auto inline-flex min-h-11 items-center gap-2 rounded-full bg-[#7a4a2a] px-4 py-2 text-sm font-medium text-[#fbf7ee] shadow-lg transition hover:bg-[#6a3d22] active:scale-[.97] motion-reduce:transition-none motion-reduce:active:scale-100 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#4e2c18] aria-disabled:pointer-events-none aria-disabled:opacity-50 aria-disabled:not-focus-visible:opacity-0"
        onClick={() => {
          if (store.getState().nearby) queueAction(store.getState().input, 'interact');
        }}
      >
        <kbd aria-hidden="true" className={KEY}>
          E
        </kbd>
        {nearby ? interactLabel(nearby) : avatarActionLabel('interact')}
      </button>
      <p className="flex flex-wrap items-center justify-center gap-x-3 gap-y-1 rounded-full bg-[#2b2118]/80 px-4 py-1.5 text-xs text-[#fbf7ee]">
        {KEYBOARD_HINTS.map((hint) => (
          <span key={hint.label} className="inline-flex items-center gap-1">
            {hint.keys.map((key) => (
              <kbd key={key} className={KEY}>
                {key}
              </kbd>
            ))}
            {hint.or ? <span className="opacity-80">/ {hint.or}</span> : null}
            <span>{hint.label}</span>
          </span>
        ))}
      </p>
    </div>
  );
}
