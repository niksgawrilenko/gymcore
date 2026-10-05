// NOTE: this config exists ONLY for `npx drizzle-kit pull` (re-dumping the existing schema into
// src/db/schema.ts). `push` / `generate` / `migrate` are forbidden in this project: the source of
// truth is db/schema.sql + db/indexes.sql (`npm run db:setup`).
import { config } from 'dotenv';
import { defineConfig } from 'drizzle-kit';

config({ path: '.env.local' });

export default defineConfig({
  dialect: 'postgresql',
  schema: './src/db/schema.ts',
  out: './drizzle',
  dbCredentials: { url: process.env.DATABASE_URL! },
});
