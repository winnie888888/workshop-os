#!/usr/bin/env node
/**
 * Seed runner. Applies db/seed/*.sql in order via pg + DATABASE_URL — the same
 * transport as migrate.js, so it works wherever migrations work (no psql, no
 * `docker compose exec` needed). Seeds are idempotent (ON CONFLICT), safe to re-run.
 *
 * Usage: DATABASE_URL=... node apps/api/scripts/seed.js
 */
const { Client } = require('pg');
const fs = require('fs');
const path = require('path');

const SEED_DIR = path.resolve(__dirname, '../../../db/seed');

async function main() {
  const url = process.env.DATABASE_URL;
  if (!url) throw new Error('DATABASE_URL is required');
  const client = new Client({ connectionString: url });
  await client.connect();

  const files = fs.readdirSync(SEED_DIR).filter((f) => f.endsWith('.sql')).sort();
  for (const file of files) {
    const sql = fs.readFileSync(path.join(SEED_DIR, file), 'utf8');
    process.stdout.write(`+ seed ${file} … `);
    await client.query(sql);
    console.log('ok');
  }

  const { rows } = await client.query('SELECT count(*)::int AS n FROM app.customers');
  console.log(`\ncustomers in DB: ${rows[0].n}`);

  await client.end();
  console.log('seed complete');
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
