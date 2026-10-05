-- Шаблон аддитивной миграции GymCore.
-- Копируй нужные блоки в db/schema.sql (таблицы/столбцы) или db/indexes.sql (индексы).
-- Типы повторяют существующий стиль проекта. Применение: npm run db:setup (идемпотентно, в транзакции).

-- 1) Новая таблица (пример: переводы упражнений для i18n; строку пишет ТОЛЬКО владелец упражнения)
CREATE TABLE IF NOT EXISTS exercise_translations (
    id          SERIAL PRIMARY KEY,
    exercise_id INTEGER NOT NULL REFERENCES exercises(id) ON DELETE CASCADE,
    locale      VARCHAR(5) NOT NULL,
    name        VARCHAR(150) NOT NULL,
    updated_at  TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE (exercise_id, locale)
);

-- 2) Новый столбец на существующей таблице: всегда с DEFAULT или nullable
ALTER TABLE users ADD COLUMN IF NOT EXISTS locale VARCHAR(5);
ALTER TABLE exercises ADD COLUMN IF NOT EXISTS source_locale VARCHAR(5) NOT NULL DEFAULT 'ru';

-- 3) Новый индекс -> в db/indexes.sql, с комментарием о назначении
CREATE INDEX IF NOT EXISTS exercise_translations_locale_idx
    ON exercise_translations (locale);

-- 4) Уникальность на СУЩЕСТВУЮЩЕЙ таблице (инлайн UNIQUE невозможен) -> тоже через индекс
CREATE UNIQUE INDEX IF NOT EXISTS exercise_translations_exercise_locale_idx
    ON exercise_translations (exercise_id, locale);

-- Откат (отдельный файл db/rollback-YYYYMMDD-<change>.sql):
-- DROP TABLE IF EXISTS exercise_translations;
-- ALTER TABLE users DROP COLUMN IF EXISTS locale;
-- ALTER TABLE exercises DROP COLUMN IF EXISTS source_locale;
