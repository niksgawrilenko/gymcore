// Инвентарь справочных строк (группы мышц, мышцы, категории, оборудование) из БД. Только SELECT.
//   npm run db:i18n:export-refs                        → отчёт: значения в БД vs db/i18n/reference-translations.en.tsv
//   npm run db:i18n:export-refs -- --out=refs.new.tsv  → полный TSV (заполненные переводы сохраняются)
// Значения в БД не меняются: файл-источник переводов правит человек, скрипт лишь показывает, чего в нём нет
// (пользователи могут вводить свои группы/категории — их тоже нужно перевести или осознанно оставить как есть).
import { fileURLToPath } from 'node:url';
import { REF_KINDS, arg, cell, connect, dbTarget, readTsvLines, requireDatabaseUrl } from './_shared.mjs';

const url = requireDatabaseUrl();
const source = arg('file', fileURLToPath(new URL('reference-translations.en.tsv', import.meta.url)));
const out = arg('out', null);

const target = dbTarget(url);

const key = (kind, value) => `${kind}\u0000${value}`;

// --- существующий файл: известные переводы + строки не-справочников (при --out их надо сохранить) ---
const known = new Map(); // kind\0source_value → value_en
const extras = []; // ui_string / llm_prompt — как есть
try {
  const { rows: lines } = readTsvLines(source, 'kind');
  for (const { cols } of lines) {
    const kind = cell(cols[0]);
    if (!REF_KINDS.includes(kind)) {
      extras.push(cols.join('\t'));
      continue;
    }
    known.set(key(kind, cell(cols[1])), cell(cols[2]));
  }
} catch {
  // файла нет — это нормально: отчёт покажет все значения как непокрытые
}

// --- значения из БД ---
const QUERY = `
  select 'primary_group' as kind, btrim(v) as value, count(*)::int as used_by
    from exercises cross join lateral unnest(primary_groups) as v
   where btrim(v) <> '' group by 1, 2
  union all
  select 'secondary_muscle', btrim(v), count(*)::int
    from exercises cross join lateral unnest(secondary_muscles) as v
   where btrim(v) <> '' group by 1, 2
  union all
  select 'category', btrim(category), count(*)::int
    from exercises where category is not null and btrim(category) <> '' group by 1, 2
  union all
  select 'equipment', btrim(equipment), count(*)::int
    from exercises where equipment is not null and btrim(equipment) <> '' group by 1, 2
  order by 1, 2
`;

const client = await connect(url);
console.log(`База (только чтение): ${target.label}`);
let rows = [];
try {
  ({ rows } = await client.query(QUERY));
} finally {
  await client.end();
}

// --- отчёт: покрытие значений БД переводами из файла ---
// Покрытие считаем по значению, а не по паре (kind, value): при показе refLabel ищет перевод во всех
// справочниках (в реальных данных одна и та же мышца встречается и в primary_groups, и в secondary_muscles).
const translatedValues = new Set([...known.keys()].map((key) => key.slice(key.indexOf('\u0000') + 1)));
let missingTotal = 0;
for (const kind of REF_KINDS) {
  const kindRows = rows.filter((row) => row.kind === kind);
  const missing = kindRows.filter((row) => !translatedValues.has(row.value));
  missingTotal += missing.length;
  console.log(`${kind}: значений в БД ${kindRows.length}, с переводом ${kindRows.length - missing.length}, без перевода ${missing.length}`);
  for (const row of missing.slice(0, 20)) console.log(`  · ${row.value}  (используется ${row.used_by} раз)`);
  if (missing.length > 20) console.log(`  … и ещё ${missing.length - 20}`);
}

// --- полный TSV (опционально): значения из БД + уже заполненные переводы ---
if (out) {
  const COLUMNS = {
    primary_group: 'primary_groups',
    secondary_muscle: 'secondary_muscles',
    category: 'category',
    equipment: 'equipment',
  };
  const PREAMBLE = [
    '# GymCore i18n: датасет ПЕРЕВОДОВ СПРАВОЧНЫХ СТРОК (таблица reference_translations).',
    '# Сгенерировано db/i18n/export-references.mjs: значения — из БД, заполненные переводы — из прежнего файла.',
    '# Колонки: kind | source_value (КЛЮЧ, менять нельзя) | value_en (пусто = перевода нет) | source | destination.',
  ];
  const HEADER = ['kind', 'source_value', 'value_en', 'source', 'destination'].join('\t');
  const dataRows = rows.map((row) =>
    [row.kind, cell(row.value), known.get(key(row.kind, row.value)) ?? '', `db:exercises.${COLUMNS[row.kind]} (используется ${row.used_by})`, 'db:reference_translations'].join('\t'),
  );
  writeFileSync(out, `\uFEFF${[...PREAMBLE, HEADER, ...dataRows, ...(extras.length ? ['', ...extras] : []), ''].join('\n')}`, 'utf8');
  console.log(`✔ ${out}: строк-справочников ${dataRows.length}${extras.length ? `, строк кода сохранено ${extras.length}` : ''}`);
} else if (missingTotal) {
  console.log(`Дальше: дополните ${missingTotal} недостающих значений в ${source} и выполните npm run db:i18n:import-refs`);
}
