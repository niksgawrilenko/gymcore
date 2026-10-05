# GymCore — Tech Context

> Стек, команды, ограничения окружения. Обновлять при изменении зависимостей/скриптов.

## Стек

- **Next.js 16.3.5** (App Router, Server Actions, React 19.2.8). Важно: API и конвенции отличаются от обучающих данных → перед написанием кода читать `node_modules/next/dist/docs/`. Карта нужных гайдов — скилл `gymcore-next16`.
- **TypeScript 5** (`strict`), ESLint 9 flat config (`eslint.config.mjs`, `eslint-config-next`).
- **PostgreSQL** (локально / Neon Frankfurt `eu-central-1`, pooled `-pooler?sslmode=require`).
- **drizzle-orm 0.45** (`src/db/index.ts` подключение, `src/db/schema.ts` типы) — но **источник истины схемы = `db/schema.sql`**, drizzle-kit только как зависимость.
- **Auth:** `jose` (JWT) + `bcryptjs`, httpOnly-cookie, `SESSION_SECRET`.
- **AI:** `@google/genai`, `openai`, `@anthropic-ai/sdk` (фасад `src/lib/ai/index.ts`).
- **Загрузки:** Cloudinary (`CLOUDINARY_*`).
- **UI:** свой CSS (`src/app/globals.css`, `src/app/app.css`, `marketing.css`), без Tailwind. Графики — chart.js. DnD — dnd-kit. Схемы — zod 4.
- Node `>=20.9`.

## Команды

```bash
npm run dev        # next dev
npm run build      # next build (полная проверка типов + роутов)
npm run lint       # eslint (flat config, без аргументов)
npm run db:setup   # node db/setup.mjs -> schema.sql, затем indexes.sql (идемпотентно)
npm run verify     # НЕ определено в package.json -> используй скилл gymcore-verify
```

`npx tsc --noEmit` — быстрая проверка типов без сборки.

## Окружение

- `.env.local` (не читать, не печатать): `DATABASE_URL`, `SESSION_SECRET`, `CLOUDINARY_*`, AI-ключи.
- `.env.example` — источник списка переменных.
- Vercel: регион функций `fra1` (`vercel.json`) должен совпадать с регионом Neon.
- Windows 11 + PowerShell. Команды выполнять без интерпретатора (`pager`-и не интерактивно: `git --no-pager`).

## Ограничения и ловушки

- **Нет `next lint`** в Next 16 — только `eslint` (см. `package.json`).
- **`src/proxy.ts`** — новая замена `middleware.ts`. Матчер и логика редиректов живут там.
- **Схема БД не в git-миграциях**: только `db/schema.sql` + `db/indexes.sql`, добавление — `CREATE TABLE/INDEX IF NOT EXISTS`.
- **`AGENTS.md`**: блок `<!-- BEGIN:nextjs-agent-rules -->` перегенерируется `next dev`; не удалять и не «чистить».
- `.gitignore` исключает `.env*`, `.next/`, `*.tsbuildinfo`, `dev.log`, `.vscode/`.
