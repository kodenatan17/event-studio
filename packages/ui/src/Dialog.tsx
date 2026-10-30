'use client';

import { useId } from 'react';
import type { KeyboardEvent, ReactNode, RefObject } from 'react';

import { Button } from './Button';
import { useModalDialog } from './useModalDialog';

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

/** Centred modal on the shared native `<dialog>` lifecycle (`useModalDialog`). */
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
  const { ref, close } = useModalDialog({ onClose, fallbackFocus });
  const titleId = useId();

  return (
    <dialog
      ref={ref}
      aria-labelledby={titleId}
      aria-modal="true"
      onKeyDown={onKeyDown}
      // Enter animation only (fade, rise, settle; backdrop fades in); exits are instant because
      // the dialog unmounts on close. Reduced motion skips both transitions.
      className={`m-auto max-h-[calc(100dvh_-_1.5rem_-_env(safe-area-inset-top)_-_env(safe-area-inset-bottom))] w-[calc(100%_-_1.5rem)] ${SIZES[size]} flex-col overflow-hidden rounded-2xl border-0 bg-[#fbf7ee] p-0 text-[#2b2118] shadow-2xl transition-[opacity,translate,scale] duration-200 ease-out backdrop:bg-[#2b2118]/55 backdrop:transition-opacity backdrop:duration-200 open:flex motion-reduce:transition-none motion-reduce:backdrop:transition-none starting:open:translate-y-3 starting:open:scale-[.98] starting:open:opacity-0 starting:open:backdrop:opacity-0`}
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
