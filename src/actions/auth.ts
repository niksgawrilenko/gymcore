'use server';
import bcrypt from 'bcryptjs';
import { eq } from 'drizzle-orm';
import { redirect } from 'next/navigation';
import { db } from '@/db';
import { users } from '@/db/schema';
import { endSession, startSession } from '@/lib/auth';
import { allowRequest, clientIp, RATE_LIMITS, resetLimit } from '@/lib/rate-limit';
import { credentials } from '@/lib/validation';
import { localeHref } from '@/i18n/server';

// Error texts are not kept in the action: we return a code and LoginForm translates it (messages/login.errors).
export type AuthErrorCode =
  | 'usernameTaken'
  | 'credentialsRequired'
  | 'invalidCredentials'
  | 'usernameInvalid'
  | 'passwordInvalid'
  | 'tooManyAttempts';

// A real bcrypt hash of a fixed dummy string: comparing against it keeps the answer time the same
// for an unknown username as for a wrong password, so responses do not reveal existing accounts.
const DUMMY_HASH = '$2b$10$VPBpDmh.ujQihm60FsuAROCJArKB864otv3GUnNtSeGl3QMtguu1i';
export type AuthState = { error?: AuthErrorCode } | undefined;

// Legacy passwords (bcrypt hashes from the old backend) keep working as is.
export async function authenticate(_prev: AuthState, formData: FormData): Promise<AuthState> {
  const mode = formData.get('mode') === 'register' ? 'register' : 'login';
  const username = String(formData.get('username') ?? '').trim();
  const password = String(formData.get('password') ?? '');
  const ip = await clientIp();
  const userKey = `login:${ip}:${username.toLowerCase()}`;

  if (mode === 'register') {
    // Registration writes rows and does bcrypt work: keep a single address from flooding it.
    if (!allowRequest(`register:${ip}`, RATE_LIMITS.registerIp)) return { error: 'tooManyAttempts' };
    const parsed = credentials.safeParse({ username, password });
    if (!parsed.success) return { error: parsed.error.issues[0]?.path[0] === 'password' ? 'passwordInvalid' : 'usernameInvalid' };

    const hash = await bcrypt.hash(password, 10);
    const [created] = await db
      .insert(users)
      .values({ username, passwordHash: hash })
      .onConflictDoNothing({ target: users.username })
      .returning({ id: users.id, role: users.role });
    if (!created) return { error: 'usernameTaken' };
    await startSession({ id: created.id, username, role: created.role ?? 'user' });
  } else {
    // Password guessing: throttle the address and the address+username pair before any DB work.
    if (!allowRequest(`login:${ip}`, RATE_LIMITS.loginIp) || !allowRequest(userKey, RATE_LIMITS.loginUser)) {
      return { error: 'tooManyAttempts' };
    }
    if (!username || !password) return { error: 'credentialsRequired' };
    const [user] = await db.select().from(users).where(eq(users.username, username));
    if (!user) {
      await bcrypt.compare(password, DUMMY_HASH);
      return { error: 'invalidCredentials' };
    }
    if (!(await bcrypt.compare(password, user.passwordHash))) return { error: 'invalidCredentials' };
    // A clean sign-in wipes the counters so an earlier typo does not lock the user out.
    resetLimit(userKey);
    resetLimit(`login:${ip}`);
    await startSession({ id: user.id, username: user.username, role: user.role ?? 'user' });
  }

  const next = String(formData.get('next') ?? '');
  // `next` already carries the locale prefix (proxy adds it). Only a same-site path is accepted:
  // browsers read "\" as "/", so "/\evil.com" would otherwise become a protocol-relative redirect.
  const isLocalPath = next.startsWith('/') && !next.startsWith('//') && !next.includes('\\');
  redirect(isLocalPath ? next : await localeHref('/'));
}

export async function logout() {
  await endSession();
  redirect(await localeHref('/login'));
}
