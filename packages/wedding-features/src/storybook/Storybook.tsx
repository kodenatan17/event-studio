'use client';

import { Button, Dialog } from '@undangan/ui';
import { useRef, useState } from 'react';
import type { KeyboardEvent, PointerEvent, RefObject } from 'react';

import { formatCalendarDate } from '../event-info/format';
import { FallbackImage } from '../shared/FallbackImage';
import type { StoryChapter } from '../types';

/** Horizontal swipe distance (CSS px) that turns a page. */
export const SWIPE_THRESHOLD_PX = 40;

/** Published chapter sequence in `order` (FR-03). */
export function orderedChapters(chapters: readonly StoryChapter[]): StoryChapter[] {
  return [...chapters].sort((a, b) => a.order - b.order);
}

/** One chapter as regular DOM text (FR-03: meaningful content stays HTML). */
export function StoryChapterArticle({ chapter }: { chapter: StoryChapter }) {
  const date = chapter.date ? formatCalendarDate(chapter.date) : null;
  return (
    <article className="flex flex-col gap-3">
      <header>
        <h3 className="font-serif text-2xl leading-tight">{chapter.title}</h3>
        {date && chapter.date ? (
          <p className="mt-1 text-sm text-[#6a3d22]">
            <time dateTime={chapter.date}>{date}</time>
          </p>
        ) : null}
      </header>
      {chapter.imageSrc ? (
        <FallbackImage
          src={chapter.imageSrc}
          alt={`Ilustrasi bab ${chapter.title}`}
          className="aspect-[16/9] w-full rounded-xl sm:max-w-md"
        />
      ) : null}
      <p className="leading-relaxed whitespace-pre-line">{chapter.body}</p>
    </article>
  );
}

/** Every chapter in order; used by the 2D invitation (architecture.md §12). */
export function StoryContent({ chapters }: { chapters: readonly StoryChapter[] }) {
  return (
    <ol className="flex flex-col gap-8">
      {orderedChapters(chapters).map((chapter) => (
        <li key={chapter.id}>
          <StoryChapterArticle chapter={chapter} />
        </li>
      ))}
    </ol>
  );
}

interface StorybookProps {
  chapters: readonly StoryChapter[];
  /** Open at this chapter (hotspot payload); unknown ids start at the first chapter. */
  chapterId?: string;
  onClose: () => void;
  fallbackFocus?: RefObject<HTMLElement | null>;
}

/**
 * Love-story book overlay (FR-03): chapter list, previous/next, ArrowLeft/ArrowRight, swipe and
 * "n / N" progress. No page-turn animation, so reduced motion needs no special case.
 */
export function Storybook({ chapters, chapterId, onClose, fallbackFocus }: StorybookProps) {
  const [ordered] = useState(() => orderedChapters(chapters));
  const [index, setIndex] = useState(() =>
    Math.max(
      0,
      ordered.findIndex((chapter) => chapter.id === chapterId),
    ),
  );
  const swipeStart = useRef<number | null>(null);
  const total = ordered.length;
  const chapter = ordered[index];

  const go = (next: number) => setIndex(Math.min(total - 1, Math.max(0, next)));

  const handleKeyDown = (event: KeyboardEvent<HTMLDialogElement>) => {
    if (event.key === 'ArrowRight') {
      event.preventDefault();
      go(index + 1);
    } else if (event.key === 'ArrowLeft') {
      event.preventDefault();
      go(index - 1);
    }
  };

  const handlePointerDown = (event: PointerEvent<HTMLDivElement>) => {
    swipeStart.current = event.clientX;
  };
  const handlePointerUp = (event: PointerEvent<HTMLDivElement>) => {
    if (swipeStart.current === null) return;
    const dx = event.clientX - swipeStart.current;
    swipeStart.current = null;
    if (Math.abs(dx) > SWIPE_THRESHOLD_PX) go(dx < 0 ? index + 1 : index - 1);
  };

  const atStart = index === 0;
  const atEnd = index === total - 1;

  return (
    <Dialog
      title="Kisah Kami"
      onClose={onClose}
      fallbackFocus={fallbackFocus}
      onKeyDown={handleKeyDown}
      size="lg"
      data-testid="overlay-panel"
      data-overlay-type="open_story"
      footer={
        <div className="flex items-center justify-between gap-2">
          <Button variant="secondary" aria-disabled={atStart} onClick={() => go(index - 1)}>
            Sebelumnya
          </Button>
          <p aria-live="polite" data-testid="story-progress" className="text-sm tabular-nums">
            {index + 1} / {total}
          </p>
          <Button aria-disabled={atEnd} onClick={() => go(index + 1)}>
            Berikutnya
          </Button>
        </div>
      }
    >
      <nav aria-label="Daftar bab">
        <ol className="mb-4 flex gap-2 overflow-x-auto pb-1">
          {ordered.map((candidate, candidateIndex) => (
            <li key={candidate.id} className="shrink-0">
              <Button
                variant={candidateIndex === index ? 'primary' : 'ghost'}
                aria-current={candidateIndex === index ? 'step' : undefined}
                onClick={() => setIndex(candidateIndex)}
                className="max-w-[12rem] truncate"
              >
                {candidateIndex + 1}. {candidate.title}
              </Button>
            </li>
          ))}
        </ol>
      </nav>
      <div
        className="touch-pan-y select-text"
        onPointerDown={handlePointerDown}
        onPointerUp={handlePointerUp}
        onPointerCancel={() => {
          swipeStart.current = null;
        }}
      >
        {chapter ? <StoryChapterArticle key={chapter.id} chapter={chapter} /> : null}
      </div>
    </Dialog>
  );
}
