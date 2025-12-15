#!/usr/bin/env bash

set -euo pipefail

# Root of the repo
ROOT_DIR="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT_DIR"

log() {
  printf "\n[%s] %s\n" "$(date +%H:%M:%S)" "$*"
}

# Pick docker compose binary
if docker compose version >/dev/null 2>&1; then
  DOCKER_COMPOSE="docker compose"
elif command -v docker-compose >/dev/null 2>&1; then
  DOCKER_COMPOSE="docker-compose"
else
  echo "docker compose is not installed." >&2
  exit 1
fi

DB_CONTAINER="${DB_CONTAINER:-whatrack-postgres}"
DB_USER="${DB_USER:-postgres}"
DB_PASSWORD="${DB_PASSWORD:-postgres}"
DB_NAME="${DB_NAME:-whatrack}"
DB_HOST="${DB_HOST:-localhost}"
DB_PORT="${DB_PORT:-5432}"

DEFAULT_DATABASE_URL="postgresql://${DB_USER}:${DB_PASSWORD}@${DB_HOST}:${DB_PORT}/${DB_NAME}?schema=public"
DEFAULT_DIRECT_URL="postgresql://${DB_USER}:${DB_PASSWORD}@${DB_HOST}:${DB_PORT}/${DB_NAME}"

export DATABASE_URL="${DATABASE_URL:-$DEFAULT_DATABASE_URL}"
export DIRECT_URL="${DIRECT_URL:-$DEFAULT_DIRECT_URL}"

log "Starting postgres and redis containers (if not running)..."
${DOCKER_COMPOSE} up -d postgres redis

log "Waiting for postgres to be ready..."
for i in {1..30}; do
  if docker exec -e PGPASSWORD="$DB_PASSWORD" "$DB_CONTAINER" pg_isready -U "$DB_USER" -d "$DB_NAME" >/dev/null 2>&1; then
    READY=1
    break
  fi
  sleep 1
done
if [ "${READY:-0}" -ne 1 ]; then
  echo "Postgres did not become ready in time." >&2
  exit 1
fi

log "Dropping and recreating schema 'public' on ${DB_NAME}..."
RESET_SQL="DROP SCHEMA IF EXISTS public CASCADE; CREATE SCHEMA public; GRANT ALL ON SCHEMA public TO ${DB_USER}; GRANT ALL ON SCHEMA public TO public;"
docker exec -e PGPASSWORD="$DB_PASSWORD" "$DB_CONTAINER" psql -U "$DB_USER" -d "$DB_NAME" -c "$RESET_SQL"

log "Applying Prisma schema (db push)..."
npm exec prisma db push

log "Running Prisma seed..."
npm exec prisma db seed

log "Database reset completed successfully."
