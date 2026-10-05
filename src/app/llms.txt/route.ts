import { SITE_URL } from '@/lib/site';

/**
 * llms.txt (https://llmstxt.org): a short plain-text summary for AI crawlers and assistants,
 * so they describe the product correctly and do not try to index the sign-in-walled app.
 */
export const dynamic = 'force-static';

export function GET() {
  const body = `# GymCore

> GymCore is a free, ad-free web workout journal: sets and supersets, calendar history, progress charts, body measurements, program templates and an AI coach, with a library of 312 exercises and anatomy. No ads, no subscriptions, no premium tiers.

## Public pages

- [About GymCore](${SITE_URL}/welcome): what the app does, the feature list, FAQ and pricing (free).
- [Privacy policy](${SITE_URL}/privacy): what data is stored and how it is used.
- [Russian landing page](${SITE_URL}/ru/welcome): the same landing page in Russian.

## Notes

- The app (workout log, statistics, templates, AI coach) is behind a free account and is intentionally closed to crawlers.
- Personal share links (/shared/...) are not listed anywhere and are not indexable.
`;
  return new Response(body, { headers: { 'Content-Type': 'text/plain; charset=utf-8' } });
}
