-- Откат аддитивной миграции блока 7: таблица переводов справочных строк (см. db/schema.sql).
-- Применять вручную только если таблица не нужна: `psql "$DATABASE_URL" -f db/rollback-20261005-reference-translations.sql`.
DROP TABLE IF EXISTS reference_translations;
