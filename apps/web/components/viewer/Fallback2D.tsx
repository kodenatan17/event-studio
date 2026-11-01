'use client';

import type { OverlayAction } from '@undangan/contracts/world';
import { Button } from '@undangan/ui';
import {
  EventList,
  FallbackImage,
  formatEventRange,
  GalleryGrid,
  isShellEnabled,
  orderedChapters,
  ShellContent,
  StoryChapterArticle,
  welcomeText,
} from '@undangan/wedding-features';
import type { WeddingContent, WeddingEvent } from '@undangan/wedding-features';
import type { FallbackReason } from '@undangan/world-engine';
import { useCallback, useEffect, useRef, useState, useSyncExternalStore } from 'react';
import type { ReactNode } from 'react';

import { monogramLetters } from '@/lib/monogram';

import { Art, Room } from './invitation/art';
import { Countdown } from './invitation/Countdown';
import { invitationFont } from './invitation/font';
import { OpeningCover } from './invitation/OpeningCover';
import { revealDelay, Slide } from './invitation/Slide';
import { useReveal } from './invitation/useReveal';
import './invitation/invitation.css';

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

const subscribeToNothing = () => () => {};
const hydrated = () => true;
const notHydrated = () => false;

function firstEvent(events: readonly WeddingEvent[]): WeddingEvent | undefined {
  return [...events].sort((a, b) => Date.parse(a.startsAt) - Date.parse(b.startsAt))[0];
}

function eventDate(event: WeddingEvent | undefined): string | null {
  if (!event) return null;
  return formatEventRange(event.startsAt, event.endsAt, event.timezone)?.start.date ?? null;
}

/**
 * 2D invitation (architecture.md §12 minimum, FR-01, D-035, D-036): names, welcome, events, every
 * story chapter, gallery, RSVP/guestbook shells and the booth notice, as snap slides behind closed
 * carved doors. Never a blank page: the server HTML holds all of it, and the cover and the reveal only
 * engage once scripts run. A 3D crash skips the cover, since that guest is already inside.
 * "Kembali ke 3D" only after a manual switch; on WebGL-less devices the reason is replaced by
 * `webgl_unsupported` on mount, which hides it.
 */
export function Fallback2D({ content, reason, onAction, onExit, banner }: Fallback2DProps) {
  const { wedding, features, gallery } = content;
  const names = `${wedding.couple.groom} & ${wedding.couple.bride}`;
  const first = firstEvent(content.events);
  const date = eventDate(first);
  const chapters = orderedChapters(content.story);
  const coverPhoto = gallery[0];
  const letters = monogramLetters(wedding.couple.groom, wedding.couple.bride);
  const heroArt = <Art name="landscape" loading="eager" className="inv-oval-art" />;

  const crashed = reason !== 'manual' && reason !== 'webgl_unsupported';
  const [opened, setOpened] = useState(crashed);
  const armed = useSyncExternalStore(subscribeToNothing, hydrated, notHydrated);
  const scroller = useRef<HTMLElement>(null);
  const [revealing, setRevealing] = useState(crashed);
  useReveal(scroller, armed && revealing);
  const reveal = useCallback(() => setRevealing(true), []);
  const finishOpening = useCallback(() => setOpened(true), []);

  // After the commit that lifts `inert`: an inert element cannot take focus.
  useEffect(() => {
    if (opened && !crashed) scroller.current?.focus({ preventScroll: true });
  }, [opened, crashed]);

  return (
    <div
      data-testid="fallback-2d"
      data-armed={armed ? '' : undefined}
      className={`inv-stage ${invitationFont.variable}`}
    >
      <div className="inv-backdrop" aria-hidden="true">
        <Art name="landscape" />
        <span className="inv-backdrop-florals inv-backdrop-left">
          <Art name="florals" />
        </span>
        <span className="inv-backdrop-florals inv-backdrop-right">
          <Art name="florals" />
        </span>
      </div>
      {banner}
      <div className="inv-body">
        <div className="inv-column">
          <div className="inv-scene" aria-hidden="true">
            <Art name="landscape" loading="eager" />
          </div>

          <main
            ref={scroller}
            tabIndex={-1}
            inert={armed && !opened}
            data-testid="invitation-slides"
            className="inv-scroller"
          >
            <section aria-labelledby="fallback-names" className="inv-slide" data-dress="hero">
              <div className="inv-scrub">
                <div className="inv-hero">
                  <span className="inv-dress-garland" data-reveal="drape" style={revealDelay(320)}>
                    <Art name="garland" loading="eager" className="inv-sway" />
                  </span>
                  <span className="inv-dress-orchid" data-reveal="bloom" style={revealDelay(420)}>
                    <Art name="orchid" loading="eager" />
                  </span>
                  <div className="inv-oval" data-reveal="pop" style={revealDelay(200)}>
                    <div className="inv-oval-photo">
                      {coverPhoto ? (
                        <FallbackImage
                          src={coverPhoto.src}
                          alt={coverPhoto.alt}
                          className="h-full w-full"
                          fallback={heroArt}
                        />
                      ) : (
                        heroArt
                      )}
                    </div>
                    <Art name="frame-oval" loading="eager" className="inv-oval-frame" />
                  </div>
                  <p className="inv-kicker" data-reveal="fade-up" style={revealDelay(360)}>
                    Undangan Pernikahan
                  </p>
                  <h1
                    id="fallback-names"
                    className="inv-names"
                    data-reveal="fade-up"
                    style={revealDelay(420)}
                  >
                    {names}
                  </h1>
                  {date ? (
                    <p className="inv-kicker" data-reveal="fade-up" style={revealDelay(500)}>
                      {date}
                    </p>
                  ) : null}
                  <p className="text-sm" data-reveal="fade-up" style={revealDelay(580)}>
                    {welcomeText(wedding)}
                  </p>
                  <p
                    role="status"
                    className="text-xs text-[#4a3324]"
                    data-reveal="fade-up"
                    style={revealDelay(640)}
                  >
                    {reasonText(reason)}
                  </p>
                  <p aria-hidden="true" className="inv-scroll-hint">
                    Geser ke bawah ↓
                  </p>
                </div>
              </div>
            </section>

            {first ? (
              <Slide
                id="fallback-date"
                title="Save the Date"
                kicker="Menuju hari bahagia"
                dress="frame"
              >
                {date ? <p className="inv-date">{date}</p> : null}
                <Countdown target={first.startsAt} />
              </Slide>
            ) : null}

            <Slide id="fallback-events" title="Info Acara" kicker="Wedding Event" dress="wreath">
              <EventList events={content.events} variant="arch" />
            </Slide>

            <Slide id="fallback-gallery" title="Galeri Foto" kicker="Momen kami" dress="orchid">
              <div data-reveal="photo" style={revealDelay(560)}>
                <GalleryGrid
                  items={gallery}
                  onOpen={(index) => onAction({ type: 'open_gallery', startIndex: index })}
                />
              </div>
            </Slide>

            <Slide id="fallback-story" title="Kisah Kami" kicker="Love Story" dress="garland">
              <div className="inv-timeline">
                <span aria-hidden="true" className="inv-timeline-line" data-reveal="grow" />
                <ol>
                  {chapters.map((chapter, index) => (
                    <li key={chapter.id} data-reveal="fade-up" style={revealDelay(120 * index)}>
                      <StoryChapterArticle chapter={chapter} />
                    </li>
                  ))}
                </ol>
              </div>
            </Slide>

            {isShellEnabled('rsvp', features) ? (
              <Slide id="fallback-rsvp" title="RSVP" kicker="Konfirmasi kehadiran" dress="wreath">
                <ShellContent kind="rsvp" />
              </Slide>
            ) : null}

            {isShellEnabled('guestbook', features) ? (
              <Slide
                id="fallback-guestbook"
                title="Buku Tamu"
                kicker="Ucapan dan doa"
                dress="orchid"
              >
                <ShellContent kind="guestbook" />
              </Slide>
            ) : null}

            {isShellEnabled('photo_booth', features) ? (
              <Slide id="fallback-photo-booth" title="Photo Booth" dress="garland">
                <p>Photo booth tidak didukung di mode 2D.</p>
              </Slide>
            ) : null}

            <section aria-labelledby="fallback-thanks" className="inv-slide" data-dress="room">
              <div className="inv-scrub">
                <Room reveal>
                  <p className="inv-kicker" data-reveal="fade-up" style={revealDelay(200)}>
                    Sampai jumpa
                  </p>
                  <h2
                    id="fallback-thanks"
                    className="inv-title"
                    data-reveal="fade-up"
                    style={revealDelay(280)}
                  >
                    Terima Kasih
                  </h2>
                  <p className="text-sm" data-reveal="fade-up" style={revealDelay(360)}>
                    Merupakan suatu kehormatan dan kebahagiaan bagi kami apabila Bapak/Ibu/Saudara/i
                    berkenan hadir dan memberikan doa restu.
                  </p>
                  <p className="inv-names" data-reveal="fade-up" style={revealDelay(440)}>
                    {names}
                  </p>
                </Room>
              </div>
            </section>
          </main>

          {opened ? null : (
            <OpeningCover
              names={names}
              letters={letters}
              date={date}
              onReveal={reveal}
              onOpened={finishOpening}
            />
          )}
        </div>

        {/* Above the cover: a guest can always leave 2D, even before opening it. */}
        {reason === 'manual' ? (
          <Button
            variant="secondary"
            className="absolute top-[calc(env(safe-area-inset-top)_+_0.5rem)] right-3 z-30 shadow-lg"
            onClick={onExit}
          >
            Kembali ke 3D
          </Button>
        ) : null}
      </div>
    </div>
  );
}
