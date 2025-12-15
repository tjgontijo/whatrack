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
rm -rf .next node_modules/@prisma/client node_modules/.cache node_modules/.prisma/client || true

print_box "🗑️ Limpando cache do npm..."
npm cache clean --force

print_box "📦 Instalando dependências..."
npm install

print_box "🔄 Gerando cliente do Prisma..."
npx prisma generate

print_box "🔄 Aplicando migração com push..."
# Usar push em vez de migrate dev (não requer acesso direto)
npx prisma db push

print_box "🌱 Executando seed manualmente..."
npx prisma db seed

print_box "🚀 Criando build da Aplicação..."
npm run build || { echo "❌ Erro ao gerar o build"; exit 1; }

print_box "✅ Processo de reset para desenvolvimento concluído!"