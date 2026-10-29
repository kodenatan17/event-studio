'use client';

import { buttonClassName, Dialog } from '@undangan/ui';
import { useEffect, useRef } from 'react';
import type { RefObject } from 'react';

import type { WeddingEvent } from '../types';
import { formatEventRange, safeHttpsUrl } from './format';

const KIND_LABELS: Readonly<Record<WeddingEvent['kind'], string>> = {
  ceremony: 'Upacara',
  reception: 'Resepsi',
};

function sortedEvents(events: readonly WeddingEvent[]): WeddingEvent[] {
  return [...events].sort((a, b) => Date.parse(a.startsAt) - Date.parse(b.startsAt));
}

/** Ceremony/reception cards in each event's IANA timezone (FR-05); reused by the 2D invitation. */
export function EventList({
  events,
  highlightId,
}: {
  events: readonly WeddingEvent[];
  highlightId?: string;
}) {
  const highlightRef = useRef<HTMLLIElement>(null);

  useEffect(() => {
    if (!highlightId) return;
    const reduce = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
    highlightRef.current?.scrollIntoView({
      block: 'nearest',
      behavior: reduce ? 'auto' : 'smooth',
    });
  }, [highlightId]);

  if (events.length === 0) return <p>Detail acara belum tersedia.</p>;

  return (
    <ul className="flex flex-col gap-4">
      {sortedEvents(events).map((event) => {
        const range = formatEventRange(event.startsAt, event.endsAt, event.timezone);
        const mapsUrl = safeHttpsUrl(event.mapsUrl);
        const highlighted = event.id === highlightId;
        return (
          <li
            key={event.id}
            ref={highlighted ? highlightRef : undefined}
            aria-current={highlighted ? 'true' : undefined}
            data-event-id={event.id}
            className={`rounded-xl border bg-white/70 p-4 ${
              highlighted ? 'border-[#7a4a2a] ring-2 ring-[#7a4a2a]' : 'border-[#e6d6c3]'
            }`}
          >
            <article aria-labelledby={`event-${event.id}-title`} className="flex flex-col gap-1">
              <p className="text-xs font-semibold tracking-widest text-[#6a3d22] uppercase">
                {KIND_LABELS[event.kind]}
              </p>
              <h3 id={`event-${event.id}-title`} className="font-serif text-xl">
                {event.title}
              </h3>
              <p data-testid="event-time">
                {range ? (
                  <time dateTime={event.startsAt}>{range.label}</time>
                ) : (
                  'Waktu belum tersedia'
                )}
              </p>
              <p className="font-medium">{event.venueName}</p>
              <p className="text-sm whitespace-pre-line text-[#4e2c18]">{event.address}</p>
              {mapsUrl ? (
                <a
                  href={mapsUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className={buttonClassName('secondary', 'mt-2 self-start')}
                >
                  Buka di Maps
                  <span className="sr-only"> (tab baru)</span>
                </a>
              ) : null}
            </article>
          </li>
        );
      })}
    </ul>
  );
}

interface EventInfoProps {
  events: readonly WeddingEvent[];
  /** Hotspot payload: highlight and scroll to this event. */
  eventId?: string;
  onClose: () => void;
  fallbackFocus?: RefObject<HTMLElement | null>;
}

/** Event details overlay, reachable from the global nav and from event hotspots (FR-05). */
export function EventInfo({ events, eventId, onClose, fallbackFocus }: EventInfoProps) {
  return (
    <Dialog
      title="Info Acara"
      onClose={onClose}
      fallbackFocus={fallbackFocus}
      data-testid="overlay-panel"
      data-overlay-type="open_event_info"
    >
      <EventList events={events} highlightId={eventId} />
      <p className="mt-4 text-xs text-[#6a3d22]">Waktu ditampilkan sesuai zona waktu acara.</p>
    </Dialog>
  );
}
