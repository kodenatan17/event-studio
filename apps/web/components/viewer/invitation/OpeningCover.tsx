'use client';

import { Button } from '@undangan/ui';
import { useEffect, useRef, useState } from 'react';

import { Art, Monogram, Room } from './art';

/** Matches the last keyframe in `invitation.css`. */
const OPENING_MS = 4300;
const REDUCED_OPENING_MS = 350;
/** The hero starts rising this long before the cover fades, so no bare landscape shows between. */
const REVEAL_LEAD_MS = 650;

interface OpeningCoverProps {
  names: string;
  letters: readonly [string, string];
  date: string | null;
  /** The cream oval fills the screen: the hero may start rising behind it. */
  onReveal: () => void;
  /** The animation finished: the invitation underneath takes over. */
  onOpened: () => void;
}

/**
 * Closed carved doors with the "Buka Undangan" gate (D-035, D-036); opening them shows the dressed
 * doorway with the couple's names, then the view passes through it into the hero. The tap is also
 * the gesture that lets the soundtrack start. Names are a `<p>`: the page's single `h1` lives in
 * the hero. Without scripts the button cannot work, so a `<noscript>` style removes the cover and
 * the content stays readable. Everything readable is live text, so missing art changes nothing.
 */
export function OpeningCover({ names, letters, date, onReveal, onOpened }: OpeningCoverProps) {
  const [opening, setOpening] = useState(false);
  const button = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    button.current?.focus({ preventScroll: true });
  }, []);

  useEffect(() => {
    if (!opening) return;
    const reduced = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
    const duration = reduced ? REDUCED_OPENING_MS : OPENING_MS;
    const reveal = setTimeout(onReveal, Math.max(0, duration - REVEAL_LEAD_MS));
    const done = setTimeout(onOpened, duration);
    return () => {
      clearTimeout(reveal);
      clearTimeout(done);
    };
  }, [opening, onReveal, onOpened]);

  return (
    <section
      aria-label="Sampul undangan"
      data-testid="invitation-cover"
      data-phase={opening ? 'opening' : 'sealed'}
      className="inv-cover"
    >
      <noscript>
        <style>{'.inv-cover{display:none}'}</style>
      </noscript>
      <div className="inv-cover-world" aria-hidden="true">
        <Art name="landscape" loading="eager" className="inv-cover-landscape" />
        <Room loading="eager">
          <Monogram letters={letters} />
          <p className="inv-kicker">Undangan Pernikahan</p>
          <p className="inv-names">{names}</p>
          {date ? <p className="inv-kicker">{date}</p> : null}
        </Room>
      </div>
      <div className="inv-cover-oval" aria-hidden="true" />
      <div className="inv-doors" aria-hidden="true">
        <Art name="door-left" loading="eager" className="inv-door inv-door-left" />
        <Art name="door-right" loading="eager" className="inv-door inv-door-right" />
      </div>
      <div className="inv-cover-card">
        <Monogram letters={letters} />
        <p className="inv-kicker">Undangan Pernikahan</p>
        <p className="inv-cover-names">{names}</p>
        {date ? <p className="inv-cover-date">{date}</p> : null}
        <p className="inv-cover-to">Kepada Bapak/Ibu/Saudara/i</p>
        <p className="inv-cover-guest">Tamu Undangan</p>
        <Button ref={button} disabled={opening} onClick={() => setOpening(true)}>
          Buka Undangan
        </Button>
      </div>
    </section>
  );
}
