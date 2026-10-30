// Runs automatically before `next build` (see package.json). Idempotent.
//  1. creates / updates the database tables (db/schema.sql)
//  2. seeds the default period structure for the Junior and Senior routines
import { readFileSync, existsSync } from 'node:fs';
import { neon } from '@neondatabase/serverless';

for (const f of ['.env.local', '.env']) {
  if (existsSync(f)) {
    try {
      process.loadEnvFile(f);
    } catch {
      /* ignore */
    }
  }
}

const url = process.env.DATABASE_URL;
if (!url) {
  console.warn('[migrate] DATABASE_URL is not set — skipping database setup.');
  process.exit(0);
}

const sql = neon(url);
const run = (text, params = []) => sql.query(text, params);

const schema = readFileSync(new URL('../db/schema.sql', import.meta.url), 'utf8')
  .split('\n')
  .filter((l) => !l.trim().startsWith('--'))
  .join('\n');

const statements = schema
  .split(/;\s*\n/)
  .map((s) => s.trim())
  .filter(Boolean);

console.log(`[migrate] applying ${statements.length} schema statements…`);
for (const stmt of statements) await run(stmt);

// Default period structure (editable later by a Routine Coordinator in the app).
const DEFAULT_PERIODS = [
  ['Form Class', 'form', '08:00', '08:15'],
  ['Period 1', 'period', '08:15', '09:00'],
  ['Period 2', 'period', '09:00', '09:45'],
  ['Period 3', 'period', '09:45', '10:30'],
  ['Tiffin Hour', 'tiffin', '10:30', '11:00'],
  ['Period 4', 'period', '11:00', '11:45'],
  ['Period 5', 'period', '11:45', '12:30'],
  ['Period 6', 'period', '12:30', '13:15'],
];

for (const section of ['junior', 'senior']) {
  const [{ n }] = await run('select count(*)::int as n from periods where section = $1', [section]);
  if (n === 0) {
    let pos = 1;
    for (const [label, kind, start, end] of DEFAULT_PERIODS) {
      await run(
        'insert into periods (section, position, label, kind, start_time, end_time) values ($1,$2,$3,$4,$5,$6)',
        [section, pos++, label, kind, start, end],
      );
    }
    console.log(`[migrate] seeded default periods for ${section} section`);
  }
}

console.log('[migrate] done');
