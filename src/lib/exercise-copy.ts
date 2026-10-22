// Copies of somebody else's exercises (a shared link). A shared row cannot be referenced by another
// user: the access rule is "public OR own" (visibleTo in ./data), so the importer gets his own copy.
import 'server-only';
import { sql } from 'drizzle-orm';
import { db } from '@/db';
import { exercises } from '@/db/schema';
import type { ExerciseInfo } from './types';

/**
 * Creates a private copy of an exercise for `userId` and returns its id.
 * The name is copied as is — exercises.name is the "data language" (docs/i18n-plan.md §5) — and the
 * source translations go with it, otherwise an English user would see the Russian original.
 */
export async function copyExerciseForUser(userId: number, src: ExerciseInfo): Promise<number> {
  // Same fallback as the exercise form: the first primary group doubles as the category.
  const primaryGroups = src.primary_groups.length ? src.primary_groups : [src.category ?? 'Другое'];
  const [row] = await db
    .insert(exercises)
    .values({
      name: src.name,
      category: primaryGroups[0],
      exerciseType: src.exercise_type === 'cardio' ? 'cardio' : 'strength',
      primaryGroups,
      secondaryMuscles: src.secondary_muscles,
      equipment: src.equipment,
      userId,
    })
    .returning({ id: exercises.id });

  await db.execute(sql`
    insert into exercise_translations (exercise_id, locale, name, updated_at)
    select ${row.id}, locale, name, CURRENT_TIMESTAMP
    from exercise_translations
    where exercise_id = ${src.id}
    on conflict (exercise_id, locale) do nothing
  `);
  return row.id;
}
