/** Date/time pieces of one instant in an IANA timezone, formatted for `id-ID`. */
export interface EventDateTimeParts {
  /** `Minggu, 14 Februari 2027` */
  date: string;
  /** `09.00` (24-hour, Indonesian separator) */
  time: string;
  /** `WIB`, `WITA`, `WIT`, or the runtime's short name elsewhere */
  timeZoneName: string;
}

export interface EventRange {
  start: EventDateTimeParts;
  end: EventDateTimeParts;
  /** `Minggu, 14 Februari 2027, 09.00–11.00 WIB` */
  label: string;
}

const formatters = new Map<string, Intl.DateTimeFormat>();

function formatter(timeZone: string): Intl.DateTimeFormat {
  let cached = formatters.get(timeZone);
  if (!cached) {
    cached = new Intl.DateTimeFormat('id-ID', {
      timeZone,
      weekday: 'long',
      day: 'numeric',
      month: 'long',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      hourCycle: 'h23',
      timeZoneName: 'short',
    });
    formatters.set(timeZone, cached);
  }
  return cached;
}

/**
 * Built from `formatToParts` so the output does not depend on ICU punctuation (FR-05: the
 * wedding's IANA timezone, identical on Android/iOS). Returns `null` for invalid input.
 */
export function eventDateTimeParts(iso: string, timeZone: string): EventDateTimeParts | null {
  const instant = new Date(iso);
  if (Number.isNaN(instant.getTime())) return null;
  let parts: Intl.DateTimeFormatPart[];
  try {
    parts = formatter(timeZone).formatToParts(instant);
  } catch {
    return null;
  }
  const part = (type: Intl.DateTimeFormatPartTypes) =>
    parts.find((candidate) => candidate.type === type)?.value ?? '';
  return {
    date: `${part('weekday')}, ${part('day')} ${part('month')} ${part('year')}`,
    time: `${part('hour')}.${part('minute')}`,
    timeZoneName: part('timeZoneName'),
  };
}

/** Event start–end in the event's timezone (FR-05); `null` when either instant is invalid. */
export function formatEventRange(
  startsAt: string,
  endsAt: string,
  timeZone: string,
): EventRange | null {
  const start = eventDateTimeParts(startsAt, timeZone);
  const end = eventDateTimeParts(endsAt, timeZone);
  if (!start || !end) return null;
  const label =
    start.date === end.date
      ? `${start.date}, ${start.time}–${end.time} ${end.timeZoneName}`
      : `${start.date}, ${start.time} ${start.timeZoneName} – ${end.date}, ${end.time} ${end.timeZoneName}`;
  return { start, end, label };
}

/** `https:` links only (architecture.md §14); anything else (javascript:, data:, http:) → null. */
export function safeHttpsUrl(url: string): string | null {
  try {
    const parsed = new URL(url);
    return parsed.protocol === 'https:' ? parsed.href : null;
  } catch {
    return null;
  }
}

/** Calendar date (`YYYY-MM-DD`, no time) such as a story chapter date → `12 Juni 2021`. */
export function formatCalendarDate(isoDate: string): string | null {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(isoDate);
  if (!match) return null;
  const [, year, month, day] = match;
  const instant = Date.UTC(Number(year), Number(month) - 1, Number(day));
  return new Intl.DateTimeFormat('id-ID', {
    timeZone: 'UTC',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  }).format(instant);
}
