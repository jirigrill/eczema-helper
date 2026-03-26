#!/usr/bin/env bun
/**
 * Migration runner — executes pending SQL migrations from migrations/ directory.
 * Tracks executed migrations in the _migrations table.
 */
import postgres from 'postgres';
import { readdir, readFile } from 'fs/promises';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const MIGRATIONS_DIR = join(__dirname, '..', 'migrations');

const DATABASE_URL = process.env.DATABASE_URL;
if (!DATABASE_URL) {
  console.error('ERROR: DATABASE_URL environment variable is not set');
  process.exit(1);
}

const sql = postgres(DATABASE_URL, { max: 1 });

async function run() {
  // Create migrations tracking table
  await sql`
    CREATE TABLE IF NOT EXISTS _migrations (
      id SERIAL PRIMARY KEY,
      filename TEXT UNIQUE NOT NULL,
      executed_at TIMESTAMPTZ DEFAULT now()
    )
  `;

  // Read all migration files
  const files = (await readdir(MIGRATIONS_DIR))
    .filter((f) => f.endsWith('.sql'))
    .sort();

  // Get already-executed migrations
  const executed = await sql`SELECT filename FROM _migrations`;
  const executedSet = new Set(executed.map((r) => r.filename));

  let ran = 0;
  for (const file of files) {
    if (executedSet.has(file)) {
      console.log(`  skip  ${file}`);
      continue;
    }

    const filePath = join(MIGRATIONS_DIR, file);
    const content = await readFile(filePath, 'utf-8');

    console.log(`  run   ${file}`);
    await sql.unsafe(content);
    await sql`INSERT INTO _migrations (filename) VALUES (${file})`;
    ran++;
  }

  console.log(`\nDone — ${ran} migration(s) applied.`);
  await sql.end();
}

run().catch((err) => {
  console.error('Migration failed:', err);
  process.exit(1);
});
