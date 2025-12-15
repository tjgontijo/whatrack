<context>
# Overview

Integracao com a Meta Marketing API para coleta automatica de metricas de anuncios do Facebook/Instagram Ads. Permite que usuarios do Whatrack conectem suas contas de anuncio via OAuth2 e visualizem metricas de campanhas diretamente na plataforma.

## Problema que resolve
- Usuarios precisam acessar multiplas plataformas para ver dados de marketing
- Dificuldade em correlacionar gastos de ads com resultados de vendas
- Falta de visibilidade unificada de metricas de diferentes contas de anuncio
- Trabalho manual de exportar dados do Meta Ads Manager

## Usuarios
- **Gestores de trafego**: Precisam monitorar performance de campanhas
- **Donos de negocio**: Querem ver ROI dos investimentos em ads
- **Agencias**: Gerenciam multiplas contas de diferentes clientes

## Valor
- Dashboard unificado com dados de ads + vendas
- Economia de tempo na coleta de dados
- Historico de metricas armazenado localmente
- Base para calculo de CAC, ROAS e outras metricas de negocio

# Core Features

## 1. Conexao OAuth2 com Meta
- Autenticacao segura via Facebook Login
- Solicitacao de permissoes ads_read
- Armazenamento seguro de tokens
- Refresh automatico de tokens expirados

## 2. Selecao de Contas de Anuncio
- Listagem de todas as contas disponiveis apos conexao
- Usuario habilita/desabilita contas especificas
- Respeito aos limites do plano (ex: max 2 contas no Starter)
- Multiplos perfis Meta por organizacao (ex: agencias)

## 3. Sincronizacao de Metricas
- Coleta diaria automatica via job agendado
- Import inicial de 90 dias de historico
- Metricas por campanha, conjunto de anuncios e anuncio
- Dados: impressoes, cliques, resultados, custo

## 4. Gestao de Conexoes
- Tela de integradores em /settings/integrations
- Status de cada conexao (ativo, expirado, erro)
- Reconexao facil quando token expira
- Desconexao com limpeza de dados opcional

## 5. Visualizacao de Metricas
- Tabela de metricas com filtros por data, campanha
- Graficos de evolucao temporal
- Exportacao para CSV/Excel
- Integracao com dashboard principal

# User Experience

## Personas

### Gestor de Trafego
- Gerencia campanhas de multiplos clientes
- Precisa conectar varias contas de anuncio
- Quer ver metricas consolidadas
- Exporta relatorios semanais

### Dono de Negocio
- Tem uma conta de anuncio propria
- Quer ver gastos vs vendas
- Nao e tecnico, precisa de UX simples
- Acessa dashboard esporadicamente

### Agencia
- Multiplos perfis Meta (um por gerente)
- Dezenas de contas de anuncio
- Precisa de plano Business
- Quer automacao maxima

## Key User Flows

### Flow 1: Primeira Conexao
1. Usuario acessa /settings/integrations
2. Ve card "Meta Ads" com botao "Conectar"
3. Clica e e redirecionado para Facebook Login
4. Autoriza permissoes de leitura de ads
5. Retorna para app com sucesso
6. Sistema lista contas de anuncio disponiveis
7. Usuario seleciona quais quer sincronizar
8. Sistema inicia import de 90 dias em background
9. Usuario ve progresso e pode navegar

### Flow 2: Adicionar Perfil Adicional
1. Usuario acessa /settings/integrations
2. Ve perfis ja conectados
3. Clica "Adicionar Perfil"
4. Sistema verifica limite do plano
5. Se dentro do limite, inicia OAuth
6. Novo perfil aparece na lista
7. Usuario seleciona contas deste perfil

### Flow 3: Reconexao por Token Expirado
1. Job de sync detecta token expirado
2. Sistema marca perfil como "expired"
3. Email enviado ao usuario
4. Usuario acessa /settings/integrations
5. Ve badge "Reconectar" no perfil
6. Clica e refaz OAuth
7. Token atualizado, sync retoma

### Flow 4: Visualizar Metricas
1. Usuario acessa /dashboard ou /analytics/meta-ads
2. Seleciona periodo (ultimos 7, 30, 90 dias)
3. Ve metricas agregadas no topo
4. Tabela detalhada por campanha/adset/ad
5. Pode expandir para ver breakdown
6. Exporta para CSV se necessario

## UI/UX Considerations

### Pagina de Integracoes (/settings/integrations)
- Grid de cards de integracoes disponiveis
- Meta Ads, Google Ads (futuro), outros
- Status badge em cada card
- Botao de acao contextual (Conectar/Reconectar/Gerenciar)

### Modal de Contas de Anuncio
- Lista com checkbox para cada conta
- Nome da conta + ID + moeda
- Indicador de uso do limite
- Botao salvar selecao

### Pagina de Metricas Meta Ads
- Date picker no topo
- Cards de metricas resumidas (spend, impressions, clicks, results)
- Tabela com colunas sortaveis
- Filtro por campanha/adset
- Botao exportar

### Estados de Conexao
- **Conectado**: Badge verde, ultima sync
- **Sincronizando**: Spinner, progresso
- **Expirado**: Badge amarelo, botao reconectar
- **Erro**: Badge vermelho, mensagem de erro
</context>

<PRD>
# Technical Architecture

## System Components

```
┌─────────────────────────────────────────────────────────────┐
│                      Frontend (Next.js)                      │
├─────────────────────────────────────────────────────────────┤
│  /settings/integrations  │  /analytics/meta-ads  │  Modals  │
└──────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────┐
│                    API Routes (Next.js)                      │
├─────────────────────────────────────────────────────────────┤
│  /api/integrations/meta/*  │  /api/meta-ads/metrics         │
└─────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────┐
│                    Services Layer                            │
├─────────────────────────────────────────────────────────────┤
│  MetaOAuthService  │  MetaAdsService  │  MetaSyncService    │
└─────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────┐
│                    Meta Marketing API                        │
│           (Graph API v21.0 - Marketing endpoints)            │
└─────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────┐
│                    Background Jobs                           │
├─────────────────────────────────────────────────────────────┤
│  Daily Sync Job (03:00 UTC)  │  Token Refresh Job           │
└─────────────────────────────────────────────────────────────┘
```

## Data Models (Prisma Schema)

### Enums

```prisma
enum MetaConnectionStatus {
  active           // Conexao funcionando
  expired          // Token expirado, precisa reconectar
  revoked          // Usuario revogou acesso no Facebook
  error            // Erro generico
}

enum SyncStatus {
  pending          // Aguardando primeira sync
  syncing          // Sync em andamento
  completed        // Sync concluida com sucesso
  failed           // Sync falhou
}
```

### Core Models

```prisma
// Perfil Meta conectado via OAuth
model MetaProfile {
  id             String               @id @default(cuid())
  organizationId String
  organization   Organization         @relation(fields: [organizationId], references: [id], onDelete: Cascade)

  metaUserId     String               // ID do usuario no Meta (numerico)
  name           String?              // Nome do perfil no Facebook
  email          String?              // Email associado

  accessToken    String               @db.Text  // Long-lived token
  tokenExpiresAt DateTime             // Expiracao do token (~60 dias)
  scopes         String?              // Permissoes concedidas (ads_read, etc)

  status         MetaConnectionStatus @default(active)
  lastSyncAt     DateTime?            // Ultima sincronizacao bem-sucedida
  errorMessage   String?              // Mensagem do ultimo erro

  createdAt      DateTime             @default(now())
  updatedAt      DateTime             @default(now()) @updatedAt

  adAccounts     MetaAdAccount[]

  @@unique([organizationId, metaUserId])
  @@index([organizationId])
  @@index([status])
  @@map("meta_profiles")
}

// Conta de anuncio do Meta
model MetaAdAccount {
  id             String       @id @default(cuid())
  organizationId String
  organization   Organization @relation(fields: [organizationId], references: [id], onDelete: Cascade)

  profileId      String
  profile        MetaProfile  @relation(fields: [profileId], references: [id], onDelete: Cascade)

  accountId      String       // ID da conta no Meta (act_xxxxx)
  name           String       // Nome da conta de anuncio
  currency       String?      // BRL, USD, etc
  timezone       String?      // America/Sao_Paulo
  businessName   String?      // Nome do Business Manager (se aplicavel)

  enabled        Boolean      @default(false)   // Usuario habilitou para sync?
  syncStatus     SyncStatus   @default(pending)
  lastSyncAt     DateTime?    // Ultima sync desta conta
  lastSyncError  String?      // Erro da ultima sync

  // Controle de sync incremental
  lastSyncDate   DateTime?    // Ultima data de dados sincronizados

  createdAt      DateTime     @default(now())
  updatedAt      DateTime     @default(now()) @updatedAt

  metrics        MetaAdsMetric[]

  @@unique([organizationId, accountId])
  @@index([organizationId])
  @@index([profileId])
  @@index([enabled])
  @@map("meta_ad_accounts")
}

// Metricas diarias de anuncios
model MetaAdsMetric {
  id             String        @id @default(cuid())
  organizationId String
  organization   Organization  @relation(fields: [organizationId], references: [id], onDelete: Cascade)

  adAccountId    String
  adAccount      MetaAdAccount @relation(fields: [adAccountId], references: [id], onDelete: Cascade)

  reportDate     DateTime      @map("report_date")  // Data do relatorio

  // Hierarquia do anuncio
  campaignId     String        @map("campaign_id")
  campaign       String        @map("campaign_name")
  adsetId        String        @map("adset_id")
  adset          String        @map("adset_name")
  adId           String        @map("ad_id")
  ad             String        @map("ad_name")

  // Metricas
  impressions    Int           @default(0)
  clicks         Int           @default(0)
  results        Int           @default(0)  // Conversoes/leads configurados
  cost           Decimal       @db.Decimal(12, 2)  // Spend em moeda da conta

  // Metricas extras (futuro)
  reach          Int?
  frequency      Decimal?      @db.Decimal(10, 4)
  cpc            Decimal?      @db.Decimal(10, 4)
  cpm            Decimal?      @db.Decimal(10, 4)
  ctr            Decimal?      @db.Decimal(10, 4)

  createdAt      DateTime      @default(now()) @map("created_at")
  updatedAt      DateTime      @default(now()) @updatedAt @map("updated_at")

  @@index([organizationId])
  @@index([adAccountId])
  @@index([reportDate])
  @@index([campaignId])
  @@unique([adAccountId, reportDate, campaignId, adsetId, adId])
  @@map("meta_ads_metrics")
}

// Log de sincronizacoes (auditoria)
model MetaSyncLog {
  id             String       @id @default(cuid())
  organizationId String
  adAccountId    String?

  syncType       String       // "initial", "daily", "manual"
  status         SyncStatus
  startedAt      DateTime
  completedAt    DateTime?

  recordsProcessed Int        @default(0)
  dateRangeStart DateTime?
  dateRangeEnd   DateTime?

  errorMessage   String?      @db.Text

  createdAt      DateTime     @default(now())

  @@index([organizationId])
  @@index([adAccountId])
  @@map("meta_sync_logs")
}
```

### Organization Update

```prisma
model Organization {
  // ... campos existentes ...

  // Novas relacoes
  metaProfiles   MetaProfile[]
  metaAdAccounts MetaAdAccount[]
  metaAdsMetrics MetaAdsMetric[]

  // ... resto ...
}
```

## APIs and Integrations

### Internal API Routes

```
# OAuth
GET  /api/integrations/meta/auth          # Inicia OAuth (redireciona para Facebook)
GET  /api/integrations/meta/callback      # Callback do OAuth
POST /api/integrations/meta/refresh       # Refresh manual de token

# Profiles
GET  /api/integrations/meta/profiles      # Lista perfis conectados
DELETE /api/integrations/meta/profiles/[id] # Desconecta perfil

# Ad Accounts
GET  /api/integrations/meta/accounts      # Lista contas do perfil
PUT  /api/integrations/meta/accounts/[id] # Habilita/desabilita conta
POST /api/integrations/meta/accounts/[id]/sync # Sync manual de uma conta

# Metrics
GET  /api/meta-ads/metrics                # Lista metricas com filtros
GET  /api/meta-ads/metrics/summary        # Metricas agregadas
GET  /api/meta-ads/metrics/export         # Exporta CSV

# Status
GET  /api/integrations/meta/status        # Status geral da integracao
```

### Meta Marketing API Endpoints

```
# OAuth
GET https://www.facebook.com/v21.0/dialog/oauth
GET https://graph.facebook.com/v21.0/oauth/access_token
GET https://graph.facebook.com/v21.0/oauth/access_token?grant_type=fb_exchange_token

# User & Accounts
GET /me?fields=id,name,email
GET /me/adaccounts?fields=id,name,currency,timezone_name,business

# Insights (Metricas)
GET /{ad-account-id}/insights
  ?fields=campaign_id,campaign_name,adset_id,adset_name,ad_id,ad_name,
          impressions,clicks,actions,spend
  &level=ad
  &time_range={"since":"2024-01-01","until":"2024-01-31"}
  &time_increment=1  # Dados diarios
  &limit=500
```

### OAuth Flow Detail

```
1. Usuario clica "Conectar Meta Ads"
   GET /api/integrations/meta/auth

2. Redirect para Facebook
   https://www.facebook.com/v21.0/dialog/oauth
   ?client_id={APP_ID}
   &redirect_uri={CALLBACK_URL}
   &scope=ads_read,ads_management,business_management
   &state={CSRF_TOKEN}

3. Usuario autoriza, Facebook redireciona
   GET /api/integrations/meta/callback
   ?code={AUTH_CODE}
   &state={CSRF_TOKEN}

4. Backend troca code por short-lived token
   GET https://graph.facebook.com/v21.0/oauth/access_token
   ?client_id={APP_ID}
   &client_secret={APP_SECRET}
   &redirect_uri={CALLBACK_URL}
   &code={AUTH_CODE}

5. Backend troca por long-lived token (~60 dias)
   GET https://graph.facebook.com/v21.0/oauth/access_token
   ?grant_type=fb_exchange_token
   &client_id={APP_ID}
   &client_secret={APP_SECRET}
   &fb_exchange_token={SHORT_LIVED_TOKEN}

6. Salva MetaProfile com token e busca ad accounts
```

## Infrastructure Requirements

### Meta Developer App Setup

1. Criar app em developers.facebook.com
2. Tipo: Business
3. Adicionar produto: Marketing API
4. Configurar OAuth redirect URIs
5. Solicitar permissoes:
   - ads_read (Standard Access suficiente para propria conta)
   - Submeter para App Review para Advanced Access

### Environment Variables

```env
# Meta App
META_APP_ID=xxx
META_APP_SECRET=xxx
META_OAUTH_CALLBACK_URL=https://whatrack.com/api/integrations/meta/callback

# API Version
META_API_VERSION=v21.0

# Sync Config
META_INITIAL_SYNC_DAYS=90
META_SYNC_CRON=0 3 * * *  # 03:00 UTC daily
```

### Background Jobs

```typescript
// Daily sync job - roda 03:00 UTC
async function dailyMetaAdsSync() {
  // 1. Busca todas as ad accounts habilitadas
  // 2. Para cada conta, verifica se token valido
  // 3. Se token expirando em <7 dias, tenta refresh
  // 4. Busca metricas do dia anterior
  // 5. Upsert no banco
  // 6. Atualiza lastSyncAt
}

// Token refresh job - roda 1x por semana
async function refreshMetaTokens() {
  // 1. Busca tokens que expiram em <14 dias
  // 2. Tenta refresh via Graph API
  // 3. Se falha, marca profile como expired
  // 4. Envia email para usuario
}
```

### Rate Limits

- Meta Marketing API: ~200 calls/hour por ad account
- Usar batch requests quando possivel
- Implementar exponential backoff
- Monitorar header X-Business-Use-Case-Usage

# Development Roadmap

## Phase 1: OAuth Foundation

### 1.1 Database Schema
- Criar migrations para MetaProfile, MetaAdAccount, MetaAdsMetric
- Atualizar MetaAdsMetric existente (adicionar adAccountId)
- Criar MetaSyncLog para auditoria

### 1.2 Meta App Configuration
- Criar app no Meta Developer Portal
- Configurar OAuth redirect URIs
- Configurar permissoes necessarias (ads_read)

### 1.3 OAuth Flow
- Endpoint /api/integrations/meta/auth
- Endpoint /api/integrations/meta/callback
- Exchange de tokens (short -> long-lived)
- Armazenamento seguro de tokens

### 1.4 Account Discovery
- Endpoint GET /me/adaccounts
- Listagem de contas disponiveis
- Salvamento no MetaAdAccount

## Phase 2: Sync Engine

### 2.1 Sync Service
- MetaSyncService com metodo syncAdAccount()
- Chamada a /insights endpoint
- Parsing e normalizacao de dados
- Upsert em MetaAdsMetric

### 2.2 Initial Sync (90 dias)
- Sync em chunks de 30 dias
- Progress tracking
- Tratamento de rate limits
- Retry com backoff

### 2.3 Daily Sync Job
- Cron job diario
- Sync apenas do dia anterior
- Atualizacao de status das contas
- Log em MetaSyncLog

### 2.4 Token Management
- Verificacao de expiracao
- Refresh automatico quando possivel
- Notificacao quando refresh falha
- Marcacao de status expired

## Phase 3: UI de Integracoes

### 3.1 Pagina /settings/integrations
- Grid de cards de integracoes
- Card Meta Ads com status
- Botao Conectar/Reconectar

### 3.2 OAuth Flow UI
- Redirect para Facebook
- Pagina de callback com loading
- Tratamento de erros (usuario cancelou, etc)
- Redirect para selecao de contas

### 3.3 Modal de Selecao de Contas
- Lista de contas com checkbox
- Indicador de limite do plano
- Validacao de limites
- Confirmacao e inicio de sync

### 3.4 Status e Gerenciamento
- Lista de perfis conectados
- Status de cada conta (syncing, completed, error)
- Botao sync manual
- Botao desconectar

## Phase 4: Visualizacao de Metricas

### 4.1 Pagina /analytics/meta-ads
- Date range picker
- Cards de metricas resumidas
- Tabela de metricas detalhadas

### 4.2 Filtros e Ordenacao
- Filtro por conta de anuncio
- Filtro por campanha
- Ordenacao por coluna
- Paginacao

### 4.3 Graficos
- Line chart de spend over time
- Bar chart comparativo de campanhas
- Metricas de eficiencia (CTR, CPC)

### 4.4 Exportacao
- Export CSV
- Export Excel (opcional)
- Selecao de colunas

## Phase 5: Polish e Limites

### 5.1 Integracao com LimitService
- Verificar maxMetaProfiles antes de conectar
- Verificar maxMetaAdAccounts antes de habilitar
- UI de upgrade quando no limite

### 5.2 Notificacoes
- Email quando token expira
- Email quando sync falha repetidamente
- Toast na UI quando precisa reconectar

### 5.3 Dashboard Integration
- Widget de Meta Ads no dashboard principal
- Metricas resumidas
- Link para pagina completa

# Logical Dependency Chain

```
1. Schema & Migrations
   └── Base para tudo

2. Meta App Setup
   └── Necessario para OAuth funcionar
   └── Pode ser feito em paralelo com 1

3. OAuth Flow (backend)
   └── Permite conectar perfis
   └── Depende de: 1, 2

4. Account Discovery
   └── Lista contas apos OAuth
   └── Depende de: 3

5. UI de Integracoes (basica)
   └── Usuario consegue conectar
   └── Depende de: 3, 4

   --- MILESTONE: Usuario consegue conectar ---

6. Sync Service
   └── Core da coleta de dados
   └── Depende de: 1, 3

7. Initial Sync (90 dias)
   └── Import historico
   └── Depende de: 6

8. UI de Selecao de Contas
   └── Usuario escolhe o que sincronizar
   └── Depende de: 5, 7

   --- MILESTONE: Usuario tem dados ---

9. Daily Sync Job
   └── Dados atualizados automaticamente
   └── Depende de: 6

10. Token Refresh Job
    └── Conexoes se mantem ativas
    └── Depende de: 3, 9

11. Pagina de Metricas (basica)
    └── Usuario ve os dados
    └── Depende de: 7

    --- MVP COMPLETO ---

12. Filtros e Graficos
    └── UX completa de analytics
    └── Depende de: 11

13. Exportacao
    └── Usuario extrai dados
    └── Depende de: 11

14. Integracao com Limites
    └── Enforcement do plano
    └── Depende de: 5, PRD-Billing

15. Dashboard Widget
    └── Visibilidade no dashboard principal
    └── Depende de: 11
```

# Risks and Mitigations

## Technical Challenges

### Risk: App Review do Meta demorado
- **Mitigacao**: Iniciar processo de App Review cedo
- **Mitigacao**: Usar Standard Access para desenvolvimento (propria conta)
- **Mitigacao**: Documentar use case claramente para revisao

### Risk: Rate limits da API
- **Mitigacao**: Implementar batch requests
- **Mitigacao**: Sync em horarios de baixo uso (03:00 UTC)
- **Mitigacao**: Exponential backoff com jitter
- **Mitigacao**: Cache de dados ja coletados

### Risk: Token expira e usuario nao reconecta
- **Mitigacao**: Notificacao proativa 7 dias antes
- **Mitigacao**: Email quando expira
- **Mitigacao**: Badge visivel na UI
- **Mitigacao**: Graceful degradation (mostra dados antigos)

### Risk: Mudancas na API do Meta
- **Mitigacao**: Usar versao fixa da API (v21.0)
- **Mitigacao**: Monitorar deprecation warnings
- **Mitigacao**: Testes de integracao automatizados

### Risk: Dados inconsistentes entre syncs
- **Mitigacao**: Unique constraint no banco
- **Mitigacao**: Upsert ao inves de insert
- **Mitigacao**: Auditoria em MetaSyncLog

## MVP Definition

O MVP permite:
1. Conectar 1 perfil Meta via OAuth
2. Selecionar contas de anuncio para sync
3. Import inicial de 90 dias
4. Sync diario automatico
5. Visualizar metricas em tabela simples

NAO inclui no MVP:
- Graficos avancados (Phase 4)
- Exportacao (Phase 4)
- Multiplos perfis (depende do plano)
- Dashboard widget (Phase 5)

## Resource Constraints

### Meta Developer
- Precisa criar app e passar por App Review
- Processo pode levar 1-4 semanas
- Ter documentacao e video prontos

### Performance
- Sync inicial de 90 dias pode ser pesado
- Processar em background com progress
- Nao bloquear UI durante sync

### Storage
- Metricas diarias podem crescer rapido
- Considerar retention policy (ex: 1 ano)
- Indices adequados para queries

# Appendix

## Meta Marketing API Reference
- Docs: https://developers.facebook.com/docs/marketing-apis
- Insights: https://developers.facebook.com/docs/marketing-api/insights
- OAuth: https://developers.facebook.com/docs/facebook-login/guides/advanced/manual-flow

## Permissions Required

| Permission | Level | Purpose |
|------------|-------|---------|
| ads_read | Standard* | Ler metricas de campanhas |
| business_management | Advanced | Acessar Business Manager |

*Standard Access funciona apenas para contas do proprio usuario. Para acessar contas de terceiros (clientes), precisa Advanced Access via App Review.

## Insights Fields Available

```
# Basicos (usar no MVP)
impressions, clicks, spend, actions

# Engagement
reach, frequency, unique_clicks

# Conversions
actions, action_values, conversions, conversion_values

# Cost metrics (calculados)
cpc, cpm, cpp, ctr, cost_per_action_type

# Video
video_play_actions, video_p25_watched_actions, etc
```

## Example API Response

```json
{
  "data": [
    {
      "campaign_id": "123456789",
      "campaign_name": "Campanha Vendas",
      "adset_id": "987654321",
      "adset_name": "Interesse - Moda",
      "ad_id": "111222333",
      "ad_name": "Criativo 1 - Video",
      "impressions": "15420",
      "clicks": "342",
      "spend": "150.45",
      "actions": [
        {"action_type": "lead", "value": "12"},
        {"action_type": "link_click", "value": "342"}
      ],
      "date_start": "2025-01-15",
      "date_stop": "2025-01-15"
    }
  ],
  "paging": {
    "cursors": {
      "after": "xxx"
    },
    "next": "https://graph.facebook.com/..."
  }
}
```

## Checklist de Setup do Meta App

- [ ] Criar conta Meta Developer
- [ ] Criar Business App
- [ ] Adicionar Marketing API product
- [ ] Configurar OAuth redirect URIs
- [ ] Gerar App Secret
- [ ] Configurar permissoes (ads_read)
- [ ] Testar em sandbox
- [ ] Submeter para App Review (Advanced Access)
- [ ] Configurar webhooks (opcional)
</PRD>
