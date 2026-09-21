-- Схема БД GymCore (совпадает с продовой базой). Идемпотентна: на существующей базе ничего не меняет,
-- на пустой — создаёт все таблицы. Применяется командой `npm run db:setup` (вместе с indexes.sql).

CREATE TABLE IF NOT EXISTS users (
    id            SERIAL PRIMARY KEY,
    username      VARCHAR(50)  NOT NULL UNIQUE,
    password_hash VARCHAR(255) NOT NULL,
    created_at    TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    role          VARCHAR(20) DEFAULT 'user'
);

CREATE TABLE IF NOT EXISTS exercises (
    id                SERIAL PRIMARY KEY,
    name              VARCHAR(100) NOT NULL,
    category          VARCHAR(50),
    exercise_type     VARCHAR(20) DEFAULT 'strength',
    user_id           INTEGER REFERENCES users(id) ON DELETE CASCADE,
    is_public         BOOLEAN DEFAULT false,
    share_id          UUID DEFAULT gen_random_uuid(),
    moderation_status VARCHAR(20) DEFAULT 'none',
    primary_groups    TEXT[] DEFAULT '{}'::text[],
    secondary_muscles TEXT[] DEFAULT '{}'::text[],
    equipment         VARCHAR(255)
);

CREATE TABLE IF NOT EXISTS templates (
    id                SERIAL PRIMARY KEY,
    name              VARCHAR(100) NOT NULL,
    description       TEXT,
    moderation_status VARCHAR(20) DEFAULT 'none',
    user_id           INTEGER REFERENCES users(id) ON DELETE CASCADE,
    is_public         BOOLEAN DEFAULT false,
    share_id          UUID DEFAULT gen_random_uuid()
);

CREATE TABLE IF NOT EXISTS template_exercises (
    id          SERIAL PRIMARY KEY,
    template_id INTEGER REFERENCES templates(id) ON DELETE CASCADE,
    exercise_id INTEGER REFERENCES exercises(id) ON DELETE CASCADE,
    sort_order  INTEGER DEFAULT 0,
    superset_id VARCHAR(50)
);

CREATE TABLE IF NOT EXISTS template_sets (
    id                   SERIAL PRIMARY KEY,
    template_exercise_id INTEGER REFERENCES template_exercises(id) ON DELETE CASCADE,
    set_order            INTEGER DEFAULT 0,
    weight               NUMERIC(5,2),
    reps                 INTEGER,
    duration_sec         INTEGER,
    distance_m           INTEGER
);

CREATE TABLE IF NOT EXISTS workouts (
    id           SERIAL PRIMARY KEY,
    title        VARCHAR(100) NOT NULL,
    template_id  INTEGER REFERENCES templates(id) ON DELETE SET NULL,
    workout_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    user_id      INTEGER REFERENCES users(id) ON DELETE CASCADE,
    media        JSONB DEFAULT '[]'::jsonb
);

CREATE TABLE IF NOT EXISTS workout_exercises (
    id          SERIAL PRIMARY KEY,
    workout_id  INTEGER REFERENCES workouts(id) ON DELETE CASCADE,
    exercise_id INTEGER REFERENCES exercises(id) ON DELETE CASCADE,
    superset_id VARCHAR(50),
    sort_order  INTEGER DEFAULT 0
);

CREATE TABLE IF NOT EXISTS sets (
    id                  SERIAL PRIMARY KEY,
    workout_exercise_id INTEGER REFERENCES workout_exercises(id) ON DELETE CASCADE,
    set_order           INTEGER DEFAULT 0,
    weight              NUMERIC(5,2),
    reps                INTEGER,
    duration_sec        INTEGER,
    distance_m          INTEGER,
    completed           BOOLEAN DEFAULT false
);

CREATE TABLE IF NOT EXISTS measurements (
    id        SERIAL PRIMARY KEY,
    user_id   INTEGER REFERENCES users(id) ON DELETE CASCADE,
    date      TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    weight    NUMERIC(5,2),
    chest     NUMERIC(5,2),
    waist     NUMERIC(5,2),
    biceps    NUMERIC(5,2),
    thighs    NUMERIC(5,2),
    calves    NUMERIC(5,2),
    shoulders NUMERIC(5,2),
    neck      NUMERIC(5,2)
);
