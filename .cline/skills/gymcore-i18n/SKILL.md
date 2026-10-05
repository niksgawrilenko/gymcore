---
name: gymcore-i18n
description: Локализация GymCore на next-intl (en primary + ru): перенос роутов под [locale], строки UI, переводы упражнений в БД, SEO/hreflang, плюрализация. Use when the task mentions i18n, локализация, перевод, messages/en.json, messages/ru.json, next-intl, [locale], hreflang, LocaleSwitcher, или одну из фаз docs/i18n-plan.md.
---

# GymCore i18n

Полный план, фазы и обоснования: **`docs/i18n-plan.md`** — прочитай перед работой.
Зафиксированные решения не пересматривай без явного запроса пользователя.

## Незыблемое (уже согласовано)

- Движок `next-intl` 4.x. `locales: ['en','ru']`, `defaultLocale: 'en'`, `localePrefix: 'as-needed'` → `/welcome` = EN, `/ru/welcome` = RU.
- Роуты: `src/app/[locale]/**`. В `src/app/` остаются `robots.ts`, `sitemap.ts`, `manifest.ts`, `icon.png`, `apple-icon.png`, `globals.css`, `app.css`.
- Детект: `localeDetection: true` + cookie `NEXT_LOCALE` (1 год) — старые RU-закладки на unprefixed-путях должны попадать на RU.
- Источник истины ключей — `messages/en.json`; `messages/ru.json` — перевод (+ ICU `one`/`few`/`many` для русского).
- Упражнения: **одна** сущность + `exercise_translations(exercise_id, locale)`; показ `coalesce(t_L.name, e.name)`; `exercises.name` = исходное имя автора.
- SEO: индексируются обе локали (RU **не** `noindex`); hreflang `en`, `ru`, `x-default`→EN; sitemap на обе локали.

## Запрещено

Дублировать упражнения по локалям · авто-переводить пользовательские упражнения · подменять исходное имя машинным переводом ·
хранить локаль только в cookie · `localePrefix: 'never'` · `drizzle-kit push` (см. скилл `gymcore-db`).

## Переводы упражнений — решение A (канон, не менять без явного запроса)

Правила модели (`docs/i18n-plan.md` §2.1). Факт из кода: центрального каталога нет; «общее» = одобренная модерация (`is_public`) → **ссылка** на ту же строку,
а шеринг по ссылке (`share_id`) → **копия** у импортёра.

1. Переводит **только владелец** упражнения (`exercise.user_id = me`) — Server Action с проверкой владельца, как в `saveExercise`.
2. Показ: `coalesce(t_L.name, e.name)`. Фолбэк — исходное имя автора; машинный перевод не подставляем.
3. `exercises.source_locale` — **отложено**: структуру `exercises` не меняем (требование заказчика), для показа колонка не нужна. Добавим аддитивно, когда понадобится `lang=`/направление AI-перевода.
4. Правка имени в локали `L`: upsert `exercise_translations(exercise_id, L)`; русский оригинал в `exercises.name` **не перезаписывается**.
5. `importSharedExercise` копирует переводы исходника (`INSERT … SELECT`), иначе импортёр получит чужой язык.
6. Публичное упражнение — одна строка для всех: история/рекорды/статистика не расщепляются по языкам (это и есть причина запрета на дубли по локалям).
7. Пользовательский текст (`workouts.title`, `templates.name`) не переводится — показывается на языке автора; смешение языков в списке — норма.
8. Однолокальный деплой: `NEXT_PUBLIC_LOCALES` (дефолт `en,ru`); выключенная локаль не рендерится, переводы в БД остаются и включаются без миграции.

## Шаблон EN-перевода упражнений (`db/i18n/`)

| Шаг | Команда | Что делает |
| --- | --- | --- |
| 1 | `npm run db:i18n:export` | TSV-шаблон из БД: `name_ru` / `name_en` (пусто) / контекст. Заполненный файл не перезаписывается → `*.new.tsv` |
| 2 | вручную | заполнить `name_en` (UTF-8, табы); `name_ru` — ключ, не менять |
| 3 | `npm run db:i18n:import` | upsert `exercise_translations(locale='en')` по `lower(btrim(name_ru))`, одной транзакцией |
| 4 | `npm run db:i18n:import -- --dry-run` | отчёт без записи: новые/обновлённые, названия без совпадений |

Скрипты трогают **только** `exercise_translations` (не `exercises`). Ключ — русское имя, а не `exercise_id` (ID различаются между базами).
Один перевод применяется ко всем упражнениям с этим именем. Схема/откат — скилл `gymcore-db` (`db/schema.sql`, `db/rollback-20261004-exercise-translations.sql`).

## Перенос роутов: что уже сделано (не ломать при новых файлах)

Фаза 0 закрыта: `src/app/[locale]/**`, `src/app/[locale]/layout.tsx` (`<html lang>`, `NextIntlClientProvider`, `setRequestLocale`),
`src/i18n/{routing,request,navigation,server}.ts`, `global.d.ts`, `messages/{en,ru}.json`, `src/components/LocaleSwitcher.tsx`,
`src/proxy.ts` = next-intl middleware → проверка сессии (пути сравниваются **без** локали, `next=` сохраняет префикс).

| Правило | Статус |
| --- | --- |
| `Link`/`useRouter`/`usePathname` — только из `@/i18n/navigation` (14+6 файлов) | ✅ применено; в новых файлах не импортировать из `next/link`/`next/navigation` (кроме `notFound`) |
| `PageProps<'/[locale]/…'>` — ключ роута включает `[locale]` | ✅ применено в 7 страницах |
| `redirect()` в Server Actions/`lib` → `redirect(await localeHref('/x'))` (`src/i18n/server.ts`) | ✅ применено (4 файла); `localeHref` возвращает строку, поэтому сужение типов после `if (!user) redirect(...)` сохраняется |
| `revalidatePath` → `revalidatePath('/', 'layout')` | ✅ применено (8 вызовов) |
| Тексты ошибок форм — коды из экшена (`AuthErrorCode`), перевод в компоненте (`login.errors.*`) | ✅ на примере `authenticate`; так же делать для zod-схем вместо `firstError` |
| `forwardRef`/typed routes: `NAV_PATHS.includes(pathname)` требует `readonly string[]` | учтено в `Chrome.tsx` |
| Новые страницы: метаданные через `generateMetadata` + `getTranslations`, canonical — через `localeHref('/path')` | см. `welcome`, `privacy`, `login` |
| Строковые `href` (`/login?mode=register`) безопасны: при `pathnames: null` next-intl не парсит query в строке, а префиксует её целиком | подтверждено по коду пакета |

Незакрытая ловушка (Phase 3): показ имени упражнения — `coalesce(t_L.name, e.name)` в `src/lib/data.ts`, `saveExercise`
и `importSharedExercise`; хардкод-фолбэк «Без категории» в `ExercisesClient` вынести в ключ перевода.

## Порядок работы

Фазы 0 → 4 последовательно, каждая — отдельный проверяемый набор изменений на `develop`, без push.
Закрытие фазы: `npm run verify` + обновление `memory-bank/activeContext.md` и `progress.md`.

```powershell
npm run verify            # типы + eslint + build
npm run verify -- -SkipBuild   # быстрая проверка, если build ещё не нужен
```

Перед Next-специфичными правками (`proxy.ts`, `params`, кэш) — скилл `gymcore-next16`.
