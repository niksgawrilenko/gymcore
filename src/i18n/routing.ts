import { defineRouting } from 'next-intl/routing';

// Locale setup — the single source of truth for request.ts, navigation.ts, proxy.ts and the SEO files.
// The list can be trimmed with NEXT_PUBLIC_LOCALES (e.g. `en` for a single-language deploy): this is
// configuration only — data and exercise translations stay untouched (docs/i18n-plan.md §2).
const ALL_LOCALES = ['en', 'ru'] as const;
export type AppLocale = (typeof ALL_LOCALES)[number];

const isKnownLocale = (value: string): value is AppLocale => (ALL_LOCALES as readonly string[]).includes(value);

const enabled: AppLocale[] = (process.env.NEXT_PUBLIC_LOCALES ?? ALL_LOCALES.join(','))
  .split(',')
  .map((locale) => locale.trim())
  .filter(isKnownLocale);

export const routing = defineRouting({
  locales: (enabled.length ? enabled : [...ALL_LOCALES]) as AppLocale[],
  // EN is the primary language (no prefix), RU lives under /ru/**. Switching the language sets the NEXT_LOCALE cookie.
  defaultLocale: enabled.includes('en') || !enabled.length ? 'en' : enabled[0],
  localePrefix: 'as-needed',
  localeDetection: true,
  localeCookie: { maxAge: 60 * 60 * 24 * 365 },
});

/** Checks that a string is an enabled locale (next-intl 4.14 no longer ships isLocale/hasLocale). */
export function isLocale(value: unknown): value is AppLocale {
  return typeof value === 'string' && (routing.locales as readonly string[]).includes(value);
}
