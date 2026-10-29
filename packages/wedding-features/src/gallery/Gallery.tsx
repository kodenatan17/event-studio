'use client';

import { Button, Dialog } from '@undangan/ui';
import { useRef, useState } from 'react';
import type { KeyboardEvent, PointerEvent, RefObject } from 'react';

import { FallbackImage } from '../shared/FallbackImage';
import { SWIPE_THRESHOLD_PX } from '../storybook/Storybook';
import type { GalleryItem } from '../types';

interface GalleryProps {
  items: readonly GalleryItem[];
  /** Photo the frame hotspot points at (FR-02); out-of-range values clamp. */
  startIndex?: number;
  onClose: () => void;
  fallbackFocus?: RefObject<HTMLElement | null>;
}

/** Lightbox (FR-02): prev/next wrap around, ArrowLeft/ArrowRight, swipe, caption and "n / N". */
export function Gallery({ items, startIndex = 0, onClose, fallbackFocus }: GalleryProps) {
  const total = items.length;
  const [index, setIndex] = useState(() =>
    Math.min(Math.max(0, startIndex), Math.max(0, total - 1)),
  );
  const swipeStart = useRef<number | null>(null);
  const item = items[index];

  const go = (step: number) => {
    if (total > 0) setIndex((current) => (current + step + total) % total);
  };

  const handleKeyDown = (event: KeyboardEvent<HTMLDialogElement>) => {
    if (event.key === 'ArrowRight') {
      event.preventDefault();
      go(1);
    } else if (event.key === 'ArrowLeft') {
      event.preventDefault();
      go(-1);
    }
  };

  const handlePointerDown = (event: PointerEvent<HTMLElement>) => {
    swipeStart.current = event.clientX;
  };
  const handlePointerUp = (event: PointerEvent<HTMLElement>) => {
    if (swipeStart.current === null) return;
    const dx = event.clientX - swipeStart.current;
    swipeStart.current = null;
    if (Math.abs(dx) > SWIPE_THRESHOLD_PX) go(dx < 0 ? 1 : -1);
  };

  return (
    <Dialog
      title="Galeri Foto"
      onClose={onClose}
      fallbackFocus={fallbackFocus}
      onKeyDown={handleKeyDown}
      size="lg"
      data-testid="overlay-panel"
      data-overlay-type="open_gallery"
      footer={
        total > 1 ? (
          <div className="flex items-center justify-between gap-2">
            <Button variant="secondary" onClick={() => go(-1)}>
              Foto sebelumnya
            </Button>
            <p aria-live="polite" data-testid="gallery-progress" className="text-sm tabular-nums">
              {index + 1} / {total}
            </p>
            <Button onClick={() => go(1)}>Foto berikutnya</Button>
          </div>
        ) : null
      }
    >
      {item ? (
        <figure
          className="flex touch-pan-y flex-col gap-3"
          onPointerDown={handlePointerDown}
          onPointerUp={handlePointerUp}
          onPointerCancel={() => {
            swipeStart.current = null;
          }}
        >
          <FallbackImage
            key={item.id}
            src={item.src}
            alt={item.alt}
            className="aspect-[4/3] max-h-[60dvh] w-full rounded-xl"
          />
          {/* No caption: the image alt already describes the photo; don't announce it twice. */}
          {item.caption || total === 1 ? (
            <figcaption className="text-sm text-[#4e2c18]">
              {item.caption}
              {total === 1 ? <span className="sr-only"> (1 / 1)</span> : null}
            </figcaption>
          ) : null}
        </figure>
      ) : (
        <p>Belum ada foto di galeri.</p>
      )}
    </Dialog>
  );
}

/** Photo grid for the 2D invitation; each tile opens the same lightbox action. */
export function GalleryGrid({
  items,
  onOpen,
}: {
  items: readonly GalleryItem[];
  onOpen?: (index: number) => void;
}) {
  if (items.length === 0) return <p>Belum ada foto di galeri.</p>;
  return (
    <ul className="grid grid-cols-2 gap-3 sm:grid-cols-3">
      {items.map((item, index) => (
        <li key={item.id}>
          <figure className="flex flex-col gap-1">
            {onOpen ? (
              <button
                type="button"
                onClick={() => onOpen(index)}
                aria-label={`Buka foto ${index + 1}: ${item.alt}`}
                className="block w-full overflow-hidden rounded-xl focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#4e2c18]"
              >
                <FallbackImage
                  src={item.src}
                  alt=""
                  className="aspect-square w-full"
                  loading="lazy"
                />
              </button>
            ) : (
              <FallbackImage
                src={item.src}
                alt={item.alt}
                className="aspect-square w-full rounded-xl"
                loading="lazy"
              />
            )}
            {item.caption ? <figcaption className="text-sm">{item.caption}</figcaption> : null}
          </figure>
        </li>
      ))}
    </ul>
  );
}
