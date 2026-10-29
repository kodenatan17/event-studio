'use client';

import { useCallback, useState } from 'react';

interface FallbackImageProps {
  src: string;
  alt: string;
  /** Sizing classes shared by the image and its fallback tile. */
  className?: string;
  loading?: 'eager' | 'lazy';
}

/**
 * Image with the designed "Foto belum tersedia" tile for missing or removed media (FR-02);
 * a failed image never breaks the overlay or the scene.
 */
export function FallbackImage({ src, alt, className = '', loading = 'eager' }: FallbackImageProps) {
  const [failedSrc, setFailedSrc] = useState<string | null>(null);

  // Server-rendered images (2D mode) can fail before hydration attaches `onError`.
  const detectEarlyFailure = useCallback(
    (image: HTMLImageElement | null) => {
      if (image?.complete && image.naturalWidth === 0) setFailedSrc(src);
    },
    [src],
  );

  if (failedSrc === src) {
    return (
      <div
        // Decorative images (`alt=""`, labelled by their control) stay hidden from AT.
        {...(alt
          ? { role: 'img', 'aria-label': `${alt} (foto belum tersedia)` }
          : { 'aria-hidden': true })}
        data-testid="photo-fallback"
        className={`flex flex-col items-center justify-center gap-2 bg-gradient-to-br from-[#f1e4d3] to-[#e6c9a8] p-4 text-center text-[#4e2c18] ${className}`}
      >
        <svg aria-hidden="true" viewBox="0 0 24 24" className="h-8 w-8 fill-none stroke-current">
          <rect x="3" y="5" width="18" height="14" rx="2" strokeWidth="1.5" />
          <circle cx="9" cy="10" r="1.75" strokeWidth="1.5" />
          <path d="m4 17 5-5 4 4 3-3 4 4" strokeWidth="1.5" strokeLinejoin="round" />
        </svg>
        <span aria-hidden="true" className="text-sm font-medium">
          Foto belum tersedia
        </span>
      </div>
    );
  }

  return (
    <img
      ref={detectEarlyFailure}
      src={src}
      alt={alt}
      loading={loading}
      decoding="async"
      onError={() => setFailedSrc(src)}
      className={`bg-[#f1e4d3] object-cover ${className}`}
    />
  );
}
