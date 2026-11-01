import type { CSSProperties, ReactNode } from 'react';

import { Art } from './art';

/** Stagger for a `data-reveal` element. */
export function revealDelay(ms: number): CSSProperties {
  return { '--inv-delay': `${ms}ms` } as CSSProperties;
}

interface SlideProps {
  id: string;
  title: string;
  /** Small line above the title. */
  kicker?: string;
  /** `frame` stands in the carved frame (short content only); the rest are paper panels. */
  dress: 'frame' | 'garland' | 'orchid' | 'wreath';
  children: ReactNode;
}

/** One snap stop of the invitation; it rises in as it scrolls into view and its art follows. */
export function Slide({ id, title, kicker, dress, children }: SlideProps) {
  return (
    <section aria-labelledby={id} className="inv-slide" data-dress={dress}>
      <div className="inv-scrub">
        <div className={dress === 'frame' ? 'inv-poster' : 'inv-panel'} data-reveal="rise">
          {dress === 'frame' ? <Art name="frame-carved" className="inv-poster-frame" /> : null}
          {dress === 'garland' ? (
            <span className="inv-dress-garland" data-reveal="drape" style={revealDelay(260)}>
              <Art name="garland" className="inv-sway" />
            </span>
          ) : null}
          {dress === 'orchid' ? (
            <span className="inv-dress-orchid" data-reveal="bloom" style={revealDelay(260)}>
              <Art name="orchid" />
            </span>
          ) : null}
          {dress === 'wreath' ? (
            <Art
              name="wreath"
              className="inv-wreath"
              data-reveal="bloom"
              style={revealDelay(200)}
            />
          ) : null}
          {kicker ? (
            <p className="inv-kicker" data-reveal="fade-up" style={revealDelay(280)}>
              {kicker}
            </p>
          ) : null}
          <h2 id={id} className="inv-title" data-reveal="fade-up" style={revealDelay(340)}>
            {title}
          </h2>
          <div className="inv-rule" aria-hidden="true" data-reveal="pop" style={revealDelay(420)} />
          <div className="inv-slide-body" data-reveal="fade-up" style={revealDelay(480)}>
            {children}
          </div>
          {dress === 'wreath' ? (
            <Art
              name="wreath"
              className="inv-wreath inv-wreath-foot"
              data-reveal="bloom"
              style={revealDelay(560)}
            />
          ) : null}
        </div>
      </div>
    </section>
  );
}
