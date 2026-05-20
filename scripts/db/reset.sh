#!/bin/bash

if [ -z "${BASH_VERSION:-}" ]; then
  exec bash "$0" "$@"
fi

set -euo pipefail

RED='\033[0;31m'
GREEN='\033[0;32m'
NC='\033[0m'

print_box() {
  local message="$1"
  local length=${#message}
  local padding=3
  local border_length=$((length + padding * 2))

  echo ""
  printf '┌%*s┐\n' "$border_length" | tr ' ' '-'
  printf '│ %*s │\n' "$((length + padding))" "$message"
  printf '└%*s┘\n' "$border_length" | tr ' ' '-'
}

trap 'printf "%b\n" "${RED}❌ Erro ao executar reset-db${NC}"; exit 1' ERR

if ! command -v pnpm >/dev/null 2>&1; then
  printf "%b\n" "${RED}❌ pnpm não encontrado no PATH. Instale o pnpm para continuar.${NC}"
  exit 1
fi

if ! command -v npx >/dev/null 2>&1; then
  printf "%b\n" "${RED}❌ npx não encontrado no PATH.${NC}"
  exit 1
fi

print_box "📦 Verificando dependências..."
pnpm install --frozen-lockfile

print_box "🔄 Gerando Prisma Client..."
pnpm prisma generate

print_box "🧹 Resetando banco local com migrations versionadas..."
pnpm prisma migrate reset --force --skip-generate --skip-seed

print_box "✅ Aplicando migrations existentes..."
pnpm prisma migrate deploy

print_box "🌱 Executando seed..."
if [ -f "prisma/seed.ts" ]; then
  pnpm prisma db seed
else
  printf "%b\n" "${RED}❌ Arquivo prisma/seed.ts não encontrado.${NC}"
  exit 1
fi

echo ""
printf "%b\n" "${GREEN}╔════════════════════════════════════════════════════════════════╗${NC}"
printf "%b\n" "${GREEN}║  ✅ Processo de Reset concluído com sucesso!                  ║${NC}"
printf "%b\n" "${GREEN}║                                                                ║${NC}"
printf "%b\n" "${GREEN}║  Banco resetado com migrations versionadas + seed aplicado     ║${NC}"
printf "%b\n" "${GREEN}╚════════════════════════════════════════════════════════════════╝${NC}"
echo ""
