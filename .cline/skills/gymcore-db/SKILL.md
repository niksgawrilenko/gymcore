---
name: gymcore-db
description: Безопасно изменить схему БД GymCore (таблица, столбец, индекс, seed) и применить её. Use when the task touches db/schema.sql, db/indexes.sql, db/setup.mjs, src/db/schema.ts, seeds, or asks to add a table/column/index, миграция, схема, добавить поле в БД.
---

# GymCore DB changes

**Источник истины — `db/schema.sql` + `db/indexes.sql`.** `drizzle-kit push|generate|migrate` запрещены (README).
`src/db/schema.ts` — TS-описание для типов, синхронизируется руками вместе с SQL.

## Порядок работы

1. Прочитай определения только затронутых таблиц в `db/schema.sql` (фрагмент, не весь файл).
2. Изменение — **аддитивное и идемпотентное**: `CREATE TABLE IF NOT EXISTS`, `ALTER TABLE … ADD COLUMN IF NOT EXISTS`, `CREATE [UNIQUE] INDEX IF NOT EXISTS`. Образец: [templates/migration.sql](templates/migration.sql).
3. Индексы — в `db/indexes.sql`, с комментарием о назначении. Индекс для новой таблицы можно и инлайн, но проектный стиль — отдельный файл (см. `exercise_translations_locale_idx`).
4. Обнови `src/db/schema.ts` (`pgTable` + связи), чтобы типы совпадали с SQL.
5. Применение: `npm run db:setup` (schema.sql, затем indexes.sql; каждая в своей транзакции). Существующие данные не трогаются.
6. Seed, если нужен: идемпотентный (`ON CONFLICT … DO UPDATE`), тексты переводов хранятся в git — дампы БД в репозиторий не кладём.
   Для переводов упражнений заготовлен готовый путь: TSV-шаблон `db/i18n/exercise-translations.en.tsv` + `npm run db:i18n:export|import`
   (см. скилл `gymcore-i18n`). Данные-скрипты живут в `db/i18n/`, `setup.mjs` при этом не трогаем.
7. Проверка: `npm run db:setup` **дважды** (второй прогон без ошибок = идемпотентность) и `npm run verify` (или `-SkipBuild`).

## Типы: следовать существующим

`SERIAL PRIMARY KEY` · FK `INTEGER REFERENCES … ON DELETE CASCADE` · `VARCHAR(n)` · `TEXT[] DEFAULT '{}'::text[]` ·
`BOOLEAN DEFAULT false` · `TIMESTAMP DEFAULT CURRENT_TIMESTAMP` · `NUMERIC(5,2)` · `JSONB DEFAULT '[]'::jsonb` · `UUID DEFAULT gen_random_uuid()`.

## Запрещено

- `DROP`/`ALTER … DROP`/переименование столбцов в том же релизе, что и код, который их использует.
- `NOT NULL` без `DEFAULT` на существующей таблице.
- Любые изменения `exercises.name` в рамках локализации (см. скилл `gymcore-i18n`: показ через `exercise_translations`).
- Правки продовой БД «руками» без соответствующего SQL в репозитории.
- Переписывание `db/setup.mjs` (он уже корректно применяет оба файла).

## Откат

Откат = обратный SQL **в репозитории** (`db/rollback-<date>-<change>.sql`, например `DROP TABLE exercise_translations;`).
Сам `setup.mjs` откатывать не умеет — это осознанно.
