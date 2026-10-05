'use server';
import { and, eq } from 'drizzle-orm';
import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { db } from '@/db';
import { exercises } from '@/db/schema';
import { requireUser } from '@/lib/auth';
import { getSharedExercise, toExerciseInfo } from '@/lib/data';
import type { ExerciseInfo } from '@/lib/types';
import { exerciseInput, firstError, type ExerciseInput } from '@/lib/validation';
import { localeHref } from '@/i18n/server';
import { fail, ok, type ActionResult } from './_shared';

export async function saveExercise(input: ExerciseInput, id?: number): Promise<ActionResult<ExerciseInfo>> {
  const user = await requireUser();
  const parsed = exerciseInput.safeParse(input);
  if (!parsed.success) return fail(firstError(parsed.error));
  const e = parsed.data;

  const values = {
    name: e.name,
    category: e.primary_groups[0],
    exerciseType: e.exercise_type,
    primaryGroups: e.primary_groups,
    secondaryMuscles: e.secondary_muscles,
  };

  const [row] = id
    ? await db.update(exercises).set(values).where(and(eq(exercises.id, id), eq(exercises.userId, user.id))).returning()
    : await db.insert(exercises).values({ ...values, userId: user.id }).returning();

  if (!row) return fail('noPermission');
  revalidatePath('/', 'layout');
  return ok(toExerciseInfo(row));
}

// WARNING: the foreign key is ON DELETE CASCADE — the whole workout history of an exercise goes with it.
export async function deleteExercise(id: number): Promise<ActionResult> {
  const user = await requireUser();
  await db.delete(exercises).where(and(eq(exercises.id, id), eq(exercises.userId, user.id)));
  revalidatePath('/', 'layout');
  return ok(undefined);
}

export async function submitExerciseForModeration(id: number): Promise<ActionResult> {
  const user = await requireUser();
  await db
    .update(exercises)
    .set({ moderationStatus: 'pending' })
    .where(and(eq(exercises.id, id), eq(exercises.userId, user.id)));
  revalidatePath('/', 'layout');
  return ok(undefined);
}

export async function importSharedExercise(shareId: string) {
  await requireUser();
  const ex = await getSharedExercise(shareId);
  if (!ex) return fail('exerciseNotFound');
  const res = await saveExercise({
    name: ex.name,
    exercise_type: ex.exercise_type === 'cardio' ? 'cardio' : 'strength',
    primary_groups: ex.primary_groups.length ? ex.primary_groups : [ex.category ?? 'Другое'],
    secondary_muscles: ex.secondary_muscles,
  });
  if (!res.ok) return res;
  redirect(await localeHref('/exercises'));
}
