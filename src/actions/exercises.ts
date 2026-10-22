'use server';
import { and, eq } from 'drizzle-orm';
import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { db } from '@/db';
import { exerciseTranslations, exercises } from '@/db/schema';
import { requireUser } from '@/lib/auth';
import { getSharedExercise, toExerciseInfo } from '@/lib/data';
import { copyExerciseForUser } from '@/lib/exercise-copy';
import type { ExerciseInfo } from '@/lib/types';
import { exerciseInput, firstError, type ExerciseInput } from '@/lib/validation';
import { currentLocale, localeHref } from '@/i18n/server';
import { fail, ok, type ActionResult } from './_shared';

export async function saveExercise(input: ExerciseInput, id?: number): Promise<ActionResult<ExerciseInfo>> {
  const user = await requireUser();
  const locale = await currentLocale();
  const parsed = exerciseInput.safeParse(input);
  if (!parsed.success) return fail(firstError(parsed.error));
  const e = parsed.data;

  const shared = {
    category: e.primary_groups[0],
    exerciseType: e.exercise_type,
    primaryGroups: e.primary_groups,
    secondaryMuscles: e.secondary_muscles,
  };
  // The original name lives in exercises.name (the "data language"). An edit in another locale must not
  // overwrite it — the new name goes into exercise_translations instead (docs/i18n-plan.md §2.1, §6).
  const [row] = id
    ? await db
        .update(exercises)
        .set(locale === 'ru' ? { ...shared, name: e.name } : shared)
        .where(and(eq(exercises.id, id), eq(exercises.userId, user.id)))
        .returning()
    : await db.insert(exercises).values({ ...shared, name: e.name, userId: user.id }).returning();

  if (!row) return fail('noPermission');

  if (id && locale !== 'ru') {
    // Renaming an existing exercise outside the data language: store the translation, keep the original.
    await db
      .insert(exerciseTranslations)
      .values({ exerciseId: row.id, locale, name: e.name })
      .onConflictDoUpdate({
        target: [exerciseTranslations.exerciseId, exerciseTranslations.locale],
        set: { name: e.name, updatedAt: new Date() },
      });
  }

  revalidatePath('/', 'layout');
  // The caller re-renders the list from this payload: return the name the user just typed — for
  // non-data locales the original stored in exercises.name intentionally stays untouched.
  return ok({ ...toExerciseInfo(row), name: e.name });
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
  const user = await requireUser();
  // No locale: the copy is created under the original (Russian) name — the "data language".
  const ex = await getSharedExercise(shareId);
  if (!ex) return fail('exerciseNotFound');
  await copyExerciseForUser(user.id, ex);
  revalidatePath('/', 'layout');
  redirect(await localeHref('/exercises'));
}
