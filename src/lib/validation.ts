import { z } from 'zod';

const blankToNull = (v: unknown) => (v === '' || v === undefined || v === null ? null : Number(v));

// NUMERIC(5,2) in the database -> 999.99 max
const weight = z.preprocess(blankToNull, z.number().finite().min(0).max(999.99).nullable());
const reps = z.preprocess(blankToNull, z.number().int().min(0).max(1_000_000).nullable());

const exerciseEntry = z.object({
  id: z.number().int().positive(),
  isSuperset: z.boolean(),
  sets: z.array(z.object({ weight, reps, completed: z.boolean().optional() })).max(100),
});

export const workoutInput = z.object({
  title: z.string().trim().min(1, 'titleRequired').max(100),
  workout_date: z.number().int().positive(),
  template_id: z.number().int().positive().nullable().optional(),
  exercises: z.array(exerciseEntry).max(100),
  media: z
    .array(z.object({ type: z.enum(['image', 'video']), url: z.url().startsWith('https://res.cloudinary.com/') }))
    .max(50),
});
export type WorkoutInput = z.input<typeof workoutInput>;

export const templateInput = z.object({
  name: z.string().trim().min(1, 'titleRequired').max(100),
  description: z.string().trim().max(2000).nullable().optional(),
  exercises: z.array(exerciseEntry).max(100),
});
export type TemplateInput = z.input<typeof templateInput>;

export const exerciseInput = z.object({
  name: z.string().trim().min(1, 'nameRequired').max(100),
  exercise_type: z.enum(['strength', 'cardio']),
  primary_groups: z.array(z.string().trim().min(1).max(50)).min(1, 'groupsRequired').max(20),
  secondary_muscles: z.array(z.string().trim().min(1).max(50)).max(50),
});
export type ExerciseInput = z.input<typeof exerciseInput>;

export const credentials = z.object({
  username: z.string().trim().min(3, 'usernameTooShort').max(50),
  password: z.string().min(6, 'passwordTooShort').max(200),
});

/** Assigns superset_id to runs of consecutive exercises (isSuperset = linked to the previous one). */
export function assignSupersetIds(list: { isSuperset: boolean }[]): (string | null)[] {
  const stamp = Date.now();
  let current: string | null = null;
  return list.map((ex, i) => {
    if (ex.isSuperset && i > 0) return current;
    current = list[i + 1]?.isSuperset ? `ss_${stamp}_${i}` : null;
    return current;
  });
}

// Messages are keys from messages('errors'): the client translates them (see useActionError).
export const firstError = (e: z.ZodError) => e.issues[0]?.message ?? 'invalidData';
