# GymCore — System Patterns

> Архитектура, слои, конвенции, критичные пути. Читать перед изменением кода.

## Слои

```
src/app/**            серверные страницы + клиентские *Client.tsx / *Loader.tsx
src/actions/*.ts      ВСЕ мутации данных (Server Actions, "use server")
src/lib/data.ts       все чтения из БД (запросы)
src/lib/{auth,session}.ts   сессия, guard
src/lib/{validation,dates,types,anatomy,site,draft}.ts   чистые хелперы
src/db/{index,schema}.ts    подключение pg + описание схемы для типов
src/components/**     переиспользуемые клиентские компоненты
src/proxy.ts          перехват запросов (auth-редиректы)
db/{schema,indexes}.sql + db/setup.mjs   схема и её применение
db/i18n/*.mjs           экспорт/импорт переводов упражнений (данные, не схема)
```

Роуты (плоско, без вложенных layout'ов кроме `(marketing)`): `page.tsx` (история/дашборд), `workout`, `workouts/[id]`, `templates`, `templates/[id]`, `templates/new`, `exercises`, `stats`, `measurements`, `profile`, `settings`, `admin`, `ai`, `login`, `shared/{exercise,template}/[shareId]`, `api/export`.

## Модель данных (`db/schema.sql`)

`users` → `exercises` (свои/публичные, `share_id`, `is_public`), `templates` (`share_id`) → `template_exercises` → `template_sets`,
`workouts` → `workout_exercises` → `sets`, `measurements`.
Индексы: `db/indexes.sql` (все `IF NOT EXISTS`, включая partial index `exercises_public_idx`).
Удаление упражнения каскадно сносит его историю (`ON DELETE CASCADE`).

Локализация названий упражнений — **отдельная таблица** `exercise_translations(exercise_id, locale, name)`; схема `exercises` и русские имена
в ней **не меняются** (требование заказчика). Показ: `coalesce(t_L.name, e.name)`; записи `locale='ru'` не нужны. Наполнение — TSV-шаблон
`db/i18n/exercise-translations.en.tsv` + `npm run db:i18n:export|import` (сопоставление по русскому имени; скрипты пишут только в
`exercise_translations`). Подробности: `docs/i18n-plan.md` §5, §5.1.

Видимость и «общее» (важно для i18n, см. долги): `exercises` принадлежит юзеру (`user_id`); публичным упражнение становится только через модерацию
(`moderation_status='pending'` → админ в `src/actions/misc.ts` → `is_public=true`). `visibleTo(userId) = is_public OR user_id = me` (`src/lib/data.ts:28`) —
чужое публичное упражнение это **ссылка** на ту же строку. Шеринг по ссылке (`share_id`, `importSharedExercise`) — наоборот **копия** у импортёра.

## Конвенции кода

1. **Мутация = Server Action** в `src/actions/*`; общие хелперы — `src/actions/_shared.ts` (проверка сессии/владельца, парсинг FormData).
2. **Чтение = функция в `src/lib/data.ts`** (или локально в странице для простых случаев).
3. **Типы** — в `src/lib/types.ts`; zod-схемы — `src/lib/validation.ts`.
4. **Инвалидация**: после мутации `revalidatePath(...)` конкретного пути.
5. **Клиентские компоненты**: имя файла = имя компонента; интерактив отделён от серверной страницы (`X.tsx` + `XClient.tsx`).
6. **Анатомия** (мышцы/оборудование) — справочники в `src/lib/anatomy.ts`, значения в БД хранятся строками (локализуются в Phase 3 i18n).

## Критичные пути (трогать осторожно)

- **Показ упражнения в истории/статистике** сейчас частично опирается на **имя** упражнения, а не на `exercise_id` (см. «Известные долги»). Это первое, что ломается при переименовании/локализации.
- **AI-фасад** `src/lib/ai/index.ts` выбирает провайдера по конфигу (`src/lib/ai/config.ts`); в `src/actions/ai.ts` захардкожены русские промпты (i18n Phase 4).
- **Экспорт** `src/app/api/export/route.ts` — CSV/JSON, зависит от имён полей.

## Известные долги (вход в i18n Phase 3)

- `getPrevSets()` в `src/lib/data.ts` сопоставляет подходы **по имени** упражнения → нужен `exercise_id` (+ fallback на `name` один релиз).
- `getExerciseProgress(userId, exerciseName)` / `loadExerciseProgress(name)` — принимают имя → перевести на `exerciseId`.
- `getStats().exercises` группирует **по `e.name`** → `group by e.id`.
- SQL-литерал `'Другое'` (`src/lib/data.ts`, `src/actions/exercises.ts`) → сентинел-ключ, перевод в UI.
- Справочные значения (мышцы/оборудование) хранятся русскими строками → маппинг RU→ключ на выходе.
- Фолбэк-группа `'Без категории'` (`src/app/exercises/ExercisesClient.tsx:41`) и сортировка списка по `exercises.name` → после i18n нужен display-name.
- Переводы упражнений (решение A): владелец переводит, фолбэк — исходное имя; `exercises` и её RU-имена не меняются, переводы — в
  `exercise_translations`, наполняется шаблоном `db/i18n/*` (`db:i18n:export|import`). Правила — `docs/i18n-plan.md` §2.1, §5.1,
  скилл `gymcore-i18n`. Живые места: `saveExercise` (запись перевода владельцем) и `importSharedExercise` (копирование переводов).
  `source_locale` — отложен.
