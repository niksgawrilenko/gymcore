# GymCore · План локализации (en primary + ru)

> Статус: **Фаза 0 (каркас next-intl) + публичный слой сделаны**; роуты под `[locale]`, каталоги `messages/{en,ru}.json`, переключатель языка и БД-часть (§5, §5.1) готовы. Строки экранов приложения — Phase 2 (§8). Документ — источник истины по i18n.
> Обновляется при отступлениях от плана. Скилл для работы: `.cline/skills/gymcore-i18n`.

## 1. Цель

Полная локализация приложения на английский (основной) и русский, включая:
маркетинговые страницы, экраны приложения, метаданные/SEO и **базу упражнений** (переводы упражнений создаёт только их владелец, машинного перевода нет — §2.1).

Требования: сохранить существующие RU-ссылки, **не менять структуру существующих таблиц и не трогать текущие RU-упражнения**, не ломать SEO, не дублировать данные упражнений, миграция БД — только аддитивная.

## 2. Зафиксированные решения

| Вопрос | Решение |
| --- | --- |
| Движок | `next-intl` 4.14.9 (установлен); конфиг — `src/i18n/{routing,request,navigation}.ts`, `src/i18n/server.ts`, плагин в `next.config.ts` |
| Локали | `['en','ru']`, `defaultLocale: 'en'` |
| Префикс | `localePrefix: 'as-needed'` → `/welcome` = EN, `/ru/welcome` = RU |
| Детект | `localeDetection: true` + cookie `NEXT_LOCALE` (1 год): старые RU-закладки без префикса остаются на RU |
| Роуты | `src/app/[locale]/**`; SEO-файлы остаются в `src/app/` |
| Ключи | источник истины — `messages/en.json`; `messages/ru.json` — перевод (+ ICU `one/few/many`) |
| Упражнения | одна сущность + `exercise_translations(exercise_id, locale)`; `exercises.name` = исходное имя автора; переводы пишет **только владелец** (решение A); фолбэк — исходное имя |
| `source_locale` | **отложено**: структуру `exercises` не меняем. Показ колонку не требует (фолбэк — `e.name`); добавим аддитивно, когда понадобится `lang=`/направление AI-перевода |
| Деплой на одном языке | конфигурация, не данные: `NEXT_PUBLIC_LOCALES` (дефолт `en,ru`); для `['en']` нет `/ru`-роутов, sitemap только EN, ru-переводы просто не читаются, данные целы |
| SEO | индексируются обе локали (RU не `noindex`), hreflang `en` + `ru` + `x-default`→EN, sitemap на обе локали |

**Запрещено:** дублировать упражнения по локалям · авто-переводить пользовательские упражнения · подменять исходное имя машинным переводом ·
перезаписывать `exercises.name` при правке в не-исходной локали · хранить локаль только в cookie · `localePrefix: 'never'` · `drizzle-kit push`.

## 2.1 Модель переводов упражнений (решение A: переводит владелец)

**Факты модели** (проверены по коду, а не по интуиции):

- центрального/сид-каталога нет (`db/` = только `schema.sql`, `indexes.sql`, `setup.mjs`); каждая строка `exercises` принадлежит юзеру (`user_id`);
- «общее» появляется только через модерацию: `submitExerciseForModeration` → `pending`, админ одобряет (`actions/misc.ts`) → `is_public = true`;
- `visibleTo(userId) = is_public OR user_id = me` (`src/lib/data.ts:28`) → чужое публичное упражнение видно как **ссылка на ту же строку** (не копия);
- `/shared/exercise/[shareId]` — наоборот **копия**: `importSharedExercise` создаёт импортёру новую строку с тем же `name`.

**Правила:**

1. Переводы к упражнению создаёт/меняет **только владелец** — в Server Action с проверкой `exercise.user_id = me` (как в `saveExercise`).
2. Показ для локали `L`: `coalesce(t_L.name, e.name)`. `e.name` — исходное имя автора; машинным переводом оно не подменяется.
3. Правка имени в локали `L`: upsert `exercise_translations(exercise_id, L)`. Русский оригинал в `exercises.name` **не переписывается** —
   EN-правка не затирает русское название. Когда появится `source_locale` (отложено, §2), `exercises.name` обновляем только при `L == source_locale`.
4. `importSharedExercise` копирует переводы исходника (`INSERT … SELECT`) — иначе EN-импортёр получит кириллицу.
5. Публичное упражнение остаётся **одной строкой** для всех: история, рекорды и статистика не расщепляются по языкам. Именно поэтому дублировать
   упражнения по локалям нельзя (сейчас история и так рвётся — `getPrevSets` маппит по `nameKey`; переход на `exercise_id` это чинит).
6. Пользовательский текст (`workouts.title`, `templates.name`, имена упражнений) не переводится автоматически — показывается на языке автора.
   Смешение языков в списке — ожидаемое поведение, а не баг.
7. Однолокальный деплой ничего не теряет: выключенная локаль не рендерится, её переводы в БД лежат и включаются позже без миграции.

## 3. Целевая структура

```
messages/en.json, messages/ru.json      # ключи (en — эталон)
src/i18n/routing.ts                     # defineRouting({locales, defaultLocale, localePrefix, localeDetection})
src/i18n/request.ts                     # getRequestConfig -> loadMessages
src/i18n/navigation.ts                  # createNavigation(routing): Link, useRouter, usePathname, redirect
src/app/[locale]/layout.tsx             # NextIntlClientProvider, setRequestLocale, generateStaticParams
src/app/[locale]/**                     # все текущие роуты
src/app/{robots,sitemap,manifest}.ts, icon.png, apple-icon.png, globals.css, app.css   # остаются на месте
src/components/LocaleSwitcher.tsx       # переключатель (сохраняет путь и query)
global.d.ts                             # типы Messages для useTranslations
next.config.ts                          # withNextIntl(...)
src/proxy.ts                            # i18n-обработка + существующая auth-логика
```

## 4. Фазы

### Phase 0 — каркас (0.5–1 д)

1. `npm i next-intl`.
2. Создать `src/i18n/{routing,request,navigation}.ts`, `global.d.ts`, `messages/{en,ru}.json` (структура ключей + перенос существующего русского текста).
3. Перенести роуты в `src/app/[locale]/`, SEO-файлы и CSS оставить в `src/app/`.
4. Обернуть `next.config.ts` в `withNextIntl`.
5. Переписать `src/proxy.ts`: обёртка i18n вокруг существующей auth-логики (`PUBLIC_PREFIXES`, `next=`, matcher — см. §6).
6. `LocaleSwitcher` в `Chrome.tsx` и в marketing-layout.
7. **Готово, если:** `npm run verify` зелёный; `/welcome` → EN (`lang="en"`), `/ru/welcome` → RU, `/en/welcome` → 307 на `/welcome`; с cookie `NEXT_LOCALE=ru` `/welcome` → RU; неавторизованный `/ru/workout` → `/ru/login`.

### Phase 1 — публичный слой (1–2 д)

`(marketing)/welcome`, `privacy`, `login` + метаданные (`generateMetadata` с локалью), OG-картинка, `sitemap` на обе локали, hreflang/alternates, `robots`.

**Готово, если:** у обеих локалей корректные `<html lang>`, canonical, hreflang; sitemap содержит и `en`-, и `ru`-URL; RU-страницы отвечают 200.

### Phase 2 — строки приложения (2–3 д)

Перевод всех экранов: `history` (`page.tsx`, `HistoryClient.tsx`), `workout` (`ActiveWorkout*`), `workouts/[id]`, `templates*`, `exercises`, `stats`, `measurements`, `profile`, `settings`, `admin`, `ai`, `shared/*`.
Замена `Link` из `next/link` (≈15 файлов) и `useRouter`/`usePathname` (≈7 файлов) на `@/i18n/navigation`. Компоненты с `useTranslations` — только внутри `NextIntlClientProvider`.

**Готово, если:** в JSX не осталось русского текста (кроме данных из БД), все ключи есть в обоих JSON, плюрализация — через ICU.

### Phase 3 — БД упражнений + рефакторинги (2–3 д)

1. ✅ SQL: `exercise_translations` (+ индекс) в `db/schema.sql`/`db/indexes.sql` — только добавление; `exercises` и данные не меняются (§5).
2. ✅ Инфраструктура EN-перевода: `db/i18n/*` + `npm run db:i18n:export|import` (§5.1). Осталось: заполнить `name_en` и импортировать.
3. Показ имени: `coalesce(t_L.name, e.name)`.
4. Рефакторинг долгов **по `exercise_id`** (детали — `memory-bank/systemPatterns.md`):
   - `getPrevSets()` — ключ по `exercise_id` (+ fallback `nameKey` на один релиз);
   - `getExerciseProgress(userId, exerciseName)` / `loadExerciseProgress(name)` → `exerciseId`;
   - `getStats().exercises` → `group by e.id`;
   - SQL-литерал `'Другое'` (`src/lib/data.ts`, `src/actions/exercises.ts`) → сентинел-ключ, перевод в UI;
   - ✅ справочники мышц/групп/категорий/оборудования — переводятся **на выводе** через `reference_translations` (не «маппинг RU→ключ»: ключ остаётся русским, локализуется только подпись — `src/lib/refs.ts`, §5.3).
5. `revalidatePath('/exercises' | '/measurements' | '/templates' | '/admin')` → `revalidatePath('/', 'layout')`.
6. Синхронизация переводов: `saveExercise` (владелец пишет перевод текущей локали; `exercises.name` не трогаем) и
   `importSharedExercise` (копирование переводов исходника одной `INSERT … SELECT`) — см. §2.1.
7. Сортировка/поиск/группировка по **отображаемому** имени: `getExercises` сортирует по `exercises.name`, `ExercisesClient` группирует по
   `primary_groups[0] ?? category ?? 'Без категории'` — и сортировка, и этот хардкод-фолбэк должны учитывать локаль.

**Готово, если:** переключение локали меняет названия переведённых упражнений; непереведённые показываются исходным именем автора; статистика и «прошлые подходы» не смешивают упражнения с одинаковым именем.

### Phase 4 — полировка (1–2 д)

- ICU-плюрализация ru (`one`/`few`/`many`) — счётчики подходов, дней, замеров.
- Форматирование дат и чисел по локали **при сохранении** cookie `tz` (таймзона устройства, не сервера).
- `users.locale` в схеме (аддитивно) — дефолтная локаль пользователя для писем/сброса.
- Промпты ИИ-тренера (`src/actions/ai.ts`, `src/lib/ai/**`) — по локали запроса.
- Скрипт `i18n:check`: паритет ключей `en`/`ru` и поиск хардкод-кириллицы в `src/**`.

## 5. БД: переводы упражнений (`exercises` не меняется)

> Приоритет: **существующая структура БД и текущие RU-упражнения сохраняются как есть**. Ни один столбец, индекс или строка `exercises`
> не переписываются — локализация живёт в отдельной таблице. Файлы: `db/schema.sql`, `db/indexes.sql`; откат — `db/rollback-20261004-exercise-translations.sql`.

```sql
-- Только новая таблица; exercises и остальные таблицы не меняются (аддитивно, идемпотентно).
-- `description` намеренно не заводим: в `exercises` такого поля нет.
CREATE TABLE IF NOT EXISTS exercise_translations (
    id          SERIAL PRIMARY KEY,
    exercise_id INTEGER NOT NULL REFERENCES exercises(id) ON DELETE CASCADE,
    locale      VARCHAR(5) NOT NULL,
    name        VARCHAR(100) NOT NULL,           -- столько же, сколько exercises.name
    updated_at  TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE (exercise_id, locale)
);
CREATE INDEX IF NOT EXISTS exercise_translations_locale_idx ON exercise_translations (locale);
```

Применение: `npm run db:setup` — идемпотентно, на существующей базе только создаёт недостающую таблицу и индекс.

Русские названия остаются источником истины для `ru`: отдельная строка `locale='ru'` не нужна — `coalesce(t_L.name, e.name)` при отсутствии
перевода отдаёт исходное имя. Поэтому наполняем только `locale='en'`. `source_locale` **отложен** (§2): он нужен лишь для `lang=` и направления
AI-перевода, добавляется аддитивно позже и на показ не влияет.

### 5.1 Шаблон английской локализации (`db/i18n/`)

| Шаг | Команда | Что делает |
| --- | --- | --- |
| 1. Шаблон из БД | `npm run db:i18n:export` | `exercise-translations.en.tsv`: по строке на **уникальное** имя (`name_ru`), `name_en` пустой, рядом контекст (`used_by`, `types`, `groups`, `public`). Заполненный файл не перезаписывается → `*.new.tsv` |
| 2. Перевод | вручную (Excel/Sheets, UTF-8, табы) | заполнить `name_en`; `name_ru` не менять — это ключ |
| 3. Импорт в БД | `npm run db:i18n:import` | upsert `exercise_translations(locale='en')` по `lower(btrim(name_ru))` ↔ `exercises.name`, одной транзакцией |
| 4. Проверка | `npm run db:i18n:import -- --dry-run` | отчёт: новых/обновлённых, названия без совпадений в БД; в БД не пишет |

Ключ сопоставления — русское имя, а не `exercise_id`: ID отличаются между локальной и продовой базой, имена — нет. Один перевод применяется
ко всем упражнениям с этим именем (видно в `used_by`). Скрипты работают **только** с `exercise_translations`: `exercises` на запись не
используют, ничего в ней не удаляют и не переименовывают. Файлы: `db/i18n/export-exercises.mjs`, `db/i18n/import-translations.mjs`,
шаблон `db/i18n/exercise-translations.en.tsv`.

Правила работы с БД и запреты — скилл `gymcore-db`. Откат: `db/rollback-20261004-exercise-translations.sql` (`DROP TABLE exercise_translations` —
переводы восстановимы импортом из TSV, если файл сохранён).

### 5.2 Миграция переводов в прод-базу (и любую удалённую)

Порядок тот же, что локально, меняется только адрес базы. `DATABASE_URL` из окружения **перекрывает** `.env.local`
(dotenv не перезаписывает уже заданные переменные), поэтому прод подключается без правки файлов и без коммита секретов.

```powershell
# 1. таблица + индекс в проде (идемпотентно, exercises не меняется)
$env:DATABASE_URL = '<prod-url>'; npm run db:setup

# 2. сверить ключи: имена в проде могут отличаться от локальных (выгрузка только читает; при заполненном шаблоне пишет *.new.tsv)
$env:DATABASE_URL = '<prod-url>'; node db/i18n/export-exercises.mjs --out=db/i18n/prod-check.tsv

# 3. план импорта без записи: новые/обновляемые + русские названия без совпадений
$env:DATABASE_URL = '<prod-url>'; npm run db:i18n:import -- --dry-run

# 4. запись. Не-локальная база требует явного --yes (защита от опечатки в DATABASE_URL)
$env:DATABASE_URL = '<prod-url>'; npm run db:i18n:import -- --yes
```

- «Миграция данных» — это и есть TSV в репозитории: один и тот же файл заливается и локально, и в прод.
- Ключ сопоставления — русское имя (`lower(btrim(name_ru))`), поэтому расхождение `exercise_id` между базами не важно.
- Без `--yes` на не-локальном хосте импорт останавливается **до** записи (exit 1) и печатает путь к плану;
  в логах только `host:port/db` — без логина и пароля.
- После импорта в прод проверьте `exercises` не изменился (скрипт пишет только в `exercise_translations`)
  и что UI показывает перевод: `coalesce(t_L.name, e.name)` (§3).


### 5.3 Справочные строки: группы мышц, мышцы, категории, оборудование

Справочные значения (`exercises.primary_groups`, `secondary_muscles`, `category`, `equipment`) лежат в БД **по-русски** и переводятся
**только при показе** — как имена упражнений. Фильтры, группировка, поиск и запись продолжают работать с русскими строками: подмена
значений в данных сломала бы логику и привела бы к сохранению английского значения в `text[]`.

| Слой | Файл | Роль |
| --- | --- | --- |
| Словарь (shared) | `src/lib/refs.ts` | `RefKind`/`RefDict` + `refLabel(dict, value)`: перевода ищется по значению в порядке `primary_group → category → secondary_muscle → equipment` (одна мышца встречается и в группах, и в списке мышц), иначе возвращается русский оригинал |
| Чтение | `src/lib/data.ts` → `loadRefDict(locale)` | один `SELECT` на запрос (`React cache`); для `ru` — без запроса (язык данных) |
| Клиент | `src/components/RefsProvider.tsx` → `useRefLabel()` | словарь передаётся из `src/app/[locale]/layout.tsx` (рядом с `TzProvider`); используется в `ExercisesClient`, `ExerciseModals`, `ExercisePicker` |
| Сервер | `getStats()` (подписи графика), `shared/exercise/[shareId]` | перевод на месте, словарь в клиент не передаётся |
| Данные | `db/i18n/reference-translations.en.tsv` | 55 строк: 7 групп, 28 мышц (включая варианты написания из БД), 10 категорий, 9 единиц оборудования |
| Скрипты | `npm run db:i18n:export-refs` / `npm run db:i18n:import-refs` | отчёт покрытия значений БД (`--out=` — полный TSV) / upsert в `reference_translations` (kind-фильтр, `--dry-run`, `--yes`, `--locale`, `--file`) |
| Обвязка скриптов | `db/i18n/_shared.mjs` | общее для всех `db/i18n/*.mjs`: флаги CLI, определение целевой базы (локальная/прод) и защита от записи в прод без `--yes`, разбор TSV |

Ограничения: неизвестные значения (пользовательские группы/категории) показываются как есть — это безопасный фолбэк; поиск упражнений
(`src/lib/search.ts`) матчит только по именам и группы не учитывает. Откат: `DROP TABLE reference_translations` — переводы восстановимы импортом из TSV.


## 6. Ловушки миграции роутов (проверять в каждой фазе)

| Что | Где | Как правильно |
| --- | --- | --- |
| `revalidatePath` | ~11 вызовов | `revalidatePath('/', 'layout')` — путь с локалью неоднозначен |
| `Link` | ~15 файлов | импорт из `@/i18n/navigation` |
| `useRouter` / `usePathname` | ~7 файлов | импорт из `@/i18n/navigation` |
| `redirect()` | `actions/auth.ts`, `actions/exercises.ts`, `actions/templates.ts`, `lib/auth.ts` (6 мест) | путь без локали; внутри `[locale]` — `getLocale()` |
| `src/proxy.ts` | `PUBLIC_PREFIXES`, параметр `next=`, matcher | сравнивать путь **без** локали; собирать URL через `getPathname` (иначе `/en/en/login`); matcher исключает `.*\..*`, чтобы не перехватывать SEO-файлы |
| `saveExercise` | `actions/exercises.ts` | upsert перевода текущей локали; `exercises.name` не перезаписывается (EN-правка не должна затирать русское имя) |
| `importSharedExercise` | `actions/exercises.ts` | копировать переводы исходника одной `INSERT … SELECT` |
| `getExercises` / `ExercisesClient` | сортировка по `exercises.name`, группировка по `'Без категории'` | сортировать/искать/группировать по отображаемому имени; хардкод-фолбэк вынести в ключ перевода |
| Справочные строки (группы, мышцы, категории, оборудование) | `ExercisesClient`, `ExerciseModals`, `getStats`, `shared/exercise/[shareId]` | подпись — через `refLabel`/`useRefLabel` (`src/lib/refs.ts`, §5.3); в логике (фильтр `filter === g`, группировка по `primary_groups[0]`, `saveExercise`, поиск) остаются **русские** значения |

## 7. Приёмка

- `npm run verify` зелёный после каждой фазы (скилл `gymcore-verify`).
- Ручной смоук: `/welcome`, `/ru/welcome`, `/en/welcome` (307 → `/welcome`), переключение cookie `NEXT_LOCALE`, `/ru/login` без авторизации, смена языка внутри приложения с сохранением пути и query.
- SEO: canonical + hreflang на обеих локалях, sitemap содержит оба набора URL, `/ru/privacy` отвечает 200 (например, `curl -I`).
- Регресс данных: `exercises` (имена, id) и остальные таблицы после `db:setup` не изменились — добавлена только `exercise_translations`.
- Регресс данных: статистика и «прошлые подходы» считаются верно при двух локалях (проверять на упражнении с переведённым именем).

## 8. Что уже реализовано (Фаза 0 + публичный слой)

| Артефакт | Файл |
| --- | --- |
| Локали, `as-needed`, cookie `NEXT_LOCALE`, `NEXT_PUBLIC_LOCALES` | `src/i18n/routing.ts` |
| Загрузка каталога по локали | `src/i18n/request.ts` (+ плагин в `next.config.ts`) |
| Навигация с локалью: `Link`, `useRouter`, `usePathname`, `redirect`, `getPathname` | `src/i18n/navigation.ts` |
| `localeHref()` — путь с локалью для `redirect()` в Server Actions и `lib` | `src/i18n/server.ts` |
| Каталоги (ключи синхронны в обеих локалях) | `messages/en.json` (источник истины), `messages/ru.json` |
| Типизация `Locale`/`Messages` | `global.d.ts` (`declare module 'next-intl'`) |
| Роуты всех экранов, `<html lang>`, провайдер, шапка | `src/app/[locale]/**`, `src/app/[locale]/layout.tsx` |
| Локаль + авторизация в одном middleware | `src/proxy.ts` (next-intl → проверка сессии, `next=` с локалью) |
| Переключение языка с сохранением пути и query | `src/components/LocaleSwitcher.tsx`, CSS `.locale-switch` в `src/app/globals.css` |

Переведено на каталоги: оболочка (`Chrome.tsx` — навигация, тема), метаданные в `layout`, `login` (форма + коды ошибок
`login.errors.*`, экшен `authenticate` возвращает код, а не текст), лендинг `welcome`, `privacy` (canonical строится
через `localeHref`). Механические правки по всему коду: `next/link` → `@/i18n/navigation` (14 файлов),
`useRouter`/`usePathname` (6), `PageProps<'/[locale]/…'>` (7), `redirect()` с локалью (4 файла),
`revalidatePath('/…')` → `revalidatePath('/', 'layout')` (8 вызовов).

**Смоук (прод-сборка, `next start`):** `/welcome` 200 + `lang="en"`, `/ru/welcome` 200 + `lang="ru"`, `/en/welcome` 307 → `/welcome`,
`/ru/login` 200, в разметке обеих страниц есть `.locale-switch`.

**Осталось — Phase 2 (механика по экрану, каталоги уже на месте):** `HistoryClient`, `workout/*`, `workouts/[id]/*`,
`templates/*`, `exercises/*`, `stats/*`, `measurements/*`, `profile`, `settings`, `admin`, `ai/*`, `shared/*` — замена
русских литералов на `t(...)`, перенос соответствующих разделов в `messages/*.json` и (там же) коды ошибок вместо
текстов zod (`firstError`).

## 9. Прод-раскатка (2026-10-05)

Схема и данные применены к прод-БД (Neon `neondb`): `npm run db:setup` (идемпотентно, таблица `exercises` не менялась), затем импорт с `--yes` —
`exercise_translations(en)` = 453 (покрытие `exercises` 100 %), `reference_translations(en)` = 61 (category 16 / equipment 9 / primary_group 8 /
secondary_muscle 28). Датасеты в репо = прод-набор: `db/i18n/exercise-translations.en.tsv` (452 имени, все переведены; 155 последних — EN-черновик
агента, вычитывает владелец) и `db/i18n/reference-translations.en.tsv` (69 значений, включая 6 прод-специфичных категорий). Бэкап перед
изменениями — `.backups/prod-20261005.sql` (локальный, вне репозитория).

Код релиза: EN-поиск матчит переведённые подписи (`src/lib/search.ts` — `RefLabel`; `useRefLabel()` стал стабильным), `localizedAlternates()`
(`src/i18n/server.ts`) даёт canonical + hreflang (`en`/`ru`/`x-default`) на публичных страницах, `sitemap.ts` отдаёт обе локали с
`alternates.languages`. `npm run verify` — ALL PASS; каталоги `messages/*` синхронны (381/381 ключей).

Открыто: вычитка 155 EN-черновиков владельцем; 16 baseline-only имён в `.backups/exercise-translations.en.local-baseline.tsv` (в прод-БД их нет);
ручной прогон `/en/exercises`, `/en/stats`, `/en/ai` под логином после деплоя. Долг Фазы 4 (плюрализация, `users.locale`, `i18n:check`) — отдельно.

