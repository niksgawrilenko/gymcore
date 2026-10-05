# GymCore — Optimization Plan (Трек B)

> **Статус: блоки 1, 2, 3, 6, 7, 4 выполнены (2026-10-05), `npm run verify` — ALL PASS; блок 5 отложен.** Создано 2026-10-04.
> Ветка: `develop`. Baseline до правок: `npm run verify` — ALL PASS. Рабочее дерево содержит незакоммиченную i18n-работу (см. `activeContext.md`) — не перезаписывать.
> Правило трека: **один блок за раз**, `npm run verify` после каждого блока, `git commit` — только с явного разрешения.

## Как продолжить с этого места (утро)

1. Прочитать `memory-bank/activeContext.md` → затем этот файл.
2. `git --no-pager status --short` — сверить, что worktree совпадает с описанным (i18n-работа на месте).
3. Прочитать «Открытые вопросы» ниже, уточнить их с пользователем (максимум 1–2 вопроса за раз).
4. Взять **блок 1**, согласовать объём, делать маленькими diff'ами.

## Порядок блоков (согласованный порядок выполнения)

| # | Блок (нумерация заказчика) | Порядок |
| --- | --- | --- |
| 1 | ИИ-штампы (комментарии-объяснялки, дубли, мёртвый код) | **1-й** |
| 2 | Производительность | 2-й |
| 6 | Прочее (типы, ошибки, дубли, мёртвый код, зависимости, конфиги, тесты, безопасность) | 3-й (сливается с 1) |
| 3 | БД (только read-only анализ + аддитивные индексы) | 4-й |
| 7 | Подготовка к локализации (структура датасета переводов) | 5-й |
| 4 | Комментарии (RU → удалить / переписать в EN) | 6-й |
| 5 | Структура папок | **последний** (механическая правка импортов ~30 файлов) |

После каждого блока: `npm run verify` → обновить этот файл (что сделано) → доложить пользователю.

## Что сделано (2026-10-05): блоки 1, 2, 3, 6, 7, 4

| Блок | Статус | Что именно |
| --- | --- | --- |
| 1. ИИ-штампы | ✅ сделано | RU-комментарии в затронутых файлах → короткий EN или удалены; `SITE_TITLE` удалён; неиспользуемые `templateSetsRelations`/`setsRelations` удалены; двойной `console.error` в `ai.ts` сохранён (ветки разные: не-`AiProviderError` и ошибка без статуса/текста) с пояснением; ветка двух форматов в `toEditorExercises` сохранена с явным комментарием; `?? Date.now()` для `workout_date` оставлен осознанно (в БД дефолт `CURRENT_TIMESTAMP`) |
| 2. Перф | ✅ сделано | `getExercises`: коррелированный подзапрос → `LEFT JOIN workout_exercises/workouts` + `count(workouts.id)` + `GROUP BY exercises.id` (один проход, счётчик совпадает со старым поведением); `searchExercises` вынесен в **`src/lib/search.ts`** (клиент + AI-инструмент); `visibleTo()` экспортирован из `lib/data.ts` и переиспользован в `actions/_shared.ts`; **`ElapsedTimer`** — секундный тик больше не перерисовывает весь экран тренировки; мемоизация `groups`/`groupIds` в `ExerciseListEditor` и `mine`/`global` в `ExercisesClient`. Пункт «группировка по `exercises.name` → `exercise_id`» осознанно отложен к Phase 3 (одни и те же файлы, иначе двойная правка) |
| 3. БД | ✅ baseline снят (2026-10-05) | Статически и на реальных данных подтверждено: `sets.duration_sec/distance_m` и `template_sets.duration_sec/distance_m` — **0 строк с не-null** (кардио хранится как вес = минуты, повторы = метры) → помечены legacy в `src/db/schema.ts`, столбцы не трогаем. Индексы: все пути запросов покрыты `db/indexes.sql`, новых не добавлено. **Baseline:** `exercises` = 313, категорий 9 (Спина и шея 67, Руки 63, Ягодицы 48, Плечи 48, Грудь 37, Пресс и косые 28, Ноги 16, Спина 4, Пресс 2), `equipment` 9 значений + 20 null (Тренажер 77, Собственный вес 60, Резина 56, Гантели 36, Штанга 27, TRX 22, Сэндбэг 6, Брусья 5, Турник 4). `EXPLAIN (ANALYZE, BUFFERS)` нового `getExercises`: `Seq Scan → Hash Left Join → HashAggregate → Sort`, **Execution Time 0.455 ms**, `shared hit=17`, коррелированного подзапроса нет. Локально применено `npm run db:setup` → `reference_translations` создана (пустая), `exercise_translations` пустая (слой переводов ещё не заполнен) |
| 6. Прочее | ✅ сделано | `.env.example` дополнен `NEXT_PUBLIC_SITE_URL` и `NEXT_PUBLIC_LOCALES`; `PendingMedia` сведён в `src/lib/types.ts` (3 файла); **`dotenv` и `drizzle-kit` признаны живыми** (`db/*.mjs` и `drizzle-kit pull` для перевыгрузки схемы) → удаления нет, `drizzle.config.ts` получил пояснение; Prettier/tsconfig не трогали (шум без выгоды); новых зависимостей (vitest) не добавляли — нужно разрешение |
| 7. Датасет | ✅ структура | Вариант **B**: `reference_translations(kind, source_value, locale, value, updated_at, UNIQUE(kind, source_value, locale))` — в `db/schema.sql` (идемпотентно) + индекс в `db/indexes.sql` + зеркало в `src/db/schema.ts` + откат `db/rollback-20261005-reference-translations.sql`; инвентарь **`db/i18n/reference-translations.en.tsv`** (33 анатомических значения, `'Другое'` ×2, 9 code-only/ui-строк с колонками `source`/`destination`, LLM-строки `keep:llm`). **Миграция не применена** (нет БД) |
| 4. Комментарии | ✅ сделано | Все RU-комментарии в `src/**` + `next.config.ts` + `global.d.ts` + `drizzle.config.ts` переведены в короткий EN или удалены (≈130 строк). Контрольный скан: RU в комментариях не осталось. `db/**`, `.env.example`, `memory-bank/`, `docs/` оставлены на RU осознанно (незакоммиченная i18n-работа + документация владельца) |
| 5. Папки | ⏸ отложено | Механический перенос ~30 файлов, большинство входят в незакоммиченную i18n-работу: выгоды нет, риск потерять работу есть. Делать после коммита i18n-работы |

**Затронутые файлы:** `src/lib/{data,types,draft,dates,theme,site,session,auth,validation}.ts`, `src/lib/search.ts` (новый), `src/lib/ai/*`, `src/actions/*`, `src/components/{Chrome,ExerciseListEditor,ExerciseModals,MediaSection,Modal,LocaleSwitcher}.tsx`, `src/app/**` (комментарии + `defaultName` в `AiChat` + `manifest`), `src/db/{index,schema}.ts`, `db/schema.sql`, `db/indexes.sql`, `db/rollback-20261005-reference-translations.sql` (новый), `db/i18n/reference-translations.en.tsv` (новый), `messages/{en,ru}.json` (+3 ключа), `.env.example`, `next.config.ts`, `global.d.ts`, `drizzle.config.ts`.

**SQL для отложенной БД-проверки (только чтение, запускать при поднятой базе):**

```sql
select coalesce(category,'(null)') v, count(*) from exercises group by 1 order by 2 desc;
select coalesce(equipment,'(null)') v, count(*) from exercises group by 1 order by 2 desc;
select count(*) filter (where duration_sec is not null) dur,
       count(*) filter (where distance_m is not null) dist from sets;
explain (analyze, buffers) select e.id, count(w.id) from exercises e
  left join workout_exercises we on we.exercise_id = e.id
  left join workouts w on w.id = we.workout_id and w.user_id = 1
  where (e.is_public or e.user_id = 1) group by e.id order by e.name;
```

---

## Блок 1 — ИИ-штампы (найдено)

| Где | Что |
| --- | --- |
| `src/**`, `db/**`, `next.config.ts`, `.env.example` | русские комментарии-объяснялки, часто 3–6 строк «здесь мы делаем X»: `src/lib/data.ts`, `src/lib/draft.ts`, `src/components/Chrome.tsx`, `src/lib/theme.ts`, `src/app/[locale]/(marketing)/welcome/page.tsx` |
| `src/actions/ai.ts:195,200` | двойной `console.error('aiChat', e)` + странное условие `e.status === undefined && !e.userMessage` — похоже на копипасту |
| `src/lib/ai/claude.ts:72`, `src/lib/ai/gemini.ts:60`, `src/lib/ai/openai.ts:72` | один и тот же RU-комментарий скопирован в 3 адаптера |
| `src/components/Chrome.tsx:44,47,57`, `src/lib/dates.ts:17`, `src/lib/ai/types.ts:17-18` | «комментарий-история фикса» (место git-логу, не коду) |
| `src/components/MediaSection.tsx:99` | `eslint-disable` + RU-комментарий |
| `src/lib/draft.ts:39-42,46-49`; `src/components/Chrome.tsx:22,31` | пустые `catch {}` без пояснения (ок для localStorage/cookie, но добавить причину) |
| **Мёртвые экспорты** | `SITE_TITLE` (`src/lib/site.ts:7`) — 0 потребителей → ✅ удалён. ~~`formatElapsed`/`useNow`~~ — **ошибка анализа**: используются в `ActiveWorkout.tsx`; экспорт нужен, оставлен (+JSDoc) |
| `src/db/schema.ts` | `templateSetsRelations`, `setsRelations` — по grep нигде не читаются (только для drizzle-query); проверить и убрать |
| «на всякий случай» код | `src/lib/types.ts:65` двойная ветка `'superset_id' in ex ? … : …`; `src/lib/data.ts:79` `?? Date.now()` для `workout_date` |

## Блок 2 — Производительность (найдено)

1. **`getExercises` считает N+1-подобный подзапрос** (`src/lib/data.ts:31-43`): `count(*)` коррелированным подзапросом **на каждую** строку `exercises`. → `LEFT JOIN workout_exercises/workouts + GROUP BY` (один проход) или `LATERAL`.
2. **Группировка/сортировка по `exercises.name`** (`src/lib/data.ts:165,201,215,233`, `ExercisesClient`) → перевести на `exercise_id`. Это же снимает долг из `systemPatterns.md` (рвётся история при переименовании).
3. **`src/components/ExerciseListEditor.tsx` (≈430 строк)** — `groupExercises(list)` и группировка считаются на каждом рендере без `useMemo`; хендлеры пересоздаются. → мемоизация + стабильные колбэки (+ возможно вынести подкомпоненты).
4. **Дубли фильтра поиска**: одинаковая логика `terms.every(t => text.includes(t))` в `src/actions/ai.ts:140-144` и `src/components/ExerciseModals.tsx:182-186`. → один хелпер.
5. **Дубли предиката доступа**: `visibleTo()` (`src/lib/data.ts:28`) и проверка в `src/actions/_shared.ts` (`exercisesVisible`). → свести в одно место.
6. Индексы: базовое покрытие хорошее (`exercise_translations` — `UNIQUE(exercise_id, locale)`). Кандидаты под `workouts(user_id, template_id)` подтвердить `EXPLAIN ANALYZE` в блоке 3 (только read-only).

## Блок 3 — БД (найдено; решение — только аддитивно)

- Таблицы `users, exercises, templates, template_exercises, template_sets, workouts, workout_exercises, sets, measurements, exercise_translations` — все актуальны, «мёртвых таблиц» не найдено.
- **Под проверку read-only запросом:** реально ли используются `sets.duration_sec/distance_m`, `template_sets.duration_sec/distance_m`, `template_exercises.superset_id`, `exercises.category` (vs `primary_groups`), `templates.moderation_status`.
- Если поле не заполняется в проде — пометить устаревшим и **убрать из чтения/записи в коде** (столбцы НЕ удалять: правило «миграции только аддитивные»).
- `exercise_translations.id` (`SERIAL PK`) избыточен при `UNIQUE(exercise_id, locale)` — только отметить, менять не будем.
- Миграции — только `db/schema.sql` + `db/indexes.sql` + `db/setup.mjs`, идемпотентно (`CREATE … IF NOT EXISTS`).

## Блок 4 — Комментарии

Удалить все русские комментарии; очевидные выкинуть; неочевидные инварианты (JWT/сессия, i18n-семантика `coalesce`, идемпотентность схемы, смысл cookie `data-theme`) переписать в 1 строку на английском. Объём ≈200 строк в ≈50 файлах — отдать субагентам после согласования стиля.

## Блок 5 — Структура папок (файлы НЕ двигать до этого момента)

Проблема одна: `src/lib/` смешивает слои. Предлагаемое дерево:

```
src/lib/
  data.ts, types.ts            # доступ к данным + доменные типы (как есть)
  auth/                        # auth.ts, session.ts
  domain/                      # anatomy.ts, validation.ts, draft.ts
  util/                        # dates.ts, site.ts, theme.ts
src/components/                # ui/ (Modal), layout/ (Chrome, LocaleSwitcher), exercise/ (3 шт.)
```

Плюс мелочи: `global.d.ts` → `src/types/i18n.d.ts`; `HistoryClient.tsx` из корня `[locale]/` (либо оставить, т.к. это index-роут `/` — обосновать в момент блока).

## Блок 6 — Прочее (найдено)

- **Зависимости:** используются все, кроме **`drizzle-kit` + `dotenv` + `drizzle.config.ts`** — фактически мёртвые (`push/migrate` запрещены, скриптов нет). `drizzle-orm` нужен в рантайме. → предложить удаление (см. открытый вопрос 2).
- **Конфиги:** `.env.example` **неполный** — код читает `NEXT_PUBLIC_SITE_URL` (`src/lib/site.ts:3`) и `NEXT_PUBLIC_LOCALES` (`src/i18n/routing.ts:11`), в примере их нет → добавить. Prettier не настроен (формат не enforced). `tsconfig`: `allowJs: true`, `target: ES2017` — кандидаты на уточнение (не критично).
- **Секреты:** утечек нет; единственное совпадение grep — плейсхолдер `'sk-ant-…'` в `src/lib/ai/config.ts:32` (UI-подсказка). `.env*` в `.gitignore`.
- **Типизация:** `any` / `as any` — **нет**. Один `as unknown as` (`AiChat`, dynamic-ключи провайдеров, обоснован). Дубль типа `{ file; url; type }`: `MediaSection.PendingMedia`, `draft.pendingMedia`, `WorkoutDetail` → свести в `src/lib/types.ts`.
- **Ошибки:** единый `ActionResult` + коды — хорошо; `console.error` только в `src/actions/ai.ts` (двойной, см. блок 1); «проглоченных» ошибок нет, кроме намеренных `catch {}` (localStorage/cookie).
- **Безопасность:** хардкод-ключей нет; SQL параметризован (`sql.raw` — только константа); проверки владельца в экшенах есть; CORS не нужен (API только сессионный `/api/export`). Замечание: нет rate-limit на логин (не критично).
- **Мёртвый код:** см. блок 1. `Modal` **не мёртв** (используется в `src/components/ExerciseModals.tsx:8`).
- **Тесты:** отсутствуют (нет раннера и файлов `*.test.*`). Предложить минимальный набор (vitest) для чистых хелперов — только с разрешения (новая зависимость).
- **Пустых каталогов нет** (ложное срабатывание прошлой проверки — из-за `[...]` в путях; перепроверено).

## Блок 7 — Подготовка к локализации: датасет (≤10 строк, как просили)

1. RU-тексты в БД: `exercises.name` — **311 строк**; файл-источник уже есть: `db/i18n/exercise-translations.en.tsv` (311 записей + 14 строк комментариев/шапки).
2. Справочные RU-строки в БД: `primary_groups[]`, `secondary_muscles[]` (в коде — 7 групп + 26 мышц = **33**, `src/lib/anatomy.ts`), `category`, `equipment` (точное число уникальных значений — только read-only запрос; оценка ~40–200).
3. Пользовательский текст (`workouts.title`, `templates.name/description`) **не переводим** — остаётся на языке автора.
4. Захардкожено в коде (не в БД), вынести в тот же файл с колонкой `source`: `anatomy.ts` (33), SQL-литерал `'Другое'` (`src/lib/data.ts:201`, `src/actions/exercises.ts:62`), фолбэки черновика (`src/lib/draft.ts:28,79`), RU-промпты/описания инструментов AI (`src/actions/ai.ts`, ~20 строк).
5. **Итого:** ≈ **311 имён** + **33 анатомии** + `'Другое'` + (`category`/`equipment` — уточнить) ≈ **350+ строк** по 4 сущностям.
6. Связь с ключами уже есть: `exercise_translations(exercise_id, locale, name)`, `UNIQUE(exercise_id, locale)`, наполнение из TSV.
7. Варианты структуры: **(A)** generic `translations(entity, entity_id, field, locale, value)` — гибко, но дублирует уже существующую `exercise_translations`; **(B)** оставить `exercise_translations` для имён + новая **`reference_translations(kind, source_value, locale, value)`** для справочников без id.
8. **Рекомендация — (B):** у сущностей с id — своя таблица (работает + TSV + `db:i18n:*`), у справочных строк без id — `kind + source_value` с `UNIQUE(kind, source_value, locale)`; существующие RU-значения не трогаем (аддитивно).
9. Чтобы не терять связь при изменении RU-строки — держать RU→key мап в коде (`anatomy.ts` фактически уже он), в БД хранить `source_value` как есть.
10. Строки интерфейса, захардкоженные в коде, в БД **не попадают** — им место в `messages/*.json` (сделано в Phase 2); в файл-источник добавить отдельную секцию с колонкой `source`.

---

## Открытые вопросы — статус на 2026-10-05

1. **read-only SQL к `DATABASE_URL`** — ✅ разрешён и использован бы, но **локальный Postgres не запущен** (`ECONNREFUSED 127.0.0.1:5432`), поэтому точные подсчёты и `EXPLAIN` отложены. SQL — в разделе «Что сделано», выше.
2. **Мёртвые `drizzle-kit` / `dotenv` / `drizzle.config.ts`** — ✅ решено **не удалять**: `dotenv` нужен `db/setup.mjs` и `db/i18n/*.mjs`; `drizzle-kit` оставлен как единственный способ перевыгрузить `src/db/schema.ts` (`drizzle-kit pull`), конфиг помечен пояснением.
3. **Структура датасета переводов** — ✅ принят **вариант B** и реализован (SQL + TSV-инвентарь + зеркало в TS-схеме). Миграция ждёт доступной БД.
4. **Чипы групп/категорий на `/exercises`** — ⏸ статус-кво: это **данные из БД**, по требованию заказчика их не переводим; переводы появятся, когда включим показ через `reference_translations` (Phase 3). Маппинг RU→EN уже подготовлен в TSV.
5. **Тесты (vitest)** — ❌ **не добавляем** (решение пользователя 2026-10-05): новых зависимостей нет.
6. **Блок 5 (структура папок)** — ⏸ отложен **по согласованию с пользователем (2026-10-05)** до коммита незакоммиченной i18n-работы. Трек B на этом закрыт: блоки 1, 2, 6, 3, 7, 4 сделаны.

## Baseline-факты (для сверки завтра)

- Ветка: `develop`. `npm run verify` — ALL PASS.
- Стек: Next 16.3.5, React 19.2.8, TS 5 strict, ESLint 9 flat, PostgreSQL + drizzle-orm 0.45, next-intl 4, zod 4, chart.js, dnd-kit, Cloudinary, AI-фасад (`@google/genai`/`openai`/`@anthropic-ai/sdk`).
- `src/` ≈70 файлов: `app/[locale]/**`, `actions/` (7), `lib/` (10 + `lib/ai/`), `components/` (6), `db/`, `i18n/` (5).
- Незакоммиченная i18n-работа на месте (список — `memory-bank/activeContext.md`); `memory-bank/`, `docs/`, `.cline/`, `.clinerules/`, `messages/`, `db/i18n/` — untracked.
