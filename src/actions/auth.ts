'use server';
import bcrypt from 'bcryptjs';
import { eq } from 'drizzle-orm';
import { redirect } from 'next/navigation';
import { db } from '@/db';
import { users } from '@/db/schema';
import { endSession, startSession } from '@/lib/auth';
import { credentials } from '@/lib/validation';
import { localeHref } from '@/i18n/server';

// Error texts are not kept in the action: we return a code and LoginForm translates it (messages/login.errors).
export type AuthErrorCode =
  | 'usernameTaken'
  | 'credentialsRequired'
  | 'invalidCredentials'
  | 'usernameInvalid'
  | 'passwordInvalid';
export type AuthState = { error?: AuthErrorCode } | undefined;

// Legacy passwords (bcrypt hashes from the old backend) keep working as is.
export async function authenticate(_prev: AuthState, formData: FormData): Promise<AuthState> {
  const mode = formData.get('mode') === 'register' ? 'register' : 'login';
  const username = String(formData.get('username') ?? '').trim();
  const password = String(formData.get('password') ?? '');

  if (mode === 'register') {
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
    if (!username || !password) return { error: 'credentialsRequired' };
    const [user] = await db.select().from(users).where(eq(users.username, username));
    if (!user || !(await bcrypt.compare(password, user.passwordHash))) {
      return { error: 'invalidCredentials' };
    }
    await startSession({ id: user.id, username: user.username, role: user.role ?? 'user' });
  }

  const next = String(formData.get('next') ?? '');
  // `next` already carries the locale prefix (proxy adds it); the fallback is the current locale root.
  redirect(next.startsWith('/') && !next.startsWith('//') ? next : await localeHref('/'));
}

export async function logout() {
  await endSession();
  redirect(await localeHref('/login'));
}
