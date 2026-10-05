// Types for the EXISTING database schema (dumped with `drizzle-kit pull`).
// This project never alters table structure — it only reads and writes data; indexes live in db/indexes.sql.
import { relations, sql } from 'drizzle-orm';
import { boolean, integer, jsonb, numeric, pgTable, serial, text, timestamp, unique, uuid, varchar } from 'drizzle-orm/pg-core';

export type Media = { type: 'image' | 'video'; url: string };

export const users = pgTable('users', {
  id: serial().primaryKey(),
  username: varchar({ length: 50 }).notNull().unique(),
  passwordHash: varchar('password_hash', { length: 255 }).notNull(),
  createdAt: timestamp('created_at', { mode: 'date' }).default(sql`CURRENT_TIMESTAMP`),
  role: varchar({ length: 20 }).default('user'),
});

export const exercises = pgTable('exercises', {
  id: serial().primaryKey(),
  name: varchar({ length: 100 }).notNull(),
  category: varchar({ length: 50 }),
  exerciseType: varchar('exercise_type', { length: 20 }).default('strength'),
  userId: integer('user_id').references(() => users.id, { onDelete: 'cascade' }),
  isPublic: boolean('is_public').default(false),
  shareId: uuid('share_id').defaultRandom(),
  moderationStatus: varchar('moderation_status', { length: 20 }).default('none'),
  primaryGroups: text('primary_groups').array().default(sql`'{}'::text[]`),
  secondaryMuscles: text('secondary_muscles').array().default(sql`'{}'::text[]`),
  equipment: varchar({ length: 255 }),
});

// i18n: translations of exercise names. The Russian name stays in exercises.name; this table only
// holds the per-locale translation (see db/schema.sql and docs/i18n-plan.md §5).
export const exerciseTranslations = pgTable(
  'exercise_translations',
  {
    id: serial().primaryKey(),
    exerciseId: integer('exercise_id')
      .notNull()
      .references(() => exercises.id, { onDelete: 'cascade' }),
    locale: varchar({ length: 5 }).notNull(),
    name: varchar({ length: 100 }).notNull(),
    updatedAt: timestamp('updated_at', { mode: 'date' }).default(sql`CURRENT_TIMESTAMP`),
  },
  (t) => [unique().on(t.exerciseId, t.locale)],
);

// i18n: translations of reference strings that have no id of their own (muscle groups, categories,
// equipment, service labels). `source_value` keeps the original Russian value as is: a translation is
// looked up by (kind, source_value), so renaming a Russian value requires updating this table.
// kind: primary_group | secondary_muscle | category | equipment | ui_string
export const referenceTranslations = pgTable(
  'reference_translations',
  {
    id: serial().primaryKey(),
    kind: varchar({ length: 30 }).notNull(),
    sourceValue: varchar('source_value', { length: 255 }).notNull(),
    locale: varchar({ length: 5 }).notNull(),
    value: varchar({ length: 255 }).notNull(),
    updatedAt: timestamp('updated_at', { mode: 'date' }).default(sql`CURRENT_TIMESTAMP`),
  },
  (t) => [unique().on(t.kind, t.sourceValue, t.locale)],
);

export const templates = pgTable('templates', {
  id: serial().primaryKey(),
  name: varchar({ length: 100 }).notNull(),
  description: text(),
  moderationStatus: varchar('moderation_status', { length: 20 }).default('none'),
  userId: integer('user_id').references(() => users.id, { onDelete: 'cascade' }),
  isPublic: boolean('is_public').default(false),
  shareId: uuid('share_id').defaultRandom(),
});

export const templateExercises = pgTable('template_exercises', {
  id: serial().primaryKey(),
  templateId: integer('template_id').references(() => templates.id, { onDelete: 'cascade' }),
  exerciseId: integer('exercise_id').references(() => exercises.id, { onDelete: 'cascade' }),
  sortOrder: integer('sort_order').default(0),
  supersetId: varchar('superset_id', { length: 50 }),
});

export const templateSets = pgTable('template_sets', {
  id: serial().primaryKey(),
  templateExerciseId: integer('template_exercise_id').references(() => templateExercises.id, { onDelete: 'cascade' }),
  setOrder: integer('set_order').default(0),
  weight: numeric({ precision: 5, scale: 2 }),
  reps: integer(),
  // Legacy columns: never read or written by the app (cardio is stored as weight = minutes, reps = meters).
  // Kept only to mirror the database; do not start using them without a new migration.
  durationSec: integer('duration_sec'),
  distanceM: integer('distance_m'),
});

export const workouts = pgTable('workouts', {
  id: serial().primaryKey(),
  title: varchar({ length: 100 }).notNull(),
  templateId: integer('template_id').references(() => templates.id, { onDelete: 'set null' }),
  workoutDate: timestamp('workout_date', { mode: 'date' }).default(sql`CURRENT_TIMESTAMP`),
  userId: integer('user_id').references(() => users.id, { onDelete: 'cascade' }),
  media: jsonb().$type<Media[]>().default([]),
});

export const workoutExercises = pgTable('workout_exercises', {
  id: serial().primaryKey(),
  workoutId: integer('workout_id').references(() => workouts.id, { onDelete: 'cascade' }),
  exerciseId: integer('exercise_id').references(() => exercises.id, { onDelete: 'cascade' }),
  supersetId: varchar('superset_id', { length: 50 }),
  sortOrder: integer('sort_order').default(0),
});

export const sets = pgTable('sets', {
  id: serial().primaryKey(),
  workoutExerciseId: integer('workout_exercise_id').references(() => workoutExercises.id, { onDelete: 'cascade' }),
  setOrder: integer('set_order').default(0),
  weight: numeric({ precision: 5, scale: 2 }),
  reps: integer(),
  // Legacy columns, same as template_sets: unused by the app (see the note there).
  durationSec: integer('duration_sec'),
  distanceM: integer('distance_m'),
  completed: boolean().default(false),
});

export const measurements = pgTable('measurements', {
  id: serial().primaryKey(),
  userId: integer('user_id').references(() => users.id, { onDelete: 'cascade' }),
  date: timestamp({ mode: 'date' }).default(sql`CURRENT_TIMESTAMP`),
  weight: numeric({ precision: 5, scale: 2 }),
  chest: numeric({ precision: 5, scale: 2 }),
  waist: numeric({ precision: 5, scale: 2 }),
  biceps: numeric({ precision: 5, scale: 2 }),
  thighs: numeric({ precision: 5, scale: 2 }),
  calves: numeric({ precision: 5, scale: 2 }),
  shoulders: numeric({ precision: 5, scale: 2 }),
  neck: numeric({ precision: 5, scale: 2 }),
});

// --- Relations for nested relational queries (one SQL query instead of N+1) ---

export const templatesRelations = relations(templates, ({ many }) => ({
  templateExercises: many(templateExercises),
}));

export const templateExercisesRelations = relations(templateExercises, ({ one, many }) => ({
  template: one(templates, { fields: [templateExercises.templateId], references: [templates.id] }),
  exercise: one(exercises, { fields: [templateExercises.exerciseId], references: [exercises.id] }),
  templateSets: many(templateSets),
}));

export const workoutsRelations = relations(workouts, ({ many }) => ({
  workoutExercises: many(workoutExercises),
}));

export const workoutExercisesRelations = relations(workoutExercises, ({ one, many }) => ({
  workout: one(workouts, { fields: [workoutExercises.workoutId], references: [workouts.id] }),
  exercise: one(exercises, { fields: [workoutExercises.exerciseId], references: [exercises.id] }),
  sets: many(sets),
}));
