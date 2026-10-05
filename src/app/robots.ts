import type { MetadataRoute } from 'next';
import { SITE_URL } from '@/lib/site';

// Only public pages are indexed: the landing page and the privacy policy. The app is behind a login,
// and shared links (/shared/*) are personal, so they do not belong in search results.
export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: '*',
      allow: ['/welcome', '/privacy'],
      disallow: ['/'],
    },
    sitemap: `${SITE_URL}/sitemap.xml`,
    host: SITE_URL,
  };
}
