import type { MetadataRoute } from 'next';
import { SITE_URL } from '@/lib/site';

// Only public pages are indexed: the landing page, the privacy policy and the AI-crawler summary.
// The app is behind a login, and shared links (/shared/*) are personal, so they do not belong in
// search results. Rules are matched by the longest path, and the RU pages sit under /ru (the rule
// '/welcome' does NOT cover '/ru/welcome'), so both locales are listed explicitly.
// `/$` and `/ru$` allow the bare roots only (the `$` anchors the end of the URL): a guest gets a
// redirect from there to a landing page, so Googlebot can follow it instead of reporting a block.
export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: '*',
      allow: ['/$', '/ru$', '/welcome', '/ru/welcome', '/privacy', '/ru/privacy', '/llms.txt'],
      disallow: ['/', '/api/', '/shared/'],
    },
    sitemap: `${SITE_URL}/sitemap.xml`,
    host: SITE_URL,
  };
}
