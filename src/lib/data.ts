// Page data reads. Every function issues a single SQL query: Drizzle relational queries nest
// exercises/sets through json aggregation on the Postgres side (no N+1).
import 'server-only';
import { and, asc, desc, eq, getTableColumns, or, sql, type SQL } from 'drizzle-orm';
import { cookies } from 'next/headers';
import { db } from '@/db';
import { exercises, measurements, templates, workoutExercises, workouts } from '@/db/schema';
import { DEFAULT_TZ, isValidTz, TZ_COOKIE } from './dates';
import { nameKey, type ExerciseInfo, type ExerciseListItem, type PrevSetsMap } from './types';

export async function getTz() {
  const tz = (await cookies()).get(TZ_COOKIE)?.value;
  return isValidTz(tz) ? tz : DEFAULT_TZ;
}

type ExerciseRow = typeof exercises.$inferSelect;

export const toExerciseInfo = (e: ExerciseRow): ExerciseInfo => ({
  id: e.id,
  name: e.name,
  exercise_type: e.exerciseType ?? 'strength',
  category: e.category,
  primary_groups: e.primaryGroups ?? [],
  secondary_muscles: e.secondaryMuscles ?? [],
  equipment: e.equipment,
});

/** Access rule shared with the actions layer: an exercise is visible if it is public or the user's own. */
export const visibleTo = (userId: number) => or(eq(exercises.isPublic, true), eq(exercises.userId, userId));

/** All exercises available to the user plus how many times they were performed (search sorting). */
export async function getExercises(userId: number): Promise<ExerciseListItem[]> {
  // Single pass: the usage counter is aggregated over the same join instead of a correlated
  // sub-select executed once per exercise row.
  const rows = await db
    .select({
      ...getTableColumns(exercises),
      usage: sql<number>`count(${workouts.id})::int`,
    })
    .from(exercises)
    .leftJoin(workoutExercises, eq(workoutExercises.exerciseId, exercises.id))
    .leftJoin(workouts, and(eq(workouts.id, workoutExercises.workoutId), eq(workouts.userId, userId)))
    .where(visibleTo(userId))
    .groupBy(exercises.id)
    .orderBy(asc(exercises.name));

  return rows.map((r) => ({
    ...toExerciseInfo(r),
    user_id: r.userId,
    share_id: r.shareId,
    moderation_status: r.moderationStatus,
    usage_count: r.usage,
  }));
}

export async function getWorkoutList(userId: number) {
  const rows = await db
    .select({ id: workouts.id, title: workouts.title, date: workouts.workoutDate })
    .from(workouts)
    .where(eq(workouts.userId, userId))
    .orderBy(desc(workouts.workoutDate));
  return rows.map((r) => ({ id: r.id, title: r.title, date: r.date?.getTime() ?? 0 }));
}

/** A whole workout. Ownership is enforced right in the WHERE clause. */
export async function getWorkout(userId: number, id: number) {
  const w = await db.query.workouts.findFirst({
    where: and(eq(workouts.id, id), eq(workouts.userId, userId)),
    with: {
      workoutExercises: {
        orderBy: (we, { asc }) => [asc(we.sortOrder)],
        with: { exercise: true, sets: { orderBy: (s, { asc }) => [asc(s.setOrder)] } },
      },
    },
  });
  if (!w) return null;
  return {
    id: w.id,
    title: w.title,
    template_id: w.templateId,
    workout_date: w.workoutDate?.getTime() ?? Date.now(),
    media: w.media ?? [],
    exercises: w.workoutExercises
      .filter((we) => we.exercise)
      .map((we) => ({
        ...toExerciseInfo(we.exercise!),
        superset_id: we.supersetId,
        sets: we.sets.map((s) => ({ weight: s.weight, reps: s.reps, completed: s.completed })),
      })),
  };
}

export async function getTemplateList(userId: number) {
  return db
    .select({
      id: templates.id,
      name: templates.name,
      description: templates.description,
      userId: templates.userId,
      shareId: templates.shareId,
      moderationStatus: templates.moderationStatus,
    })
    .from(templates)
    .where(or(eq(templates.isPublic, true), eq(templates.userId, userId)))
    .orderBy(desc(templates.id));
}

async function findTemplate(where: SQL | undefined) {
  const t = await db.query.templates.findFirst({
    where,
    with: {
      templateExercises: {
        orderBy: (te, { asc }) => [asc(te.sortOrder)],
        with: { exercise: true, templateSets: { orderBy: (s, { asc }) => [asc(s.setOrder)] } },
      },
    },
  });
  if (!t) return null;
  return {
    id: t.id,
    name: t.name,
    description: t.description,
    userId: t.userId,
    exercises: t.templateExercises
      .filter((te) => te.exercise)
      .map((te) => ({
        ...toExerciseInfo(te.exercise!),
        superset_id: te.supersetId,
        sets: te.templateSets.map((s) => ({ weight: s.weight, reps: s.reps, completed: false })),
      })),
  };
}

export const getTemplate = (userId: number, id: number) =>
  findTemplate(and(eq(templates.id, id), or(eq(templates.isPublic, true), eq(templates.userId, userId))));

export const getSharedTemplate = (shareId: string) => findTemplate(eq(templates.shareId, shareId));

export async function getSharedExercise(shareId: string) {
  const [row] = await db.select().from(exercises).where(eq(exercises.shareId, shareId));
  return row ? toExerciseInfo(row) : null;
}

/**
 * Latest performed set list per exercise (keyed by lowercase exercise name).
 * The key is lowercased in JS: Postgres lower() is locale-dependent and may not handle Cyrillic.
 */
export async function getPrevSets(userId: number): Promise<PrevSetsMap> {
  const { rows } = await db.execute<{ name: string; sets: PrevSetsMap[string] }>(sql`
    with last_we as (
      select distinct on (e.name) e.name, w.workout_date, we.id as we_id
      from workout_exercises we
      join workouts w on w.id = we.workout_id
      join exercises e on e.id = we.exercise_id
      where w.user_id = ${userId}
        and exists (select 1 from sets s where s.workout_exercise_id = we.id and (s.weight is not null or s.reps is not null))
      order by e.name, w.workout_date desc
    )
    select l.name,
      (select json_agg(json_build_object('weight', s.weight, 'reps', s.reps) order by s.set_order)
         from sets s where s.workout_exercise_id = l.we_id) as sets
    from last_we l
    order by l.workout_date asc
  `);
  // Ordered by date: among case-insensitive name matches the fresher workout wins
  return Object.fromEntries(rows.map((r) => [nameKey(r.name), r.sets ?? []]));
}

export async function getProfileCounts(userId: number) {
  const { rows } = await db.execute<{ workouts: number; exercises: number; templates: number }>(sql`
    select
      (select count(*)::int from workouts where user_id = ${userId}) as workouts,
      (select count(*)::int from exercises where user_id = ${userId}) as exercises,
      (select count(*)::int from templates where user_id = ${userId}) as templates
  `);
  return rows[0];
}

export async function getMeasurements(userId: number, limit: number) {
  return db
    .select()
    .from(measurements)
    .where(eq(measurements.userId, userId))
    .orderBy(desc(measurements.date))
    .limit(limit);
}

// A "performed" set — same rule as the legacy stats: checked OR filled in.
const DONE = sql.raw('(s.completed or s.weight is not null or s.reps is not null)');

export async function getStats(userId: number) {
  const [totals, muscles, months, usage] = await Promise.all([
    db.execute<{ sets: number; workouts: number }>(sql`
      select
        (select count(*)::int from sets s
           join workout_exercises we on we.id = s.workout_exercise_id
           join workouts w on w.id = we.workout_id
          where w.user_id = ${userId} and ${DONE}) as sets,
        (select count(*)::int from workouts where user_id = ${userId}) as workouts
    `),
    db.execute<{ label: string; sets: number }>(sql`
      select coalesce(e.category, e.primary_groups[1], 'Другое') as label, count(*)::int as sets
      from sets s
      join workout_exercises we on we.id = s.workout_exercise_id
      join workouts w on w.id = we.workout_id
      join exercises e on e.id = we.exercise_id
      where w.user_id = ${userId} and ${DONE}
      group by 1 order by 2 desc
    `),
    db.execute<{ month: string; count: number }>(sql`
      select to_char(date_trunc('month', workout_date), 'YYYY-MM') as month, count(*)::int as count
      from workouts where user_id = ${userId}
      group by 1 order by 1
    `),
    db.execute<{ name: string; count: number }>(sql`
      select e.name, count(*)::int as count
      from workout_exercises we
      join workouts w on w.id = we.workout_id
      join exercises e on e.id = we.exercise_id
      where w.user_id = ${userId}
      group by e.name order by 2 desc, 1
    `),
  ]);
  return {
    totalSets: totals.rows[0].sets,
    totalWorkouts: totals.rows[0].workouts,
    muscles: muscles.rows,
    months: months.rows,
    exercises: usage.rows,
  };
}

/** Per-exercise progress: max weight and set count for each workout. */
export async function getExerciseProgress(userId: number, exerciseName: string) {
  const { rows } = await db.execute<{ date: string; max_weight: string | null; sets: number }>(sql`
    select to_char(w.workout_date, 'YYYY-MM-DD"T"HH24:MI:SS"Z"') as date,
           max(s.weight) as max_weight, count(*)::int as sets
    from sets s
    join workout_exercises we on we.id = s.workout_exercise_id
    join workouts w on w.id = we.workout_id
    join exercises e on e.id = we.exercise_id
    where w.user_id = ${userId} and e.name = ${exerciseName} and ${DONE}
    group by w.id, w.workout_date order by w.workout_date
  `);
  return rows.map((r) => ({ date: Date.parse(r.date), maxWeight: r.max_weight === null ? null : Number(r.max_weight), sets: r.sets }));
}
