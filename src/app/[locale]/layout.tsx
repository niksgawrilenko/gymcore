import type { Metadata, Viewport } from 'next';
import { cookies } from 'next/headers';
import { notFound } from 'next/navigation';
import { NextIntlClientProvider } from 'next-intl';
import { getTranslations, setRequestLocale } from 'next-intl/server';
import { BottomNav, LegacyHashRedirect, ThemeToggle, TzProvider } from '@/components/Chrome';
import { LocaleSwitcher } from '@/components/LocaleSwitcher';
import { RefsProvider } from '@/components/RefsProvider';
import { Link } from '@/i18n/navigation';
import { isLocale } from '@/i18n/routing';
import { getTz, loadRefDict } from '@/lib/data';
import { SITE_URL } from '@/lib/site';
import { parseTheme, THEME_COOKIE } from '@/lib/theme';
import '../globals.css';
import '../app.css';

type LocaleParams = { params: Promise<{ locale: string }> };

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  themeColor: [
    { media: '(prefers-color-scheme: light)', color: '#f2f2f7' },
    { media: '(prefers-color-scheme: dark)', color: '#000000' },
  ],
};

// Theme: the server renders <html data-theme> from the cookie (see src/lib/theme.ts), while a dark
// system theme on the first visit (no cookie yet) is applied by plain CSS — the media query in
// globals.css. There is deliberately no inline <script> here: the [locale] segment remounts on a
// language switch and React 19 (dev) complains about a re-created script. The theme/tz cookies are
// written by the client-side TzProvider (src/components/Chrome.tsx).
export async function generateMetadata({ params }: LocaleParams): Promise<Metadata> {
  const { locale } = await params;
  if (!isLocale(locale)) notFound();
  const t = await getTranslations({ locale, namespace: 'meta' });
  // The absolute base URL is required for the OG image and the canonical link.
  return {
    metadataBase: new URL(SITE_URL),
    title: t('title'),
    description: t('description'),
  };
}

export default async function LocaleLayout({ children, params }: LocaleParams & { children: React.ReactNode }) {
  const { locale } = await params;
  // An unknown first segment (/fx/...) is not a locale — return 404.
  if (!isLocale(locale)) notFound();
  setRequestLocale(locale);

  const tz = await getTz();
  // The theme comes from the cookie and is rendered server-side on <html>: on a locale switch the root
  // layout is re-created, but React sets the attribute from props, so the theme is not reset (it used
  // to live in localStorage only). An explicit dark/light choice is rendered as an attribute; without
  // one it stays undefined and the system CSS media query applies.
  const theme = parseTheme((await cookies()).get(THEME_COOKIE)?.value);
  // Reference strings (muscle groups, categories, equipment) are translated on display: the dictionary
  // is loaded once per request and handed to client components through RefsProvider.
  const refDict = await loadRefDict(locale);
  return (
    <html lang={locale} data-theme={theme} suppressHydrationWarning>
      <body>
        <NextIntlClientProvider>
          <TzProvider tz={tz}>
            <RefsProvider dict={refDict}>
              <header className="app-header">
                <Link href="/">
                  {/* Not an h1: the page heading must own the single H1 (important for the landing page). */}
                  <span className="app-logo">GymCore</span>
                </Link>
                <div className="header-actions">
                  <LocaleSwitcher />
                  <ThemeToggle />
                </div>
              </header>
              <main className="app-content">{children}</main>
              <BottomNav />
              <LegacyHashRedirect />
            </RefsProvider>
          </TzProvider>
        </NextIntlClientProvider>
      </body>
    </html>
  );
}
