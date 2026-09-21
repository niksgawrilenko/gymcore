import 'server-only';
import { and, eq, inArray, or } from 'drizzle-orm';
import { db } from '@/db';
import { exercises } from '@/db/schema';

export type ActionResult<T = undefined> = { ok: true; data: T } | { ok: false; error: string };

export const ok = <T>(data: T): ActionResult<T> => ({ ok: true, data });
export const fail = (error: string): ActionResult<never> => ({ ok: false, error });

/** Все упражнения должны быть доступны пользователю (свои или публичные). */
export async function exercisesVisible(userId: number, ids: number[]) {
  const unique = [...new Set(ids)];
  if (unique.length === 0) return true;
  const rows = await db
    .select({ id: exercises.id })
    .from(exercises)
    .where(and(inArray(exercises.id, unique), or(eq(exercises.isPublic, true), eq(exercises.userId, userId))));
  return rows.length === unique.length;
}
