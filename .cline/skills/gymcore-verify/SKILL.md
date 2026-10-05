---
name: gymcore-verify
description: Проверить, что GymCore собирается после правок кода. Use when asked to verify/check the project, before declaring a task done, when the user says "проверь", "собери", "всё ли зелёное", "работает ли", or after changes in src/, next.config.ts, package.json, db/.
---

# GymCore verify

Единая проверка: **types → eslint → production build**. Скрипт печатает компактный отчёт
(отфильтрованные ошибки), поэтому полный вывод `next build` не попадает в контекст.

## Запуск

```powershell
npm run verify                      # типы + lint + build
npm run verify -- -SkipBuild        # быстро: только типы + lint (перед полным прогоном)
npm run verify -- -Full             # весь вывод сборки (для разбора падения)
```

Напрямую (если npm недоступен): `powershell -NoProfile -ExecutionPolicy Bypass -File .cline/skills/gymcore-verify/scripts/verify.ps1`.

## Как реагировать

- `RESULT: ALL PASS` → запусти протокол завершения из `.clinerules/00-workflow.md` (обновить `memory-bank/activeContext.md`).
- `RESULT: FAIL` → в отчёте уже отобраны релевантные строки (`error TS…`, eslint, build). Правь причину; повторный запуск — после фикса, вслепую не перезапускай.
- Ошибка build из-за окружения (нет `DATABASE_URL`, нет сети, нет доступа к Cloudinary) — это не регрессия кода: сообщи пользователю, не «чини» env.

## Границы

- Скрипт read-only по исходникам; `next build` перезаписывает `.next/`.
- Не редактируй сам скрипт ради зелёного результата и не отключай шаги без просьбы пользователя.
