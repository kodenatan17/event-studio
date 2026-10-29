'use client';

import { Dialog } from '@undangan/ui';
import type { RefObject } from 'react';

import type { WeddingContent } from '../types';

export type ShellKind = 'rsvp' | 'guestbook' | 'photo_booth';

const TITLES: Readonly<Record<ShellKind, string>> = {
  rsvp: 'RSVP',
  guestbook: 'Buku Tamu',
  photo_booth: 'Photo Booth',
};

/** Whether the couple turned the feature on (manifest `features.*Enabled`). */
export function isShellEnabled(kind: ShellKind, features: WeddingContent['features']): boolean {
  switch (kind) {
    case 'rsvp':
      return features.rsvpEnabled;
    case 'guestbook':
      return features.guestbookEnabled;
    case 'photo_booth':
      return features.photoBoothEnabled;
  }
}

/**
 * View-only shells until guest sessions exist (T-303..T-305, T-403): anonymous visitors get a
 * clear invitation-only message instead of a broken form (FR-05, FR-09); the booth never uses
 * the camera (FR-06). No form and no fake submit.
 */
export function ShellContent({ kind }: { kind: ShellKind }) {
  switch (kind) {
    case 'rsvp':
      return (
        <div className="flex flex-col gap-2" data-shell-kind="rsvp">
          <p className="font-serif text-xl">Khusus tamu undangan</p>
          <p>
            Konfirmasi kehadiran (RSVP) hanya dapat diisi melalui tautan undangan pribadi yang
            dikirimkan oleh mempelai kepada Anda.
          </p>
          <p className="text-sm text-[#4e2c18]">
            Jika Anda menerima tautan pribadi, buka undangan melalui tautan tersebut untuk mengisi
            RSVP.
          </p>
        </div>
      );
    case 'guestbook':
      return (
        <div className="flex flex-col gap-2" data-shell-kind="guestbook">
          <p className="font-serif text-xl">Khusus tamu undangan</p>
          <p>Ucapan dan doa untuk mempelai hanya dapat dikirim melalui tautan undangan pribadi.</p>
          <p className="text-sm text-[#4e2c18]">
            Ucapan akan tampil setelah disetujui oleh mempelai.
          </p>
        </div>
      );
    case 'photo_booth':
      return (
        <div className="flex flex-col gap-2" data-shell-kind="photo_booth">
          <p className="font-serif text-xl">Segera hadir</p>
          <p>Photo booth virtual bersama avatar mempelai sedang disiapkan.</p>
          <p className="text-sm text-[#4e2c18]">
            Photo booth tidak akan pernah menggunakan kamera perangkat Anda.
          </p>
        </div>
      );
  }
}

interface ShellOverlayProps {
  kind: ShellKind;
  features: WeddingContent['features'];
  onClose: () => void;
  fallbackFocus?: RefObject<HTMLElement | null>;
}

export function ShellOverlay({ kind, features, onClose, fallbackFocus }: ShellOverlayProps) {
  return (
    <Dialog
      title={TITLES[kind]}
      onClose={onClose}
      fallbackFocus={fallbackFocus}
      data-testid="overlay-panel"
      data-overlay-type={`open_${kind}`}
    >
      {isShellEnabled(kind, features) ? (
        <ShellContent kind={kind} />
      ) : (
        <p>Fitur ini tidak diaktifkan untuk undangan ini.</p>
      )}
    </Dialog>
  );
}
