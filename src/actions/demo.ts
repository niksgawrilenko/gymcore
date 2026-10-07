'use server';
import { redirect } from 'next/navigation';
import { startSession } from '@/lib/auth';
import { startDemoSession } from '@/lib/demo';
import { allowRequest, clientIp, RATE_LIMITS } from '@/lib/rate-limit';
import { localeHref } from '@/i18n/server';

// The action returns a code; DemoButton translates it (messages/demo.errors).
export type DemoErrorCode = 'unavailable' | 'tooManyAttempts';
export type DemoState = { error?: DemoErrorCode } | undefined;

// Starts an ephemeral demo (fresh `demo+<random>` account with a copy of the seeded data) and signs in.
export async function startDemo(_prev: DemoState, _formData: FormData): Promise<DemoState> {
  const ip = await clientIp();
  // Each start clones a whole account, so keep one address from spawning them in a loop.
  if (!allowRequest(`demo:${ip}`, RATE_LIMITS.demoIp)) return { error: 'tooManyAttempts' };

  try {
    const user = await startDemoSession();
    await startSession(user);
  } catch {
    // The canonical demo user is missing or the clone failed — the button reports it instead of crashing.
    return { error: 'unavailable' };
  }

  redirect(await localeHref('/'));
}
