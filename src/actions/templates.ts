'use server';
import { and, eq } from 'drizzle-orm';
import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { db } from '@/db';
import { templateExercises, templateSets, templates } from '@/db/schema';
import { requireUser } from '@/lib/auth';
import { getSharedTemplate } from '@/lib/data';
import { copyExerciseForUser } from '@/lib/exercise-copy';
import { assignSupersetIds, firstError, templateInput, type TemplateInput } from '@/lib/validation';
import { localeHref } from '@/i18n/server';
import { exercisesVisible, fail, ok, visibleExerciseIds, type ActionResult } from './_shared';

export async function saveTemplate(input: TemplateInput, id?: number): Promise<ActionResult<{ id: number }>> {
  const user = await requireUser();
  const parsed = templateInput.safeParse(input);
  if (!parsed.success) return fail(firstError(parsed.error));
  const t = parsed.data;

  if (!(await exercisesVisible(user.id, t.exercises.map((e) => e.id)))) return fail('exerciseNotFound');

  const supersetIds = assignSupersetIds(t.exercises);

  const templateId = await db.transaction(async (tx) => {
    let tid: number;
    if (id) {
      const updated = await tx
        .update(templates)
        .set({ name: t.name, ...(t.description !== undefined && { description: t.description }) })
        .where(and(eq(templates.id, id), eq(templates.userId, user.id)))
        .returning({ id: templates.id });
      if (!updated.length) return null;
      tid = id;
      await tx.delete(templateExercises).where(eq(templateExercises.templateId, tid));
    } else {
      const [created] = await tx
        .insert(templates)
        .values({ name: t.name, description: t.description ?? null, userId: user.id })
        .returning({ id: templates.id });
      tid = created.id;
    }

    if (t.exercises.length) {
      const teRows = await tx
        .insert(templateExercises)
        .values(t.exercises.map((ex, i) => ({ templateId: tid, exerciseId: ex.id, supersetId: supersetIds[i], sortOrder: i })))
        .returning({ id: templateExercises.id, sortOrder: templateExercises.sortOrder });

      const teIdByOrder = new Map(teRows.map((r) => [r.sortOrder, r.id]));
      const setRows = t.exercises.flatMap((ex, i) =>
        ex.sets.map((s, j) => ({
          templateExerciseId: teIdByOrder.get(i)!,
          setOrder: j,
          weight: s.weight === null ? null : String(s.weight),
          reps: s.reps,
        })),
      );
      if (setRows.length) await tx.insert(templateSets).values(setRows);
    }
    return tid;
  });

  if (!templateId) return fail('noPermission');
  revalidatePath('/', 'layout');
  return ok({ id: templateId });
}

export async function deleteTemplate(id: number): Promise<ActionResult> {
  const user = await requireUser();
  await db.delete(templates).where(and(eq(templates.id, id), eq(templates.userId, user.id)));
  revalidatePath('/', 'layout');
  return ok(undefined);
}

export async function submitTemplateForModeration(id: number): Promise<ActionResult> {
  const user = await requireUser();
  await db
    .update(templates)
    .set({ moderationStatus: 'pending' })
    .where(and(eq(templates.id, id), eq(templates.userId, user.id)));
  revalidatePath('/', 'layout');
  return ok(undefined);
}

/** A copy of a shared template, together with its sets and supersets. */
export async function importSharedTemplate(shareId: string) {
  const user = await requireUser();
  // locale is not needed here: only exercise ids are copied (names come from the shared template as is).
  const tpl = await getSharedTemplate(shareId, 'ru');
  if (!tpl) return fail('templateNotFound');

  // The author's private exercises are invisible to everybody else, so they cannot be referenced:
  // each of them is first copied into the importer's own library (otherwise the whole import fails).
  const visible = await visibleExerciseIds(user.id, tpl.exercises.map((ex) => ex.id));
  const copyOf = new Map<number, number>();
  for (const ex of tpl.exercises) {
    if (!visible.has(ex.id)) copyOf.set(ex.id, await copyExerciseForUser(user.id, ex));
  }

  let prev: string | null = null;
  const res = await saveTemplate({
    name: tpl.name,
    description: tpl.description,
    exercises: tpl.exercises.map((ex) => {
      const isSuperset = !!ex.superset_id && ex.superset_id === prev;
      prev = ex.superset_id;
      return { id: copyOf.get(ex.id) ?? ex.id, isSuperset, sets: ex.sets.map((s) => ({ weight: s.weight, reps: s.reps })) };
    }),
  });
  if (!res.ok) return res;
  redirect(await localeHref('/templates'));
}
