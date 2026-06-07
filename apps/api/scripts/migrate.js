#!/usr/bin/env node
/**
 * Minimal forward-only migration runner. Applies db/migrations/*.sql in order,
 * tracking applied files in app.schema_migrations. Each file runs in its own
 * transaction (the SQL files themselves wrap in BEGIN/COMMIT).
 *
 * Usage: DATABASE_URL=... node apps/api/scripts/migrate.js
 */
const { Client } = require('pg');
const fs = require('fs');
const path = require('path');

const MIGRATIONS_DIR = path.resolve(__dirname, '../../../db/migrations');

async function main() {
  const url = process.env.DATABASE_URL;
  if (!url) throw new Error('DATABASE_URL is required');
  const client = new Client({ connectionString: url });
  await client.connect();

  await client.query(`
    CREATE SCHEMA IF NOT EXISTS app;
    CREATE TABLE IF NOT EXISTS app.schema_migrations (
      filename text PRIMARY KEY,
      applied_at timestamptz NOT NULL DEFAULT now()
    );
  `);

  const applied = new Set(
    (await client.query('SELECT filename FROM app.schema_migrations')).rows.map((r) => r.filename),
  );

  const files = fs.readdirSync(MIGRATIONS_DIR).filter((f) => f.endsWith('.sql')).sort();
  for (const file of files) {
    if (applied.has(file)) {
      console.log(`= skip ${file}`);
      continue;
    }
    const sql = fs.readFileSync(path.join(MIGRATIONS_DIR, file), 'utf8');
    console.log(`+ apply ${file}`);
    await client.query(sql);
    await client.query('INSERT INTO app.schema_migrations(filename) VALUES ($1)', [file]);
  }

  await client.end();
  console.log('migrations complete');
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
