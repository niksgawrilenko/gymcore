import { getRequestConfig } from 'next-intl/server';
import { isLocale, routing } from './routing';

// The locale comes from the [locale] segment (proxy.ts fills it in and refreshes the NEXT_LOCALE cookie).
// Texts live in messages/<locale>.json: en.json is the source of truth, ru.json is a translation.
export default getRequestConfig(async ({ requestLocale }) => {
  const requested = await requestLocale;
  const locale = isLocale(requested) ? requested : routing.defaultLocale;

  return {
    locale,
    messages: (await import(`../../messages/${locale}.json`)).default,
  };
});
