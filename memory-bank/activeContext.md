# GymCore — Active Context

> **Файл с самым высоким приоритетом чтения.** Обновляется в конце каждой задачи (это делает Cline сам, см. `.clinerules/00-workflow.md`).
> Последнее обновление: 2026-10-05

## Сейчас в работе

**Тема:** i18n (en primary + ru) на `next-intl`.
**Статус:** сделаны **Фаза 0 (каркас) + публичный слой**: `next-intl@4.14.9`, `src/i18n/**`, `global.d.ts`, `messages/{en,ru}.json`, роуты `src/app/[locale]/**`, локаль+авторизация в `src/proxy.ts`, `LocaleSwitcher`. Переведены оболочка/навигация, `login`, лендинг `welcome`, `privacy`. `npm run verify` — ALL PASS; смоук на `next start`: `/welcome` 200 (en), `/ru/welcome` 200 (ru), `/en/welcome` 307→`/welcome`, `/ru/login` 200. Дальше — **Phase 3** (показ упражнений `coalesce(t_L.name, e.name)`, `docs/i18n-plan.md` §8).
**Дополнительно (сессия 2026-10-04): починен сброс темы при смене языка.** Тема переведена с `localStorage` на cookie (`src/lib/theme.ts`) + серверный `<html data-theme>`; системная тема на первом визите — чистым CSS-медиазапросом. Inline boot-скрипт убран из `[locale]/layout.tsx` (React 19 в dev ругался на пересоздаваемый `<script>` при смене локали), запись cookie темы/tz — в клиентском `TzProvider`. Проверено headless-CDP: тема (dark и light) переживает смену локали и reload, console-error нет.
**Дополнительно (сессия 2026-10-04, Phase 2 закрыта): интерфейс приложения полностью локализован.** Все экраны (`HistoryClient`, `workout/*`, `workouts/[id]/*`, `templates/*`, `exercises/*`, `stats/*`, `measurements/*`, `profile`, `settings`, `admin`, `ai/*`, `shared/*`, `loading`) и компоненты (`ExerciseListEditor`, `ExerciseModals`, `MediaSection`, `Chrome`, `ImportButton`) берут строки из `messages('…')`. Добавлен `src/i18n/errors.ts` (`useActionError`): Server Actions/Zod возвращают **коды** (`nameRequired/titleRequired/groupsRequired/noPermission/…`), AI-ошибки — `aiKey|Provider` и т.п.; клиент переводит. `fmtDate` стал локаль-осознанным (+`monthNames/weekdayNames`). AI-конфиг: `keyLabel/keyHint` переехали из `config.ts` в `messages('ai.providers.*')`. `npm run verify` — ALL PASS; смоук: `/welcome` `lang="en"`, `/ru/welcome` `lang="ru"`, `/login` EN. **Данные из БД (имена упражнений, группы мышц, категории, оборудование, SQL-фолбэк `'Другое'`) НЕ переводятся** — по требованию заказчика.
**Ветка:** `develop` (отстаёт на 0 от `main`/`origin/main`; push в `main` деплоит на Vercel автоматически).
**Коммиты:** не делать без явного разрешения (worktree намеренно содержит незакоммиченную работу).

## Незакоммиченное состояние worktree (проверено `git status`)

- Изменены: `.gitignore`, `package.json`, `package-lock.json`, `next.config.ts` (плагин next-intl), `src/app/globals.css` (CSS `.locale-switch`), `src/proxy.ts` (локаль + авторизация), `src/lib/auth.ts` и `src/actions/{auth,exercises,templates,misc}.ts` (`localeHref`, коды ошибок логина), `src/components/Chrome.tsx`, `src/app/[locale]/ai/AiChat.tsx`, `src/actions/ai.ts`, `src/lib/site.ts`, `db/schema.sql`, `db/indexes.sql`, `src/db/schema.ts`.
- **Перенесены** (git видит как delete+add): все экраны из `src/app/<name>` → `src/app/[locale]/<name>`; `src/app/layout.tsx` удалён — его содержимое стало `src/app/[locale]/layout.tsx` (html/body + `NextIntlClientProvider` + шапка со свитчером). В `src/app/` остались `api/**`, `robots.ts`, `sitemap.ts`, `manifest.ts`, `globals.css`, `app.css`, иконки.
- Новые: `src/i18n/{routing,request,navigation,server}.ts`, `global.d.ts`, `messages/{en,ru}.json`, `src/components/LocaleSwitcher.tsx`, `src/lib/theme.ts`, `src/app/[locale]/layout.tsx`; `src/app/[locale]/(marketing)/**` (welcome, privacy, marketing.css, opengraph-image), `src/app/{manifest,robots,sitemap}.ts`, `src/lib/ai/**` (провайдер-агностик AI).
- Новые (i18n, БД-часть): `db/i18n/**` (`export-exercises.mjs` с guard `--yes` для не-локальной базы, `import-translations.mjs`, `exercise-translations.en.tsv`), `db/rollback-20261004-exercise-translations.sql`; изменены `db/schema.sql`, `db/indexes.sql`, `src/db/schema.ts`, `package.json` (`db:i18n:*`). Таблица `exercise_translations` уже применена к БД.
- Новые/изменённые (Phase 2, локализация строк): новый `src/i18n/errors.ts`; переведены все экраны `src/app/[locale]/**` и `src/components/*`; `src/lib/dates.ts` (+локаль, `monthNames`/`weekdayNames`), `src/lib/validation.ts` (zod-тексты → коды), `src/actions/{exercises,templates,workouts,misc,ai}.ts` + `src/lib/ai/*` (коды ошибок), `messages/{en,ru}.json` (namespace `common/errors/history/exercises/workout/workoutDetail/templates/templateEditor/stats/measurements/profile/settings/admin/ai/shared/editor/exerciseInfo/exerciseForm/exercisePicker/media`), `src/lib/site.ts` (EN).
- Смысл: мультипровайдерный AI + публичный маркетинговый слой (SEO-файлы) + локализация (каркас и публичный слой). Всё это **ещё не закоммичено** — не перезаписывать и не «чистить».

## Зафиксированные решения по i18n (не пересматривать без запроса)

- `next-intl` 4.x, `locales: ['en','ru']`, `defaultLocale: 'en'`, `localePrefix: 'as-needed'` → `/welcome` = EN, `/ru/welcome` = RU.
- Апп-роутер с префиксом локали: `src/app/[locale]/**`; SEO-файлы (`robots/sitemap/manifest/icon/globals.css`) остаются в `src/app/`.
- Детект локали: `localeDetection: true` + cookie `NEXT_LOCALE` (1 год) — чтобы старые RU-закладки на unprefixed-путях не теряли язык.
- SEO: индексируются обе локали, hreflang `en`/`ru`/`x-default`(→EN), RU **не** `noindex`.
- Источник истины ключей: `messages/en.json`; `messages/ru.json` — перевод (+ ICU `one/few/many`).
- Упражнения: одна сущность + таблица `exercise_translations(exercise_id, locale)`; показ `coalesce(t_L.name, e.name)`.
- **Переводы упражнений — решение A (зафиксировано с пользователем):** переводит **только владелец** упражнения; машинного перевода нет, фолбэк — исходное имя автора.
- «Общее» = одобренная модерация (`pending` → admin → `is_public`) и это **ссылка** на ту же строку (`visibleTo` в `data.ts`), а шеринг по ссылке — **копия** (`importSharedExercise`). Поэтому дублировать упражнения по локалям нельзя: это расщепит историю/рекорды.
- Новый столбец `exercises.source_locale` — **отложен**: структуру `exercises` не меняем, показ его не требует. Добавим аддитивно, когда понадобится `lang=`/направление AI-перевода.
- Правка имени пишет перевод текущей локали (`upsert`); русский оригинал в `exercises.name` **не перезаписывается**. Импорт копирует переводы (`INSERT … SELECT`).
- Однолокальный деплой — конфигурация (`NEXT_PUBLIC_LOCALES`, дефолт `en,ru`): выключенная локаль не рендерится, её переводы лежат в БД и включаются без миграции.
- Миграция БД — только аддитивная (`CREATE TABLE/INDEX IF NOT EXISTS`), `db/setup.mjs` не меняется, откат = `DROP TABLE`.
- **Структура существующих таблиц и текущие RU-упражнения не меняются** (требование пользователя): локализация — только новая таблица `exercise_translations`; русские имена остаются в `exercises.name` как есть, строка `locale='ru'` не нужна.
- EN-переводы наполняются TSV-шаблоном `db/i18n/exercise-translations.en.tsv` (`db:i18n:export` → заполнить `name_en` → `db:i18n:import`); сопоставление по русскому имени, не по `exercise_id`.
- Запрещено: дублировать упражнения по локалям, авто-переводить пользовательские упражнения, подменять исходное имя машинным переводом, cookie-only локаль, `localePrefix: 'never'`, `drizzle-kit push`.

## Трек B — оптимизация (сделаны блоки 1, 2, 3, 6, 7, 4; блок 5 отложен)

**Статус (2026-10-05):** пройдены блоки **1** (ИИ-штампы, мёртвый код), **2** (производительность), **3** (БД: статический анализ, изменений в SQL не потребовалось), **6** (конфиги, типы, дубли), **7** (датасет локализации: таблица `reference_translations` + TSV-инвентарь), **4** (все RU-комментарии в `src/**` и корневых конфигах → удалены или переписаны в EN; контрольный скан чист). `npm run verify` — **ALL PASS** после каждого блока. **Блок 5 (перенос папок) не делался** — отложен осознанно. Полные решения и находки — `memory-bank/optimization-plan.md`.

**Главные правки:** `getExercises` — один проход (`LEFT JOIN` + `GROUP BY`) вместо коррелированного подзапроса на каждую строку; общий хелпер поиска `src/lib/search.ts`; единый предикат доступа `visibleTo()` (вместо дубля в `actions/_shared.ts`); таймер активной тренировки вынесен в компонент `ElapsedTimer` — экран больше не перерисовывается каждую секунду; мемоизация в `ExerciseListEditor`/`ExercisesClient`; `PendingMedia` — один тип в `src/lib/types.ts`; `.env.example` дополнен `NEXT_PUBLIC_SITE_URL`/`NEXT_PUBLIC_LOCALES`; убраны неиспользуемые drizzle-relations и мёртвый `SITE_TITLE`; RU-строки из кода → коды каталога (`errors.invalidData`, `errors.usernameTooShort/passwordTooShort`, `ai.defaultTemplateName`), фолбэк-заголовки черновика приходят из UI.

**Найдено при проверке:** `formatElapsed`/`useNow` (Chrome) и `dotenv` **не мёртвые** (используются в `ActiveWorkout` и `db/*.mjs`) — оставлены.

**Следующие шаги по треку B:**
1. Когда поднята БД — применить аддитивную миграцию `npm run db:setup` (создаёт `reference_translations`, идемпотентно). Сейчас локальный Postgres недоступен (`ECONNREFUSED 127.0.0.1:5432`), поэтому `EXPLAIN ANALYZE` и точные подсчёты справочников (category/equipment) не выполнены; SQL для них перечислен в плане.
2. `db/i18n/export-reference.mjs` + импорт (по образцу `db:i18n:*`) и заполнение DB-части `db/i18n/reference-translations.en.tsv`.
3. Переход с группировки по `exercises.name` на `exercise_id` (долг «рвётся история при переименовании») — логично вместе с Phase 3 (показ перевода).
4. Тесты (vitest) — ❌ **не добавляем** (решение пользователя 2026-10-05).
5. Блок 5 (перенос папок) — ⏸ отложен **по согласованию с пользователем (2026-10-05)** до коммита незакоммиченной i18n-работы (риск перезаписать её при нулевой функциональной выгоде). **Трек B закрыт**: блоки 1, 2, 6, 3, 7, 4 сделаны, `npm run verify` — ALL PASS.

## Ближайшие шаги

1. ~~**Phase 2**~~ — **сделано (2026-10-04)**: экраны приложения и компоненты локализованы (`messages/*.json`), коды ошибок экшенов + `useActionError`, `fmtDate` локаль-осознанный. Осталось только: показ/сортировка/поиск по **отображаемому** имени упражнения в `lib/data.ts` (Phase 3).
2. **Данные упражнений**: заполнить `name_en` в `db/i18n/exercise-translations.en.tsv` → `npm run db:i18n:import -- --dry-run` → импорт. Для прода: `docs/i18n-plan.md` §5.2 — `$env:DATABASE_URL=<prod>; npm run db:setup` → `export --out=prod-check.tsv` → `import -- --dry-run` → `import -- --yes`.
3. Phase 3 (показ `coalesce(t_L.name, e.name)` в `src/lib/data.ts`, `saveExercise`/`importSharedExercise`), затем Phase 4 (полировка, плюрализация, `users.locale`, AI, `i18n:check`).
4. SEO локалей: hreflang/canonical на обе, sitemap и OG-картинка (`sitemap.ts`, `opengraph-image.tsx`).

## Открытые вопросы

Открыт один: **чем заполнять `name_en`** для 311 названий упражнений — черновым машинным словарём (TSV, без записи в БД) или вручную. Всё остальное закрыто с пользователем (модель переводов упражнений — вариант A). Полный план — `docs/i18n-plan.md` (§2.1 — правила переводов, §5.2 — миграция прода, §8 — что сделано).

## Известный dev-шум (не баг)

- ~~Console Error «Encountered a script tag while rendering React component…» в `next dev`~~ — **закрыто (2026-10-04)**. Причина подтверждена: сегмент `[locale]` динамический, при смене языка Next перемонтирует поддерево → inline `<script>` из `[locale]/layout.tsx` пересоздавался на клиенте, и React 19 (dev) ругался (`isScriptDataBlock` = false для исполняемых типов). Тот же пересоздаваемый `<html>` терял императивно выставленный `data-theme` (отсюда «сброс темы на белую»). Решение: (1) тема — cookie `theme` + серверный `<html data-theme>` (`src/lib/theme.ts`, `parseTheme`); системная тема на первом визите — CSS-медиазапрос `@media (prefers-color-scheme: dark) :root:not([data-theme])`; (2) inline-скрипт удалён, cookie темы (разовая миграция из старого localStorage) и tz пишет `TzProvider` в `useEffect`; (3) `next/script strategy="beforeInteractive"` НЕ подошёл — для inline он сам рендерит `<script>` и предупреждение остаётся. Проверено headless-CDP (в т.ч. явная light при тёмной системе): тема держится при смене локали и reload, `console.error` нет.
- ~~Русские тексты на экранах приложения при EN~~ — **закрыто (Phase 2, 2026-10-04)**: интерфейс берёт строки из `messages/*.json`. Намеренно остаются русскими только **данные из БД** (имена упражнений, группы мышц / категории / оборудование, SQL-фолбэк `'Другое'`) — по требованию «упражнения и БД оставить как есть»; их показ через `exercise_translations` — Phase 3. Фолбэк-группа «Без категории» вынесена в ключ `exercises.uncategorized`.
