-- Откат локализации упражнений (i18n). ВНИМАНИЕ: удаляет таблицу переводов вместе с английскими названиями.
-- Структура exercises и остальных таблиц не затрагивается — они этим изменением не менялись.
-- Переводы восстановимы из db/i18n/exercise-translations.en.tsv (npm run db:i18n:import), поэтому
-- перед откатом убедитесь, что заполненный TSV сохранён/закоммичен.
-- Запуск: psql "$DATABASE_URL" -f db/rollback-20261004-exercise-translations.sql

DROP INDEX IF EXISTS exercise_translations_locale_idx;
DROP TABLE IF EXISTS exercise_translations;