# PRD: Follow-up Automático

## Problema

Atendentes esquecem de fazer follow-up, leads esfriam e vendas são perdidas.

## Solução

Sistema de follow-up automático com mensagens geradas por IA:
- Atendente ativa follow-up no **ticket**
- Sistema agenda mensagens em steps configuráveis
- IA gera mensagem contextual no momento do envio
- Lead responde? Cancela follow-ups e reinicia ciclo

**Custo**: 1 crédito por mensagem de follow-up

**Regra**: Follow-up é **por ticket**, não por conversa. Se lead abre novo ticket, não recebe follow-ups do ticket anterior.

---

## Fluxo Principal

```
1. Atendente responde ao lead
        │
        ▼
2. Ativa toggle "Follow-up automático"
        │
        ▼
3. Sistema agenda Step 1 (ex: 30 min)
        │
        ▼
4. Lead não responde em 30 min
        │
        ▼
5. BullMQ dispara job
        │
        ├──▶ Verifica créditos
        ├──▶ Verifica horário comercial
        ├──▶ Gemini gera mensagem contextual
        ├──▶ Envia via WuzAPI
        └──▶ Agenda Step 2 (ex: 2h)
        │
        ▼
6. Repete até Step 3 ou lead responder
        │
        ▼
7. Após Step 3 sem resposta:
   └──▶ IA sugere status (ABANDONED/LOST)
   └──▶ Notifica atendente
```

---

## Cancelamento Automático

```
Lead envia mensagem (webhook)
        │
        ▼
┌──────────────────────────┐
│ Ticket tem follow-up     │
│ ativo?                   │
└──────────┬───────────────┘
           │ Sim
           ▼
┌──────────────────────────┐
│ Cancela todas as         │
│ ScheduledMessages        │
│ pendentes do ticket      │
└──────────┬───────────────┘
           │
           ▼
┌──────────────────────────┐
│ Remove jobs do BullMQ    │
│ usando bullJobId         │
└──────────┬───────────────┘
           │
           ▼
┌──────────────────────────┐
│ Reseta para Step 1       │
│ (se follow-up continuar  │
│ ativo)                   │
└──────────────────────────┘
```

**Nota**: Apenas o ticket ativo é afetado. Tickets anteriores do mesmo lead não são impactados.

---

## Cadência Configurável

A empresa define quantos steps quer e o delay de cada um. **Não há limite fixo** - pode ser 3, 5, 10 ou mais tentativas.

**Default (sugestão inicial):**

| Step | Delay |
|------|-------|
| 1 | 30 min |
| 2 | 2 horas |
| 3 | 24 horas |

**Exemplo de cadência agressiva (vendas B2C):**

| Step | Delay |
|------|-------|
| 1 | 15 min |
| 2 | 1 hora |
| 3 | 4 horas |
| 4 | 24 horas |
| 5 | 48 horas |

**Exemplo de cadência suave (B2B enterprise):**

| Step | Delay |
|------|-------|
| 1 | 24 horas |
| 2 | 3 dias |
| 3 | 7 dias |

A cadência é configurada na página de settings da organização (ver [prd-followup-config.md](prd-followup-config.md)).

---

## Horário Comercial

- Follow-ups só são enviados em horário comercial
- Se fora do horário, reagenda para próximo horário válido
- Configurável: horário de início, fim e dias da semana

---

## Prompt de Geração

```typescript
const FOLLOWUP_PROMPT = `
Você é um assistente de vendas. Gere uma mensagem de follow-up.

CONTEXTO:
- Empresa: {businessType}
- Produto: {productDescription}
- Tom: {aiTone}
- Step atual: {step} de {maxSteps}

CONVERSA ANTERIOR:
{recentMessages}

INSTRUÇÕES:
- Seja breve (máx 2-3 frases)
- Não seja invasivo
- Referencie algo da conversa anterior
- Se step final, indique que é a última tentativa de contato

Retorne APENAS a mensagem, sem aspas ou formatação.
`
```

---

## Modelo de Dados

```prisma
model ScheduledMessage {
  id             String   @id @default(cuid())
  organizationId String
  ticketId       String
  ticket         Ticket   @relation(fields: [ticketId], references: [id], onDelete: Cascade)

  step           Int      // 1, 2, 3
  content        String?  // Preenchido no momento do envio

  scheduledAt    DateTime
  sentAt         DateTime?
  cancelledAt    DateTime?
  cancelReason   String?  // "lead_replied", "manual", "no_credits"

  bullJobId      String?  // Para cancelar o job
  creditsUsed    Int      @default(1)

  createdAt      DateTime @default(now())

  @@index([ticketId])
  @@index([scheduledAt, sentAt])
  @@map("scheduled_messages")
}

// Campos no Ticket (já definidos no prd-application-flow.md)
// model Ticket {
//   followUpEnabled     Boolean  @default(false)
//   currentFollowUpStep Int?
//   scheduledMessages   ScheduledMessage[]
// }
```

---

## APIs

```
# Busca status do follow-up do ticket
GET /api/v1/tickets/:id/followup
Response: {
  enabled: true,
  currentStep: 1,
  creditsAvailable: 45,
  scheduledMessages: [
    { id, step: 1, scheduledAt, status: "pending", cost: 1 },
    { id, step: 2, scheduledAt, status: "scheduled", cost: 1 }
  ]
}

# Ativa/desativa follow-up
PATCH /api/v1/tickets/:id/followup
Body: { enabled: true }

# Cancela todos pendentes
DELETE /api/v1/tickets/:id/followup/scheduled

# Pula para próximo step
POST /api/v1/tickets/:id/followup/skip
Response: { nextStep: 2, scheduledAt: "..." }
```

---

## BullMQ Worker

```typescript
// src/lib/bullmq/workers/followup-sender.ts

const followupQueue = new Queue('followup', { connection: redis })

// Job data
interface FollowupJobData {
  scheduledMessageId: string
  ticketId: string
  organizationId: string
  step: number
}

// Worker
const worker = new Worker('followup', async (job) => {
  const { scheduledMessageId, ticketId, organizationId, step } = job.data

  // 1. Busca scheduled message
  const scheduled = await prisma.scheduledMessage.findUnique({
    where: { id: scheduledMessageId },
    include: { ticket: { include: { conversation: true } } }
  })

  // 2. Já foi cancelada?
  if (scheduled.cancelledAt) return

  // 3. Verifica créditos
  if (!await hasCredits(organizationId, 1)) {
    await cancelScheduledMessage(scheduledMessageId, 'no_credits')
    // Notifica atendente
    await notifyAgent(ticketId, 'Follow-up cancelado: sem créditos')
    return
  }

  // 4. Verifica horário comercial
  if (!isBusinessHours(organizationId)) {
    // Reagenda para próximo horário válido
    await rescheduleToBusinessHours(scheduledMessageId)
    return
  }

  // 5. Gera mensagem com IA (Gemini 2.0 Flash)
  const content = await generateFollowupMessage(ticketId, step)

  // 6. Envia via WuzAPI
  const conversationId = scheduled.ticket.conversationId
  await sendWhatsAppMessage(conversationId, content)

  // 7. Consome crédito e marca como enviada
  await consumeCredits(organizationId, 1, 'followup_generation', ticketId)
  await prisma.scheduledMessage.update({
    where: { id: scheduledMessageId },
    data: { sentAt: new Date(), content }
  })

  // 8. Agenda próximo step se houver
  const config = await getFollowupConfig(organizationId)
  if (step < config.maxSteps) {
    await scheduleNextStep(ticketId, step + 1, config)
  } else {
    // Último step - sugere fechar ticket
    await suggestTicketStatus(ticketId, 'ABANDONED')
  }
})
```

---

## UI: Accordion de Follow-up

### Custo dos botões

| Ação | Créditos | Quando |
|------|----------|--------|
| Cada step enviado | 1 | Automático |
| Pular Step | 1 | Manual |
| Ativar/Desativar | 0 | Apenas agenda/cancela |

**Regra de UX**: Mostrar custo total estimado e créditos disponíveis.

### Follow-up ativo
```
▼ Follow-up Automático
┌──────────────────────────────────┐
│ ⚡ 45 créditos restantes         │
│                                  │
│ [Toggle: Ativo]          ●───○   │
│                                  │
│ Status: Aguardando resposta      │
│ Próximo envio: em 25 min         │
│                                  │
│ ─── Cadência (3 steps) ───       │
│ ○ Step 1: 16:00 − 1 crédito      │
│ ○ Step 2: 18:00 − 1 crédito      │
│ ○ Step 3: amanhã 09:00 − 1 créd. │
│                                  │
│ Custo total: até 3 créditos      │
│                                  │
│ [⏭️ Pular Step − 1 crédito]      │
│ [❌ Cancelar Todos]               │
└──────────────────────────────────┘
```

### Follow-up em andamento
```
▼ Follow-up Automático
┌──────────────────────────────────┐
│ ⚡ 44 créditos restantes         │
│                                  │
│ [Toggle: Ativo]          ●───○   │
│                                  │
│ Status: Step 1 enviado           │
│ Próximo: em 1h45 (Step 2/3)      │
│                                  │
│ ─── Histórico ───                │
│ ✓ Step 1: 16:00 − 1 crédito      │
│   "Oi João, passando para..."    │
│ ○ Step 2: 18:00 − 1 crédito      │
│ ○ Step 3: amanhã 09:00 − 1 créd. │
│                                  │
│ [⏭️ Pular Step − 1 crédito]      │
│ [❌ Cancelar Todos]               │
└──────────────────────────────────┘
```

### Sem créditos
```
▼ Follow-up Automático
┌──────────────────────────────────┐
│ ⚠️ 0 créditos restantes          │
│                                  │
│ [Toggle: Desativado]     ○───●   │
│                                  │
│ Sem créditos para follow-up.     │
│ Steps pendentes foram cancelados.│
│                                  │
│ [Fazer Upgrade]                  │
└──────────────────────────────────┘
```

---

## Estados do Follow-up

| Estado | Descrição |
|--------|-----------|
| `idle` | Follow-up desativado |
| `waiting` | Aguardando timeout do step |
| `sending` | Gerando e enviando mensagem |
| `completed` | Todos steps enviados |
| `cancelled` | Cancelado (lead respondeu ou manual) |
| `paused` | Fora do horário comercial |
