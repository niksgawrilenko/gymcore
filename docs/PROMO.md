# GymCore — промо-плейбук

Цель: первые внешние пользователи и 20–50 звёзд на GitHub. Приложение бесплатное и без рекламы, поэтому
«продавать» его не нужно — достаточно честно показать, что оно есть и работает.

**Правило номер один:** в большинстве сообществ самопиар ограничен (специальные треды, «Saturday»-посты,
правило 9:1 на Reddit). Перед постом прочитай правила конкретного сабреддита/канала — иначе пост снесут,
а аккаунт могут забанить. Просить звёзды напрямую нельзя почти нигде: проси попробовать и дать фидбек.

## Что прикладывать к постам

| Ассет | Файл |
| --- | --- |
| Превью-картинка для ссылок (1200×630) | `docs/og.png` |
| Лендинг, десктоп | `docs/screenshots/welcome-desktop-en.png`, `...-ru.png` |
| Лендинг, телефон | `docs/screenshots/welcome-mobile-en.png`, `...-ru.png` |

**Ссылки:** приложение — https://gymcore-omega.vercel.app/ · код — https://github.com/niksgawrilenko/gymcore ·
после включения Pages — зеркало лендинга https://niksgawrilenko.github.io/gymcore/

## Приоритет каналов

| Приоритет | Канал | Что даёт | Риск |
| --- | --- | --- | --- |
| 1 | r/SideProject, r/InternetIsBeautiful, r/coolgithubprojects | самых релевантных читателей, там самопиар разрешён | низкий, но читай правила |
| 2 | Show HN (news.ycombinator.com/submit) | технический трафик и звёзды, если пост зайдёт | средний: HN не любит маркетинг — только факты и «попробуйте» |
| 3 | VC.ru / Habr (статья на русском) | русскоязычная аудитория, статья живёт месяцами | низкий |
| 4 | Telegram-каналы про зал/ЗОЖ и про разработку | быстрый отклик, много мобильного трафика | средний: у многих каналов промо только по договорённости |
| 5 | Product Hunt | разовый всплеск, хороший бэклинк | низкий, но нужен аккуратный набор ассетов |
| 6 | X / LinkedIn / Threads | бэклинки и профильные контакты | низкий |
| 7 | awesome-списки на GitHub (awesome-selfhosted, awesome-fitness и др.) | пассивный трафик на годы | низкий, но у каждого списка свои критерии |

## Готовые тексты (EN)

### Show HN

Title:
`Show HN: GymCore – free, ad-free workout journal (open source, Next.js 16)`

Первый комментарий (HN требует быть в комментариях первые часы):
> I built GymCore because every workout app I tried either pushed a subscription or showed ads, and the
> free ones wanted my email and a card.
>
> What it does: log sets and supersets in seconds (the draft survives a closed tab), history and calendar
> by day, progress charts per exercise over the whole history, body measurements with change history,
> program templates, and program sharing by link.
>
> It comes with a library of 312 exercises with anatomy, an optional AI coach (bring your own Gemini /
> Claude / GPT key — it stays in the browser), and full JSON export of your data.
>
> No accounts on third parties, no analytics that track you: the app is a plain Next.js 16 App Router app
> with Server Actions, Drizzle ORM and PostgreSQL. MIT licensed, self-hosting notes are in docs/DEV.md.
>
> The interface is English and Russian. I'd love feedback on the logging UX and on what is missing.

### Reddit (r/SideProject, r/InternetIsBeautiful, r/coolgithubprojects)

Title:
`I built a free workout journal with no ads and no subscriptions — 312 exercises with anatomy, charts, program sharing`

Body:
> I train with a notebook and got tired of apps that nag you to subscribe, so I built my own and made it
> completely free: no ads, no premium tiers, no trial period — just a username and a password.
>
> Features: sets and supersets logged in seconds (draft is saved), calendar history, progress charts per
> exercise over your whole history, body measurements, program templates and program sharing by link.
> 312 exercises with anatomy diagrams. Optional AI coach with your own key (stored only in your browser).
> Full JSON export any time. English and Russian. Installs to the phone home screen.
>
> Link: https://gymcore-omega.vercel.app/ — source (MIT): https://github.com/niksgawrilenko/gymcore
>
> Happy to hear what to add next — especially from people who train with barbells.

### X / Twitter (тред из трёх постов)

> 1/ I built a workout journal that is actually free: no ads, no subscriptions, no premium tiers.
> Sets and supersets in seconds, charts per exercise, measurements, program sharing — all unlocked at sign-up.
> https://gymcore-omega.vercel.app/
>
> 2/ Built with Next.js 16 App Router, Server Actions, Drizzle ORM and PostgreSQL. MIT licensed and
> self-hostable — docs/DEV.md has the details.
> Source: https://github.com/niksgawrilenko/gymcore
>
> 3/ 312 exercises with anatomy, English + Russian, installs to the home screen, optional AI coach with
> your own key. Feedback welcome.

### LinkedIn

> I shipped GymCore — a free workout journal with no ads and no subscriptions.
> Why: the logging flow in most apps is slower than a notebook, and the rest hides behind a paywall.
> GymCore logs sets and supersets in seconds, keeps a full history with charts and measurements, shares
> programs by link and exports all your data to JSON. It is open source (MIT) and built with Next.js 16,
> Drizzle ORM and PostgreSQL. Interface in English and Russian.
> Try it: https://gymcore-omega.vercel.app/ · Code: https://github.com/niksgawrilenko/gymcore

### Product Hunt (когда будет готов галерейный набор)

Tagline (до 60 символов): `Free workout journal. No ads, no subscriptions.`
Description: rewrite of the first Reddit paragraph. В галерею кладём `og.png` + два телефонных скриншота.
В первый комментарий (от имени мейкера) — историю «почему бесплатно» и просьбу дать фидбек.

## Готовые тексты (RU)

### Telegram — короткая версия (для чатов друзей, где уместно)

> Сделал GymCore — бесплатный дневник тренировок, без рекламы и подписок. Подходы и суперсеты
> записываются за пару секунд, есть графики прогресса, замеры тела, шаблоны программ и 312 упражнений
> с анатомией. Интерфейс на русском, ставится на домашний экран телефона.
> https://gymcore-omega.vercel.app/

### Telegram — для тематических каналов (сначала договориться с админом)

> GymCore — открытый дневник тренировок (лицензия MIT), полностью бесплатный: ни рекламы, ни подписок,
> ни «премиум-режимов». Для регистрации нужен только логин и пароль.
> Что есть: подходы и суперсеты с сохранением черновика, история по дням, графики объёма по упражнениям
> за всю историю, замеры тела с историей изменений, шаблоны программ и обмен программой по ссылке,
> библиотека 312 упражнений с анатомией, ИИ-тренер со своим ключом (ключ хранится в браузере),
> экспорт всей истории в JSON.
> Приложение: https://gymcore-omega.vercel.app/ · Код: https://github.com/niksgawrilenko/gymcore

### VC.ru / Habr — заголовки и план статьи

Варианты заголовка:
- `Как я сделал бесплатный дневник тренировок на Next.js 16 и выложил его в опенсорс`
- `GymCore: дневник тренировок без рекламы и подписок — что внутри и почему бесплатно`

План (Habr ценит инженерную часть, а не «зацените приложение»):
1. Задача: чем не устроили 5 популярных дневников (подписка, реклама, скорость логирования).
2. Почему бесплатно: одиночный проект, нет команды и поддержки, лицензия MIT, self-hosting по инструкции.
3. Стек и решения: Next.js 16 App Router + Server Actions, React 19, Drizzle ORM + PostgreSQL,
   next-intl (`en`/`ru` с hreflang и отдельным sitemap), PWA и оффлайн-черновик тренировки,
   CSP без `unsafe-eval`, защита данных на уровне каждой Server Action.
4. Данные: библиотека 312 упражнений с анатомией, шаблоны тренировок, шаринг программы ссылкой.
5. Мобильный UX: почему телефон в зале важнее десктопа, крупные кнопки, тёмная тема.
6. Что дальше и как получить фидбек. В конце — ссылка на приложение и репозиторий.
   Детали по каждой теме есть в `docs/DEV.md` — оттуда можно брать конкретику.

## Этикет: что ломает запуск

- Одинаковый текст в пять сообществ за час выглядит как спам и часто упирается в фильтры.
- Не просить звёзды/апвоуты и не покупать их — на GitHub за это снимают звёзды и могут ограничить репозиторий.
- Не постить промо в r/fitness и подобные крупные сабы без разрешения модерации: там самопиар только
  в специально отведённых тредах.
- Первые 1–2 часа после поста нужно отвечать в комментариях — именно это вытягивает посты наверх.
- Product Hunt: просить апвоуты в личных сообщениях нельзя, это нарушение правил платформы.
- Заголовки без КАПСА и без «кричащих» эмодзи — так пост не удаляют премодерируемые сообщества.

## GitHub-сторона (бесплатный долговременный трафик)

- [x] Витрина в `README.md` + `README.ru.md`, MIT-лицензия, публичный репозиторий.
- [ ] About: короткое описание (EN) + Website уже указан; заполнить Topics.
- [ ] Включить Secret scanning и Push protection (Settings → Code security).
- [ ] Загрузить Social preview (можно взять `docs/og.png`).
- [ ] Включить Discussions: Settings → General → Features — даёт страницу обсуждений и поисковый трафик.
- [ ] Первый релиз: Releases → Draft a new release (`v1.0.0`) с коротким описанием — попадает в ленту.
- [ ] Settings → Pages → Source: `Deploy from a branch`, Branch `main`, folder `/docs` — включает зеркало
      лендинга на `https://niksgawrilenko.github.io/gymcore/` (после включения добавлю ссылку в README).
- [ ] Закрепить репозиторий в профиле и добавить ссылку в profile README (`niksgawrilenko/niksgawrilenko`).
- [ ] Google Search Console: URL-prefix-ресурс + «HTML-тег» (токен уже вшит в приложение), затем отправить `sitemap.xml`.
- [ ] PR в тематические awesome-списки (`awesome-selfhosted`, `awesome-fitness`, списки PWA/Next.js) —
      сначала проверить критерии каждого списка.

## Метрики

| Что смотреть | Где |
| --- | --- |
| Просмотры и источники трафика | GitHub → Insights → Traffic (Views, Clones, Referrers) |
| Заходы и пути переходов | Vercel → Analytics / Logs |
| Индексация и запросы | Google Search Console |

Ключевая связка для проверки промо: сколько заходов дал канал и сколько из них дошло до регистрации.

## План на две недели

| День | Действие |
| --- | --- |
| 1 | GitHub-полировка: About, Topics, Pages, Social preview, релиз `v1.0.0`, Search Console |
| 2 | r/SideProject + X-тред, отвечать в комментариях |
| 3–4 | Show HN (утро вторника–четверга по US-времени), следить за тредом весь день |
| 5 | Статья на VC.ru или Habr по плану выше |
| 7 | 2–3 русскоязычных Telegram-канала (по договорённости с админами) |
| 8–9 | PR в awesome-списки |
| 10 | Product Hunt (галерея: `og.png` + два телефонных скриншота) |
| 14 | Ретроспектива: какой канал дал переходы и регистрации, повторить лучшее |

