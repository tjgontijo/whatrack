#!/bin/bash
set -euo pipefail

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

print_box() {
  local message="$1"
  local length=${#message}
  local padding=2
  local border_length=$((length + padding * 2))

  echo ""
  printf '┌%*s┐\n' "$border_length" | tr ' ' '-'
  printf '│ %*s │\n' "$((length + padding))" "$message"
  printf '└%*s┘\n' "$border_length" | tr ' ' '-'
}

trap 'echo -e "${RED}Erro ao executar reset-test-db${NC}"; exit 1' ERR

if [ -f ".env" ]; then
  set -a
  # shellcheck disable=SC1091
  . ./.env
  set +a
fi

TEST_DATABASE_URL="${TEST_DATABASE_URL:-}"
if [ -z "${TEST_DATABASE_URL}" ]; then
  echo -e "${RED}TEST_DATABASE_URL nao definido.${NC}"
  echo -e "${YELLOW}Configure TEST_DATABASE_URL no .env ou no ambiente.${NC}"
  exit 1
fi

if ! printf '%s\n' "${TEST_DATABASE_URL}" | grep -Eq '^postgres(ql)?://'; then
  echo -e "${YELLOW}TEST_DATABASE_URL nao parece ser Postgres.${NC}"
  echo -e "${YELLOW}Revise a variavel antes de continuar.${NC}"
  exit 1
fi

print_box "Resetando banco de teste (Postgres + seed de infraestrutura)"
TEST_DATABASE_URL="${TEST_DATABASE_URL}" DATABASE_URL="${TEST_DATABASE_URL}" node --import tsx/esm e2e/setup.ts

echo ""
echo -e "${GREEN}Banco de teste resetado com sucesso.${NC}"
echo ""
