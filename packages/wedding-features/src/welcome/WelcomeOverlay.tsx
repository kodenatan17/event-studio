'use client';

import { Button, Dialog } from '@undangan/ui';
import type { RefObject } from 'react';

import type { WeddingContent } from '../types';

/** Short welcome derived from the published names only (FR-01); no hardcoded couple content. */
export function welcomeText(wedding: WeddingContent['wedding']): string {
  const { groom, bride } = wedding.couple;
  return `Selamat datang di undangan pernikahan ${groom} & ${bride}. Jelajahi setiap ruangan untuk membaca kisah, melihat galeri foto dan informasi acara.`;
}

interface WelcomeOverlayProps {
  wedding: WeddingContent['wedding'];
  onClose: () => void;
  fallbackFocus?: RefObject<HTMLElement | null>;
}

export function WelcomeOverlay({ wedding, onClose, fallbackFocus }: WelcomeOverlayProps) {
  return (
    <Dialog
      title="Sambutan"
      onClose={onClose}
      fallbackFocus={fallbackFocus}
      data-testid="overlay-panel"
      data-overlay-type="open_welcome"
      footer={
        <div className="flex justify-end">
          <Button onClick={onClose}>Mulai</Button>
        </div>
      }
    >
      <div className="flex flex-col items-center gap-3 text-center">
        <p className="text-xs tracking-widest text-[#6a3d22] uppercase">Undangan Pernikahan</p>
        <p className="font-serif text-3xl">
          {wedding.couple.groom} &amp; {wedding.couple.bride}
        </p>
        {wedding.title !== `${wedding.couple.groom} & ${wedding.couple.bride}` ? (
          <p className="text-lg">{wedding.title}</p>
        ) : null}
        <p className="max-w-prose">{welcomeText(wedding)}</p>
      </div>
    </Dialog>
  );
}
