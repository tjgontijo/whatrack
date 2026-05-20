#!/usr/bin/env bash

if [ -z "${BASH_VERSION:-}" ]; then
  exec bash "$0" "$@"
fi

set -euo pipefail

# Load local env file when present so TEST_DATABASE_URL can come from .env
if [ -f ".env" ]; then
  set -a
  # shellcheck disable=SC1091
  . ./.env
  set +a
fi

PROJECT_NAME="${TEST_DOCKER_PROJECT_NAME:-whatrack-test}"
COMPOSE_FILE="${TEST_DOCKER_COMPOSE_FILE:-docker-compose.test.yml}"
TEST_DATABASE_URL="${TEST_DATABASE_URL:-}"

if [ -z "${TEST_DATABASE_URL}" ]; then
  echo "TEST_DATABASE_URL nao definido. Configure no .env ou no ambiente."
  exit 1
fi

cleanup() {
  docker compose -p "${PROJECT_NAME}" -f "${COMPOSE_FILE}" down -v >/dev/null 2>&1 || true
}

trap cleanup EXIT

echo "==> Subindo Postgres de teste"
docker compose -p "${PROJECT_NAME}" -f "${COMPOSE_FILE}" up -d --wait

echo "==> Gerando Prisma Client"
pnpm prisma generate --schema prisma/schema.prisma

echo "==> Aplicando migrations"
TEST_DATABASE_URL="${TEST_DATABASE_URL}" DATABASE_URL="${TEST_DATABASE_URL}" pnpm prisma migrate deploy --schema prisma/schema.prisma

echo "==> Rodando seed"
TEST_DATABASE_URL="${TEST_DATABASE_URL}" DATABASE_URL="${TEST_DATABASE_URL}" pnpm prisma db seed

echo "==> Rodando testes Prisma (Vitest)"
TEST_DATABASE_URL="${TEST_DATABASE_URL}" pnpm vitest --config vitest.prisma.config.ts "$@"
