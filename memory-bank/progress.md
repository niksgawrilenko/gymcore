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

## Следующее (план i18n, `docs/i18n-plan.md`)

| Phase | Объём | Содержание |
| --- | --- | --- |
| 0 ✅ | 0.5–1 д | `next-intl`, `src/i18n/*`, `messages/*`, `LocaleSwitcher`, перенос роутов в `[locale]`, `proxy.ts`, build — **сделано** |
| 1 ✅ | 1–2 д | публичные страницы: welcome/privacy/login + метаданные — **сделано**; осталось: hreflang/canonical на обе локали, sitemap и OG-картинка на локаль |
| 2 ✅ | 2–3 д | строки всех экранов приложения (`messages/*.json`), коды ошибок экшенов + `useActionError`, локаль-осознанный `fmtDate` — **сделано (2026-10-04)** |
| 3 | 2–3 д | `exercise_translations`: **БД-часть готова** (таблица + шаблон `db/i18n/*`); осталось — переводы и показ через `coalesce`, рефакторинг долгов (см. `systemPatterns.md`) |
| 4 | 1–2 д | плюрализация, формат дат/чисел, `users.locale`, AI-промпты, `i18n:check` |

## Известные проблемы / долги

- Показ упражнений частично по **имени** (а не `exercise_id`) — блокер для i18n и для переименований.
- Русские строки-справочники в БД (мышцы/оборудование) и SQL-литерал `'Другое'` остаются как есть по требованию заказчика (данные упражнений не переводятся). Фолбэк-группа «Без категории» в UI вынесена в ключ `exercises.uncategorized`.
- ~~`revalidatePath` с конкретными путями~~ — исправлено: `revalidatePath('/', 'layout')` (8 вызовов, Фаза 0).
- ~~Строки экранов приложения русскими литералами (Фаза 2)~~ — исправлено (2026-10-04): все экраны/компоненты через `messages/*.json`; zod-тексты (`firstError`) → коды, перевод в UI (`useActionError`); AI-ошибки провайдеров → коды.
- Показ/сортировка/поиск упражнений по `exercises.name` (не по отображаемому имени): `getExercises`/`ExercisesClient`/сортировки — Phase 3 (`coalesce(t_L.name, e.name)`).
- `users.locale` в схеме отсутствует (нужен для «языка писем/дефолтов»).

## История решений (кратко)

- Express+PWA → Next.js App Router (единое приложение, Server Actions, без отдельного API).
- Схема БД переведена на канонический `db/schema.sql` + `db/indexes.sql`; `drizzle-kit push` на прод запрещён.
- ИИ-тренер: сначала Gemini → теперь мультипровайдерный фасад.
- Публичное упражнение = ссылка на одну строку (модерация → `is_public`), шеринг по ссылке = копия. Отсюда запрет дублировать упражнения по локалям.
- i18n: `next-intl` (en primary + ru); переводы упражнений — **решение A**: переводит владелец, фолбэк на исходное имя, EN-переводы в отдельной `exercise_translations`, импорт копирует переводы. Структура `exercises` и RU-имена не меняются; `source_locale` отложен.
- Подготовка EN-локализации: шаблон `db/i18n/exercise-translations.en.tsv` (генерируется из БД, ключ — русское имя), `npm run db:i18n:export|import`; схема БД правится только аддитивно.
