import { describe, expect, it } from 'vitest';

import { eventDateTimeParts, formatCalendarDate, formatEventRange, safeHttpsUrl } from './format';

const STARTS_AT = '2027-02-14T02:00:00Z';
const ENDS_AT = '2027-02-14T04:00:00Z';

/** Reference parts straight from ICU, independent of the module's string building. */
function icuParts(iso: string, timeZone: string) {
  const parts = new Intl.DateTimeFormat('id-ID', {
    timeZone,
    day: 'numeric',
    month: 'long',
    hour: '2-digit',
    minute: '2-digit',
    hourCycle: 'h23',
    timeZoneName: 'short',
  }).formatToParts(new Date(iso));
  return Object.fromEntries(parts.map((part) => [part.type, part.value]));
}

describe('formatEventRange', () => {
  it('[FR-05] 2027-02-14T02:00Z shows 09.00 WIB in Asia/Jakarta', () => {
    const icu = icuParts(STARTS_AT, 'Asia/Jakarta');
    expect(icu).toMatchObject({ hour: '09', minute: '00', timeZoneName: 'WIB', day: '14' });

    const range = formatEventRange(STARTS_AT, ENDS_AT, 'Asia/Jakarta');
    expect(range?.start).toMatchObject({ time: '09.00', timeZoneName: 'WIB' });
    expect(range?.end.time).toBe('11.00');
    expect(range?.label).toContain('14 Februari 2027');
    expect(range?.label).toContain('09.00–11.00 WIB');
  });

  it('[FR-05] Asia/Makassar shows 10.00 WITA', () => {
    expect(icuParts(STARTS_AT, 'Asia/Makassar')).toMatchObject({
      hour: '10',
      timeZoneName: 'WITA',
    });

    const range = formatEventRange(STARTS_AT, ENDS_AT, 'Asia/Makassar');
    expect(range?.start).toMatchObject({ time: '10.00', timeZoneName: 'WITA' });
  });

  it('[FR-05] America/New_York shows 13 Feb', () => {
    const icu = icuParts(STARTS_AT, 'America/New_York');
    expect(icu.day).toBe('13');
    expect(icu.month).toMatch(/^Feb/);

    const start = eventDateTimeParts(STARTS_AT, 'America/New_York');
    expect(start?.date).toMatch(/ 13 Feb/);
    expect(start?.time).toBe('21.00');
  });

  it('[FR-05] invalid instant or timezone → null, never a throw', () => {
    expect(formatEventRange('not-a-date', ENDS_AT, 'Asia/Jakarta')).toBeNull();
    expect(formatEventRange(STARTS_AT, ENDS_AT, 'Mars/Olympus')).toBeNull();
  });

  it('[FR-05] multi-day range names both dates', () => {
    const range = formatEventRange(STARTS_AT, '2027-02-15T02:00:00Z', 'Asia/Jakarta');
    expect(range?.label).toContain('14 Februari 2027');
    expect(range?.label).toContain('15 Februari 2027');
  });
});

describe('safeHttpsUrl', () => {
  it('[§14] safeHttpsUrl rejects javascript:/data:/http', () => {
    expect(safeHttpsUrl('javascript:alert(1)')).toBeNull();
    expect(safeHttpsUrl('JavaScript:alert(1)')).toBeNull();
    expect(safeHttpsUrl('data:text/html,<script>alert(1)</script>')).toBeNull();
    expect(safeHttpsUrl('http://maps.google.com/?q=x')).toBeNull();
    expect(safeHttpsUrl('/relative/path')).toBeNull();
    expect(safeHttpsUrl('https://maps.google.com/?q=Pendopo+Contoh')).toBe(
      'https://maps.google.com/?q=Pendopo+Contoh',
    );
  });
});

describe('formatCalendarDate', () => {
  it('[FR-03] chapter date shows in id-ID without timezone drift', () => {
    expect(formatCalendarDate('2021-06-12')).toBe('12 Juni 2021');
    expect(formatCalendarDate('12/06/2021')).toBeNull();
  });
});
