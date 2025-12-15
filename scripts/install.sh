#!/bin/bash

set -e  # Parar o script em caso de erro

echo "🚀 Iniciando a instalação do servidor Next.js..."

# Atualizar pacotes
echo "🔄 Atualizando pacotes do sistema..."
apt update && sudo apt upgrade -y

echo "📦 Instalando dependências essenciais..."
apt install -y curl git unzip nginx certbot python3-certbot-nginx

# Clonar o repositório
echo "📥 Clonando o repositório do projeto..."
cd /var/www
git clone https://github.com/tjgontijo/homenz.git homenz
cd homenz

# Instalar dependências
echo "📦 Instalando dependências do projeto..."
npm install

# Criar build do Next.js
echo "⚙️ Criando build do Next.js..."
npm run build

# Iniciar aplicação com PM2
echo "🚀 Iniciando aplicação com PM2..."
pm2 start npm --name "Homenz" -- start
pm2 save
pm2 startup

# Configurar Nginx
echo "⚙️ Configurando Nginx..."
bash -c 'cat > /etc/nginx/sites-available/homenz <<EOF
server {
    listen 80;
    server_name homenzbrasilia.com.br www.homenzbrasilia.com.br;

    location / {
        proxy_pass http://127.0.0.1:3003;
        proxy_set_header Host "$host";
        proxy_set_header X-Real-IP "$remote_addr";
        proxy_set_header X-Forwarded-For "$proxy_add_x_forwarded_for";
        proxy_set_header X-Forwarded-Proto "$scheme";
        proxy_http_version 1.1;
        proxy_set_header Upgrade "$http_upgrade";
        proxy_set_header Connection "upgrade";
    }

    location /_next/static/ {
        root /var/www/homenz/.next/;
        access_log off;
        expires 1y;
        add_header Cache-Control "public, max-age=31536000, immutable";
    }

    error_log /var/log/nginx/homenz.error.log;
    access_log /var/log/nginx/homenz.access.log;
}
EOF'

# Ativar configuração do Nginx
echo "🔄 Ativando configuração do Nginx..."
ln -s /etc/nginx/sites-available/homenz /etc/nginx/sites-enabled/

# Testar a configuração antes de reiniciar
echo "✅ Testando a configuração do Nginx..."
nginx -t

if [ $? -eq 0 ]; then
    echo "🔄 Reiniciando Nginx..."
    systemctl restart nginx
else
    echo "❌ Erro na configuração do Nginx! Verifique o arquivo em /etc/nginx/sites-available/homenz"
    exit 1
fi

# Configurar HTTPS com Certbot
echo "🔒 Configurando HTTPS com Let's Encrypt..."
certbot --nginx -d homenzbrasilia.com.br -d www.homenzbrasilia.com.br --non-interactive --agree-tos --redirect -m tjgontijo@gmail.com

# Finalização
echo "🔄 Reiniciando serviços..."
pm2 restart all
systemctl restart nginx

echo "✅ Instalação concluída com sucesso! O site deve estar rodando em https://homenzbrasilia.com.br"
