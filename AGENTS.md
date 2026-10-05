<!-- BEGIN:nextjs-agent-rules -->

# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->

# GymCore — инструкции для агента

**Язык общения — русский.** Код, идентификаторы, коммиты — английский. Ответы краткие, без пересказа прочитанных файлов.

## В начале задачи — читать (в этом порядке)

1. `memory-bank/activeContext.md` — что происходит прямо сейчас.
2. `memory-bank/progress.md` — этапы, долги (при необходимости).
3. Дальше по потребности: `memory-bank/{projectbrief,techContext,systemPatterns}.md`, `docs/i18n-plan.md`.

Репозиторий заново не сканировать: карта файлов, модель данных и конвенции описаны в `memory-bank/systemPatterns.md`, стек и команды — в `memory-bank/techContext.md`.

## Скиллы (`.cline/skills/`)

| Скилл | Когда использовать |
| --- | --- |
| `gymcore-verify` | после любых правок кода — `npm run verify` (типы → eslint → build, компактный отчёт) |
| `gymcore-i18n` | локализация (`[locale]`, next-intl), переводы упражнений в БД, SEO/hreflang |
| `gymcore-db` | любое изменение `db/schema.sql` / `db/indexes.sql` / seed |
| `gymcore-next16` | перед написанием Next-специфичного кода — карта гайдов в `node_modules/next/dist/docs/` |

## Жёсткие ограничения

- **Нет** `git commit` / `push` / `reset` / `checkout --` без явного разрешения пользователя.
- **Нет** `drizzle-kit push|generate|migrate`. Схема — `db/schema.sql` + `db/indexes.sql`, идемпотентно, через `npm run db:setup`.
- Не трогать авто-блок `nextjs-agent-rules` выше — его перегенерирует `next dev`. `CLAUDE.md` (`@AGENTS.md`) не удалять.
- Не читать и не печатать `.env.local`; список переменных — `.env.example`.
- БД-миграции только аддитивные; в каждой Server Action — проверка владельца данных.
- Не перезаписывать незакоммиченную работу в worktree (список — в `memory-bank/activeContext.md`).

## Команды

```bash
npm run dev        # next dev
npm run build      # next build
npm run lint       # eslint (flat config)
npm run db:setup   # применить schema.sql + indexes.sql
npm run verify     # tsc --noEmit + eslint + build, короткий отчёт (скилл gymcore-verify)
```

## Конец задачи

1. `npm run verify` — обязательно.
2. Обновить `memory-bank/activeContext.md` (ветка, статус, что сделано, следующие шаги, открытые вопросы); этап закрыт → ещё `progress.md`.
3. В ответе: изменённые файлы → как проверено → что дальше.

