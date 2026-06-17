#!/usr/bin/env bash
set -euo pipefail

migrations_dir="${MIGRATIONS_DIR:-migrations}"
schema_migrations_table="${SCHEMA_MIGRATIONS_TABLE:-schema_migrations}"
bootstrap_empty_database="${BOOTSTRAP_EMPTY_DATABASE:-false}"
baseline_existing_database="${BASELINE_EXISTING_DATABASE:-false}"
baseline_sql_migrations_on_bootstrap="${BASELINE_SQL_MIGRATIONS_ON_BOOTSTRAP:-true}"

require_env() {
  local name="$1"
  if [[ -z "${!name:-}" ]]; then
    echo "Missing required environment variable: $name" >&2
    exit 1
  fi
}

require_env DATABASE_HOST
require_env DATABASE_PORT
require_env DATABASE_USER
require_env DATABASE_PASSWORD
require_env DATABASE_NAME

if ! command -v psql >/dev/null 2>&1; then
  echo "psql is required to run SQL migrations." >&2
  exit 1
fi

if [[ ! -d "$migrations_dir" ]]; then
  echo "Migrations directory not found: $migrations_dir" >&2
  exit 1
fi

checksum_file() {
  local file="$1"
  if command -v sha256sum >/dev/null 2>&1; then
    sha256sum "$file" | awk '{print $1}'
  else
    shasum -a 256 "$file" | awk '{print $1}'
  fi
}

psql_base=(
  psql
  --no-psqlrc
  --set ON_ERROR_STOP=1
  --host "$DATABASE_HOST"
  --port "$DATABASE_PORT"
  --username "$DATABASE_USER"
  --dbname "$DATABASE_NAME"
)

export PGPASSWORD="$DATABASE_PASSWORD"
export PGSSLMODE="${PGSSLMODE:-require}"

psql_scalar() {
  "${psql_base[@]}" --tuples-only --no-align --command "$1"
}

ensure_schema_migrations_table() {
  "${psql_base[@]}" <<SQL
CREATE TABLE IF NOT EXISTS ${schema_migrations_table} (
  filename text PRIMARY KEY,
  checksum text NOT NULL,
  applied_at timestamptz NOT NULL DEFAULT now()
);
SQL
}

baseline_sql_migrations() {
  local found_migrations=false
  local file filename checksum

  while IFS= read -r file; do
    found_migrations=true
    filename="$(basename "$file")"
    checksum="$(checksum_file "$file")"

    echo "Baselining migration: $filename"
    "${psql_base[@]}" \
      --set filename="$filename" \
      --set checksum="$checksum" \
      --command "INSERT INTO ${schema_migrations_table} (filename, checksum) VALUES (:'filename', :'checksum') ON CONFLICT (filename) DO NOTHING;"
  done < <(find "$migrations_dir" -maxdepth 1 -type f -name '*.sql' | sort)

  if [[ "$found_migrations" == false ]]; then
    echo "No SQL migration files found in $migrations_dir."
  fi
}

schema_migrations_exists="$(
  psql_scalar "SELECT CASE WHEN to_regclass('public.${schema_migrations_table}') IS NULL THEN 'false' ELSE 'true' END;"
)"
app_table_count="$(
  psql_scalar "SELECT count(*) FROM information_schema.tables WHERE table_schema = 'public' AND table_type = 'BASE TABLE' AND table_name <> '${schema_migrations_table}';"
)"

if [[ "$app_table_count" == "0" ]]; then
  if [[ "$bootstrap_empty_database" != "true" ]]; then
    echo "Database has no application tables. Set BOOTSTRAP_EMPTY_DATABASE=true to initialize an empty database." >&2
    exit 1
  fi

  if ! command -v npm >/dev/null 2>&1; then
    echo "npm is required to bootstrap an empty database with TypeORM schema sync." >&2
    exit 1
  fi

  echo "Database is empty; bootstrapping schema with TypeORM."
  npm run schema:sync
  ensure_schema_migrations_table

  if [[ "$baseline_sql_migrations_on_bootstrap" == "true" ]]; then
    baseline_sql_migrations
  fi

  echo "Empty database bootstrap completed."
  exit 0
fi

if [[ "$schema_migrations_exists" != "true" ]]; then
  if [[ "$baseline_existing_database" != "true" ]]; then
    echo "Database already has application tables but no ${schema_migrations_table} table." >&2
    echo "Refusing to replay historical SQL migrations. Set BASELINE_EXISTING_DATABASE=true once if this database is already up to date." >&2
    exit 1
  fi

  ensure_schema_migrations_table
  baseline_sql_migrations
  echo "Existing database baseline completed."
  exit 0
fi

ensure_schema_migrations_table

found_migrations=false

while IFS= read -r file; do
  found_migrations=true
  filename="$(basename "$file")"
  checksum="$(checksum_file "$file")"
  applied_checksum="$(
    "${psql_base[@]}" \
      --tuples-only \
      --no-align \
      --set filename="$filename" \
      --command "SELECT checksum FROM ${schema_migrations_table} WHERE filename = :'filename';"
  )"

  if [[ -n "$applied_checksum" ]]; then
    if [[ "$applied_checksum" != "$checksum" ]]; then
      echo "Migration $filename was already applied with a different checksum." >&2
      exit 1
    fi

    echo "Skipping already applied migration: $filename"
    continue
  fi

  echo "Applying migration: $filename"

  if grep -Eiq '^[[:space:]]*(BEGIN|COMMIT)[[:space:]]*;' "$file"; then
    "${psql_base[@]}" --file "$file"
  else
    "${psql_base[@]}" --single-transaction --file "$file"
  fi

  "${psql_base[@]}" \
    --set filename="$filename" \
    --set checksum="$checksum" \
    --command "INSERT INTO ${schema_migrations_table} (filename, checksum) VALUES (:'filename', :'checksum');"
done < <(find "$migrations_dir" -maxdepth 1 -type f -name '*.sql' | sort)

if [[ "$found_migrations" == false ]]; then
  echo "No SQL migration files found in $migrations_dir."
  exit 0
fi

echo "SQL migrations completed."
