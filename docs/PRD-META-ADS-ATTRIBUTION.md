# PRD — Meta Ads Attribution no WhaTrack

**Data:** 2026-02-18  
**Status:** v4 — Utmify-Style (Multi-Profile & Multi-Account)

---

## 0. Pré-Requisitos (Meta Developer Portal)

Antes de iniciar a implementação, o App no Meta Developer Portal deve estar configurado corretamente:

1. **Tipo de App:** `Business` (Obrigatório).
   - *Recomendação:* Criar um **APP NOVO e SEPARADO** do app de WhatsApp. Isso evita pedir permissões de Ads no fluxo de conexão do número e isola riscos de bloqueio.
2. **Produtos Adicionados:**
   - **Marketing API** (Leitura de anúncios e envio de eventos offline).
   - **Facebook Login for Business** (Autenticação OAuth).

3. **Configurações de Login:**
   - Habilitar `Client OAuth Login` e `Web OAuth Login`.
   - Adicionar **Valid OAuth Redirect URIs**:
     - Dev: `http://localhost:3000/api/v1/meta-ads/callback`
     - Prod: `https://app.whatrack.com/api/v1/meta-ads/callback`

4. **Permissões (App Review):**
   - Para rodar em produção com contas de terceiros, é necessário solicitar **Advanced Access** para:
     - `ads_read`
     - `ads_management`
     - `business_management`

---

## 1. Contexto

O WhaTrack já recebe webhooks da Meta Cloud API oficial e captura o `ctwa_clid` quando a conversa vem de anúncio Click-to-WhatsApp (CTWA).

Objetivo deste módulo:

1. Capturar `source_id` (Ad ID) no webhook.
2. Enriquecer com nome de campanha, conjunto e anúncio via Marketing API.
3. Permitir conexão OAuth Multi-Perfil (vários gestores).
4. Permitir seleção granular de múltiplas Ad Accounts.
5. Enviar eventos de conversão (Lead e Purchase) via CAPI Business Messaging.

---

## 2. Payload Webhook

```json
{
  "entry": [{
    "changes": [{
      "field": "messages",
      "value": {
        "messages": [{
          "from": "557998093883",
          "referral": {
            "headline": "Prof Didática",
            "ctwa_clid": "AfeDIj2Ewr2X...",
            "source_id": "120237888636060701",
            "source_url": "https://fb.me/...",
            "source_type": "ad",
            "media_type": "video"
          },
          "timestamp": "1771407964"
        }]
      }
    }]
  }]
}
```

---

## 3. Escopo do MVP (v4 Utmify-Style)

### 3.1 Entra no MVP

1. **Multi-Perfil OAuth:** Adicionar vários usuários do Facebook.
2. **Multi-Contas:** Listar todas as contas acessíveis por todos os perfis.
3. **Seleção Granular:** Ativar/Desativar tracking por conta de anúncio.
4. **Configuração de Pixel:** Selecionar Dataset/Pixel para cada conta ativa (via API).
5. **Dashboard de ROI:** Tabela unificada de performance.
6. **CAPI Inteligente:** Lead na qualificação, Purchase na venda.

### 3.2 Não entra no MVP

1. Envio CAPI sem `ctwa_clid`.
2. Regras obrigatórias de UTM.

---

## 4. Fluxo Completo a Implementar

```
PASSO 1 — WEBHOOK (mensagem recebida)
  Extrair dados: `ctwa_clid`, `source_id` (Ad ID), `source_type`, `media_type`.

  Lógica de Atribuição (Last-Touch com Expiração):
  1. Buscar Ticket ABERTO (`status: open`).
  2. Verificar Expiração:
     - Se `lastMessageAt` > `ticketExpirationDays` -> Fechar ticket (Expired).
  
  3. Ação:
     - Sem Ticket Aberto -> Criar Novo Ticket + `TicketTracking`.
     - Com Ticket Aberto -> **ATUALIZAR** `TicketTracking` existente.
       - Atualiza dados do anúncio (Last-Touch).
       - Salva histórico em `MetaAttributionHistory`.
       - Dispara novo enriquecimento se `metaAdId` mudou.

PASSO 2 — ENRIQUECIMENTO DE DADOS (Marketing API) 
  - Buscar Token da AdAccount (via `MetaAdAccount` -> `MetaConnection`).
  - Buscar dados completos: Campaign Name, AdSet Name, Ad Name.
  - Salvar no `TicketTracking` (`TicketTracking` é a fonte da verdade).

PASSO 3 — LEAD via CAPI (Gatilho: Qualificação)
  Dispara se:
  - Ticket movido para etapa "Qualificado".
  - Possui `ctwa_clid`.
  - Evento: `LeadSubmitted`.

PASSO 4 — PURCHASE via CAPI (Gatilho: Venda)
  Dispara se:
  - Ticket movido para etapa "Ganho".
  - Evento: `Purchase`.
  - Valor: `Ticket.dealValue`.
```

---

## 5. Tela de Conexão (Estilo Multi-Perfil/Utmify)

### 5.1 Fluxo de UX

**Área 1: Perfis Conectados (OAuth)**
- Lista de usuários do Facebook conectados (ex: "Thiago Gontijo", "Viviane Borges").
- Status da conexão (Token válido/expirado).
- **Botão:** `Adicionar Novo Perfil` (Inicia OAuth).

**Área 2: Contas de Anúncio Disponíveis**
- Lista unificada de todas as Ad Accounts acessíveis pelos perfis conectados.
- Colunas: Nome da Conta, ID, Perfil de Origem, Status.
- **Ação:** Switch (Toggle) para ativar/desativar integração.
- **Configuração:** Ao ativar, modal para selecionar o **Dataset/Pixel** daquela conta (lista via API).

### 5.2 Endpoints de API

- `GET /connections`: Lista perfis conectados.
- `POST /connections`: Adiciona novo perfil (callback do OAuth).
- `GET /ad-accounts`: Lista todas as contas (buscando na API do Meta para cada conexão ativa).
- `PUT /ad-accounts/{id}/config`: Salva settings da conta (Ativa/Inativa, Dataset ID).

---

## 6. Mudanças de Schema (Prisma)

### 6.1 `MetaConnection` (Perfil OAuth)

```prisma
model MetaConnection {
  id             String   @id @default(dbgenerated("gen_random_uuid()")) @db.Uuid
  organizationId String   @db.Uuid
  
  fbUserId       String   // ID do usuário no Facebook
  fbUserName     String   // Nome exibido (ex: "Thiago Gontijo")
  accessToken    String   // Token Long-Lived (Criptografado)
  tokenExpiresAt DateTime
  
  status         String   @default("ACTIVE") // ACTIVE | EXPIRED | INVALID_SCOPES
  createdAt      DateTime @default(now())
  updatedAt      DateTime @updatedAt

  organization   Organization    @relation(fields: [organizationId], references: [id], onDelete: Cascade)
  adAccounts     MetaAdAccount[] // Contas importadas/vinculadas a este token

  @@unique([organizationId, fbUserId]) // Um usuário FB só conecta 1x por org
  @@map("meta_connections")
}
```

### 6.2 `MetaAdAccount` (Configuração)

```prisma
model MetaAdAccount {
  id                    String   @id @default(dbgenerated("gen_random_uuid()")) @db.Uuid
  organizationId        String   @db.Uuid
  connectionId          String   @db.Uuid // Qual token usar para acessar essa conta?

  adAccountId           String   // "act_123456"
  adAccountName         String
  
  pixelId               String?  // Dataset/Pixel ID para envio CAPI
  isActive              Boolean  @default(false) // Switch da UI

  createdAt             DateTime @default(now())
  updatedAt             DateTime @updatedAt

  connection            MetaConnection @relation(fields: [connectionId], references: [id], onDelete: Cascade)
  organization          Organization   @relation(fields: [organizationId], references: [id], onDelete: Cascade)

  @@unique([organizationId, adAccountId])
  @@map("meta_ad_accounts")
}
```

### 6.3 Campos em `TicketTracking`

```prisma
// Adicionar ao model TicketTracking:
metaAdId         String?   // source_id do referral (Ad ID)
metaAdSetId      String?
metaCampaignId   String?
metaAccountId    String?   // account_id retornado pela API

metaAdName       String?
metaAdSetName    String?
metaCampaignName String?
metaPlacement    String?   // referral.media_type
metaSourceType   String?   // referral.source_type (ad | post | organic)

// Controle de Enriquecimento e Race Condition
metaEnrichmentStatus   String   @default("PENDING") // PENDING | COMPLETED | FAILED
metaEnrichmentError    String?
lastEnrichmentAt       DateTime?
metaAdIdAtEnrichment   String?  // Evita sobrescrever com dados antigos (Race Condition)
```

### 6.4 `MetaConversionEvent`

```prisma
model MetaConversionEvent {
  id             String   @id @default(dbgenerated("gen_random_uuid()")) @db.Uuid
  organizationId String   @db.Uuid
  ticketId       String   @db.Uuid
  eventName      String   // LeadSubmitted | Purchase
  status         String   @default("PENDING") // PENDING | SENT | FAILED | SKIPPED_NO_CTWA | SKIPPED_DUPLICATE_LEAD
  eventId        String   @unique // Determinístico: "lead-{ticketId}" ou "purchase-{ticketId}"
  ctwaclid       String?
  metaAdId       String?
  fbtraceId      String?
  success        Boolean  @default(false)
  errorCode      String?
  errorMessage   String?
  value          Decimal? @db.Decimal(12, 2)
  currency       String   @default("BRL")
  sentAt         DateTime @default(now())

  organization   Organization @relation(fields: [organizationId], references: [id], onDelete: Cascade)

  @@unique([ticketId, eventName])
  @@index([organizationId])
  @@map("meta_conversion_events")
}
```

### 6.5 `MetaAttributionHistory`

```prisma
model MetaAttributionHistory {
  id             String   @id @default(dbgenerated("gen_random_uuid()")) @db.Uuid
  ticketId       String   @db.Uuid
  oldAdId        String?
  newAdId        String?
  changedAt      DateTime @default(now())
  
  ticket         Ticket   @relation(fields: [ticketId], references: [id], onDelete: Cascade)

  @@index([ticketId])
  @@map("meta_attribution_history")
}
```

---

## 7. Estrutura de Arquivos e Serviços (Feature-Based)

Recomendamos agrupar tudo em `src/services/meta-ads/` para separar da integração de WhatsApp (BSP).

### 7.1 Services (`src/services/meta-ads/`)

| Arquivo | Responsabilidade |
|---------|------------------|
| `access-token.service.ts` | Troca de code por token, refresh e validação. |
| `ad-account.service.ts` | Listar contas de anúncio e datasets (pixels). |
| `ad-enrichment.service.ts` | Buscar dados da campanha/anúncio na Graph API. |
| `ad-insights.service.ts` | Buscar métricas de gastos e ROI (Job Diário). |
| `capi.service.ts` | Enviar eventos `LeadSubmitted` e `Purchase`. |

### 7.2 API Routes (`src/app/api/v1/meta-ads/`)

| Rota | Método | Descrição |
|------|--------|-----------|
| `connect/route.ts` | GET | Inicia OAuth (Redirect). |
| `callback/route.ts` | GET | Recebe code e salva token. |
| `connections/route.ts` | GET | Lista perfis conectados. |
| `ad-accounts/route.ts` | GET/PUT | Lista e Configura Ad Accounts (Ativa/Desativa). |
| `insights/route.ts` | GET | Retorna dados para o Dashboard de ROI. |

### 7.3 Frontend Components (`src/components/settings/meta-ads/`)

- `ProfileList.tsx`: Lista perfis conectados e botão "Adicionar".
- `AdAccountList.tsx`: Tabela de contas com Toggle e Modal de Pixel.
- `RoiDashboard.tsx`: Tabela de performance.

---

## 8. Escopos OAuth (Limpos)

`ads_read` (leitura de contas e insights)
`ads_management` (necessário para ler alguns dados de pixel/dataset)
`business_management` (listar organizações)

---

## 9. Ordem de Implementação

### Sprint 1 — Base de Dados & Webhook
1. Migration (Novas tabelas v4).
2. Webhook: Captura e Lógica Last-Touch (sem enrichment ainda).

### Sprint 2 — Conexão Multi-Perfil
3. OAuth Flow: `connect`, `callback`, `MetaConnection`.
4. Tela: Adicionar Perfil.

### Sprint 3 — Setup de Contas
5. Serviço de Listagem de Contas (Agregando Tokens).
6. Tela: Lista de AdAccounts + Toggle + Modal Pixel.

### Sprint 4 — Enriquecimento & CAPI
7. Job de Enriquecimento (buscando token correto na `MetaAdAccount`).
8. CAPI: Lead qualificado e Purchase.

### Sprint 5 — ROI Dashboard
9. Job de Insights.
10. Tabela de ROI.
