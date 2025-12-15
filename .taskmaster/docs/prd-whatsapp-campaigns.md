# PRD: WhatsApp Campaigns (Meta Cloud API)

## Overview
Sistema de campanhas/disparos em massa via WhatsApp utilizando a API oficial da Meta (Cloud API). Permite enviar mensagens de template aprovadas para múltiplos destinatários, com rastreamento de entrega e monetização por mensagem.

## Problem Statement
Clientes precisam enviar comunicações em massa (promoções, lembretes, notificações) para sua base de leads. O WuzAPI não é adequado para isso devido a:
- Risco de ban por volume alto
- Sem templates aprovados (compliance)
- Limitações de rate limiting

A API oficial da Meta resolve esses problemas com templates aprovados e infraestrutura para alto volume.

## Goals
1. Permitir disparos em massa com templates aprovados pela Meta
2. Rastrear status de entrega (enviado, entregue, lido, falhou)
3. Monetizar cobrando markup sobre custo Meta
4. Fornecer analytics de campanhas

## Nomeação e Fronteiras de Models (para não confundir com outros créditos)
- **Credenciais Meta**: `MetaWhatsAppCredential` (tabela `meta_whatsapp_credentials`) vive no domínio WhatsApp/Meta Cloud.
- **Campanhas**: `WhatsAppTemplate`, `Campaign`, `CampaignRecipient`, `CampaignCredits`, `CampaignCreditTransaction` (tabelas `whatsapp_templates`, `campaigns`, `campaign_recipients`, `campaign_credits`, `campaign_credit_transactions`). Todos os valores monetários aqui ficam em **centavos de BRL**.
- **Créditos de IA**: `AICredits` e `AIUsageLog` (tabelas `ai_credits`, `ai_usage_logs`) são um domínio separado, não compartilham transações com campanhas.
- **Billing**: Planos/assinaturas permanecem em `Plan`, `Subscription`, etc., fora do escopo de campanhas e de IA.

### Como aparecerá no Postgres (nomes de tabela)
- `meta_whatsapp_credentials` (credenciais Meta)
- `whatsapp_templates` (cache de templates)
- `campaigns` / `campaign_recipients`
- `campaign_credits` / `campaign_credit_transactions` (créditos de campanha)
- `ai_credits` / `ai_usage_logs` (créditos de IA)

## Modo de Integração (Coexistência / Tech Provider)
- Usamos o modo de coexistência da Meta: o cliente faz login via botão de embedded signup fornecido pela Meta e autoriza o WABA/telefone diretamente no nosso SaaS.
- Sem SDKs proprietárias: tudo via chamadas REST para `graph.facebook.com`.
- Webhook simples: GET para verificação (`hub.mode`, `hub.challenge`, `hub.verify_token`) e POST para eventos; não dependemos de libraries da Meta.
- Salvamos no backend os dados retornados no onboarding (phoneNumberId, wabaId, accessToken, phoneNumber) em `meta_whatsapp_credentials`.

## Non-Goals
- Chat 1:1 (usar WuzAPI via PRD do Chat)
- Criação de templates (feito no Meta Business Manager)
- Chatbots/automações
- Integração com outros canais (SMS, Email)

## Business Model

### Custos Meta (referência Nov 2024 - Brasil)
| Categoria | Custo por conversa |
|-----------|-------------------|
| Marketing | ~R$ 0,80 |
| Utility | ~R$ 0,35 |
| Authentication | ~R$ 0,30 |
| Service | Gratuito (desde Nov 2024) |

### Modelo de Monetização Whatrack
```
┌─────────────────────────────────────────────────────────────┐
│                    Pricing Strategy                         │
├─────────────────────────────────────────────────────────────┤
│  Custo Meta (ex: R$ 0,80) + Markup Whatrack (15-25%)       │
│                                                             │
│  Exemplo Marketing:                                         │
│    Meta cobra: R$ 0,80                                      │
│    Whatrack cobra: R$ 0,95 (+R$ 0,15 / 18.75% markup)      │
│                                                             │
│  Margem por mensagem: R$ 0,15                              │
│  1.000 mensagens = R$ 150 margem bruta                     │
│  10.000 mensagens = R$ 1.500 margem bruta                  │
├─────────────────────────────────────────────────────────────┤
│  Considerações fiscais:                                     │
│    - ISS: ~5% sobre serviço                                │
│    - PIS/COFINS: ~9.25% (Lucro Presumido)                  │
│    - IR/CSLL: variável                                      │
│                                                             │
│  Markup mínimo recomendado: 20-25% para cobrir impostos    │
└─────────────────────────────────────────────────────────────┘
```

### Billing Flow
```
1. Cliente cria campanha com N destinatários
2. Sistema calcula: N × (custo_meta + markup)
3. Verifica saldo/créditos do cliente
4. Se OK, executa campanha
5. Webhooks atualizam status de cada mensagem
6. Dashboard mostra relatório final
```

## User Stories

### US1: Configurar Credenciais Meta Cloud
**Como** administrador da organização
**Quero** conectar minha conta Meta Business
**Para** poder enviar campanhas oficiais

**Acceptance Criteria:**
- Formulário para inserir Phone Number ID, WABA ID, Access Token
- Validação de credenciais via API Meta
- Feedback de sucesso/erro
- Exibir número conectado após configuração

### US2: Listar Templates Disponíveis
**Como** usuário do dashboard
**Quero** ver meus templates aprovados na Meta
**Para** escolher qual usar na campanha

**Acceptance Criteria:**
- Listar templates do WABA conectado
- Mostrar: nome, categoria, idioma, status (aprovado/pendente/rejeitado)
- Preview do template com variáveis
- Filtro por categoria e status

### US3: Criar Campanha
**Como** usuário do dashboard
**Quero** criar uma nova campanha de disparo
**Para** enviar mensagens para minha base

**Acceptance Criteria:**
- Selecionar template aprovado
- Upload de lista de destinatários (CSV) ou selecionar de leads existentes
- Mapear variáveis do template com dados dos destinatários
- Preview de mensagem com dados reais
- Calcular e exibir custo total estimado
- Agendar para envio imediato ou futuro

### US4: Acompanhar Campanha
**Como** usuário do dashboard
**Quero** acompanhar o progresso da campanha
**Para** saber quantas mensagens foram entregues

**Acceptance Criteria:**
- Dashboard de campanha com métricas em tempo real
- Status: enviadas, entregues, lidas, falhas
- Gráfico de progresso
- Lista de destinatários com status individual
- Export de relatório (CSV)

### US5: Ver Histórico de Campanhas
**Como** usuário do dashboard
**Quero** ver histórico de campanhas anteriores
**Para** analisar performance e custos

**Acceptance Criteria:**
- Lista de campanhas com filtros (data, status, template)
- Métricas agregadas: total enviado, taxa de entrega, taxa de leitura
- Custo total por campanha
- Comparativo entre campanhas

### US6: Gerenciar Créditos/Saldo
**Como** usuário do dashboard
**Quero** ver meu saldo de créditos
**Para** saber quanto posso gastar em campanhas

**Acceptance Criteria:**
- Exibir saldo atual
- Histórico de transações (compras, gastos)
- Alerta de saldo baixo
- Botão para comprar mais créditos (integração Asaas)

## Technical Architecture

### Database Models (novos)

```prisma
// Template cache (sincronizado da Meta)
model WhatsAppTemplate {
  id             String       @id @default(cuid())
  organizationId String
  organization   Organization @relation(fields: [organizationId], references: [id], onDelete: Cascade)

  templateId String // ID na Meta
  name       String
  language   String
  category   TemplateCategory
  status     TemplateStatus
  components Json // Header, body, footer, buttons
  syncedAt   DateTime

  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt

  campaigns Campaign[]

  @@unique([organizationId, templateId])
  @@index([organizationId, status])
  @@map("whatsapp_templates")
}

enum TemplateCategory {
  MARKETING
  UTILITY
  AUTHENTICATION
}

enum TemplateStatus {
  APPROVED
  PENDING
  REJECTED
  PAUSED
}

// Campanha de disparo (custos em centavos de BRL)
model Campaign {
  id             String       @id @default(cuid())
  organizationId String
  organization   Organization @relation(fields: [organizationId], references: [id], onDelete: Cascade)

  templateId String
  template   WhatsAppTemplate @relation(fields: [templateId], references: [id])

  name   String
  status CampaignStatus @default(DRAFT)

  scheduledAt DateTime?
  startedAt   DateTime?
  completedAt DateTime?

  // Métricas
  totalRecipients Int @default(0)
  sent            Int @default(0)
  delivered       Int @default(0)
  read            Int @default(0)
  failed          Int @default(0)

  // Custos (centavos)
  estimatedCost Int @default(0)
  actualCost    Int @default(0)

  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt

  recipients CampaignRecipient[]

  @@index([organizationId, status])
  @@index([scheduledAt])
  @@map("campaigns")
}

enum CampaignStatus {
  DRAFT
  SCHEDULED
  PROCESSING
  COMPLETED
  FAILED
  CANCELLED
}

enum MessageStatus {
  PENDING
  SENT
  DELIVERED
  READ
  FAILED
}

// Destinatários da campanha (status por mensagem)
model CampaignRecipient {
  id         String   @id @default(cuid())
  campaignId String
  campaign   Campaign @relation(fields: [campaignId], references: [id], onDelete: Cascade)

  phone     String
  variables Json? // Variáveis do template para este destinatário

  status    MessageStatus @default(PENDING)
  messageId String? // ID da mensagem na Meta

  sentAt      DateTime?
  deliveredAt DateTime?
  readAt      DateTime?
  failedAt    DateTime?

  errorCode    String?
  errorMessage String?

  @@index([campaignId, status])
  @@index([messageId])
  @@map("campaign_recipients")
}

// Créditos/Saldo do cliente
model CampaignCredits {
  id             String       @id @default(cuid())
  organizationId String       @unique
  organization   Organization @relation(fields: [organizationId], references: [id], onDelete: Cascade)

  balance Int @default(0) // centavos

  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt

  transactions CreditTransaction[]

  @@map("campaign_credits")
}

model CreditTransaction {
  id        String          @id @default(cuid())
  creditsId String
  credits   CampaignCredits @relation(fields: [creditsId], references: [id], onDelete: Cascade)

  type        CreditTransactionType
  amount      Int // centavos: positivo (crédito) ou negativo (débito)
  description String
  campaignId  String? // Referência ao uso em campanha
  paymentId   String? // Referência ao pagamento Asaas

  createdAt DateTime @default(now())

  @@index([creditsId, createdAt])
  @@map("credit_transactions")
}

enum CreditTransactionType {
  PURCHASE      // Compra de créditos
  CAMPAIGN_USE  // Uso em campanha
  REFUND        // Estorno
  ADJUSTMENT    // Ajuste manual
}
```

### API Routes

```
# Credenciais Meta Cloud
GET    /api/v1/whatsapp/meta-cloud/credential      - Ver credencial atual
POST   /api/v1/whatsapp/meta-cloud/credential      - Salvar credencial
POST   /api/v1/whatsapp/meta-cloud/credential/test - Testar conexão

# Templates
GET    /api/v1/campaigns/templates                 - Listar templates
POST   /api/v1/campaigns/templates/sync            - Sincronizar da Meta
GET    /api/v1/campaigns/templates/:id             - Detalhes do template

# Campanhas
GET    /api/v1/campaigns                           - Listar campanhas
POST   /api/v1/campaigns                           - Criar campanha
GET    /api/v1/campaigns/:id                       - Detalhes da campanha
PUT    /api/v1/campaigns/:id                       - Atualizar campanha
POST   /api/v1/campaigns/:id/start                 - Iniciar envio
POST   /api/v1/campaigns/:id/cancel                - Cancelar campanha
GET    /api/v1/campaigns/:id/recipients            - Listar destinatários
GET    /api/v1/campaigns/:id/export                - Exportar relatório

# Créditos
GET    /api/v1/campaigns/credits                   - Ver saldo
GET    /api/v1/campaigns/credits/transactions      - Histórico
POST   /api/v1/campaigns/credits/purchase          - Comprar créditos

# Webhook Meta (já existe parcialmente)
GET    /api/v1/whatsapp/meta-cloud/webhook         - Verificar hub.challenge (hub.mode/verify_token)
POST   /api/v1/whatsapp/meta-cloud/webhook         - Receber status updates
```

### Meta Cloud Integration

- Sem SDK: chamadas REST diretas para o Graph API.
- Onboarding via botão de embedded signup (coexistência): recebemos `phoneNumberId`, `wabaId`, `accessToken`, `phoneNumber` e salvamos em `meta_whatsapp_credentials`.
- Webhook: responder GET com `hub.challenge` quando `hub.mode=subscribe` e `hub.verify_token` coincide; POST apenas loga/atualiza status.

**Enviar Template Message:**
```typescript
// src/services/whatsapp/meta-cloud/send-template.ts
export async function sendTemplateMessage(
  credential: MetaWhatsAppCredential,
  to: string,
  templateName: string,
  languageCode: string,
  components?: TemplateComponent[]
) {
  const response = await fetch(
    `https://graph.facebook.com/${META_API_VERSION}/${credential.phoneNumberId}/messages`,
    {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${credential.accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        messaging_product: 'whatsapp',
        to,
        type: 'template',
        template: {
          name: templateName,
          language: { code: languageCode },
          components,
        },
      }),
    }
  )

  const data = await response.json()
  return {
    messageId: data.messages?.[0]?.id,
    success: response.ok,
    error: data.error,
  }
}
```

**Listar Templates:**
```typescript
// src/services/whatsapp/meta-cloud/list-templates.ts
export async function listTemplates(credential: MetaWhatsAppCredential) {
  const response = await fetch(
    `https://graph.facebook.com/${META_API_VERSION}/${credential.wabaId}/message_templates`,
    {
      headers: {
        'Authorization': `Bearer ${credential.accessToken}`,
      },
    }
  )

  const data = await response.json()
  return data.data as MetaTemplate[]
}
```

### Webhook Handler (status updates)

```typescript
// Processar status de mensagem da campanha
async function handleStatusUpdate(status: MetaStatusUpdate) {
  const { id: messageId, status: deliveryStatus, timestamp, errors } = status

  // Encontrar recipient pelo messageId
  const recipient = await prisma.campaignRecipient.findFirst({
    where: { messageId },
    include: { campaign: true },
  })

  if (!recipient) return

  // Atualizar status do recipient
  const updateData: Partial<CampaignRecipient> = {}

  switch (deliveryStatus) {
    case 'sent':
      updateData.status = 'SENT'
      updateData.sentAt = new Date(timestamp * 1000)
      break
    case 'delivered':
      updateData.status = 'DELIVERED'
      updateData.deliveredAt = new Date(timestamp * 1000)
      break
    case 'read':
      updateData.status = 'READ'
      updateData.readAt = new Date(timestamp * 1000)
      break
    case 'failed':
      updateData.status = 'FAILED'
      updateData.failedAt = new Date(timestamp * 1000)
      updateData.errorCode = errors?.[0]?.code
      updateData.errorMessage = errors?.[0]?.title
      break
  }

  await prisma.campaignRecipient.update({
    where: { id: recipient.id },
    data: updateData,
  })

  // Atualizar contadores da campanha
  await updateCampaignMetrics(recipient.campaignId)

  // Notificar frontend via Centrifugo
  await publishCampaignUpdate(recipient.campaign.organizationId, recipient.campaignId)
}
```

### Campaign Processing (background job)

```typescript
// Job para processar campanha (via QStash ou similar)
async function processCampaign(campaignId: string) {
  const campaign = await prisma.campaign.findUnique({
    where: { id: campaignId },
    include: {
      template: true,
      recipients: { where: { status: 'PENDING' } },
      organization: { include: { metaWhatsAppCredential: true } },
    },
  })

  if (!campaign || campaign.status !== 'PROCESSING') return

  const credential = campaign.organization.metaWhatsAppCredential
  if (!credential) throw new Error('Meta credential not configured')

  // Rate limiting: ~80 msgs/segundo (Meta limit)
  const BATCH_SIZE = 50
  const BATCH_DELAY = 1000 // 1 segundo entre batches

  for (let i = 0; i < campaign.recipients.length; i += BATCH_SIZE) {
    const batch = campaign.recipients.slice(i, i + BATCH_SIZE)

    await Promise.all(
      batch.map(async (recipient) => {
        try {
          const result = await sendTemplateMessage(
            credential,
            recipient.phone,
            campaign.template.name,
            campaign.template.language,
            buildComponents(campaign.template, recipient.variables)
          )

          if (result.success) {
            await prisma.campaignRecipient.update({
              where: { id: recipient.id },
              data: {
                status: 'SENT',
                messageId: result.messageId,
                sentAt: new Date(),
              },
            })
          } else {
            await prisma.campaignRecipient.update({
              where: { id: recipient.id },
              data: {
                status: 'FAILED',
                failedAt: new Date(),
                errorMessage: result.error?.message,
              },
            })
          }
        } catch (error) {
          await prisma.campaignRecipient.update({
            where: { id: recipient.id },
            data: {
              status: 'FAILED',
              failedAt: new Date(),
              errorMessage: error instanceof Error ? error.message : 'Unknown error',
            },
          })
        }
      })
    )

    // Atualizar métricas a cada batch
    await updateCampaignMetrics(campaignId)

    // Delay entre batches
    if (i + BATCH_SIZE < campaign.recipients.length) {
      await sleep(BATCH_DELAY)
    }
  }

  // Finalizar campanha
  await prisma.campaign.update({
    where: { id: campaignId },
    data: {
      status: 'COMPLETED',
      completedAt: new Date(),
    },
  })
}
```

## UI Components

### Layout
```
/dashboard/campaigns/
├── page.tsx                    # Lista de campanhas
├── new/
│   └── page.tsx               # Criar nova campanha (wizard)
├── [id]/
│   └── page.tsx               # Detalhes/acompanhamento
├── templates/
│   └── page.tsx               # Gerenciar templates
└── credits/
    └── page.tsx               # Gerenciar créditos
```

### Componentes React
```
src/components/campaigns/
├── campaign-list.tsx           # Lista de campanhas
├── campaign-card.tsx           # Card de campanha na lista
├── campaign-wizard.tsx         # Wizard de criação (steps)
├── campaign-dashboard.tsx      # Dashboard de acompanhamento
├── campaign-metrics.tsx        # Métricas (sent, delivered, read, failed)
├── campaign-recipients.tsx     # Tabela de destinatários
├── template-list.tsx           # Lista de templates
├── template-card.tsx           # Card de template
├── template-preview.tsx        # Preview do template
├── recipient-upload.tsx        # Upload CSV de destinatários
├── variable-mapper.tsx         # Mapear variáveis do template
├── cost-calculator.tsx         # Calcular custo estimado
├── credits-balance.tsx         # Exibir saldo de créditos
└── credits-purchase.tsx        # Comprar créditos
```

## Data Flow

### Criar e Enviar Campanha
```
1. Usuário seleciona template
   ↓
2. Upload lista de destinatários (CSV ou seleciona leads)
   ↓
3. Mapeia variáveis do template com colunas do CSV
   ↓
4. Sistema calcula custo: N destinatários × preço por msg
   ↓
5. Verifica saldo de créditos
   ↓
6. Se OK, cria campanha com status DRAFT
   ↓
7. Usuário confirma e agenda/inicia
   ↓
8. Sistema debita créditos
   ↓
9. Job background processa em batches
   ↓
10. Webhooks atualizam status de cada mensagem
    ↓
11. Dashboard atualiza em tempo real (Centrifugo)
```

### Webhook Status Flow
```
Meta envia GET /api/v1/whatsapp/meta-cloud/webhook com hub.mode/verify_token/challenge
    ↓
Validar hub.verify_token (META_WEBHOOK_VERIFY_TOKEN) e devolver hub.challenge (200) ou 403
    ↓
Meta envia POST /api/v1/whatsapp/meta-cloud/webhook
    ↓
Validar assinatura (X-Hub-Signature-256)
    ↓
Parse payload (messages ou statuses)
    ↓
Para cada status update:
    ├── Encontrar CampaignRecipient por messageId
    ├── Atualizar status (SENT → DELIVERED → READ ou FAILED)
    ├── Atualizar contadores da Campaign
    └── Publicar no Centrifugo para atualização real-time
```

## Environment Variables

```env
# Meta Cloud (já existentes)
META_APP_ID=
META_APP_SECRET=
META_WEBHOOK_VERIFY_TOKEN=
META_API_VERSION=v21.0

# Pricing (configurável)
CAMPAIGN_MARKETING_PRICE=0.95      # Preço cobrado do cliente
CAMPAIGN_UTILITY_PRICE=0.45
CAMPAIGN_AUTH_PRICE=0.40
CAMPAIGN_MARKUP_PERCENT=20         # Markup sobre custo Meta
```

## Migration Plan

### Phase 1: Infrastructure (1 dia)
1. Criar models no Prisma (templates, campaigns, recipients, credits)
2. Rodar migrations
3. Implementar webhook handler para status updates

### Phase 2: Meta Cloud Integration (2 dias)
1. Implementar listTemplates
2. Implementar sendTemplateMessage
3. Criar rota de sync de templates
4. Testar envio individual

### Phase 3: Campaign Engine (2-3 dias)
1. Criar API routes de campaigns
2. Implementar job de processamento em batch
3. Integrar com sistema de créditos
4. Testar fluxo completo

### Phase 4: Frontend (3-4 dias)
1. Página de templates
2. Wizard de criação de campanha
3. Dashboard de acompanhamento
4. Página de créditos

### Phase 5: Polish (1-2 dias)
1. Validações e tratamento de erros
2. Notificações (email quando campanha finalizar)
3. Export de relatórios
4. Testes

## Success Metrics
- Tempo para criar campanha < 5 min
- Taxa de entrega > 95%
- Atualização de status < 5s após webhook
- Zero mensagens cobradas mas não enviadas

## Risks
| Risco | Mitigação |
|-------|-----------|
| Token Meta expira | Alerta + guia de renovação |
| Rate limit Meta | Batch com delays, retry com backoff |
| Template rejeitado | Mostrar status, bloquear uso |
| Saldo insuficiente | Verificar antes de iniciar |
| Webhook não chega | Polling fallback, reconciliação |

## Out of Scope
- Criação de templates (usar Meta Business Manager)
- Chat 1:1 (usar WuzAPI)
- Automações/triggers
- Multi-canais (SMS, Email)
- A/B testing de templates

## Timeline Estimate
- Infrastructure: 1 dia
- Meta Integration: 2 dias
- Campaign Engine: 3 dias
- Frontend: 4 dias
- Testes: 2 dias
- **Total: ~2 semanas**
