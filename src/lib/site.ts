// Absolute site URL for metadata, robots.txt and sitemap. Set NEXT_PUBLIC_SITE_URL on the host.
export const SITE_URL = (process.env.NEXT_PUBLIC_SITE_URL ?? 'http://localhost:3000').replace(/\/$/, '');

export const SITE_NAME = 'GymCore';

// Global metadata (rendered outside [locale]) — written in the app's primary language (EN).
export const SITE_DESCRIPTION =
  'Free workout journal with no ads and no subscriptions: sets and supersets, calendar history, progress charts, body measurements, program templates and an AI coach. 312 exercises with anatomy.';
