// Общие куски скриптов db/i18n/*.mjs: флаги CLI, целевая база, защита от записи в прод, разбор TSV.
// Подключается напрямую (ESM, без сборки) — см. db:i18n:* в package.json.
import { readFileSync } from 'node:fs';
import { config } from 'dotenv';
import pg from 'pg';

/** Значение флага --name=value из argv (--file=db/i18n/x.tsv). */
export function arg(name, fallback) {
  const hit = process.argv.find((a) => a.startsWith(`--${name}=`));
  return hit ? hit.slice(name.length + 3) : fallback;
}

/** Флаг без значения: --dry-run, --yes. */
export const hasFlag = (name) => process.argv.includes(`--${name}`);

/** DATABASE_URL из окружения или .env.local (окружение имеет приоритет: dotenv не перезаписывает). */
export function requireDatabaseUrl() {
  config({ path: '.env.local' });
  if (!process.env.DATABASE_URL) {
    console.error('DATABASE_URL не задан (см. .env.example)');
    process.exit(1);
  }
  return process.env.DATABASE_URL;
}

const LOCAL_HOSTS = ['localhost', '127.0.0.1', '::1', '0.0.0.0', 'host.docker.internal', 'db', 'postgres'];

/** Целевая база: метка без логина/пароля (для логов) + признак «локальная». */
export function dbTarget(url) {
  try {
    const parsed = new URL(url);
    return {
      label: `${parsed.hostname}:${parsed.port || '5432'}${parsed.pathname}`,
      isLocal: LOCAL_HOSTS.includes(parsed.hostname) || parsed.hostname.endsWith('.local'),
    };
  } catch {
    return { label: '(DATABASE_URL не удалось разобрать)', isLocal: false };
  }
}

// Pre-flight: в не-локальную базу (прод) пишем только с явным --yes. Читающие режимы (--dry-run и экспорт)
// проходят всегда — они ничего не меняют.
export function assertWriteAllowed({ target, dryRun, confirmed, command, locale = 'en' }) {
  if (dryRun || target.isLocal || confirmed) return;
  console.error(`[стоп] ${target.label} — база не локальная. Записи в неё требуют подтверждения.`);
  console.error(`Проверьте план: npm run ${command} -- --dry-run`);
  console.error(`Затем повторите с флагом --yes${locale === 'en' ? '' : ` --locale=${locale}`}`);
  console.error('Если это прод: DATABASE_URL из окружения перекрывает .env.local (см. docs/i18n-plan.md §5.2).');
  process.exit(1);
}

/** Локаль вида en / ru / en-US. */
export function requireLocale(locale) {
  if (!/^[a-z]{2}(-[A-Z]{2})?$/.test(locale)) {
    console.error(`Некорректная локаль: ${locale} (ожидается en / ru / en-US)`);
    process.exit(1);
  }
  return locale;
}

/** Виды справочных строк (те же, что RefKind в src/lib/refs.ts). */
export const REF_KINDS = ['primary_group', 'secondary_muscle', 'category', 'equipment'];
export const REF_KIND_SET = new Set(REF_KINDS);

/** Табы/переводы строк внутри поля сломали бы TSV. */
export const cell = (value) => String(value ?? '').replace(/[\t\r\n]+/g, ' ').trim();

/**
 * Строки TSV: BOM, пустые строки и комментарии (#) отбрасываются.
 * @returns {{ rows: { cols: string[], line: number }[], hasHeader: boolean }}
 *          hasHeader=false — заголовок с указанным первым столбцом не найден (вызывающий решает, предупреждать ли).
 */
export function readTsvLines(file, headerName) {
  const text = readFileSync(file, 'utf8').replace(/^\uFEFF/, '');
  const rows = [];
  let hasHeader = false;
  text.split(/\r?\n/).forEach((raw, index) => {
    const line = raw.trim();
    if (!line || line.startsWith('#')) return;
    const cols = line.split('\t');
    if (!hasHeader) {
      if (cols[0] === headerName) hasHeader = true;
      return;
    }
    rows.push({ cols, line: index + 1 });
  });
  return { rows, hasHeader };
}

/** Подключение к базе: pg.Client + connect, вызывающий закрывает его сам. */
export async function connect(url) {
  const client = new pg.Client({ connectionString: url });
  await client.connect();
  return client;
}
