# GymCore — Progress

> Что работает, что осталось, что сломано. Обновлять при закрытии этапов.

## Работает (в `main`)

- Тренировки: активная тренировка, подходы, суперсеты, замена/сворачивание упражнений и подходов, черновик в localStorage.
- База упражнений: свои + публичные, анатомия (мышцы), кастомные группы мышц, медиа в Cloudinary, перетаскивание (dnd-kit).
- Шаблоны программ: редактор, генерация подходов, «сохранить как шаблон».
- История с календарём, детальная страница тренировки, статистика (графики), замеры тела.
- Шеринг упражнений/шаблонов по ссылке + импорт, админ-модерация публичных.
- ИИ-тренер (Gemini) в профиле.

## В работе (worktree, не закоммичено)

- Мультипровайдерный AI-фасад `src/lib/ai/**` (Gemini/OpenAI/Claude) + чат `/ai`.
- Публичный маркетинговый слой `(marketing)`: `/welcome`, `/privacy`, OG-картинка.
- SEO: `manifest.ts`, `robots.ts`, `sitemap.ts`, `src/lib/site.ts`.
- Заметки: см. `activeContext.md`.
- i18n, БД-часть (аддитивно): таблица `exercise_translations` в `db/schema.sql` + индекс в `db/indexes.sql`, откат `db/rollback-20261004-exercise-translations.sql`, шаблон-инструменты `db/i18n/{export-exercises,import-translations}.mjs` + `db/i18n/exercise-translations.en.tsv`, скрипты `db:i18n:export|import`. Схема `exercises` не менялась. Импорт в не-локальную (прод) базу требует `--yes`; порядок миграции прода — `docs/i18n-plan.md` §5.2.
- i18n, фронтенд (Фаза 0 + публичный слой): `next-intl@4.14.9`; `src/i18n/{routing,request,navigation,server}.ts`; `global.d.ts`; `messages/{en,ru}.json`; роуты `src/app/[locale]/**` + `[locale]/layout.tsx`; `src/proxy.ts` (локаль + авторизация); `LocaleSwitcher` + CSS. На каталоги переведены оболочка/навигация, `login`, `welcome`, `privacy`; `next/link`/`useRouter`/`PageProps`/`redirect`/`revalidatePath` заменены на локаль-осознанные аналоги. `npm run verify` — ALL PASS; смоук `/welcome` (en), `/ru/welcome` (ru), `/en/welcome` → 307, `/ru/login` (200).

- i18n, Phase 3, код (2026-10-05): локализованный показ имён упражнений (`coalesce`) в `src/lib/data.ts` + все страницы (`currentLocale()`), долги переведены на `exercise_id` (`getPrevSets`, `getExerciseProgress`/`loadExerciseProgress`, `getStats().exercises`), `saveExercise`/`importSharedExercise` работают с `exercise_translations`, `StatsClient` — select по id, ключ `stats.other` вместо SQL-литерала `'Другое'`. `db/i18n/exercise-translations.en.tsv` заполнен (311 переводов) и импортирован в локальную БД. `npm run verify` — ALL PASS. Риски смоука закрыты (2026-10-05, перед пушем): `saveExercise` не перезаписывает `exercises.name` вне языка данных (имя уходит в `exercise_translations`, ответ экшена возвращает введённое имя), при создании упражнения перевод не пишется — `importSharedExercise` копирует реальные переводы источника. Скрипты `db/i18n/*.mjs` отрефакторены на общий модуль `_shared.mjs` (флаги, определение локальной/прод-базы, `--yes`-защита, разбор TSV). Работа закоммичена локально (4 коммита в `develop`), **на прод не пушилось**. Прод-БД не менялась (нет доступа к её `DATABASE_URL`).

- i18n, Phase 3.2, справочные строки (2026-10-05): `reference_translations` подключены к показу — `src/lib/refs.ts` (`refLabel`, порядок `primary_group → category → secondary_muscle → equipment`), `loadRefDict(locale)` в `src/lib/data.ts` (`ru` — без запроса), `src/components/RefsProvider.tsx` + `useRefLabel()` в `[locale]/layout.tsx`, показ в `ExercisesClient`, `ExerciseModals`, `ExercisePicker`, `getStats()`, `shared/exercise/[shareId]`. Справочные значения в БД остаются русскими — локализуется только подпись. Данные: `db/i18n/reference-translations.en.tsv` = 55 строк (7 групп, 28 мышц, 10 категорий, 9 единиц оборудования); новые `db/i18n/export-references.mjs` / `import-references.mjs` + `db:i18n:export-refs|import-refs`. Проверено: покрытие 100 %, dry-run идемпотентен, `npm run verify` ALL PASS, live EN/RU на `/shared/exercise/<id>`. Осталось: импорт в прод-БД и ручной прогон `/en/exercises`, `/en/stats` под логином.

## Следующее (план i18n, `docs/i18n-plan.md`)

| Phase | Объём | Содержание |
| --- | --- | --- |
| 0 ✅ | 0.5–1 д | `next-intl`, `src/i18n/*`, `messages/*`, `LocaleSwitcher`, перенос роутов в `[locale]`, `proxy.ts`, build — **сделано** |
| 1 ✅ | 1–2 д | публичные страницы: welcome/privacy/login + метаданные — **сделано**; осталось: hreflang/canonical на обе локали, sitemap и OG-картинка на локаль |
| 2 ✅ | 2–3 д | строки всех экранов приложения (`messages/*.json`), коды ошибок экшенов + `useActionError`, локаль-осознанный `fmtDate` — **сделано (2026-10-04)** |
| 3 ✅ | 2–3 д | `exercise_translations`: БД + код + переводы — **сделано (2026-10-05, локально)**: показ `coalesce(t_L.name, e.name)`, рефакторинг долгов на `exercise_id`, `saveExercise`/`importSharedExercise` пишут переводы, 311 EN-переводов импортированы в локальную БД; **Phase 3.2**: `reference_translations` в UI (группы/мышцы/категории/оборудование) через `refLabel`/`RefsProvider`. Осталось: прогон переводов по прод-БД |
| 4 | 1–2 д | плюрализация, формат дат/чисел, `users.locale`, AI-промпты, `i18n:check` |

## Известные проблемы / долги

- ~~Показ упражнений частично по **имени** (а не `exercise_id`)~~ — **закрыто (2026-10-05)**: `getPrevSets`, `getExerciseProgress`/`loadExerciseProgress`, `getStats().exercises` работают по `exercise_id`; имя для показа — `coalesce(t_L.name, e.name)`.
- ~~Русские строки-справочники (группы мышц, категории, оборудование) не переводятся в UI~~ — **закрыто (2026-10-05, Phase 3.2)**: значения в БД остаются русскими («язык данных»), показ — через `refLabel`/`useRefLabel` (`src/lib/refs.ts`, `src/components/RefsProvider.tsx`), словарь — `db/i18n/reference-translations.en.tsv` + `db:i18n:export-refs|import-refs`. Фолбэк-группа «Без категории» — ключ `exercises.uncategorized`; `'Другое'` в `getStats` — ключ `stats.other` (в коде остаётся только в `importSharedExercise`). Долг: поиск (`src/lib/search.ts`) матчит только имена, EN-подписи групп в поиск не добавлены.
- ~~`revalidatePath` с конкретными путями~~ — исправлено: `revalidatePath('/', 'layout')` (8 вызовов, Фаза 0).
- ~~Строки экранов приложения русскими литералами (Фаза 2)~~ — исправлено (2026-10-04): все экраны/компоненты через `messages/*.json`; zod-тексты (`firstError`) → коды, перевод в UI (`useActionError`); AI-ошибки провайдеров → коды.
- ~~Показ/сортировка/поиск упражнений по `exercises.name` (не по отображаемому имени)~~ — **показ закрыт (2026-10-05)**: `getExercises`/`getWorkout`/`getTemplate`/`getStats` берут `coalesce(t_L.name, e.name)`, справочные подписи — через `refLabel`. Долг: сортировка/поиск/группировка в `getExercises`/`ExercisesClient` по-прежнему по **русскому** значению (`exercises.name`, `primary_groups`).
- `users.locale` в схеме отсутствует (нужен для «языка писем/дефолтов»).

## История решений (кратко)

- Express+PWA → Next.js App Router (единое приложение, Server Actions, без отдельного API).
- Схема БД переведена на канонический `db/schema.sql` + `db/indexes.sql`; `drizzle-kit push` на прод запрещён.
- ИИ-тренер: сначала Gemini → теперь мультипровайдерный фасад.
- Публичное упражнение = ссылка на одну строку (модерация → `is_public`), шеринг по ссылке = копия. Отсюда запрет дублировать упражнения по локалям.
- i18n: `next-intl` (en primary + ru); переводы упражнений — **решение A**: переводит владелец, фолбэк на исходное имя, EN-переводы в отдельной `exercise_translations`, импорт копирует переводы. Структура `exercises` и RU-имена не меняются; `source_locale` отложен.
- Подготовка EN-локализации: шаблон `db/i18n/exercise-translations.en.tsv` (генерируется из БД, ключ — русское имя), `npm run db:i18n:export|import`; схема БД правится только аддитивно.
