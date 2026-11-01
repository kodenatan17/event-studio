import type { ComponentProps, ReactNode } from 'react';

const BASE = '/templates/joglo/1.0.0/invitation';

/** Output sizes of `pnpm assets:invitation`; they reserve the space before an image arrives. */
const SIZES = {
  'door-left': [453, 1663],
  'door-right': [411, 1656],
  landscape: [860, 1528],
  'frame-carved': [860, 1591],
  garland: [860, 1260],
  orchid: [860, 1312],
  florals: [860, 898],
  'frame-oval': [860, 1160],
  wreath: [860, 567],
} as const;

interface ArtProps extends Omit<ComponentProps<'img'>, 'src' | 'alt' | 'width' | 'height'> {
  name: keyof typeof SIZES;
}

/** Decorative template art: lazy unless a caller needs it for the first view (D-036). */
export function Art({ name, loading = 'lazy', ...rest }: ArtProps) {
  const [width, height] = SIZES[name];
  return (
    // Already sized and compressed by `pnpm assets:invitation`.
    // eslint-disable-next-line @next/next/no-img-element
    <img
      {...rest}
      src={`${BASE}/${name}.webp`}
      alt=""
      aria-hidden="true"
      width={width}
      height={height}
      loading={loading}
      decoding="async"
    />
  );
}

/** Two interlocked initials, in place of the sample monogram baked into the reference art. */
export function Monogram({ letters }: { letters: readonly [string, string] }) {
  return (
    <span aria-hidden="true" className="inv-monogram">
      <span>{letters[0]}</span>
      <span>{letters[1]}</span>
    </span>
  );
}

interface RoomProps {
  children: ReactNode;
  loading?: 'eager' | 'lazy';
  /** Slides reveal the flowers on scroll; the opening cover animates them itself. */
  reveal?: boolean;
}

/** The carved doorway dressed with flowers: opens the invitation and closes it again. */
export function Room({ children, loading, reveal = false }: RoomProps) {
  const dress = (kind: string) => (reveal ? { 'data-reveal': kind } : {});
  return (
    <div className="inv-room">
      <Art name="frame-carved" loading={loading} className="inv-room-frame" />
      <span className="inv-room-garland" {...dress('drape')}>
        <Art name="garland" loading={loading} className="inv-sway" />
      </span>
      <span className="inv-room-orchid" {...dress('bloom')}>
        <Art name="orchid" loading={loading} />
      </span>
      <span className="inv-room-florals" {...dress('bloom')}>
        <Art name="florals" loading={loading} />
      </span>
      <div className="inv-room-copy">{children}</div>
    </div>
  );
}
