# GymCore — Active Context

> **Файл с самым высоким приоритетом чтения.** Обновляется в конце каждой задачи (это делает Cline сам, см. `.clinerules/00-workflow.md`).
> Последнее обновление: 2026-10-05

## Сейчас в работе

**Тема:** i18n (en primary + ru) на `next-intl`.
**Статус:** сделаны **Фаза 0 (каркас) + публичный слой**: `next-intl@4.14.9`, `src/i18n/**`, `global.d.ts`, `messages/{en,ru}.json`, роуты `src/app/[locale]/**`, локаль+авторизация в `src/proxy.ts`, `LocaleSwitcher`. Переведены оболочка/навигация, `login`, лендинг `welcome`, `privacy`. `npm run verify` — ALL PASS; смоук на `next start`: `/welcome` 200 (en), `/ru/welcome` 200 (ru), `/en/welcome` 307→`/welcome`, `/ru/login` 200. Дальше — **Phase 3** (показ упражнений `coalesce(t_L.name, e.name)`, `docs/i18n-plan.md` §8).
**Дополнительно (сессия 2026-10-04): починен сброс темы при смене языка.** Тема переведена с `localStorage` на cookie (`src/lib/theme.ts`) + серверный `<html data-theme>`; системная тема на первом визите — чистым CSS-медиазапросом. Inline boot-скрипт убран из `[locale]/layout.tsx` (React 19 в dev ругался на пересоздаваемый `<script>` при смене локали), запись cookie темы/tz — в клиентском `TzProvider`. Проверено headless-CDP: тема (dark и light) переживает смену локали и reload, console-error нет.
**Дополнительно (сессия 2026-10-04, Phase 2 закрыта): интерфейс приложения полностью локализован.** Все экраны (`HistoryClient`, `workout/*`, `workouts/[id]/*`, `templates/*`, `exercises/*`, `stats/*`, `measurements/*`, `profile`, `settings`, `admin`, `ai/*`, `shared/*`, `loading`) и компоненты (`ExerciseListEditor`, `ExerciseModals`, `MediaSection`, `Chrome`, `ImportButton`) берут строки из `messages('…')`. Добавлен `src/i18n/errors.ts` (`useActionError`): Server Actions/Zod возвращают **коды** (`nameRequired/titleRequired/groupsRequired/noPermission/…`), AI-ошибки — `aiKey|Provider` и т.п.; клиент переводит. `fmtDate` стал локаль-осознанным (+`monthNames/weekdayNames`). AI-конфиг: `keyLabel/keyHint` переехали из `config.ts` в `messages('ai.providers.*')`. `npm run verify` — ALL PASS; смоук: `/welcome` `lang="en"`, `/ru/welcome` `lang="ru"`, `/login` EN. **Данные из БД (имена упражнений, группы мышц, категории, оборудование, SQL-фолбэк `'Другое'`) НЕ переводятся** — по требованию заказчика.
**Phase 3 (сессия 2026-10-05, локально, код + переводы) — показ имён через `coalesce(t_L.name, e.name)` и перевод долгов на `exercise_id`.**
- Чтение: `getExercises(userId, locale)`, `getWorkout(id, locale)`, `getTemplate/getSharedTemplate(..., locale)`, `getSharedExercise(shareId, locale='ru')`, `getStats(userId, locale)`; хелпер `withLocalizedNames()` (`src/lib/data.ts`). Все вызовы на страницах обновлены (`currentLocale()`).
- Долги закрыты: `getPrevSets()` — ключ = `exercise_id` (было `nameKey`, функция удалена); `getExerciseProgress(userId, exerciseId)` / `loadExerciseProgress(id)`; `getStats().exercises` → `group by e.id` (+ `id` в типе, `StatsClient`/`Progress` перешли на id); SQL-литерал `'Другое'` → пустой label + ключ `stats.other`.
- Запись: `saveExercise` при локали ≠ `ru` пишет/обновляет `exercise_translations` (русский оригинал остаётся в `exercises.name` — «язык данных»); `importSharedExercise` копирует переводы исходника (`INSERT … SELECT … ON CONFLICT DO NOTHING`); в форме подсказка `exerciseForm.nameHint`. `src/actions/ai.ts` намеренно читает имена в `ru`.
- Данные: `db/i18n/exercise-translations.en.tsv` заполнен — **311 переводов**, покрывают 312 строк БД (в т.ч. `test`); «Жим хуя» оставлено без перевода. **Импортировано только в локальную БД** (`exercise_translations` = 312 строк; `exercises` = 313 строк, не изменялись — проверено агрегатом). EN-переводы — стартовый набор от агента, владельцу вычитать (решение A: правит владелец).
- Проверка: `npm run verify` — ALL PASS.
- **Phase 3.2 закрыта (2026-10-05, локально, код + переводы): справочные строки (`reference_translations`) переведены на выводе.** Русские значения остаются «языком данных» — фильтры, группировка, поиск и запись не меняются; показ идёт через `refLabel()`, `'Другое'` из `importSharedExercise` тоже покрыт.
  - Чтение: `src/lib/refs.ts` (shared, без `server-only`: `RefKind`/`RefDict`/`refLabel` с порядком `primary_group → category → secondary_muscle → equipment`), `loadRefDict(locale)` в `src/lib/data.ts` (`React cache`; `ru` — без запроса), клиентский `src/components/RefsProvider.tsx` (`useRefLabel()`), смонтирован в `src/app/[locale]/layout.tsx` рядом с `TzProvider`.
  - Показ: `ExercisesClient` (чипы, заголовки групп, теги), `ExerciseModals` (`ExerciseInfoModal` — оборудование/группы/мышцы, `ExerciseForm` — чипы и `ANATOMY`, `ExercisePicker`), `getStats()` (подписи графика), `shared/exercise/[shareId]` (серверный рендер).
  - Данные/скрипты: `db/i18n/reference-translations.en.tsv` → **55 строк** (7 групп, 28 мышц — включая варианты написания из БД «Квадрицепс», «Широчайшие», «Ягодичные», «Трапеция», «Ромбовидные», «Бицепс бедра», «Группамышц-стабилизаторов»; 10 категорий; 9 единиц оборудования). Новые `db/i18n/export-references.mjs` (`npm run db:i18n:export-refs` — отчёт покрытия + `--out=`) и `db/i18n/import-references.mjs` (`npm run db:i18n:import-refs` — kind-фильтр, upsert, `--dry-run`, `--yes`, `--locale`, `--file`).
  - Проверка: `export-refs` → **0 непокрытых** по всем 4 справочникам; импорт в локальную БД (55 переводов) и повторный `--dry-run` («новых 0, изменится 0» — идемпотентно); `npm run verify` ALL PASS; live на `next dev :3000`: `/en/shared/exercise/<id>` → `Chest`, `/ru/…` → `Грудь`; словарь `{"primary_group":…,"equipment":{"Тренажер":"Machine",…}}` виден в RSC-payload (провайдер доехал до клиента).
  - Осталось: ручной прогон под логином `/en/exercises` и `/en/stats` (в окружении авторизации нет — `/exercises` отдаёт 307) и импорт переводов в **прод-БД** (`npm run db:i18n:import-refs -- --yes` после dry-run, `DATABASE_URL` прода в env).
  - Известное ограничение: `src/lib/search.ts` матчит только по именам — переводы групп в поиск не добавлены.
- **Прод не обновлялся:** доступа к прод-БД в окружении нет (`.env.local` → `localhost:5432/gymcore`; `.vercel`/Vercel CLI отсутствуют; process env пуст). Порядок для прода — `docs/i18n-plan.md` §5.2: `DATABASE_URL` прода в env → `npm run db:setup` → `npm run db:i18n:import -- --yes` (dry-run обязателен).

**Смоук (сессия 2026-10-05, локальный запуск для теста):**
- Запущены локальная БД (`localhost:5432/gymcore`: 313 `exercises`, 312 `exercise_translations`), `next dev` на `:3000` и для проверки прод-сборки `next start` на `:3001` (`.next` от последнего `npm run build`).
- Маршруты: `/` · `/ru` → 307; `/welcome` 200 (en) · `/ru/welcome` 200 · `/en/welcome` 307; `/login` · `/ru/login` 200; `/exercises`, `/stats` → 307 (авторизация).
- Живой показ перевода имён: `/shared/exercise/<shareId>` отдаёт английское имя из `exercise_translations` («High Pulley Triceps Extensions…»), `/ru/shared/exercise/<shareId>` — русский оригинал; `/shared/template/<id>` рендерит контент в обеих локалях (название шаблона — пользовательский текст, намеренно не переводится).
- **Баг найден и исправлен (2026-10-05, по репорту владельца: «ошибка на EN-версии, просмотр конкретной тренировки в истории»).** `drizzle-orm@0.45.3` в `normalizeRelation` (`node_modules/drizzle-orm/relations.js:250`) для `many(...)` без явных `fields/references` требует **обратной `one()`-relation** в схеме referenced-таблицы; иначе бросается `There is not enough information to infer relation "<table>.<field>"`. В `src/db/schema.ts` relations для `sets`/`templateSets` отсутствовали → падали и `workoutExercises.sets` (`getWorkout`, страница `/workouts/[id]` и `/workout`), и `templateExercises.templateSets` (`getTemplate`/`getSharedTemplate`). Фикс: добавлены обратные relations `setsRelations` и `templateSetsRelations` (аддитивно, только схема — таблицы/данные не менялись). Проверено: прямой прогон тех же relational-запросов к локальной БД (`workout OK id=68 … setsInFirst=4`, `template OK id=50 … setsInFirst=2`), `npm run verify` ALL PASS, в dev и в `next start` `/shared/template/*` и `/shared/exercise/*` → 200 с контентом, `not enough information` в логах больше не появляется (dev 31→31 строк, prod 0).

**Риски перед продом (найдены при смоуке, фиксы ещё не делались):**
1. `saveExercise` (`src/actions/exercises.ts`) при locale ≠ `ru` пишет введённое имя и в `exercises.name`, и в `exercise_translations` — EN-правка затирает русский оригинал, план §6 требует обратное поведение.
2. `importSharedExercise` под EN-локалью: `saveExercise` уже создаёт `translations(en, <русское имя>)`, поэтому `INSERT … SELECT … ON CONFLICT DO NOTHING` не перезаписывает её реальным переводом — копия покажет русский текст в EN.
3. `'Другое'` сентинел в `importSharedExercise` (fallback `primary_groups`).
4. ~~`reference_translations` заполняется, но UI читает русские строки; импорт-скрипта нет~~ — **закрыто в Phase 3.2 (2026-10-05)**: показ через `refLabel`/`RefsProvider`, импорт — `npm run db:i18n:import-refs` (dry-run → `--yes`); для прода добавить `db:i18n:export-refs` против прод-БД, чтобы поймать пользовательские значения.
5. Для прода: TSV сматчен по RU-имени — сначала `npm run db:i18n:export` против ПРОД-БД, сверить/дополнить набор имён, и только затем `db:setup` + импорт (dry-run → `--yes`), после бэкапа `pg_dump`.

**Незакоммичено в worktree (Phase 3 + 3.2, 2026-10-05; не перезаписывать):**
- Изменены (Phase 3): `db/i18n/exercise-translations.en.tsv` (311 переводов), `src/lib/data.ts`, `src/db/schema.ts` (обратные relations `sets`/`templateSets`), `src/lib/types.ts`, `src/actions/{ai,exercises,misc,templates}.ts`, страницы `src/app/[locale]/{exercises,stats,templates,workout,workouts,shared}/**`, `src/components/{ExerciseListEditor,ExerciseModals}.tsx`, `messages/{en,ru}.json`, `package.json`.
- Изменены (Phase 3.2): `src/lib/data.ts` (`loadRefDict`), `src/app/[locale]/layout.tsx` (`RefsProvider`), `src/app/[locale]/exercises/ExercisesClient.tsx`, `src/components/ExerciseModals.tsx`, `src/app/[locale]/shared/exercise/[shareId]/page.tsx`, `db/i18n/reference-translations.en.tsv`, `package.json`, документация (`docs/i18n-plan.md`, `memory-bank/{activeContext,progress}.md`).
- Новые: `src/lib/refs.ts`, `src/components/RefsProvider.tsx`, `db/i18n/export-references.mjs`, `db/i18n/import-references.mjs`.

**Ветка:** `develop` — локально +3 коммита, в `main`/`origin/main` их нет (push в `main` деплоит на Vercel автоматически).
**Коммиты (2026-10-05, по явному разрешению, без push):**

| Коммит | Сообщение | Масштаб |
| --- | --- | --- |
| `25a7418` | `feat(i18n): next-intl locale routing and full UI localization` | 75 файлов, +4662/−618 |
| `a4d6e81` | `refactor: performance pass and dead-code cleanup (track B)` | 26 файлов, +454/−226 |
| `e64fce4` | `chore: agent rules, skills, memory bank and i18n plan` | 16 файлов, +1057 |

Файлы, затронутые и i18n, и треком B, попали в коммит, где изменение доминирует (это отметка в теле коммитов). `npm run verify` после коммитов — ALL PASS.

## Что вошло в коммиты 2026-10-05 (справочно; worktree чистый)

- Изменены: `.gitignore`, `package.json`, `package-lock.json`, `next.config.ts` (плагин next-intl), `src/app/globals.css` (CSS `.locale-switch`), `src/proxy.ts` (локаль + авторизация), `src/lib/auth.ts` и `src/actions/{auth,exercises,templates,misc}.ts` (`localeHref`, коды ошибок логина), `src/components/Chrome.tsx`, `src/app/[locale]/ai/AiChat.tsx`, `src/actions/ai.ts`, `src/lib/site.ts`, `db/schema.sql`, `db/indexes.sql`, `src/db/schema.ts`.
- **Перенесены** (git видит как delete+add): все экраны из `src/app/<name>` → `src/app/[locale]/<name>`; `src/app/layout.tsx` удалён — его содержимое стало `src/app/[locale]/layout.tsx` (html/body + `NextIntlClientProvider` + шапка со свитчером). В `src/app/` остались `api/**`, `robots.ts`, `sitemap.ts`, `manifest.ts`, `globals.css`, `app.css`, иконки.
- Новые: `src/i18n/{routing,request,navigation,server}.ts`, `global.d.ts`, `messages/{en,ru}.json`, `src/components/LocaleSwitcher.tsx`, `src/lib/theme.ts`, `src/app/[locale]/layout.tsx`; `src/app/[locale]/(marketing)/**` (welcome, privacy, marketing.css, opengraph-image), `src/app/{manifest,robots,sitemap}.ts`, `src/lib/ai/**` (провайдер-агностик AI).
- Новые (i18n, БД-часть): `db/i18n/**` (`export-exercises.mjs` с guard `--yes` для не-локальной базы, `import-translations.mjs`, `exercise-translations.en.tsv`), `db/rollback-20261004-exercise-translations.sql`; изменены `db/schema.sql`, `db/indexes.sql`, `src/db/schema.ts`, `package.json` (`db:i18n:*`). Таблица `exercise_translations` уже применена к БД.
- Новые/изменённые (Phase 2, локализация строк): новый `src/i18n/errors.ts`; переведены все экраны `src/app/[locale]/**` и `src/components/*`; `src/lib/dates.ts` (+локаль, `monthNames`/`weekdayNames`), `src/lib/validation.ts` (zod-тексты → коды), `src/actions/{exercises,templates,workouts,misc,ai}.ts` + `src/lib/ai/*` (коды ошибок), `messages/{en,ru}.json` (namespace `common/errors/history/exercises/workout/workoutDetail/templates/templateEditor/stats/measurements/profile/settings/admin/ai/shared/editor/exerciseInfo/exerciseForm/exercisePicker/media`), `src/lib/site.ts` (EN).
- Смысл: мультипровайдерный AI + публичный маркетинговый слой (SEO-файлы) + локализация (каркас и публичный слой). **Всё закоммичено 2026-10-05** (см. таблицу выше), `git status` пуст.

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
1. ~~Поднять БД и снять baseline~~ — **сделано (2026-10-05)**: `npm run db:setup` применён локально (создана пустая `reference_translations`). Baseline на реальных данных: `exercises` = 313; `category` = 9 значений (Спина и шея 67, Руки 63, Ягодицы 48, Плечи 48, Грудь 37, Пресс и косые 28, Ноги 16, Спина 4, Пресс 2); `equipment` = 9 + 20 NULL (Тренажер 77, Собственный вес 60, Резина 56, Гантели 36, Штанга 27, TRX 22, Сэндбэг 6, Брусья 5, Турник 4); `sets`/`template_sets`.duration_sec/distance_m — 0 непустых (legacy подтверждён); `EXPLAIN (ANALYZE, BUFFERS)` для `getExercises` — Seq Scan → Hash Left Join → HashAggregate → Sort, 0.455 ms, shared hit=17.
2. ~~`db/i18n/export-reference.mjs` + импорт (по образцу `db:i18n:*`) и заполнение DB-части `db/i18n/reference-translations.en.tsv`~~ — **сделано (Phase 3.2, 2026-10-05)**: `db/i18n/export-references.mjs`, `db/i18n/import-references.mjs`, TSV = 55 строк, импорт в локальную БД, показ в UI через `src/lib/refs.ts` + `RefsProvider`.
3. Переход с группировки по `exercises.name` на `exercise_id` (долг «рвётся история при переименовании») — логично вместе с Phase 3 (показ перевода).
4. Тесты (vitest) — ❌ **не добавляем** (решение пользователя 2026-10-05).
5. Блок 5 (перенос папок) — ⏸ отложен **по согласованию с пользователем (2026-10-05)**; блокер снят — i18n-работа **закоммичена** (`25a7418`), так что делать можно в любой момент. Функциональной выгоды нет (косметика путей), поэтому только по отдельному запросу. **Трек B закрыт**: блоки 1, 2, 6, 3, 7, 4 сделаны, `npm run verify` — ALL PASS.

## Ближайшие шаги

1. ~~**Phase 2**~~ — **сделано (2026-10-04)**: экраны приложения и компоненты локализованы (`messages/*.json`), коды ошибок экшенов + `useActionError`, `fmtDate` локаль-осознанный. Осталось только: показ/сортировка/поиск по **отображаемому** имени упражнения в `lib/data.ts` (Phase 3).
2. **Данные упражнений**: заполнить `name_en` в `db/i18n/exercise-translations.en.tsv` → `npm run db:i18n:import -- --dry-run` → импорт. Для прода: `docs/i18n-plan.md` §5.2 — `$env:DATABASE_URL=<prod>; npm run db:setup` → `export --out=prod-check.tsv` → `import -- --dry-run` → `import -- --yes`.
3. Phase 3 (показ `coalesce(t_L.name, e.name)` в `src/lib/data.ts`, `saveExercise`/`importSharedExercise`), затем Phase 4 (полировка, плюрализация, `users.locale`, AI, `i18n:check`).
4. SEO локалей: hreflang/canonical на обе, sitemap и OG-картинка (`sitemap.ts`, `opengraph-image.tsx`).

## Открытые вопросы

Открыт один: **чем заполнять `name_en`** для 311 названий упражнений — черновым машинным словарём (TSV, без записи в БД) или вручную. Всё остальное закрыто с пользователем (модель переводов упражнений — вариант A). Полный план — `docs/i18n-plan.md` (§2.1 — правила переводов, §5.2 — миграция прода, §5.3 — справочные строки, §8 — что сделано). Ранее отложенная часть «строки `category`/`equipment` — заглушки» **закрыта в Phase 3.2**: реальные 9 + 9 значений БД переведены, скрипты `db:i18n:export-refs`/`import-refs` написаны.

## Известный dev-шум (не баг)

- ~~Console Error «Encountered a script tag while rendering React component…» в `next dev`~~ — **закрыто (2026-10-04)**. Причина подтверждена: сегмент `[locale]` динамический, при смене языка Next перемонтирует поддерево → inline `<script>` из `[locale]/layout.tsx` пересоздавался на клиенте, и React 19 (dev) ругался (`isScriptDataBlock` = false для исполняемых типов). Тот же пересоздаваемый `<html>` терял императивно выставленный `data-theme` (отсюда «сброс темы на белую»). Решение: (1) тема — cookie `theme` + серверный `<html data-theme>` (`src/lib/theme.ts`, `parseTheme`); системная тема на первом визите — CSS-медиазапрос `@media (prefers-color-scheme: dark) :root:not([data-theme])`; (2) inline-скрипт удалён, cookie темы (разовая миграция из старого localStorage) и tz пишет `TzProvider` в `useEffect`; (3) `next/script strategy="beforeInteractive"` НЕ подошёл — для inline он сам рендерит `<script>` и предупреждение остаётся. Проверено headless-CDP (в т.ч. явная light при тёмной системе): тема держится при смене локали и reload, `console.error` нет.
- ~~Русские тексты на экранах приложения при EN~~ — **закрыто (Phase 2, 2026-10-04)**: интерфейс берёт строки из `messages/*.json`. Намеренно остаются русскими только **данные из БД** (имена упражнений, группы мышц / категории / оборудование, SQL-фолбэк `'Другое'`) — по требованию «упражнения и БД оставить как есть»; их показ через `exercise_translations` — Phase 3. Фолбэк-группа «Без категории» вынесена в ключ `exercises.uncategorized`.
