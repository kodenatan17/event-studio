'use client';

import { useEffect, useEffectEvent, useLayoutEffect, useRef, useState } from 'react';
import type { RefObject } from 'react';

import { openModalDialog } from './dialogLifecycle';

/**
 * `body` means no real opener (3D canvas tap, or Safari/iOS where clicked buttons don't take
 * focus); treat it as missing so `fallbackFocus` receives focus on close.
 */
function currentFocus(): HTMLElement | null {
  if (typeof document === 'undefined') return null;
  const active = document.activeElement;
  return active instanceof HTMLElement && active !== document.body ? active : null;
}

export interface ModalDialogOptions {
  /** Close button, Escape (`cancel`) and native close all end up here, at most once per opening. */
  onClose: () => void;
  /** Focus target on close when the element focused before opening no longer exists. */
  fallbackFocus?: RefObject<HTMLElement | null>;
}

/**
 * Native `<dialog>` + `showModal()` lifecycle shared by `Dialog` and `Sheet` (architecture.md
 * §3.4, §12): the browser keeps focus inside and makes the page inert; the dialog is open while
 * it is mounted, and focus returns to the opener when it goes (D-026).
 */
export function useModalDialog({ onClose, fallbackFocus }: ModalDialogOptions) {
  const ref = useRef<HTMLDialogElement>(null);
  const closedRef = useRef(false);
  // Captured while rendering, before the rest of the page turns inert and loses focus.
  const [opener] = useState(currentFocus);

  const close = () => {
    if (closedRef.current) return;
    closedRef.current = true;
    onClose();
  };
  const requestClose = useEffectEvent(close);

  useLayoutEffect(() => {
    const dialog = ref.current;
    if (!dialog) return;
    closedRef.current = false;
    return openModalDialog(dialog, () => requestClose());
  }, []);

  // Passive cleanup runs after the commit that removes the dialog and the page's `inert`.
  useEffect(
    () => () => {
      const target = opener?.isConnected ? opener : fallbackFocus?.current;
      target?.focus({ preventScroll: true });
    },
    [opener, fallbackFocus],
  );

  return { ref, close };
}
