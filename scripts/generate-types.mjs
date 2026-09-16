#!/usr/bin/env node
/**
 * Generates src/lib/supabase/database.types.ts by introspecting a Postgres
 * database that has the migrations applied.
 *
 * Used so the checked-in types match the schema exactly rather than being
 * maintained by hand. Against a real Supabase project you can instead run
 * `npm run db:types`, which uses the Supabase CLI and produces the same shape.
 *
 *   node scripts/generate-types.mjs --host /var/run/postgresql --port 55432 --db crmtest
 */
import { execFileSync } from 'node:child_process';
import { writeFileSync, mkdirSync } from 'node:fs';
import { dirname, resolve } from 'node:path';

const args = Object.fromEntries(
  process.argv.slice(2).reduce((acc, a, i, arr) => {
    if (a.startsWith('--')) acc.push([a.slice(2), arr[i + 1]]);
    return acc;
  }, []),
);

const HOST = args.host ?? '/var/run/postgresql';
const PORT = args.port ?? '55432';
const DB = args.db ?? 'crmtest';
const OUT = resolve(args.out ?? 'src/lib/supabase/database.types.ts');

const q = (sql) =>
  JSON.parse(
    execFileSync(
      'psql',
      ['-h', HOST, '-p', PORT, '-U', 'postgres', '-d', DB, '-At', '-c',
       `select coalesce(json_agg(t), '[]') from (${sql}) t`],
      { encoding: 'utf8' },
    ).trim(),
  );

const enums = q(`
  select t.typname as name,
         array_agg(e.enumlabel order by e.enumsortorder) as labels
  from pg_type t
  join pg_enum e on e.enumtypid = t.oid
  join pg_namespace n on n.oid = t.typnamespace
  where n.nspname = 'public'
  group by t.typname
  order by t.typname
`);

const columns = q(`
  select c.relname as table_name,
         a.attname as column_name,
         a.attnum  as ordinal,
         format_type(a.atttypid, a.atttypmod) as data_type,
         t.typname as udt_name,
         not a.attnotnull as is_nullable,
         (pg_get_expr(d.adbin, d.adrelid) is not null) as has_default,
         a.attidentity <> '' as is_identity
  from pg_attribute a
  join pg_class c on c.oid = a.attrelid
  join pg_namespace n on n.oid = c.relnamespace
  join pg_type t on t.oid = a.atttypid
  left join pg_attrdef d on d.adrelid = c.oid and d.adnum = a.attnum
  where n.nspname = 'public'
    and c.relkind = 'r'
    and a.attnum > 0
    and not a.attisdropped
  order by c.relname, a.attnum
`);

// Foreign keys, so embedded selects (`.select('*, clients(company_name)')`)
// are typed. postgrest-js requires this field: without it a table does not
// satisfy GenericTable and every query silently degrades to `never`.
const relationships = q(`
  select con.conname as constraint_name,
         src.relname as table_name,
         (select array_agg(att.attname order by u.ord)
            from unnest(con.conkey) with ordinality as u(attnum, ord)
            join pg_attribute att
              on att.attrelid = con.conrelid and att.attnum = u.attnum) as columns,
         tgt.relname as referenced_relation,
         (select array_agg(att.attname order by u.ord)
            from unnest(con.confkey) with ordinality as u(attnum, ord)
            join pg_attribute att
              on att.attrelid = con.confrelid and att.attnum = u.attnum) as referenced_columns,
         exists (
           select 1 from pg_constraint uq
           where uq.conrelid = con.conrelid
             and uq.contype in ('u', 'p')
             and uq.conkey @> con.conkey
             and con.conkey @> uq.conkey
         ) as is_one_to_one
  from pg_constraint con
  join pg_class src on src.oid = con.conrelid
  join pg_class tgt on tgt.oid = con.confrelid
  join pg_namespace n on n.oid = src.relnamespace
  where con.contype = 'f' and n.nspname = 'public'
  order by src.relname, con.conname
`);

const relsByTable = new Map();
for (const r of relationships) {
  if (!relsByTable.has(r.table_name)) relsByTable.set(r.table_name, []);
  relsByTable.get(r.table_name).push(r);
}

const pgArray = (v) =>
  typeof v === 'string' ? v.replace(/^{|}$/g, '').split(',').filter(Boolean) : (v ?? []);

const enumNames = new Set(enums.map((e) => e.name));

const pascal = (s) => s.split('_').map((w) => w[0].toUpperCase() + w.slice(1)).join('');

function tsType(col) {
  const udt = col.udt_name;
  if (enumNames.has(udt)) return `Database['public']['Enums']['${udt}']`;
  if (udt.startsWith('_')) {
    const inner = udt.slice(1);
    if (enumNames.has(inner)) return `Database['public']['Enums']['${inner}'][]`;
    return `${scalar(inner)}[]`;
  }
  return scalar(udt);
}

function scalar(udt) {
  switch (udt) {
    case 'int2': case 'int4': case 'int8':
    case 'float4': case 'float8': case 'numeric':
      return 'number';
    case 'bool':
      return 'boolean';
    case 'json': case 'jsonb':
      return 'Json';
    default:
      return 'string';
  }
}

const byTable = new Map();
for (const c of columns) {
  if (!byTable.has(c.table_name)) byTable.set(c.table_name, []);
  byTable.get(c.table_name).push(c);
}

let out = `// ---------------------------------------------------------------------------
// GENERATED FILE — do not edit by hand.
// Regenerate with:  node scripts/generate-types.mjs
// (or \`npm run db:types\` against a linked Supabase project)
// ---------------------------------------------------------------------------

export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[];

export interface Database {
  public: {
    Tables: {
`;

for (const [table, cols] of [...byTable].sort((a, b) => a[0].localeCompare(b[0]))) {
  out += `      ${table}: {\n        Row: {\n`;
  for (const c of cols) {
    out += `          ${c.column_name}: ${tsType(c)}${c.is_nullable ? ' | null' : ''};\n`;
  }
  out += `        };\n        Insert: {\n`;
  for (const c of cols) {
    const optional = c.has_default || c.is_nullable || c.is_identity;
    out += `          ${c.column_name}${optional ? '?' : ''}: ${tsType(c)}${c.is_nullable ? ' | null' : ''};\n`;
  }
  out += `        };\n        Update: {\n`;
  for (const c of cols) {
    out += `          ${c.column_name}?: ${tsType(c)}${c.is_nullable ? ' | null' : ''};\n`;
  }
  out += `        };\n        Relationships: [\n`;
  for (const r of relsByTable.get(table) ?? []) {
    const cols = pgArray(r.columns).map((c) => `'${c}'`).join(', ');
    const refCols = pgArray(r.referenced_columns).map((c) => `'${c}'`).join(', ');
    out += `          {\n`;
    out += `            foreignKeyName: '${r.constraint_name}';\n`;
    out += `            columns: [${cols}];\n`;
    out += `            isOneToOne: ${r.is_one_to_one === true || r.is_one_to_one === 't'};\n`;
    out += `            referencedRelation: '${r.referenced_relation}';\n`;
    out += `            referencedColumns: [${refCols}];\n`;
    out += `          },\n`;
  }
  out += `        ];\n      };\n`;
}

out += `    };
    Views: { [_ in never]: never };
    Functions: {
      calculate_project_progress: { Args: { p_project_id: string }; Returns: Json };
      recalculate_project_completion: { Args: { p_project_id: string }; Returns: number };
      subscription_period: {
        Args: { p_subscription_id: string; p_on?: string };
        Returns: { period_start: string; period_end: string }[];
      };
      subscription_usage: {
        Args: { p_subscription_id: string; p_on?: string };
        Returns: {
          period_start: string;
          period_end: string;
          change_minutes: number;
          support_minutes: number;
        }[];
      };
      sweep_maintenance_state: { Args: Record<PropertyKey, never>; Returns: Json };
      staff_signup_hints: {
        Args: Record<PropertyKey, never>;
        Returns: {
          signup_mode: string;
          email_domains: string[];
          is_first_account: boolean;
        }[];
      };
      record_audit: {
        Args: {
          p_action: string;
          p_entity_type: string;
          p_entity_id: string | null;
          p_previous_value?: Json;
          p_new_value?: Json;
          p_ip_address?: string | null;
          p_user_agent?: string | null;
        };
        Returns: string;
      };
    };
    Enums: {
`;

for (const e of enums) {
  const labels = (typeof e.labels === 'string'
    ? e.labels.replace(/^{|}$/g, '').split(',')
    : e.labels).map((l) => `'${l}'`);
  out += `      ${e.name}: ${labels.join(' | ')};\n`;
}

out += `    };
    CompositeTypes: { [_ in never]: never };
  };
}

// Convenience aliases ---------------------------------------------------------
export type Tables<T extends keyof Database['public']['Tables']> =
  Database['public']['Tables'][T]['Row'];
export type InsertDto<T extends keyof Database['public']['Tables']> =
  Database['public']['Tables'][T]['Insert'];
export type UpdateDto<T extends keyof Database['public']['Tables']> =
  Database['public']['Tables'][T]['Update'];
export type Enums<T extends keyof Database['public']['Enums']> =
  Database['public']['Enums'][T];
`;

mkdirSync(dirname(OUT), { recursive: true });
writeFileSync(OUT, out);
console.log(`wrote ${OUT} — ${byTable.size} tables, ${enums.length} enums`);
