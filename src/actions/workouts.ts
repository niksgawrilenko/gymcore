'use server';
import { and, eq } from 'drizzle-orm';
import { revalidatePath } from 'next/cache';
import { db } from '@/db';
import { sets, workoutExercises, workouts } from '@/db/schema';
import { requireUser } from '@/lib/auth';
import { assignSupersetIds, firstError, workoutInput, type WorkoutInput } from '@/lib/validation';
import { exercisesVisible, fail, ok, type ActionResult } from './_shared';

/**
 * Создание/обновление тренировки. Было: 1 INSERT на КАЖДЫЙ подход (~45 запросов подряд).
 * Стало: 3 запроса в транзакции — тренировка, все упражнения пачкой, все подходы пачкой.
 */
export async function saveWorkout(input: WorkoutInput, id?: number): Promise<ActionResult<{ id: number }>> {
  const user = await requireUser();
  const parsed = workoutInput.safeParse(input);
  if (!parsed.success) return fail(firstError(parsed.error));
  const w = parsed.data;

  if (!(await exercisesVisible(user.id, w.exercises.map((e) => e.id)))) return fail('Упражнение не найдено');

  const supersetIds = assignSupersetIds(w.exercises);
  const values = { title: w.title, workoutDate: new Date(w.workout_date), media: w.media };

  const workoutId = await db.transaction(async (tx) => {
    let wid: number;
    if (id) {
      const updated = await tx
        .update(workouts)
        .set(values)
        .where(and(eq(workouts.id, id), eq(workouts.userId, user.id)))
        .returning({ id: workouts.id });
      if (!updated.length) return null;
      wid = id;
      await tx.delete(workoutExercises).where(eq(workoutExercises.workoutId, wid)); // подходы удалятся каскадом
    } else {
      const [created] = await tx
        .insert(workouts)
        .values({ ...values, userId: user.id, templateId: w.template_id ?? null })
        .returning({ id: workouts.id });
      wid = created.id;
    }

    if (w.exercises.length) {
      const weRows = await tx
        .insert(workoutExercises)
        .values(w.exercises.map((ex, i) => ({ workoutId: wid, exerciseId: ex.id, supersetId: supersetIds[i], sortOrder: i })))
        .returning({ id: workoutExercises.id, sortOrder: workoutExercises.sortOrder });

      const weIdByOrder = new Map(weRows.map((r) => [r.sortOrder, r.id]));
      const setRows = w.exercises.flatMap((ex, i) =>
        ex.sets.map((s, j) => ({
          workoutExerciseId: weIdByOrder.get(i)!,
          setOrder: j,
          weight: s.weight === null ? null : String(s.weight),
          reps: s.reps,
          completed: !!s.completed,
        })),
      );
      if (setRows.length) await tx.insert(sets).values(setRows);
    }
    return wid;
  });

  if (!workoutId) return fail('Тренировка не найдена');
  revalidatePath('/', 'layout');
  return ok({ id: workoutId });
}

export async function deleteWorkout(id: number): Promise<ActionResult> {
  const user = await requireUser();
  await db.delete(workouts).where(and(eq(workouts.id, id), eq(workouts.userId, user.id)));
  revalidatePath('/', 'layout');
  return ok(undefined);
}
