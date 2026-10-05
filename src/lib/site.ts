// Absolute site URL for metadata, robots.txt and sitemap. Set NEXT_PUBLIC_SITE_URL on the host; on
// Vercel we fall back to the project's own domain so a forgotten variable can never ship localhost
// URLs into the sitemap, canonical and hreflang tags.
const vercelHost = process.env.VERCEL_PROJECT_PRODUCTION_URL ?? process.env.VERCEL_URL;
export const SITE_URL = (
  process.env.NEXT_PUBLIC_SITE_URL || (vercelHost ? `https://${vercelHost}` : 'http://localhost:3000')
).replace(/\/+$/, '');

export const SITE_NAME = 'GymCore';

// Global metadata (rendered outside [locale]) — written in the app's primary language (EN).
export const SITE_DESCRIPTION =
  'Free workout journal with no ads and no subscriptions: sets and supersets, calendar history, progress charts, body measurements, program templates and an AI coach. 312 exercises with anatomy.';
