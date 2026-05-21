# Infraestrutura e Backups (Coolify + R2)

Este documento descreve o padrão de infraestrutura para projetos WhaTrack e similares hospedados no Coolify, utilizando Cloudflare R2 para persistência de mídias e backups nativos do Coolify.

## 1. Cloudflare R2 (Storage)

Utilizamos o Cloudflare R2 para armazenar conteúdos de mídia e backups do banco de dados.

### A. Bucket de Mídia (User Content)
Utilizado para armazenar áudios, imagens e documentos recebidos/enviados via WhatsApp.
- **Configuração no `.env`**:
  ```env
  R2_ENDPOINT="https://<account_id>.r2.cloudflarestorage.com"
  R2_ACCESS_KEY_ID="<key_id>"
  R2_SECRET_ACCESS_KEY="<secret>"
  R2_BUCKET_NAME="whatrack"
  R2_PUBLIC_URL="https://pub-<id>.r2.dev"
  ```
- **Padrão de Diretório**: `organizations/{orgId}/whatsapp/media/{year}/{month}/{day}/{messageId}.{ext}`

### B. Bucket de Backup (Gerenciado pelo Coolify)
Utilizado para dumps do banco de dados. O Coolify realiza o backup de forma nativa e assíncrona.
- **Bucket**: `backups`
- **Pasta no Bucket**: `whatrack`

---

## 2. Configuração de Backups Nativos no Coolify

A responsabilidade de gerar e enviar backups é do Coolify. Ele realiza o `pg_dump` fora do container da aplicação, o que é mais seguro e performático.

### Passo 1: Cadastrar o Storage S3 (R2) no Coolify
No painel do Coolify, vá em **Destinations > S3 Storages > Add New**:
- **Name**: `Cloudflare R2 Backups`
- **Endpoint**: `https://<account_id>.r2.cloudflarestorage.com`
- **Bucket**: `backups`
- **Region**: `auto`
- **Access Key**: `<Mesma do Bucket de Mídia>`
- **Secret Key**: `<Mesma do Bucket de Mídia>`

### Passo 2: Agendar o Backup do Banco de Dados
No recurso do **PostgreSQL** dentro do Coolify:
1. Vá na aba **Backups**.
2. Selecione o **S3 Storage** cadastrado.
3. Defina o **Frequency (Cron)**: `0 3 * * *` (Diariamente às 03:00).
4. Defina a pasta de destino (ex: `whatrack`).

---

## 3. Script de Restauração (CLI)

Mantemos um script local para facilitar a recuperação de dados ou sincronização de produção para desenvolvimento.

### Restauração Interativa
```bash
npm run restore:db
```
*O script utiliza as credenciais `R2_*` do seu `.env` para listar os backups no bucket `backups/whatrack` e permite escolher qual restaurar localmente.*

---

## 4. Checklist de Novo Projeto
1. [ ] Criar bucket `whatrack` (mídias) e garantir que o bucket `backups` existe no Cloudflare R2.
2. [ ] Configurar variáveis de ambiente `R2_*` no Coolify.
3. [ ] Cadastrar S3 Storage no painel do Coolify usando as mesmas credenciais.
4. [ ] Ativar backup agendado na instância do Postgres do projeto.
5. [ ] Testar a conexão de restauração com `npm run restore:db`.
