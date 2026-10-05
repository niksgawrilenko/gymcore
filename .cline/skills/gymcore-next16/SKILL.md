---
name: gymcore-next16
description: Карта документации Next.js 16, лежащей в node_modules проекта, и список breaking changes, из-за которых код из обучающих данных модели неверен. Use BEFORE writing or changing any Next.js-specific code - routing, proxy, params, cookies, caching, revalidation, images, metadata, sitemap, Server Actions.
---

# GymCore · Next.js 16.3.5

Проект на **Next.js 16.3.5**: API отличаются от обучающих данных модели. Перед правками Next-кода открой нужный гайд
из `node_modules/next/dist/docs/` и прочитай **фрагмент** (файлы длинные — читай диапазоном строк).
Если гайд противоречит «памяти» — прав гайд.

## Карта «тема → файл» (пути от `node_modules/next/dist/docs/`)

| Тема | Гайд |
| --- | --- |
| Структура проекта, layouts/pages | `01-app/01-getting-started/02-project-structure.md`, `03-layouts-and-pages.md` |
| Ссылки и навигация | `01-app/01-getting-started/04-linking-and-navigating.md` |
| Server / Client компоненты | `01-app/01-getting-started/05-server-and-client-components.md` |
| Получение данных | `01-app/01-getting-started/06-fetching-data.md` |
| Мутации (Server Actions) | `01-app/01-getting-started/07-mutating-data.md`, `01-app/02-guides/server-actions.md`, `forms.md` |
| Кэш | `01-app/01-getting-started/08-caching.md`, `01-app/02-guides/caching-without-cache-components.md` |
| Ревалидация | `01-app/01-getting-started/09-revalidating.md`, `03-api-reference/04-functions/{revalidatePath,revalidateTag,updateTag,refresh}.md` |
| **`proxy.ts` (замена middleware)** | `01-app/01-getting-started/16-proxy.md` |
| Редиректы | `01-app/02-guides/redirecting.md`, `04-functions/{redirect,permanentRedirect}.md` |
| Metadata / OG / sitemap | `01-app/01-getting-started/14-metadata-and-og-images.md`, `04-functions/{generate-metadata,generate-sitemaps}.md` |
| i18n | `01-app/02-guides/internationalization.md` |
| Аутентификация | `01-app/02-guides/authentication.md` |
| Route Handlers | `01-app/01-getting-started/15-route-handlers.md` |
| Апгрейд на 16 (все breaking changes) | `01-app/02-guides/upgrading/version-16.md` |

## Breaking changes, которые чаще всего ломают код

1. **Async Request APIs** — `cookies()`, `headers()`, `params`, `searchParams` асинхронные: `await`.
2. **`middleware.ts` → `proxy.ts`** (функция `proxy`). В проекте уже `src/proxy.ts` — логику писать туда, не создавать middleware.
3. **`next lint` удалён** → только `eslint` (flat config, `eslint.config.mjs`).
4. **Async `id` у `sitemap`**, async params у `icon`/`opengraph-image` — важно для `src/app/sitemap.ts`, `icon.png`, `apple-icon.png`, `(marketing)/welcome/opengraph-image.tsx`.
5. **Кэш-API** переработаны: `revalidateTag`, `updateTag`, `refresh`, `cacheLife`, `cacheTag`; `experimental.dynamicIO` и `experimental.useCache` удалены.
6. **`unstable_rootParams` удалён** → `next/root-params` (есть в проекте, но наш путь для i18n — `next-intl`).
7. **Turbopack по умолчанию**, `next dev` и `next build` могут идти параллельно.
8. **Parallel Routes** требуют `default.js`.
9. **`next/image`** — несколько breaking-изменений (TTL, `qualities`, `imageSizes`, редиректы) — не полагайся на память.
10. **`next dev` перегенерирует `AGENTS.md`** (`nextjs-agent-rules`-блок) — не удалять его из diff'а.

## Границы

- Не обновляй Next и не меняй `next.config.ts` сверх задачи (i18n-обёртка — в скилле `gymcore-i18n`).
- Не копируй примеры из гайдов «как есть»: версия 16 + React 19 + отсутствие Tailwind в проекте.
- После Next-специфичных правок — `npm run verify` (скилл `gymcore-verify`).
