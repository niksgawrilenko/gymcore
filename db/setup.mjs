// Подготовка БД: создаёт недостающие таблицы и индексы. Существующие данные и таблицы не трогает,
// поэтому безопасно и для локальной базы, и для Neon.   npm run db:setup
import { readFileSync } from 'node:fs';
import { config } from 'dotenv';
import pg from 'pg';

config({ path: '.env.local' });
if (!process.env.DATABASE_URL) {
  console.error('DATABASE_URL не задан (см. .env.example)');
  process.exit(1);
}

const client = new pg.Client({ connectionString: process.env.DATABASE_URL });
await client.connect();
try {
  for (const file of ['schema.sql', 'indexes.sql']) {
    await client.query(readFileSync(new URL(file, import.meta.url), 'utf8'));
    console.log(`✔ ${file}`);
  }
} finally {
  await client.end();
}
