import { getLocale } from 'next-intl/server';
import { getPathname } from '@/i18n/navigation';
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
