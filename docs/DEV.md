# GymCore — техническая документация

Внутренняя документация репозитория: запуск, деплой, безопасность, SEO и структура.
Витрина проекта — [README.md](README.md) (EN) и [README.ru.md](README.ru.md) (RU).

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
  регистрация — 5/час, подписи загрузки в Cloudinary — 60/час на пользователя, запуск демо — 15/час на адрес.
  Счётчики живут в памяти инстанса (serverless), то есть тормозят перебор, но не заменяют внешний WAF/store.
- Успешный вход сбрасывает счётчики; неизвестный логин проверяется по фиктивному bcrypt-хешу, чтобы время
  ответа не выдавало существование аккаунта.
- `/api/export` отдаётся с `Cache-Control: no-store`, `/shared/*` и `/api/*` — с `X-Robots-Tag: noindex`.
- Сессия — подписанный JWT (HS256) в httpOnly-cookie; владелец данных проверяется в каждой Server Action.

**SEO и продвижение.**
- `src/app/robots.ts` (индексируются только `/welcome`, `/privacy`, `/llms.txt` и их RU-варианты
  `/ru/welcome`, `/ru/privacy`; `sitemap.xml` разрешён явно — иначе `Disallow: /` блокирует и его, и Google
  не может скачать карту сайта; голые `/` и `/ru` разрешены только как редиректы на лендинг), `src/app/sitemap.ts`
  (обе локали + `alternates.languages`), `src/app/manifest.ts` (PWA-установка).
- Canonical и hreflang (`en`/`ru`/`x-default`) — `localizedAlternates()` в `src/i18n/server.ts`.
- OG/Twitter-картинка (`welcome/opengraph-image.tsx`), JSON-LD `SoftwareApplication` + `FAQPage` + `WebSite` +
  `Organization`, `llms.txt` для ИИ-краулеров.
- Локализованные 404 (`not-found.tsx`) и экран ошибки (`error.tsx`) внутри приложения.

**Чек-лист после первого деплоя:** задать домен и `NEXT_PUBLIC_SITE_URL`, отправить `https://домен/sitemap.xml`
в Google Search Console, проверить `robots.txt` и OG-карточку (например, в валидаторе Facebook/Telegram),
затем проверить `/en/exercises`, `/ru/exercises` под логином.

### Как попасть в индекс поисковиков

Со стороны сайта всё готово: `robots.txt` пускает только `/welcome`, `/privacy`, `/llms.txt` (и их RU-версии
`/ru/welcome`, `/ru/privacy`) плюс сам `/sitemap.xml` (иначе `Disallow: /` блокирует и карту сайта, и Search
Console пишет «Не удалось обработать файл Sitemap»); `sitemap.xml` отдаёт обе локали с hreflang (`en`, `ru`, `x-default`); есть
OG-картинка, JSON-LD (`SoftwareApplication`, `FAQPage`, `WebSite`, `Organization`) и `llms.txt` для
ИИ-ассистентов. Приложение за логином закрыто от индексации намеренно — индексируются только публичные
страницы. Голый корень `/` — это редирект на лендинг (`/` → `/welcome`, `/ru` → `/ru/welcome`), поэтому в
«Проверке URL» для него Google покажет редирект, а не «Заблокировано»; запрашивать индексирование нужно для
URL лендинга.

1. **Подтвердить владение доменом.** Токен Google уже вшит в проект (константа в
   `src/app/[locale]/layout.tsx`) и выводится `<meta name="google-site-verification">` на всех страницах.
   Для `*.vercel.app` подходит **только URL-prefix-ресурс** (`https://<домен>/`) с методом «HTML-тег»:
   DNS TXT-запись добавить нельзя — домен принадлежит Vercel. Значение можно перекрыть переменной
   `GOOGLE_SITE_VERIFICATION` в Vercel (другой домен/перевыпущенный токен). Резервный путь, если хочется
   подтвердить именно методом «HTML-файл»: `public/google0823b479960c35e6.html` (содержимое —
   `google-site-verification: google0823b479960c35e6.html`) отдаётся как
   `https://<домен>/google0823b479960c35e6.html`. Токен перевыпустят — файл переименовывается под выданное имя.
2. **Google Search Console:** добавить ресурс → «Файлы Sitemap» → `sitemap.xml` → «Проверка URL» →
   «Запросить индексирование» для `/welcome` и `/privacy` (для русской версии — `/ru/welcome`, `/ru/privacy`).
   Если после правки `robots.txt` «Проверка URL» всё ещё показывает **старые** правила — это норма: URL
   Inspection (и сам Googlebot) используют **закэшированную** копию `robots.txt`, а не свежую. Форсировать
   обновление: **Настройки → robots.txt → «Запросить повторное сканирование»** (доступно для domain-ресурса
   или URL-prefix без пути), затем повторить проверку.
3. **Проверить, что в выдаче правильный домен:** в `robots.txt` и `sitemap.xml` не должно быть `localhost` —
   значит `NEXT_PUBLIC_SITE_URL` задан (или сработал фолбэк на домен Vercel).
4. **Ускорить индексацию:** внешние ссылки на сайт (профиль GitHub, соцсети, каталоги приложений,
   Product Hunt / Reddit / профильные форумы) — по ним краулер доходит до страниц быстрее.
5. **Смотреть метрики раз в 1–2 недели:** «Покрытие»/«Страницы в индексе». Локализованный 404 на битых
   ссылках — норма; «Обнаружено, но не проиндексировано» на `/welcome` означает нехватку внешних ссылок.

## Демо-режим (одноразовый)

Кнопка «Попробовать демо» (`src/components/DemoButton.tsx`, на `/login` и лендинге) создаёт свежий аккаунт
`demo+<random>` и клонирует в него данные каноничного пользователя `demo`: шаблоны Push/Pull/Legs, историю
тренировок за 12 недель и замеры тела. Гость сразу видит наполненное приложение без регистрации; клон живёт
в отдельной строке `users`, поэтому реальные аккаунты не затрагиваются.

- **Источник данных** — пользователь `demo`. Наполнить/обновить: `npm run db:demo:seed`
  (`node db/demo/seed.mjs`; для не-локальной базы сначала `--dry-run`, затем `--yes`). Скрипт идемпотентен:
  данные `demo` пересоздаются в одной транзакции. Упражнения НЕ создаются — имена в `db/demo/demo-data.mjs`
  должны точно совпадать с `exercises.name`, иначе сид завершится ошибкой со списком ненайденных. Флаг
  `--reset` дополнительно удаляет все аккаунты `demo+*`; `--dry-run` не пишет в БД ничего (вставка
  пользователя обёрнута в транзакцию с `ROLLBACK`).
- **Клонирование** — `src/lib/demo.ts` (`startDemoSession`), вызывается Server Action `src/actions/demo.ts`
  (лимит 15 запусков/час на IP). Всё в одной транзакции: аккаунт + шаблоны + история + замеры.
- **Уборка.** Ленивая — при следующем запуске демо удаляются `demo+*` старше 24 ч. Плюс Vercel Cron
  (`vercel.json` → `/api/cron/demo-cleanup`, раз в сутки) с проверкой `Authorization: Bearer ${CRON_SECRET}`.
  Переменную `CRON_SECRET` задайте в Vercel; локально — в `.env.local`.
- **Вход в демо** — только кнопкой: у `demo`/`demo+*` фиктивный bcrypt-хеш, паролем войти нельзя. Пока идёт
  демо-сессия, под шапкой висит полоса `DemoBanner` (src/components/DemoBanner.tsx) с выходом.
- **ИИ-тренер** в демо просит свой ключ: он хранится только в браузере (см. `src/actions/ai.ts`) — так и задумано.

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
db/demo/          сид демо-данных (`npm run db:demo:seed`) и генератор датасета
```

## Заметки

- Сессия — подписанный JWT в httpOnly-cookie (`SESSION_SECRET`).
- Черновик активной тренировки хранится в `localStorage` и переживает перезагрузку. На сервер он попадает при «Сохранить».
- Фото и видео грузятся из браузера прямо в Cloudinary по подписи сервера.
- Даты форматируются в таймзоне устройства (cookie `tz`), а не сервера.
- Удаление своего упражнения удаляет и его историю в тренировках (`ON DELETE CASCADE` в схеме).
- Не запускай `drizzle-kit push` на проде: схема ведётся в `db/schema.sql`.

