#!/usr/bin/env bash
# ---------------------------------------------------------------------------
# Applies every migration to a throwaway local Postgres database, using the
# stubs in supabase-stubs.sql to stand in for the parts Supabase provides
# (auth schema, storage schema, the anon/authenticated/service_role roles).
#
# Proves the migrations apply cleanly before they are pushed to a real project.
#
#   ./scripts/verify-schema.sh [socket-dir] [port]
# ---------------------------------------------------------------------------
set -euo pipefail

SOCKET_DIR="${1:-/var/run/postgresql}"
PORT="${2:-55432}"
DB="crmtest_$$"
ROOT="$(cd "$(dirname "$0")/.." && pwd)"

psql -h "$SOCKET_DIR" -p "$PORT" -U postgres -q -c "create database ${DB};"
trap 'psql -h "$SOCKET_DIR" -p "$PORT" -U postgres -q -c "drop database if exists ${DB};" >/dev/null 2>&1' EXIT

run() { psql -h "$SOCKET_DIR" -p "$PORT" -U postgres -d "$DB" -v ON_ERROR_STOP=1 -q -f "$1"; }

run "$ROOT/scripts/supabase-stubs.sql"
echo "stubs applied"

for f in "$ROOT"/supabase/migrations/*.sql; do
  run "$f"
  echo "applied $(basename "$f")"
done

run "$ROOT/supabase/seed.sql"
echo "seed applied"

if [ -f "$ROOT/scripts/rls-tests.sql" ]; then
  psql -h "$SOCKET_DIR" -p "$PORT" -U postgres -d "$DB" -v ON_ERROR_STOP=1 -f "$ROOT/scripts/rls-tests.sql"
fi

echo "schema verified"
