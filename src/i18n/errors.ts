'use client';
import { useTranslations } from 'next-intl';

type ErrorT = { (key: string, values?: Record<string, string | number>): string; has(key: string): boolean };

/**
 * Translates an error CODE returned by a Server Action into the text of the current locale.
 * Codes live in messages('errors'); some carry parameters separated by "|" (AI: `aiKey|Gemini`).
 * An unknown code is returned as is — diagnostics are never lost.
 */
export function useActionError() {
  const t = useTranslations('errors') as unknown as ErrorT;
  return (raw: string) => {
    if (!raw) return raw;
    if (t.has(raw)) return t(raw);
    const [code, ...params] = raw.split('|');
    if (code !== raw && t.has(code)) {
      if (code === 'aiFailed') {
        return t(code, { provider: params[0] ?? '', status: params[1] ?? '', detail: params[2] ?? '' });
      }
      return t(code, { provider: params[0] ?? '' });
    }
    return raw;
  };
}
