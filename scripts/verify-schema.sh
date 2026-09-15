#!/usr/bin/env bash
# ---------------------------------------------------------------------------
# Applies the whole database setup to a throwaway Postgres database and runs
# the Row Level Security assertions against it.
#
# scripts/supabase-stubs.sql stands in for the parts Supabase provides (the
# auth and storage schemas, and the anon/authenticated/service_role roles), so
# this runs against plain Postgres — locally or in CI.
#
# Everything is applied TWICE, because supabase/setup.sql is pasted into the
# Supabase SQL Editor by hand and a retry after a half-finished run is normal.
#
#   ./scripts/verify-schema.sh                      # local socket
#   ./scripts/verify-schema.sh localhost 5432       # TCP (CI)
#
# Honours PGUSER and PGPASSWORD.
# ---------------------------------------------------------------------------
set -euo pipefail

PGHOST_ARG="${1:-/var/run/postgresql}"
PGPORT_ARG="${2:-55432}"
PGUSER="${PGUSER:-postgres}"
DB="crmtest_$$"
ROOT="$(cd "$(dirname "$0")/.." && pwd)"

psql_run() {
  psql -h "$PGHOST_ARG" -p "$PGPORT_ARG" -U "$PGUSER" "$@"
}

psql_run -q -c "create database ${DB};"
trap 'psql_run -q -c "drop database if exists ${DB};" >/dev/null 2>&1' EXIT

apply() { psql_run -d "$DB" -v ON_ERROR_STOP=1 -q -f "$1"; }

apply "$ROOT/scripts/supabase-stubs.sql"
echo "stubs applied"

for pass in 1 2; do
  for f in "$ROOT"/supabase/migrations/*.sql; do
    apply "$f"
  done
  apply "$ROOT/supabase/seed.sql"
  echo "pass ${pass}: all migrations and seed applied"
done

# The generated single-file script must stay in step with the migrations.
if [ -f "$ROOT/supabase/setup.sql" ]; then
  DB2="crmsetup_$$"
  psql_run -q -c "create database ${DB2};"
  psql_run -d "$DB2" -v ON_ERROR_STOP=1 -q -f "$ROOT/scripts/supabase-stubs.sql"
  psql_run -d "$DB2" -v ON_ERROR_STOP=1 -q -f "$ROOT/supabase/setup.sql"
  psql_run -d "$DB2" -v ON_ERROR_STOP=1 -q -f "$ROOT/supabase/setup.sql"
  psql_run -q -c "drop database ${DB2};"
  echo "supabase/setup.sql applied twice"
fi

if [ -f "$ROOT/scripts/rls-tests.sql" ]; then
  psql_run -d "$DB" -v ON_ERROR_STOP=1 -f "$ROOT/scripts/rls-tests.sql"
fi

echo "schema verified"
