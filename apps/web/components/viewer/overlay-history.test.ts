import { describe, expect, it, vi } from 'vitest';

import { createOverlayHistory } from './overlay-history';

/**
 * Same-document history: `pushState` is synchronous, `back()` traverses later (like browsers),
 * and every traversal fires `popstate` on `window`.
 */
function fakeBrowser() {
  const entries: unknown[] = [null];
  let index = 0;
  let queuedBacks = 0;
  const window = new EventTarget();
  const history = {
    get state() {
      return entries[index];
    },
    pushState: vi.fn((data: unknown) => {
      entries.splice(index + 1, entries.length, data);
      index = entries.length - 1;
    }),
    back: vi.fn(() => {
      queuedBacks += 1;
    }),
  };
  const traverseBack = () => {
    index = Math.max(0, index - 1);
    window.dispatchEvent(new Event('popstate'));
  };
  return {
    window,
    history,
    /** Lets queued `history.back()` calls land. */
    settle() {
      while (queuedBacks > 0) {
        queuedBacks -= 1;
        traverseBack();
      }
    },
    /** The guest presses the browser/Android back button. */
    pressBack: traverseBack,
    get length() {
      return entries.length;
    },
    get index() {
      return index;
    },
  };
}

/** Wires the controller like `useOverlayHistory`: `popstate` → maybe `onBack`. */
function setup() {
  const browser = fakeBrowser();
  const onBack = vi.fn();
  const overlayHistory = createOverlayHistory(() => browser.history);
  browser.window.addEventListener('popstate', () => {
    if (overlayHistory.popState()) onBack();
  });
  return { browser, onBack, overlayHistory };
}

describe('createOverlayHistory', () => {
  it('[FR-04] browser back closes the open overlay', () => {
    const { browser, onBack, overlayHistory } = setup();
    overlayHistory.sync('open_story');
    expect(browser.history.pushState).toHaveBeenCalledOnce();
    expect(browser.history.state).toEqual({ overlay: 'open_story' });

    browser.pressBack();
    expect(onBack).toHaveBeenCalledOnce();
    // The store closes the overlay; the entry is already gone, so no extra back.
    overlayHistory.sync(null);
    expect(browser.history.back).not.toHaveBeenCalled();
    expect(browser.index).toBe(0);
  });

  it('[FR-04] reopen during a pending back pushes once after it settles', () => {
    const { browser, onBack, overlayHistory } = setup();
    overlayHistory.sync('open_story');
    overlayHistory.sync(null);
    expect(browser.history.back).toHaveBeenCalledOnce();

    // Reopened before our back() landed: pushing now would be undone by the traversal.
    overlayHistory.sync('open_gallery');
    expect(browser.history.pushState).toHaveBeenCalledOnce();

    browser.settle();
    expect(onBack).not.toHaveBeenCalled();
    expect(browser.history.pushState).toHaveBeenCalledTimes(2);
    expect(browser.history.state).toEqual({ overlay: 'open_gallery' });
    expect(browser.index).toBe(1);

    // The reopened overlay still closes on back.
    browser.pressBack();
    expect(onBack).toHaveBeenCalledOnce();
  });

  it('[FR-04] reopen and close again during a pending back pushes nothing', () => {
    const { browser, onBack, overlayHistory } = setup();
    overlayHistory.sync('open_story');
    overlayHistory.sync(null);
    overlayHistory.sync('open_gallery');
    overlayHistory.sync(null);

    browser.settle();
    expect(onBack).not.toHaveBeenCalled();
    expect(browser.history.pushState).toHaveBeenCalledOnce();
    expect(browser.history.back).toHaveBeenCalledOnce();
    expect(browser.index).toBe(0);
  });

  it('[FR-04] double close pops our entry once', () => {
    const { browser, onBack, overlayHistory } = setup();
    overlayHistory.sync('open_rsvp');
    overlayHistory.sync(null);
    overlayHistory.sync(null);
    browser.settle();
    overlayHistory.sync(null);

    expect(browser.history.back).toHaveBeenCalledOnce();
    expect(onBack).not.toHaveBeenCalled();
    expect(browser.index).toBe(0);
    expect(browser.length).toBe(2);
  });

  it('[FR-04] back press while a scene switch is pending', () => {
    const { browser, onBack, overlayHistory } = setup();
    // Quick map navigates: the store closes the map, the scene switch pushes nothing.
    overlayHistory.sync('quick_map');
    overlayHistory.sync(null);
    expect(browser.history.back).toHaveBeenCalledOnce();

    // The guest presses back before our own back() landed: neither traversal closes or pushes.
    browser.pressBack();
    browser.settle();
    expect(onBack).not.toHaveBeenCalled();
    expect(browser.history.pushState).toHaveBeenCalledOnce();
    expect(browser.index).toBe(0);

    // No overlay open during a switch: back is left to the browser, never trapped.
    const fresh = setup();
    fresh.browser.pressBack();
    expect(fresh.onBack).not.toHaveBeenCalled();
    expect(fresh.browser.history.pushState).not.toHaveBeenCalled();
    expect(fresh.browser.history.back).not.toHaveBeenCalled();
  });

  it('[FR-04] closing after the entry is no longer current does not go back', () => {
    const { browser, overlayHistory } = setup();
    overlayHistory.sync('open_story');
    // Something else replaced the current entry (e.g. a router update).
    browser.history.pushState({ other: true });
    overlayHistory.sync(null);
    expect(browser.history.back).not.toHaveBeenCalled();
  });
});
