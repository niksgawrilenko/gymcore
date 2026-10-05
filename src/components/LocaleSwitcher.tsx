'use client';
// Language switcher: keeps the current path and query and writes the NEXT_LOCALE cookie via the next-intl router.
import { useLocale, useTranslations } from 'next-intl';
import { useSearchParams } from 'next/navigation';
import { usePathname, useRouter } from '@/i18n/navigation';
import { routing, type AppLocale } from '@/i18n/routing';

export function LocaleSwitcher() {
  const t = useTranslations('locale');
  const active = useLocale();
  const router = useRouter();
  const pathname = usePathname(); // path without the locale prefix
  const searchParams = useSearchParams();

  const change = (next: AppLocale) => {
    if (next === active) return;
    router.replace({ pathname, query: Object.fromEntries(searchParams.entries()) }, { locale: next });
  };

  return (
    <div className="locale-switch" role="group" aria-label={t('label')}>
      {routing.locales.map((locale) => (
        <button
          key={locale}
          type="button"
          className={`locale-btn${locale === active ? ' active' : ''}`}
          aria-pressed={locale === active}
          lang={locale}
          title={t(locale)}
          onClick={() => change(locale)}
        >
          {locale.toUpperCase()}
        </button>
      ))}
    </div>
  );
}
