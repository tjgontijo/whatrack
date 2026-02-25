#!/bin/bash
set -euo pipefail

# Cores para output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Função para imprimir mensagens em caixas
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

# Trap para tratar erros
trap 'echo -e "${RED}❌ Erro ao executar reset-db${NC}"; exit 1' ERR

# 1. Limpeza de arquivos locais e cache
print_box "🧹 Limpando arquivos locais e cache..."
rm -rf .next .turbo node_modules/.cache prisma/generated prisma/migrations public/sw.js public/manifest.webmanifest public/*.js || true
npm cache clean --force

# 3. Instalação de dependências
print_box "📦 Verificando dependências..."
npm install

# 4. Reset do Banco de Dados e Migrations
print_box "🗑️ Resetando Banco de Dados..."
npx prisma migrate reset --force

# Criar migration initial (init) a partir do schema
print_box "📝 Criando migration inicial (init)..."
npx prisma migrate dev --name init || true

# Gerar Prisma Client (necessário antes do seed)
print_box "🔄 Gerando Prisma Client..."
npx prisma generate

# 6. População de Dados (Seed)
print_box "🌱 Populando Banco de Dados (Seed)..."
if [ -f "prisma/seed.ts" ]; then
  TRUNCATE_DB=1 npx prisma db seed
else
  echo "⚠️  Arquivo seed.ts não encontrado, pulando seed"
fi

# 7. Build da Aplicação
print_box "🚀 Gerando build da aplicação..."
if npm run build; then
  echo -e "${GREEN}✅ Build compilou com sucesso!${NC}"
else
  echo -e "${RED}❌ Erro ao gerar build${NC}"
  exit 1
fi

echo ""
echo -e "${GREEN}╔════════════════════════════════════════════════════════════════╗${NC}"
echo -e "${GREEN}║  ✅ Processo de Reset concluído com sucesso!                  ║${NC}"
echo -e "${GREEN}║                                                                ║${NC}"
echo -e "${GREEN}║  Base de dados resetada e pronta para desenvolvimento          ║${NC}"
echo -e "${GREEN}╚════════════════════════════════════════════════════════════════╝${NC}"
echo ""