#!/usr/bin/env bash
set -euo pipefail

migrations_dir="${MIGRATIONS_DIR:-migrations}"
schema_migrations_table="${SCHEMA_MIGRATIONS_TABLE:-schema_migrations}"

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

"${psql_base[@]}" <<SQL
CREATE TABLE IF NOT EXISTS ${schema_migrations_table} (
  filename text PRIMARY KEY,
  checksum text NOT NULL,
  applied_at timestamptz NOT NULL DEFAULT now()
);
SQL

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
