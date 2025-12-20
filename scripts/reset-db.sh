#!/bin/bash

set -e  # Para o script imediatamente se qualquer comando falhar

print_box() {
    local message="$1"
    local length=${#message}
    local padding=3
    local border_length=$((length + padding * 2))
    
    printf '┌%*s┐\n' "$border_length" | tr ' ' '-'
    printf '│ %*s │\n' "$((length + padding))" "$message"
    printf '└%*s┘\n' "$border_length" | tr ' ' '-'
}

print_box "🔄 Removendo diretórios e arquivos de desenvolvimento..."
rm -rf .next .turbo node_modules/.cache prisma/generated || true

print_box "🗑️ Limpando cache do npm..."
npm cache clean --force

print_box "📦 Instalando dependências..."
npm install

print_box "📦 Resetando banco com schema atual (forçando recriação)..."
npx prisma db push --force-reset

print_box "🔄 Gerando cliente do Prisma v7..."
npx prisma generate

#print_box "🔄 Aplicando migração com push..."
#npx prisma db push

print_box "🌱 Executando seed..."
TRUNCATE_DB=1 npx prisma db seed

print_box "🚀 Criando build da Aplicação..."
npm run build || { echo "❌ Erro ao gerar o build"; exit 1; }

print_box "✅ Reset concluído com sucesso (Prisma v7)!"