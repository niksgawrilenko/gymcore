import 'server-only';
import { and, inArray } from 'drizzle-orm';
import { db } from '@/db';
import { exercises } from '@/db/schema';
import { visibleTo } from '@/lib/data';

export type ActionResult<T = undefined> = { ok: true; data: T } | { ok: false; error: string };

export const ok = <T>(data: T): ActionResult<T> => ({ ok: true, data });
export const fail = (error: string): ActionResult<never> => ({ ok: false, error });

/** All given exercises must be accessible to the user (own or public) — see visibleTo(). */
export async function exercisesVisible(userId: number, ids: number[]) {
  const unique = [...new Set(ids)];
  if (unique.length === 0) return true;
  const rows = await db
    .select({ id: exercises.id })
    .from(exercises)
    .where(and(inArray(exercises.id, unique), visibleTo(userId)));
  return rows.length === unique.length;
}
