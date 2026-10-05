// Locale and message-key typing for next-intl (Locale, Messages).
// The source of truth is messages/en.json: a key missing from the EN catalog does not exist in code.
import type { AppLocale } from '@/i18n/routing';
import messages from './messages/en.json';

declare module 'next-intl' {
  interface AppConfig {
    Locale: AppLocale;
    Messages: typeof messages;
  }
}
