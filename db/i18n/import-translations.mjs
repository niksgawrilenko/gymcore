// Импорт переводов названий упражнений из TSV в таблицу exercise_translations.
//   npm run db:i18n:import                                   → db/i18n/exercise-translations.en.tsv, locale=en
//   node db/i18n/import-translations.mjs --file=file.tsv --locale=en --dry-run
// Идемпотентно (ON CONFLICT (exercise_id, locale)); таблица exercises и другие данные НЕ меняются,
// русские названия остаются в exercises.name как есть. Совпадение — по нормализованному name_ru.
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { config } from 'dotenv';
import pg from 'pg';

config({ path: '.env.local' });
if (!process.env.DATABASE_URL) {
  console.error('DATABASE_URL не задан (см. .env.example)');
  process.exit(1);
}

const arg = (name, fallback) => {
  const hit = process.argv.find((a) => a.startsWith(`--${name}=`));
  return hit ? hit.slice(name.length + 3) : fallback;
};
const file = arg('file', fileURLToPath(new URL('exercise-translations.en.tsv', import.meta.url)));
const locale = arg('locale', 'en');
const dryRun = process.argv.includes('--dry-run');
const confirmed = process.argv.includes('--yes');
if (!/^[a-z]{2}(-[A-Z]{2})?$/.test(locale)) {
  console.error(`Некорректная локаль: ${locale} (ожидается en / ru / en-US)`);
  process.exit(1);
}

// --- куда пишем: локальная база или прод/удалённая (нужно --yes) ---
// URL разбираем без логина/пароля: в логах остаётся только хост, порт и имя базы.
const dbHost = (() => {
  try {
    return new URL(process.env.DATABASE_URL).hostname;
  } catch {
    return '';
  }
})();
const LOCAL_HOSTS = ['localhost', '127.0.0.1', '::1', '0.0.0.0', 'host.docker.internal', 'db', 'postgres'];
const isLocalDb = LOCAL_HOSTS.includes(dbHost) || dbHost.endsWith('.local');
const dbLabel = (() => {
  try {
    const url = new URL(process.env.DATABASE_URL);
    return `${url.hostname}:${url.port || '5432'}${url.pathname}`;
  } catch {
    return '(DATABASE_URL не удалось разобрать)';
  }
})();

// Pre-flight: в не-локальную базу (прод) пишем только с явным подтверждением --yes.
// Читающие режимы (--dry-run) проходят всегда: они ничего не меняют.
if (!dryRun && !isLocalDb && !confirmed) {
  console.error(`[стоп] ${dbLabel} — база не локальная. Записи в неё требуют подтверждения.`);
  console.error('Проверьте план: npm run db:i18n:import -- --dry-run');
  console.error(`Затем повторите с флагом --yes${locale === 'en' ? '' : ` --locale=${locale}`}`);
  console.error('Если это прод: DATABASE_URL из окружения перекрывает .env.local (см. docs/i18n-plan.md §5.2).');
  process.exit(1);
}

// --- разбор TSV: name_ru <tab> name_en <tab> контекст… ---
const text = readFileSync(file, 'utf8').replace(/^\uFEFF/, '');
const translations = new Map(); // ключ: name_ru.toLowerCase() → { nameRu, nameEn }
const warnings = [];
let hasHeader = false;
text.split(/\r?\n/).forEach((raw, index) => {
  const line = raw.trim();
  if (!line || line.startsWith('#')) return;
  const cols = line.split('\t');
  if (!hasHeader) {
    if (cols[0] === 'name_ru') hasHeader = true;
    else warnings.push(`строка ${index + 1}: ожидался заголовок "name_ru …", строка пропущена`);
    return;
  }
  const nameRu = (cols[0] ?? '').trim();
  const nameEn = (cols[1] ?? '').trim();
  if (!nameRu) return;
  if (!nameEn) return; // пустой перевод — строку пропускаем
  if (nameEn.length > 100) {
    warnings.push(`строка ${index + 1}: перевод «${nameRu}» длиннее 100 символов (лимит exercises.name) — пропущен`);
    return;
  }
  const key = nameRu.toLowerCase();
  const previous = translations.get(key);
  if (previous) {
    if (previous.nameEn !== nameEn) warnings.push(`строка ${index + 1}: повтор «${nameRu}» с другим переводом — оставлен первый`);
    return;
  }
  translations.set(key, { nameRu, nameEn });
});
if (!hasHeader) warnings.push(`в файле ${file} не найден заголовок "name_ru …" — проверьте формат TSV`);

const client = new pg.Client({ connectionString: process.env.DATABASE_URL });
await client.connect();
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
  console.log(`База: ${dbLabel}${isLocalDb ? ' (локальная)' : ' (ВНИМАНИЕ: не локальная)'}`);
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
