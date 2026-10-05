// Импорт переводов названий упражнений из TSV в таблицу exercise_translations.
//   npm run db:i18n:import                                   → db/i18n/exercise-translations.en.tsv, locale=en
//   node db/i18n/import-translations.mjs --file=file.tsv --locale=en --dry-run
// Идемпотентно (ON CONFLICT (exercise_id, locale)); таблица exercises и другие данные НЕ меняются,
// русские названия остаются в exercises.name как есть. Совпадение — по нормализованному name_ru.
import { fileURLToPath } from 'node:url';
import {
  arg,
  assertWriteAllowed,
  connect,
  dbTarget,
  hasFlag,
  readTsvLines,
  requireDatabaseUrl,
  requireLocale,
} from './_shared.mjs';

const url = requireDatabaseUrl();
const file = arg('file', fileURLToPath(new URL('exercise-translations.en.tsv', import.meta.url)));
const locale = requireLocale(arg('locale', 'en'));
const dryRun = hasFlag('dry-run');
// --- куда пишем: локальная база или прод/удалённая (нужно --yes) ---
const target = dbTarget(url);
assertWriteAllowed({ target, dryRun, confirmed: hasFlag('yes'), command: 'db:i18n:import', locale });

// --- разбор TSV: name_ru <tab> name_en <tab> контекст… ---
const { rows: lines, hasHeader } = readTsvLines(file, 'name_ru');
const translations = new Map(); // ключ: name_ru.toLowerCase() → { nameRu, nameEn }
const warnings = [];
if (!hasHeader) warnings.push(`в файле ${file} не найден заголовок "name_ru …" — проверьте формат TSV`);
for (const { cols, line } of lines) {
  const nameRu = (cols[0] ?? '').trim();
  const nameEn = (cols[1] ?? '').trim();
  if (!nameRu) continue;
  if (!nameEn) continue; // пустой перевод — строку пропускаем
  if (nameEn.length > 100) {
    warnings.push(`строка ${line}: перевод «${nameRu}» длиннее 100 символов (лимит exercises.name) — пропущен`);
    continue;
  }
  const key = nameRu.toLowerCase();
  const previous = translations.get(key);
  if (previous) {
    if (previous.nameEn !== nameEn) warnings.push(`строка ${line}: повтор «${nameRu}» с другим переводом — оставлен первый`);
    continue;
  }
  translations.set(key, { nameRu, nameEn });
}

const client = await connect(url);
try {
  const { rows: table } = await client.query("SELECT to_regclass('public.exercise_translations') AS oid");
  if (!table[0].oid) {
    console.error('Нет таблицы exercise_translations — сначала выполните npm run db:setup');
    process.exit(1);
  }

  const { rows: exercises } = await client.query('SELECT id, btrim(name) AS name FROM exercises');
  const idsByName = new Map();
  for (const exercise of exercises) {
    const key = (exercise.name ?? '').trim().toLowerCase();
    if (!key) continue;
    idsByName.set(key, [...(idsByName.get(key) ?? []), exercise.id]);
  }

  const { rows: existing } = await client.query('SELECT exercise_id FROM exercise_translations WHERE locale = $1', [locale]);
  const translated = new Set(existing.map((row) => row.exercise_id));

  const missing = []; // name_ru, которых нет в exercises
  const writes = []; // { id, nameEn }
  for (const { nameRu, nameEn } of translations.values()) {
    const ids = idsByName.get(nameRu.toLowerCase());
    if (!ids?.length) {
      missing.push(nameRu);
      continue;
    }
    for (const id of ids) writes.push({ id, nameEn });
  }
  const fresh = writes.filter((write) => !translated.has(write.id)).length;

  console.log(`Файл: ${file}`);
  console.log(`База: ${target.label}${target.isLocal ? ' (локальная)' : ' (ВНИМАНИЕ: не локальная)'}`);
  console.log(
    `Переводов в файле: ${translations.size}; совпадений в exercises: ${writes.length} (новых ${fresh}, на обновление ${writes.length - fresh})`,
  );

  if (dryRun) {
    console.log('[dry-run] в БД ничего не записано');
  } else if (!writes.length) {
    console.log('Записывать нечего: заполните колонку name_en и повторите.');
  } else {
    await client.query('BEGIN');
    try {
      for (const write of writes) {
        await client.query(
          `INSERT INTO exercise_translations (exercise_id, locale, name, updated_at)
           VALUES ($1, $2, $3, CURRENT_TIMESTAMP)
           ON CONFLICT (exercise_id, locale)
           DO UPDATE SET name = EXCLUDED.name, updated_at = CURRENT_TIMESTAMP`,
          [write.id, locale, write.nameEn],
        );
      }
      await client.query('COMMIT');
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    }
    console.log(`✔ locale=${locale}: записано переводов ${writes.length}. Таблица exercises не изменялась.`);
  }

  if (missing.length) {
    console.log(`! нет совпадений в exercises (${missing.length}) — проверьте русские названия:`);
    for (const name of missing.slice(0, 20)) console.log(`  · ${name}`);
    if (missing.length > 20) console.log(`  … и ещё ${missing.length - 20}`);
  }
  for (const warning of warnings) console.log(`! ${warning}`);
} finally {
  await client.end();
}
