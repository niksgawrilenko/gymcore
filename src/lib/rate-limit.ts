import 'server-only';
import { headers } from 'next/headers';

/**
 * A tiny in-memory rate limiter (fixed windows). Serverless instances do not share memory, so this
 * throttles abuse per warm instance instead of globally — enough to blunt password guessing and
 * upload spam without adding a store. Buckets are pruned and capped so the map cannot grow forever.
 */
export type RateLimitRule = { limit: number; windowMs: number };

export const RATE_LIMITS = {
  /** Password guessing against any account from one address. */
  loginIp: { limit: 10, windowMs: 10 * 60_000 },
  /** Password guessing against one account from one address (avoids locking out other users). */
  loginUser: { limit: 5, windowMs: 10 * 60_000 },
  /** Account spam. */
  registerIp: { limit: 5, windowMs: 60 * 60_000 },
  /** Cloudinary upload signatures — each one spends the operator's storage quota. */
  uploadUser: { limit: 60, windowMs: 60 * 60_000 },
} satisfies Record<string, RateLimitRule>;

const buckets = new Map<string, { count: number; resetAt: number }>();
const MAX_BUCKETS = 5_000;

/** Client address from the proxy headers the host sets; 'unknown' in a bare local run. */
export async function clientIp(): Promise<string> {
  const h = await headers();
  return h.get('x-forwarded-for')?.split(',')[0]?.trim() || h.get('x-real-ip')?.trim() || 'unknown';
}

/** true = the request is allowed (and counted); false = this window is exhausted. */
export function allowRequest(key: string, { limit, windowMs }: RateLimitRule): boolean {
  const now = Date.now();
  const bucket = buckets.get(key);
  if (!bucket || bucket.resetAt <= now) {
    if (buckets.size >= MAX_BUCKETS) prune(now);
    buckets.set(key, { count: 1, resetAt: now + windowMs });
    return true;
  }
  if (bucket.count >= limit) return false;
  bucket.count += 1;
  return true;
}

/** Clears a counter (e.g. after a successful sign-in) so earlier typos are not held against the user. */
export function resetLimit(key: string) {
  buckets.delete(key);
}

function prune(now: number) {
  for (const [key, bucket] of buckets) if (bucket.resetAt <= now) buckets.delete(key);
  // Still full of live buckets: drop the oldest half (Map keeps insertion order).
  if (buckets.size >= MAX_BUCKETS) {
    for (const key of [...buckets.keys()].slice(0, MAX_BUCKETS / 2)) buckets.delete(key);
  }
}
