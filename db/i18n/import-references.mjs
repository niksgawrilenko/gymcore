// Импорт переводов СПРАВОЧНЫХ строк (группы мышц, мышцы, категории, оборудование) из TSV
// в таблицу reference_translations.
//   npm run db:i18n:import-refs                                     → db/i18n/reference-translations.en.tsv, locale=en
//   node db/i18n/import-references.mjs --file=f.tsv --locale=en --dry-run
// Идемпотентно (ON CONFLICT (kind, source_value, locale)); таблица exercises и её значения НЕ меняются:
// русские справочные строки остаются "языком данных", перевод применяется только при показе.
// Из файла берутся только kind-и справочников; ui_string/llm_prompt — инвентарь строк кода, в БД не нужны.
import { fileURLToPath } from 'node:url';
import {
  REF_KIND_SET,
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
const file = arg('file', fileURLToPath(new URL('reference-translations.en.tsv', import.meta.url)));
const locale = requireLocale(arg('locale', 'en'));
const dryRun = hasFlag('dry-run');
// --- куда пишем: локальная база или прод/удалённая (нужно --yes) ---
const target = dbTarget(url);
assertWriteAllowed({ target, dryRun, confirmed: hasFlag('yes'), command: 'db:i18n:import-refs', locale });

// --- разбор TSV: kind <tab> source_value <tab> value_en <tab> source <tab> destination ---
const { rows: lines, hasHeader } = readTsvLines(file, 'kind');
const translations = new Map(); // ключ: kind\0source_value → { kind, sourceValue, value }
const warnings = [];
if (!hasHeader) warnings.push(`в файле ${file} не найден заголовок "kind …" — проверьте формат TSV`);
for (const { cols, line } of lines) {
  const kind = (cols[0] ?? '').trim();
  const sourceValue = (cols[1] ?? '').trim();
  const value = (cols[2] ?? '').trim();
  if (!REF_KIND_SET.has(kind)) continue; // ui_string / llm_prompt в БД не импортируются
  if (!sourceValue) continue;
  if (!value) continue; // пустой перевод — строку пропускаем
  if (sourceValue.length > 255 || value.length > 255) {
    warnings.push(`строка ${line}: «${sourceValue}» длиннее 255 символов — пропущена`);
    continue;
  }
  const key = `${kind}\u0000${sourceValue}`;
  const previous = translations.get(key);
  if (previous) {
    if (previous.value !== value) warnings.push(`строка ${line}: повтор «${kind}/${sourceValue}» с другим переводом — оставлен первый`);
    continue;
  }
  translations.set(key, { kind, sourceValue, value });
}

const client = await connect(url);
try {
  const { rows: table } = await client.query("SELECT to_regclass('public.reference_translations') AS oid");
  if (!table[0].oid) {
    console.error('Нет таблицы reference_translations — сначала выполните npm run db:setup');
    process.exit(1);
  }

  const { rows: existing } = await client.query(
    'SELECT kind, source_value, value FROM reference_translations WHERE locale = $1',
    [locale],
  );
  const stored = new Map(existing.map((row) => [`${row.kind}\u0000${row.source_value}`, row.value]));

  const writes = [...translations.values()];
  const fresh = writes.filter((w) => !stored.has(`${w.kind}\u0000${w.sourceValue}`)).length;
  const changed = writes.filter((w) => stored.get(`${w.kind}\u0000${w.sourceValue}`) !== w.value).length;

  console.log(`Файл: ${file}`);
  console.log(`База: ${target.label}${target.isLocal ? ' (локальная)' : ' (ВНИМАНИЕ: не локальная)'}`);
  console.log(
    `Строк-справочников в файле: ${translations.size} (новых ${fresh}, изменится ${changed}, без изменений ${writes.length - changed})`,
  );

  if (dryRun) {
    console.log('[dry-run] в БД ничего не записано');
  } else if (!writes.length) {
    console.log('Записывать нечего: заполните колонку value_en и повторите.');
  } else {
    await client.query('BEGIN');
    try {
      for (const write of writes) {
        await client.query(
          `INSERT INTO reference_translations (kind, source_value, locale, value, updated_at)
           VALUES ($1, $2, $3, $4, CURRENT_TIMESTAMP)
           ON CONFLICT (kind, source_value, locale)
           DO UPDATE SET value = EXCLUDED.value, updated_at = CURRENT_TIMESTAMP`,
          [write.kind, write.sourceValue, locale, write.value],
        );
      }
      await client.query('COMMIT');
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    }
    console.log(`✔ locale=${locale}: записано переводов ${writes.length}. Таблица exercises не изменялась.`);
  }

  const stale = [...stored.keys()].filter((key) => !translations.has(key));
  if (stale.length) {
    console.log(`i в БД есть ${stale.length} перевод(ов), которых нет в файле (не удаляю): ${stale.slice(0, 10).map((k) => k.replace('\u0000', '/')).join(', ')}`);
  }
  for (const warning of warnings) console.log(`! ${warning}`);
} finally {
  await client.end();
}
