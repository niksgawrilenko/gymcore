# GymCore — трекер тренировок

Веб-приложение для записи тренировок: подходы, суперсеты, шаблоны программ, база упражнений с анатомией,
история с календарём, статистика, замеры тела, шеринг и модерация.

**Стек:** Next.js 16 (App Router, Server Actions) · React 19 · TypeScript · Drizzle ORM · PostgreSQL · Cloudinary.
Это одно приложение: страницы получают данные прямо на сервере, отдельного API-сервера нет.

## Локальный запуск

Нужны Node.js 20.9+ и PostgreSQL.

```bash
npm install
cp .env.example .env.local      # заполни DATABASE_URL и SESSION_SECRET
npm run db:setup                # создаст недостающие таблицы и индексы (существующие данные не трогает)
npm run dev                     # http://localhost:3000
```

## Деплой (Vercel + Neon)

1. **База.** Neon → создать проект в регионе **Frankfurt (eu-central-1)**. Если база уже есть, ничего не создавай.
2. **Схема.** Один раз с локальной машины: вписать Neon-строку в `DATABASE_URL` и выполнить `npm run db:setup`.
   На существующей базе команда только добавит индексы.
3. **Vercel.** New Project → импорт этого репозитория, настройки по умолчанию (Next.js определится сам).
4. **Environment Variables** в Vercel — те же, что в `.env.example`:
   `DATABASE_URL` (pooled-строка Neon, хост с `-pooler`, `?sslmode=require`), `SESSION_SECRET`, `CLOUDINARY_*`,
   **`NEXT_PUBLIC_SITE_URL`** (`https://ваш-домен`, без слэша на конце) — от него зависят canonical, hreflang,
   sitemap, robots.txt и `llms.txt`; при пустом значении подставится `http://localhost:3000`.
   `NEXT_PUBLIC_LOCALES` — необязательный список локалей (по умолчанию `en,ru`).
5. Регион функций задан в `vercel.json` (`fra1`). Он должен совпадать с регионом Neon, иначе каждый запрос
   к базе пойдёт между континентами.

После этого каждый `git push` в `main` деплоится автоматически.

## Публикация: безопасность и SEO

**Безопасность.**
- Заголовки на всех ответах (`next.config.ts`): HSTS, `X-Content-Type-Options`, `Referrer-Policy`,
  `X-Frame-Options`/`frame-ancestors`, `Permissions-Policy`, `Cross-Origin-Opener-Policy`, `X-Powered-By` выключен.
  CSP включается только в проде (`script-src 'self' 'unsafe-inline'`, наружу разрешены лишь Cloudinary-домены);
  в `next dev` она не мешает HMR.
- Ограничение частоты (`src/lib/rate-limit.ts`): логин — 10 попыток/10 мин на адрес и 5 на пару адрес+логин,
  регистрация — 5/час, подписи загрузки в Cloudinary — 60/час на пользователя. Счётчики живут в памяти
  инстанса (serverless), то есть тормозят перебор, но не заменяют внешний WAF/store.
- Успешный вход сбрасывает счётчики; неизвестный логин проверяется по фиктивному bcrypt-хешу, чтобы время
  ответа не выдавало существование аккаунта.
- `/api/export` отдаётся с `Cache-Control: no-store`, `/shared/*` и `/api/*` — с `X-Robots-Tag: noindex`.
- Сессия — подписанный JWT (HS256) в httpOnly-cookie; владелец данных проверяется в каждой Server Action.

**SEO и продвижение.**
- `src/app/robots.ts` (индексируются только `/welcome`, `/privacy`, `/llms.txt`), `src/app/sitemap.ts`
  (обе локали + `alternates.languages`), `src/app/manifest.ts` (PWA-установка).
- Canonical и hreflang (`en`/`ru`/`x-default`) — `localizedAlternates()` в `src/i18n/server.ts`.
- OG/Twitter-картинка (`welcome/opengraph-image.tsx`), JSON-LD `SoftwareApplication` + `FAQPage` + `WebSite` +
  `Organization`, keywords для Яндекса, `llms.txt` для ИИ-краулеров.
- Локализованные 404 (`not-found.tsx`) и экран ошибки (`error.tsx`) внутри приложения.

**Чек-лист после первого деплоя:** задать домен и `NEXT_PUBLIC_SITE_URL`, отправить `https://домен/sitemap.xml`
в Google Search Console, Bing Webmaster Tools и Яндекс.Вебмастер, проверить `robots.txt` и OG-карточку
(например, в валидаторе Facebook/Telegram), затем проверить `/en/exercises`, `/ru/exercises` под логином.

### Как попасть в индекс поисковиков

Со стороны сайта всё готово: `robots.txt` пускает только `/welcome`, `/privacy`, `/llms.txt`; `sitemap.xml`
отдаёт обе локали с hreflang (`en`, `ru`, `x-default`); есть OG-картинка, JSON-LD (`SoftwareApplication`,
`FAQPage`, `WebSite`, `Organization`) и `llms.txt` для ИИ-ассистентов. Приложение за логином закрыто от
индексации намеренно — индексируются только публичные страницы.

1. **Подтвердить владение домена.** Присвойте в Vercel переменные `GOOGLE_SITE_VERIFICATION`,
   `YANDEX_VERIFICATION`, `BING_SITE_VERIFICATION` (значения из консолей) — теги попадут в `<head>`
   автоматически (`src/app/[locale]/layout.tsx`). Альтернатива — DNS TXT-запись или HTML-файл в `public/`.
2. **Google Search Console:** добавить ресурс → «Файлы Sitemap» → `sitemap.xml` → «Проверка URL» →
   «Запросить индексирование» для `/welcome` и `/privacy` (для русской версии — `/ru/welcome`, `/ru/privacy`).
3. **Яндекс.Вебмастер:** «Индексирование → Файлы Sitemap» → `sitemap.xml`, затем «Переобход страниц» для тех же URL.
4. **Bing Webmaster Tools:** «Sitemaps» → `sitemap.xml` (можно импортировать ресурс из GSC).
5. **Проверить, что в выдаче правильный домен:** в `robots.txt` и `sitemap.xml` не должно быть `localhost` —
   значит `NEXT_PUBLIC_SITE_URL` задан (или сработал фолбэк на домен Vercel).
6. **Ускорить индексацию:** внешние ссылки на сайт (профиль GitHub, соцсети, каталоги приложений,
   Product Hunt / Reddit / профильные форумы), плюс опционально IndexNow (Bing + Яндекс) для мгновенного
   уведомления об изменениях.
7. **Смотреть метрики раз в 1–2 недели:** «Покрытие»/«Страницы в индексе». Локализованный 404 на битых
   ссылках — норма; «Обнаружено, но не проиндексировано» на `/welcome` означает нехватку внешних ссылок.

## Структура

```
src/app/          страницы (история, тренировка, шаблоны, упражнения, профиль, статистика, замеры, админка, шеринг)
src/actions/      Server Actions — все изменения данных (с проверкой владельца в каждом)
src/components/   общие клиентские компоненты (редактор упражнений, модалки, медиа)
src/lib/          запросы к БД, сессия, валидация, даты
src/db/           подключение и описание схемы для Drizzle
src/proxy.ts      редирект неавторизованных на /login
db/schema.sql     схема БД (идемпотентная)
db/indexes.sql    индексы
db/setup.mjs      `npm run db:setup`
```

## Заметки

- Сессия — подписанный JWT в httpOnly-cookie (`SESSION_SECRET`).
- Черновик активной тренировки хранится в `localStorage` и переживает перезагрузку. На сервер он попадает при «Сохранить».
- Фото и видео грузятся из браузера прямо в Cloudinary по подписи сервера.
- Даты форматируются в таймзоне устройства (cookie `tz`), а не сервера.
- Удаление своего упражнения удаляет и его историю в тренировках (`ON DELETE CASCADE` в схеме).
- Не запускай `drizzle-kit push` на проде: схема ведётся в `db/schema.sql`.
