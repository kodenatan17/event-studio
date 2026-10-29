'use client';

import type { OverlayAction } from '@undangan/contracts/world';
import { Button } from '@undangan/ui';
import {
  EventList,
  GalleryGrid,
  isShellEnabled,
  ShellContent,
  StoryContent,
  welcomeText,
} from '@undangan/wedding-features';
import type { WeddingContent } from '@undangan/wedding-features';
import type { FallbackReason } from '@undangan/world-engine';
import type { ReactNode } from 'react';

interface Fallback2DProps {
  content: WeddingContent;
  reason: FallbackReason | null;
  /** Same actions as in 3D (e.g. a gallery tile opens the lightbox). */
  onAction: (action: OverlayAction) => void;
  onExit: () => void;
  /** Rendered above the names (e.g. the dev-fixture banner). */
  banner?: ReactNode;
}

function reasonText(reason: FallbackReason | null): string {
  switch (reason) {
    case 'manual':
      return 'Anda sedang melihat undangan dalam mode 2D.';
    case 'webgl_unsupported':
      return 'Perangkat atau peramban ini tidak mendukung tampilan 3D, jadi undangan ditampilkan dalam mode 2D.';
    default:
      return 'Tampilan 3D berhenti bekerja, jadi undangan ditampilkan dalam mode 2D.';
  }
}

function Section({ id, title, children }: { id: string; title: string; children: ReactNode }) {
  return (
    <section aria-labelledby={id} className="flex flex-col gap-4">
      <h2 id={id} className="font-serif text-2xl text-[#4e2c18]">
        {title}
      </h2>
      {children}
    </section>
  );
}

/**
 * 2D invitation (architecture.md §12 minimum, FR-01): names, welcome, events, every story
 * chapter, gallery, RSVP/guestbook shells and the booth notice. Never a blank page.
 * "Kembali ke 3D" only after a manual switch; on WebGL-less devices the reason is replaced by
 * `webgl_unsupported` on mount, which hides it.
 */
export function Fallback2D({ content, reason, onAction, onExit, banner }: Fallback2DProps) {
  const { wedding, features } = content;

  return (
    <div data-testid="fallback-2d" className="h-full overflow-y-auto bg-[#f7f1ea]">
      {banner}
      <div className="mx-auto flex max-w-2xl flex-col gap-10 px-[max(1.25rem,env(safe-area-inset-left))] pt-[calc(2rem_+_env(safe-area-inset-top))] pb-[calc(2.5rem_+_env(safe-area-inset-bottom))]">
        <header className="flex flex-col items-center gap-3 text-center">
          <p className="text-xs tracking-widest text-[#6a3d22] uppercase">Undangan Pernikahan</p>
          <h1 className="font-serif text-4xl">
            {wedding.couple.groom} &amp; {wedding.couple.bride}
          </h1>
          <p className="max-w-prose">{welcomeText(wedding)}</p>
          <p role="status" className="text-sm text-[#4e2c18]">
            {reasonText(reason)}
          </p>
          {reason === 'manual' ? <Button onClick={onExit}>Kembali ke 3D</Button> : null}
        </header>

        <Section id="fallback-events" title="Info Acara">
          <EventList events={content.events} />
        </Section>

        <Section id="fallback-story" title="Kisah Kami">
          <StoryContent chapters={content.story} />
        </Section>

        <Section id="fallback-gallery" title="Galeri Foto">
          <GalleryGrid
            items={content.gallery}
            onOpen={(index) => onAction({ type: 'open_gallery', startIndex: index })}
          />
        </Section>

        {isShellEnabled('rsvp', features) ? (
          <Section id="fallback-rsvp" title="RSVP">
            <ShellContent kind="rsvp" />
          </Section>
        ) : null}

        {isShellEnabled('guestbook', features) ? (
          <Section id="fallback-guestbook" title="Buku Tamu">
            <ShellContent kind="guestbook" />
          </Section>
        ) : null}

        {isShellEnabled('photo_booth', features) ? (
          <Section id="fallback-photo-booth" title="Photo Booth">
            <p>Photo booth tidak didukung di mode 2D.</p>
          </Section>
        ) : null}
      </div>
    </div>
  );
}
