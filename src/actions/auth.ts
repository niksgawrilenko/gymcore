'use server';
import bcrypt from 'bcryptjs';
import { eq } from 'drizzle-orm';
import { redirect } from 'next/navigation';
import { db } from '@/db';
import { users } from '@/db/schema';
import { endSession, startSession } from '@/lib/auth';
import { credentials, firstError } from '@/lib/validation';

export type AuthState = { error?: string } | undefined;

// Старые пароли (bcrypt из прежнего бэкенда) подходят как есть.
export async function authenticate(_prev: AuthState, formData: FormData): Promise<AuthState> {
  const mode = formData.get('mode') === 'register' ? 'register' : 'login';
  const username = String(formData.get('username') ?? '').trim();
  const password = String(formData.get('password') ?? '');

  if (mode === 'register') {
    const parsed = credentials.safeParse({ username, password });
    if (!parsed.success) return { error: firstError(parsed.error) };

    const hash = await bcrypt.hash(password, 10);
    const [created] = await db
      .insert(users)
      .values({ username, passwordHash: hash })
      .onConflictDoNothing({ target: users.username })
      .returning({ id: users.id, role: users.role });
    if (!created) return { error: 'Пользователь с таким именем уже существует' };
    await startSession({ id: created.id, username, role: created.role ?? 'user' });
  } else {
    if (!username || !password) return { error: 'Введите логин и пароль' };
    const [user] = await db.select().from(users).where(eq(users.username, username));
    if (!user || !(await bcrypt.compare(password, user.passwordHash))) {
      return { error: 'Неверный логин или пароль' };
    }
    await startSession({ id: user.id, username: user.username, role: user.role ?? 'user' });
  }

  const next = String(formData.get('next') ?? '');
  redirect(next.startsWith('/') && !next.startsWith('//') ? next : '/');
}

export async function logout() {
  await endSession();
  redirect('/login');
}
