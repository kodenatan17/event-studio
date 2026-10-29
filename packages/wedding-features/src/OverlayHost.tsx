'use client';

import type { OverlayAction } from '@undangan/contracts/world';
import type { RefObject } from 'react';

import { EventInfo } from './event-info/EventInfo';
import { Gallery } from './gallery/Gallery';
import { ShellOverlay } from './shared/ShellOverlay';
import { Storybook } from './storybook/Storybook';
import type { WeddingContent } from './types';
import { WelcomeOverlay } from './welcome/WelcomeOverlay';

export interface OverlayHostProps {
  overlay: OverlayAction;
  onClose: () => void;
  content: WeddingContent;
  /** Focus target on close when the opener is gone (e.g. a 3D hotspot tap). */
  fallbackFocus?: RefObject<HTMLElement | null>;
}

/**
 * Domain overlay for each `WorldAction` (architecture.md §4.3). Receives the overlay and
 * `onClose` as props and never touches the world store.
 */
export function OverlayHost({ overlay, onClose, content, fallbackFocus }: OverlayHostProps) {
  const shared = { onClose, fallbackFocus };
  switch (overlay.type) {
    case 'open_welcome':
      return <WelcomeOverlay wedding={content.wedding} {...shared} />;
    case 'open_gallery':
      return <Gallery items={content.gallery} startIndex={overlay.startIndex} {...shared} />;
    case 'open_story':
      return <Storybook chapters={content.story} chapterId={overlay.chapterId} {...shared} />;
    case 'open_event_info':
      return <EventInfo events={content.events} eventId={overlay.eventId} {...shared} />;
    case 'open_rsvp':
      return <ShellOverlay kind="rsvp" features={content.features} {...shared} />;
    case 'open_guestbook':
      return <ShellOverlay kind="guestbook" features={content.features} {...shared} />;
    case 'open_photo_booth':
      return <ShellOverlay kind="photo_booth" features={content.features} {...shared} />;
  }
}
