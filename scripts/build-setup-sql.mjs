#!/usr/bin/env node
/**
 * Concatenates every migration plus the reference seed into one file that can
 * be pasted straight into the Supabase SQL Editor.
 *
 * The migrations are also kept individually so `supabase db push` still works
 * for anyone using the CLI; this is the no-CLI path.
 *
 *   node scripts/build-setup-sql.mjs
 */
import { readFileSync, writeFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';

const ROOT = new URL('..', import.meta.url).pathname;
const MIGRATIONS = join(ROOT, 'supabase/migrations');
const OUT = join(ROOT, 'supabase/setup.sql');

const files = readdirSync(MIGRATIONS)
  .filter((f) => f.endsWith('.sql'))
  .sort();

const banner = (title) => `
-- ###########################################################################
-- ${title}
-- ###########################################################################
`;

let out = `-- ===========================================================================
-- Client Portal — complete database setup
-- ===========================================================================
--
-- GENERATED FILE — do not edit by hand.
-- Rebuild with:  node scripts/build-setup-sql.mjs
--
-- HOW TO USE
--   1. Open your Supabase project
--   2. SQL Editor -> New query
--   3. Paste this entire file and press Run
--
-- It creates 40 tables, 34 enum types, the permission functions, every Row
-- Level Security policy, the column guard triggers, the private storage bucket
-- and the agency-configurable reference data (lifecycle stages, the onboarding
-- template, example maintenance tiers, the handover checklist).
--
-- Safe to run more than once: every statement is guarded, so a retry after a
-- half-finished run does not error and does not duplicate anything.
--
-- It does NOT create any user accounts. Do that afterwards with the
-- "Seed demo data" GitHub Action, or \`node scripts/seed-demo.mjs\`.
--
-- Source: supabase/migrations/*.sql and supabase/seed.sql
--
-- Deliberately carries no generation timestamp: the output must be byte-for-byte
-- reproducible so CI can check it still matches the migrations.
-- ===========================================================================
`;

for (const file of files) {
  out += banner(file);
  out += readFileSync(join(MIGRATIONS, file), 'utf8').trimEnd();
  out += '\n';
}

out += banner('seed.sql — agency-configurable reference data');
out += readFileSync(join(ROOT, 'supabase/seed.sql'), 'utf8').trimEnd();
out += `

-- ===========================================================================
-- Done.
--
-- Next: create your first login.
--   GitHub  -> Actions -> "Seed demo data" -> Run workflow
--   Locally -> node scripts/seed-demo.mjs
-- ===========================================================================
`;

writeFileSync(OUT, out);

const lines = out.split('\n').length;
console.log(`wrote supabase/setup.sql — ${files.length} migrations + seed, ${lines} lines`);
