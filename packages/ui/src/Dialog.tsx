'use client';

import { useEffect, useEffectEvent, useId, useLayoutEffect, useRef, useState } from 'react';
import type { KeyboardEvent, ReactNode, RefObject } from 'react';

import { Button } from './Button';
import { openModalDialog } from './dialogLifecycle';

export interface DialogProps {
  title: ReactNode;
  /** Close button, Escape (`cancel`) and native close all end up here, at most once per opening. */
  onClose: () => void;
  children: ReactNode;
  /** Focus target on close when the element focused before opening no longer exists. */
  fallbackFocus?: RefObject<HTMLElement | null>;
  footer?: ReactNode;
  onKeyDown?: (event: KeyboardEvent<HTMLDialogElement>) => void;
  size?: 'md' | 'lg';
  /** Pass-through `data-*` attributes (test ids, overlay type). */
  [dataAttribute: `data-${string}`]: string | undefined;
}

const SIZES = { md: 'max-w-lg', lg: 'max-w-2xl' } as const;

/**
 * `body` means no real opener (3D canvas tap, or Safari/iOS where clicked buttons don't take
 * focus); treat it as missing so `fallbackFocus` receives focus on close.
 */
function currentFocus(): HTMLElement | null {
  if (typeof document === 'undefined') return null;
  const active = document.activeElement;
  return active instanceof HTMLElement && active !== document.body ? active : null;
}

/**
 * Modal dialog on native `<dialog>` + `showModal()` (architecture.md §3.4, §12): the browser
 * keeps focus inside and makes the page inert; the dialog is open while it is mounted.
 */
export function Dialog({
  title,
  onClose,
  children,
  fallbackFocus,
  footer,
  onKeyDown,
  size = 'md',
  ...dataAttributes
}: DialogProps) {
  const ref = useRef<HTMLDialogElement>(null);
  const closedRef = useRef(false);
  const titleId = useId();
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

  return (
    <dialog
      ref={ref}
      aria-labelledby={titleId}
      aria-modal="true"
      onKeyDown={onKeyDown}
      className={`m-auto max-h-[calc(100dvh_-_1.5rem_-_env(safe-area-inset-top)_-_env(safe-area-inset-bottom))] w-[calc(100%_-_1.5rem)] ${SIZES[size]} flex-col overflow-hidden rounded-2xl border-0 bg-[#fbf7ee] p-0 text-[#2b2118] shadow-2xl transition-opacity duration-200 backdrop:bg-[#2b2118]/55 open:flex motion-reduce:transition-none starting:open:opacity-0`}
      {...dataAttributes}
    >
      <header className="flex items-center justify-between gap-3 border-b border-[#e6d6c3] py-2 pr-2 pl-[max(1.25rem,env(safe-area-inset-left))]">
        <h2 id={titleId} className="font-serif text-xl leading-tight">
          {title}
        </h2>
        <Button variant="ghost" onClick={close}>
          Tutup
        </Button>
      </header>
      <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-[max(1.25rem,env(safe-area-inset-left))] py-4">
        {children}
      </div>
      {footer ? (
        <footer className="border-t border-[#e6d6c3] px-[max(1.25rem,env(safe-area-inset-left))] pt-3 pb-[calc(0.75rem_+_env(safe-area-inset-bottom))]">
          {footer}
        </footer>
      ) : null}
    </dialog>
  );
}
