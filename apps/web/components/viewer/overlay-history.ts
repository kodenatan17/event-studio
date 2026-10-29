/** Key marking the history entries this module pushed. */
const HISTORY_KEY = 'overlay';

/** The part of `window.history` the overlay history needs (mockable in tests). */
export interface HistoryLike {
  readonly state: unknown;
  pushState(data: unknown, unused: string): void;
  back(): void;
}

export interface OverlayHistory {
  /** The active overlay changed: its type when open, `null` when closed. */
  sync(overlayType: string | null): void;
  /** Handles a `popstate`; returns `true` when the browser back must close the overlay. */
  popState(): boolean;
}

function isOverlayEntry(state: unknown): boolean {
  return typeof state === 'object' && state !== null && HISTORY_KEY in state;
}

/**
 * Browser back closes the active overlay first (architecture.md §3.4, D-014): opening pushes
 * one same-URL entry, `popstate` while open closes, and closing any other way (UI, Escape, a
 * scene switch) pops our entry only if it is still the current one. Scene switches never push.
 */
export function createOverlayHistory(getHistory: () => HistoryLike): OverlayHistory {
  /** Our entry is the current history entry. */
  let pushed = false;
  /** We called `history.back()` and its `popstate` has not arrived yet. */
  let backPending = false;
  /** An overlay opened while `backPending`; push once the back traversal settles. */
  let pushWhenSettled = false;
  let openType: string | null = null;

  const push = (overlayType: string) => {
    getHistory().pushState({ [HISTORY_KEY]: overlayType }, '');
    pushed = true;
  };

  return {
    sync(overlayType) {
      openType = overlayType;
      if (overlayType !== null) {
        if (pushed) return;
        if (backPending) {
          pushWhenSettled = true;
          return;
        }
        push(overlayType);
        return;
      }

      pushWhenSettled = false;
      if (!pushed) return;
      pushed = false;
      const history = getHistory();
      if (isOverlayEntry(history.state)) {
        backPending = true;
        history.back();
      }
    },

    popState() {
      if (backPending) {
        // Our own `history.back()` landed.
        backPending = false;
        if (pushWhenSettled && openType !== null) {
          pushWhenSettled = false;
          push(openType);
        }
        return false;
      }
      if (!pushed) return false;
      pushed = false;
      return true;
    },
  };
}
