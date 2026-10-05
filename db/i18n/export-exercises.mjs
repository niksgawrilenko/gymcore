// Экспорт упражнений из БД в шаблон для английской локализации. Только SELECT — данные не меняются.
//   npm run db:i18n:export                          → db/i18n/exercise-translations.en.tsv
//   node db/i18n/export-exercises.mjs --out=file.tsv
// Заполненный шаблон не перезаписывается: если в файле уже есть переводы, результат пишется в *.new.tsv.
import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { arg, cell, connect, dbTarget, requireDatabaseUrl } from './_shared.mjs';

const url = requireDatabaseUrl();
const target = arg('out', fileURLToPath(new URL('exercise-translations.en.tsv', import.meta.url)));

// Только чтение, поэтому подтверждение не нужно — но полезно видеть, из какой базы выгружаем
// (локальная или прод: переводы в прод-базу заводятся тем же TSV, см. docs/i18n-plan.md §5.2).
const base = dbTarget(url);

const PREAMBLE = [
  '# Шаблон английских переводов названий упражнений (GymCore i18n). Кодировка UTF-8, разделитель — табы.',
  '#',
  '# Порядок работы:',
  '#   1) npm run db:i18n:export   — сгенерировать/обновить шаблон из БД (заполненный файл не перезаписывается, см. *.new.tsv)',
  '#   2) заполнить колонку name_en (Excel / Google Sheets / редактор); колонку name_ru НЕ менять',
  '#   3) npm run db:i18n:import   — записать переводы в таблицу exercise_translations (идемпотентно)',
  '#   4) npm run db:i18n:import -- --dry-run  — проверить без записи',
  '#',
  '# Колонки:',
  '#   name_ru — КЛЮЧ: точное exercises.name из БД; импорт сопоставляет перевод с упражнениями по этому имени',
  '#   name_en — перевод; пусто = перевода нет, строка пропускается',
  '#   used_by — сколько упражнений в БД с этим именем (перевод применится ко всем)',
  '#   types   — exercise_type (strength/cardio/…); groups — категория + основные группы; public — есть ли публичное',
  '#   (used_by/types/groups/public — только контекст для переводчика, импорт их игнорирует)',
];
const HEADER = ['name_ru', 'name_en', 'used_by', 'types', 'groups', 'public'].join('\t');

const client = await connect(url);
console.log(`База (только чтение): ${base.label}`);
let groups = [];
try {
  const { rows } = await client.query(
    'SELECT name, category, exercise_type, primary_groups, is_public FROM exercises ORDER BY lower(btrim(name)), id',
  );
  const byName = new Map();
  for (const row of rows) {
    const name = cell(row.name);
    if (!name) continue;
    const key = name.toLowerCase();
    const group = byName.get(key) ?? { name, usedBy: 0, types: new Set(), groups: new Set(), isPublic: false };
    group.usedBy += 1;
    if (row.exercise_type) group.types.add(cell(row.exercise_type));
    if (row.category) group.groups.add(cell(row.category));
    for (const muscle of row.primary_groups ?? []) if (muscle) group.groups.add(cell(muscle));
    if (row.is_public) group.isPublic = true;
    byName.set(key, group);
  }
  groups = [...byName.values()].sort((a, b) => a.name.localeCompare(b.name, 'ru'));
} finally {
  await client.end();
}

const dataRows = groups.map((g) =>
  [g.name, '', String(g.usedBy), [...g.types].join(', '), [...g.groups].join(', '), g.isPublic ? 'Y' : 'N'].join('\t'),
);

let outPath = target;
if (existsSync(target)) {
  const hasTranslations = readFileSync(target, 'utf8')
    .split(/\r?\n/)
    .some((line) => {
      if (!line.trim() || line.startsWith('#')) return false;
      const cols = line.split('\t');
      return cols[0] !== 'name_ru' && Boolean((cols[1] ?? '').trim());
    });
  if (hasTranslations) {
    outPath = target.replace(/\.tsv$/i, '') + '.new.tsv';
    console.log(`В ${target} уже есть переводы — пишу в ${outPath}, перенесите строки вручную.`);
  }
}

// BOM: Excel/Notepad иначе показывают кириллицу кракозябрами.
writeFileSync(outPath, `\uFEFF${[...PREAMBLE, HEADER, ...dataRows, ''].join('\n')}`, 'utf8');
console.log(`✔ ${outPath}`);
console.log(
  `  уникальных названий: ${groups.length}; строк в exercises: ${groups.reduce((n, g) => n + g.usedBy, 0)}`,
);
console.log('Дальше: заполните колонку name_en и выполните npm run db:i18n:import');
