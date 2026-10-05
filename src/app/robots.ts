import type { MetadataRoute } from 'next';
import { SITE_URL } from '@/lib/site';

// Only public pages are indexed: the landing page, the privacy policy and the AI-crawler summary.
// The app is behind a login, and shared links (/shared/*) are personal, so they do not belong in
// search results. The allow/deny entries are the ones crawlers match by the longest prefix.
export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: '*',
      allow: ['/welcome', '/privacy', '/llms.txt'],
      disallow: ['/', '/api/', '/shared/'],
    },
    sitemap: `${SITE_URL}/sitemap.xml`,
    host: SITE_URL,
  };
}
