import { describe, expect, it } from 'vitest';

import { isActionEnabled } from './action-enabled';

const ALL_OFF = { rsvpEnabled: false, guestbookEnabled: false, photoBoothEnabled: false };
const ALL_ON = { rsvpEnabled: true, guestbookEnabled: true, photoBoothEnabled: true };

describe('isActionEnabled', () => {
  it('[§3.4] disabled features hide their actions', () => {
    expect(isActionEnabled({ type: 'open_rsvp' }, ALL_OFF)).toBe(false);
    expect(isActionEnabled({ type: 'open_guestbook' }, ALL_OFF)).toBe(false);
    expect(isActionEnabled({ type: 'open_photo_booth' }, ALL_OFF)).toBe(false);
  });

  it('[§3.4] enabled features keep their actions', () => {
    expect(isActionEnabled({ type: 'open_rsvp' }, ALL_ON)).toBe(true);
    expect(isActionEnabled({ type: 'open_guestbook' }, ALL_ON)).toBe(true);
    expect(isActionEnabled({ type: 'open_photo_booth' }, ALL_ON)).toBe(true);
  });

  it('[§3.4] each flag only gates its own action', () => {
    const rsvpOnly = { ...ALL_OFF, rsvpEnabled: true };
    expect(isActionEnabled({ type: 'open_rsvp' }, rsvpOnly)).toBe(true);
    expect(isActionEnabled({ type: 'open_guestbook' }, rsvpOnly)).toBe(false);
  });

  it('[§3.4] content and navigation actions are always enabled', () => {
    expect(isActionEnabled({ type: 'open_story' }, ALL_OFF)).toBe(true);
    expect(isActionEnabled({ type: 'open_event_info' }, ALL_OFF)).toBe(true);
    expect(isActionEnabled({ type: 'navigate', sceneId: 'living-room' }, ALL_OFF)).toBe(true);
  });
});
