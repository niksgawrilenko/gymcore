// Форматирование дат с ЯВНОЙ таймзоной пользователя.
// Сервер (Vercel) живёт в UTC, поэтому без timeZone время тренировок уезжало бы на 2-3 часа,
// а сервер и браузер рендерили бы разный текст (hydration mismatch).
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

export function fmtDate(date: Date | number, tz: string, opts: Intl.DateTimeFormatOptions) {
  return new Intl.DateTimeFormat('ru-RU', { ...opts, timeZone: tz }).format(date);
}

/** YYYY-MM-DD в таймзоне пользователя — ключ дня для календаря. */
export function dayKey(date: Date | number, tz: string) {
  return new Intl.DateTimeFormat('en-CA', { timeZone: tz, year: 'numeric', month: '2-digit', day: '2-digit' }).format(date);
}

/** Для <input type="datetime-local"> (в браузере, локальное время устройства). */
export function toLocalInputValue(ms: number) {
  const d = new Date(ms);
  return new Date(ms - d.getTimezoneOffset() * 60000).toISOString().slice(0, 16);
}
