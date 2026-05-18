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

if [ ! -f ".env.test" ]; then
  echo -e "${RED}Arquivo .env.test nao encontrado${NC}"
  exit 1
fi

if command -v rg >/dev/null 2>&1; then
  if ! rg -q '^DATABASE_URL="postgres(ql)?://' .env.test; then
    echo -e "${YELLOW}DATABASE_URL em .env.test nao parece ser Postgres.${NC}"
    echo -e "${YELLOW}Revise .env.test antes de continuar.${NC}"
    exit 1
  fi
elif ! grep -Eq '^DATABASE_URL="postgres(ql)?://' .env.test; then
  echo -e "${YELLOW}DATABASE_URL em .env.test nao parece ser Postgres.${NC}"
  echo -e "${YELLOW}Revise .env.test antes de continuar.${NC}"
  exit 1
fi

print_box "Resetando banco de teste (Postgres + seed de infraestrutura)"
node --import tsx/esm e2e/setup.ts

echo ""
echo -e "${GREEN}Banco de teste resetado com sucesso.${NC}"
echo ""
