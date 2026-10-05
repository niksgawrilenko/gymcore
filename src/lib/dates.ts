// Date formatting with an EXPLICIT user time zone: the server runs in UTC, so omitting timeZone
// would shift workout times and make server and browser render different text (hydration mismatch).
export const TZ_COOKIE = 'tz';
export const DEFAULT_TZ = 'Europe/Warsaw';

export function isValidTz(tz: string | undefined): tz is string {
  if (!tz) return false;
  try {
    new Intl.DateTimeFormat('en', { timeZone: tz });
    return true;
  } catch {
    return false;
  }
}

export function fmtDate(date: Date | number, tz: string, opts: Intl.DateTimeFormatOptions, locale: string) {
  return new Intl.DateTimeFormat(locale, { ...opts, timeZone: tz }).format(date);
}

/** Full month names in the given locale — for the calendar header (no catalog keys needed). */
export function monthNames(locale: string) {
  return Array.from({ length: 12 }, (_, m) =>
    new Intl.DateTimeFormat(locale, { month: 'long', timeZone: 'UTC' }).format(Date.UTC(2024, m, 1)),
  );
}

/** Short weekday names starting from Monday (2024-01-01 is a Monday). */
export function weekdayNames(locale: string) {
  return Array.from({ length: 7 }, (_, i) =>
    new Intl.DateTimeFormat(locale, { weekday: 'short', timeZone: 'UTC' }).format(Date.UTC(2024, 0, 1 + i)),
  );
}

/** YYYY-MM-DD in the user time zone — the calendar day key. */
export function dayKey(date: Date | number, tz: string) {
  return new Intl.DateTimeFormat('en-CA', { timeZone: tz, year: 'numeric', month: '2-digit', day: '2-digit' }).format(date);
}

/** Value for <input type="datetime-local"> (device-local time, browser side only). */
export function toLocalInputValue(ms: number) {
  const d = new Date(ms);
  return new Date(ms - d.getTimezoneOffset() * 60000).toISOString().slice(0, 16);
}
