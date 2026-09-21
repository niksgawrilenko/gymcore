import 'server-only';
import { eq } from 'drizzle-orm';
import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import { cache } from 'react';
import { db } from '@/db';
import { users } from '@/db/schema';
import { SESSION_COOKIE, SESSION_MAX_AGE, signSession, verifySession, type SessionUser } from './session';

export const getUser = cache(async () => verifySession((await cookies()).get(SESSION_COOKIE)?.value));

/** Для страниц и Server Actions: без сессии — на логин. */
export async function requireUser(): Promise<SessionUser> {
  const user = await getUser();
  if (!user) redirect('/login');
  return user;
}

/** Роль берём из БД, а не из токена: снятые права действуют сразу. */
export async function requireAdmin(): Promise<SessionUser> {
  const user = await requireUser();
  const [row] = await db.select({ role: users.role }).from(users).where(eq(users.id, user.id));
  if (row?.role !== 'admin') redirect('/');
  return user;
}

export async function startSession(user: SessionUser) {
  (await cookies()).set(SESSION_COOKIE, await signSession(user), {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/',
    maxAge: SESSION_MAX_AGE,
  });
}

export async function endSession() {
  (await cookies()).delete(SESSION_COOKIE);
}
