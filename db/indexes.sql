-- Индексы для частых запросов. Только добавляет индексы — данные и структура таблиц не меняются.
-- Безопасно запускать повторно (IF NOT EXISTS).
-- Применение:  psql "$DATABASE_URL" -f db/indexes.sql

CREATE INDEX IF NOT EXISTS workouts_user_date_idx          ON workouts (user_id, workout_date DESC);
CREATE INDEX IF NOT EXISTS workout_exercises_workout_idx   ON workout_exercises (workout_id);
CREATE INDEX IF NOT EXISTS workout_exercises_exercise_idx  ON workout_exercises (exercise_id);
CREATE INDEX IF NOT EXISTS sets_workout_exercise_idx       ON sets (workout_exercise_id);
CREATE INDEX IF NOT EXISTS template_exercises_template_idx ON template_exercises (template_id);
CREATE INDEX IF NOT EXISTS template_exercises_exercise_idx ON template_exercises (exercise_id);
CREATE INDEX IF NOT EXISTS template_sets_te_idx            ON template_sets (template_exercise_id);
CREATE INDEX IF NOT EXISTS exercises_user_idx              ON exercises (user_id);
CREATE INDEX IF NOT EXISTS exercises_public_idx            ON exercises (is_public) WHERE is_public;
CREATE INDEX IF NOT EXISTS templates_user_idx              ON templates (user_id);
CREATE INDEX IF NOT EXISTS measurements_user_date_idx      ON measurements (user_id, date DESC);
CREATE INDEX IF NOT EXISTS exercises_share_idx             ON exercises (share_id);
CREATE INDEX IF NOT EXISTS templates_share_idx             ON templates (share_id);
