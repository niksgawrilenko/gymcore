import { getLocale } from 'next-intl/server';
import { getPathname } from '@/i18n/navigation';
import { SITE_URL } from '@/lib/site';
import { isLocale, routing, type AppLocale } from './routing';

/** Current request locale: outside an i18n context (e.g. a route handler outside the matcher) the primary one is used. */
export async function currentLocale(): Promise<AppLocale> {
  try {
    const locale = await getLocale();
    return isLocale(locale) ? locale : routing.defaultLocale;
  } catch {
    return routing.defaultLocale;
  }
}

/**
 * A path prefixed with the current locale — for redirect() from next/navigation in Server Actions and lib.
 * Returns a string (it does not redirect), so type narrowing after `if (!user) redirect(...)` survives.
 */
export async function localeHref(href: string): Promise<string> {
  return getPathname({ href, locale: await currentLocale() });
}

/** Absolute URL of a public path in a given locale (SEO alternates are always absolute). */
export const absoluteHref = (href: string, locale: AppLocale): string => `${SITE_URL}${getPathname({ href, locale })}`;

/**
 * Canonical + hreflang alternates for a public page: one entry per enabled locale plus x-default
 * (the primary locale). Used by the SEO metadata of /welcome and /privacy and by the sitemap.
 */
export async function localizedAlternates(href: string) {
  const languages: Record<string, string> = {};
  for (const locale of routing.locales) languages[locale] = absoluteHref(href, locale);
  languages['x-default'] = absoluteHref(href, routing.defaultLocale);
  return { canonical: `${SITE_URL}${await localeHref(href)}`, languages };
}
