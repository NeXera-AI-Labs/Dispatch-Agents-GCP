#!/usr/bin/env node
const { Client } = require('pg');
const { execSync } = require('child_process');

const client = new Client({
  host: '/cloudsql/agentic-dispatch:us-central1:nexera-sbx-db',
  user: 'dispatch-user',
  database: 'dispatch',
  password: process.env.CDS_REQUIRES_DB_CREDENTIALS_PASSWORD || process.env.DB_PASSWORD,
  ssl: false,
});

async function run() {
  await client.connect();
  console.log('[migrate] Connected to database');

  const ddl = execSync('npx cds compile "*" --to sql --dialect postgres', {
    cwd: '/app',
    env: { ...process.env, NODE_ENV: 'production' },
    encoding: 'utf8',
  });

  console.log(`[migrate] Generated DDL: ${ddl.length} chars`);

  const statements = ddl
    .split(';')
    .map(s => s.trim())
    .filter(s => s.length > 0);

  console.log(`[migrate] Executing ${statements.length} statements...`);

  for (const stmt of statements) {
    const type = stmt.startsWith('CREATE TABLE') ? 'TABLE' :
                 stmt.startsWith('CREATE VIEW') ? 'VIEW' : 'OTHER';
    const name = stmt.match(/(?:TABLE|VIEW)\s+(\S+)/)?.[1] || 'unknown';
    try {
      await client.query(stmt);
      console.log(`[migrate]   OK: ${type} ${name}`);
    } catch (e) {
      if (e.code === '42P07') {
        console.log(`[migrate]   SKIP (exists): ${type} ${name}`);
      } else {
        console.error(`[migrate]   FAIL: ${type} ${name} — ${e.message}`);
      }
    }
  }

  const res = await client.query(
    "SELECT table_name FROM information_schema.tables WHERE table_schema='public' ORDER BY table_name"
  );
  console.log(`\n[migrate] Tables in public schema: ${res.rows.length}`);
  res.rows.forEach(r => console.log(`  ${r.table_name}`));

  const vres = await client.query(
    "SELECT table_name FROM information_schema.views WHERE table_schema='public' ORDER BY table_name"
  );
  console.log(`\n[migrate] Views in public schema: ${vres.rows.length}`);
  vres.rows.forEach(r => console.log(`  ${r.table_name}`));

  await client.end();
  console.log('\n[migrate] Done');
}

run().catch(e => {
  console.error('[migrate] Fatal:', e.message);
  process.exit(1);
});
