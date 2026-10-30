'use client';

import type { ReactNode, Ref, RefObject } from 'react';

import { useModalDialog } from './useModalDialog';

export interface SheetProps {
  /** Accessible name of the dialog. */
  label: string;
  onClose: () => void;
  /** Focus target on close when the element focused before opening no longer exists. */
  fallbackFocus?: RefObject<HTMLElement | null>;
  /** The transparent area beside the panel; the world stays visible through it. */
  surface?: ReactNode;
  /** The panel itself, e.g. to measure how much of the viewport it takes. */
  panelRef?: Ref<HTMLElement>;
  children: ReactNode;
  /** Pass-through `data-*` attributes (test ids, overlay type). */
  [dataAttribute: `data-${string}`]: unknown;
}

/**
 * Modal panel over the live 3D world: a bottom sheet on phones (≤ 55 dvh), a 360 px side panel
 * from sm. It is a full-viewport transparent `<dialog>` with a transparent backdrop, because
 * `Dialog`'s centred dimmed box would hide what the panel edits.
 */
export function Sheet({
  label,
  onClose,
  fallbackFocus,
  surface,
  panelRef,
  children,
  ...dataAttributes
}: SheetProps) {
  const { ref } = useModalDialog({ onClose, fallbackFocus });

  return (
    <dialog
      ref={ref}
      aria-label={label}
      aria-modal="true"
      className="m-0 h-dvh max-h-none w-screen max-w-none flex-col overflow-hidden border-0 bg-transparent p-0 text-[#2b2118] backdrop:bg-transparent open:flex sm:flex-row"
      {...dataAttributes}
    >
      <div className="relative min-h-0 min-w-0 flex-1">{surface}</div>
      <section
        ref={panelRef}
        className="flex max-h-[55dvh] min-h-0 shrink-0 flex-col rounded-t-2xl bg-[#fbf7ee] pb-[env(safe-area-inset-bottom)] shadow-2xl transition-transform duration-[260ms] ease-out motion-reduce:transition-none starting:translate-y-full sm:h-full sm:max-h-none sm:w-[360px] sm:rounded-t-none sm:rounded-l-2xl sm:pr-[env(safe-area-inset-right)] sm:pb-0 sm:starting:translate-x-full sm:starting:translate-y-0"
      >
        {children}
      </section>
    </dialog>
  );
}
