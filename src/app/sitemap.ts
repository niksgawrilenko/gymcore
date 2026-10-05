import type { MetadataRoute } from 'next';
import { getPathname } from '@/i18n/navigation';
import { routing } from '@/i18n/routing';
import { SITE_URL } from '@/lib/site';

// Only public pages are listed. Each page is indexed in every enabled locale and carries hreflang
// alternates, mirroring the `alternates` of its metadata (src/i18n/server.ts → localizedAlternates).
const PAGES = [
  { path: '/welcome', changeFrequency: 'weekly', priority: 1 },
  { path: '/privacy', changeFrequency: 'yearly', priority: 0.3 },
] as const;

export default function sitemap(): MetadataRoute.Sitemap {
  const lastModified = new Date();
  return PAGES.flatMap(({ path, changeFrequency, priority }) => {
    const languages = Object.fromEntries(
      routing.locales.map((locale) => [locale, `${SITE_URL}${getPathname({ href: path, locale })}`]),
    );
    return routing.locales.map((locale) => ({
      url: `${SITE_URL}${getPathname({ href: path, locale })}`,
      lastModified,
      changeFrequency,
      priority,
      alternates: { languages },
    }));
  });
}
