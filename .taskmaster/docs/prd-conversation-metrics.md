# PRD: Métricas de Conversa e Lead Score

## Problema

Atendentes não têm visibilidade sobre engajamento do lead, dificultando priorização.

## Solução

Calcular métricas automaticamente (por código, sem IA, grátis) a cada mensagem:
- Tempo de resposta do lead e agente
- Contagens (mensagens, mídia, tickets, vendas)
- Lead Score básico baseado em engajamento e histórico

---

## Métricas Calculadas

### Métricas da Conversa Atual

| Métrica | Tipo | Descrição |
|---------|------|-----------|
| `leadAvgResponseTime` | ms | Tempo médio de resposta do lead |
| `agentAvgResponseTime` | ms | Tempo médio de resposta do agente |
| `leadFastestResponse` | ms | Resposta mais rápida do lead |
| `messagesFromLead` | int | Total de msgs do lead nesta conversa |
| `messagesFromAgent` | int | Total de msgs do agente nesta conversa |
| `mediaShared` | int | Quantidade de mídia enviada |
| `avgMessageLength` | int | Tamanho médio em caracteres |
| `conversationDuration` | ms | Duração total da conversa |
| `daysSinceLastMessage` | int | Dias desde última mensagem |

### Métricas do Lead (histórico)

| Métrica | Tipo | Descrição |
|---------|------|-----------|
| `totalTickets` | int | Quantos tickets/tickets esse lead já teve |
| `totalSales` | int | Quantas vendas esse lead tem |
| `totalRevenue` | decimal | Valor total das vendas (R$) |
| `isReturningLead` | bool | Se já teve ticket anterior |
| `lastSaleAt` | datetime | Data da última venda |

---

## Lead Score Básico (0-100)

O score usa o **ticket médio da organização** para determinar se um cliente é de "alto valor", tornando o cálculo relevante para qualquer tipo de negócio.

```typescript
interface LeadMetrics {
  // Conversa atual
  leadAvgResponseTime: number | null
  messagesFromLead: number
  mediaShared: number
  daysSinceLastMessage: number

  // Histórico do lead
  totalTickets: number
  totalSales: number
  totalRevenue: number

  // Contexto da organização
  orgAvgTicket: number // Ticket médio da org (da tabela Organization)
}

function calculateBasicLeadScore(metrics: LeadMetrics): number {
  let score = 50 // base
  const avgTicket = metrics.orgAvgTicket || 100 // fallback se não tiver histórico

  // === ENGAJAMENTO NA CONVERSA ===

  // Tempo de resposta rápido (+15 max)
  if (metrics.leadAvgResponseTime) {
    const responseMinutes = metrics.leadAvgResponseTime / 60000
    if (responseMinutes < 5) score += 15
    else if (responseMinutes < 30) score += 10
    else if (responseMinutes < 120) score += 5
  }

  // Volume de mensagens (+10 max)
  if (metrics.messagesFromLead > 10) score += 10
  else if (metrics.messagesFromLead > 5) score += 5

  // Mídia compartilhada (+5)
  if (metrics.mediaShared > 0) score += 5

  // === HISTÓRICO DO LEAD ===

  // Cliente recorrente (+15 max)
  if (metrics.totalSales > 0) {
    score += 10 // Já comprou antes
    if (metrics.totalSales > 2) score += 5 // Cliente fiel
  }

  // Valor do cliente baseado no ticket médio da org (+10 max)
  // Alto valor = gastou mais de 3x o ticket médio
  // Médio valor = gastou mais de 1x o ticket médio
  if (metrics.totalRevenue > avgTicket * 3) score += 10
  else if (metrics.totalRevenue > avgTicket) score += 5

  // Lead que volta (+5)
  if (metrics.totalTickets > 1) score += 5

  // === PENALIDADES ===

  // Inatividade (-20 max)
  if (metrics.daysSinceLastMessage > 7) score -= 20
  else if (metrics.daysSinceLastMessage > 3) score -= 10

  return Math.max(0, Math.min(100, score))
}
```

---

## Modelo de Dados

```prisma
model ConversationMetrics {
  id             String   @id @default(cuid())
  conversationId String   @unique
  conversation   Conversation @relation(fields: [conversationId], references: [id], onDelete: Cascade)

  // Response times (ms)
  leadAvgResponseTime   Int?
  agentAvgResponseTime  Int?
  leadFastestResponse   Int?

  // Contagens da conversa
  messagesFromLead      Int      @default(0)
  messagesFromAgent     Int      @default(0)
  totalMessages         Int      @default(0)
  mediaShared           Int      @default(0)

  // Engagement
  avgMessageLength      Int?
  conversationDuration  Int?     // ms desde primeira msg

  // Score
  basicLeadScore        Int?

  // Timestamps
  lastLeadMessageAt     DateTime?
  lastAgentMessageAt    DateTime?

  updatedAt      DateTime @updatedAt

  @@map("conversation_metrics")
}
```

**Nota**: Métricas do Lead (totalTickets, totalSales, totalRevenue) são calculadas em runtime consultando as tabelas `Ticket` e `Sale`, não precisam de campo dedicado.

---

## Funções de Cálculo

```typescript
// src/lib/metrics/lead-history.ts

// Busca histórico do lead + contexto da org para calcular score
async function getLeadHistoryWithContext(
  leadId: string,
  organizationId: string
): Promise<{
  totalTickets: number
  totalSales: number
  totalRevenue: number
  lastSaleAt: Date | null
  orgAvgTicket: number
}> {
  const [ticketCount, salesData, org] = await Promise.all([
    prisma.ticket.count({ where: { leadId } }),
    prisma.sale.aggregate({
      where: { ticket: { leadId }, status: 'completed' },
      _count: true,
      _sum: { totalAmount: true },
      _max: { createdAt: true }
    }),
    prisma.organization.findUnique({
      where: { id: organizationId },
      select: { avgTicket: true }
    })
  ])

  return {
    totalTickets: ticketCount,
    totalSales: salesData._count || 0,
    totalRevenue: salesData._sum.totalAmount?.toNumber() || 0,
    lastSaleAt: salesData._max.createdAt || null,
    orgAvgTicket: org?.avgTicket?.toNumber() || 0
  }
}
```

**Nota**: O campo `avgTicket` já existe na tabela `Organization` e é atualizado automaticamente quando vendas são registradas.

---

## Quando Atualizar

```
Nova mensagem chega (webhook)
        │
        ▼
┌──────────────────────────┐
│ updateConversationMetrics(conversationId)
│ - Recalcula tempos de resposta
│ - Atualiza contagens da conversa
│ - Busca histórico do lead
│ - Recalcula Lead Score
└──────────────────────────┘
        │
        ▼
    Salva no banco
```

---

## API

```
GET /api/v1/conversations/:id/metrics
Response: {
  // Conversa atual
  leadAvgResponseTime: 180000,      // 3 min
  agentAvgResponseTime: 720000,     // 12 min
  messagesFromLead: 8,
  messagesFromAgent: 6,
  mediaShared: 1,
  daysSinceLastMessage: 0,

  // Histórico do lead
  totalTickets: 3,
  totalSales: 2,
  totalRevenue: 1500.00,
  isReturningLead: true,

  // Score
  basicLeadScore: 82,
  lastLeadMessageAt: "2024-12-12T15:30:00Z"
}
```

---

## UI: Accordion de Métricas

```
▼ Métricas
┌──────────────────────────────────┐
│ Lead Score: █████████░ 82/100    │
│ (baseado em engajamento)         │
│                                  │
│ ─── Conversa Atual ───           │
│ Tempo resp. lead: 3 min (médio)  │
│ Tempo resp. agente: 12 min       │
│ Msgs do lead: 8                  │
│ Msgs do agente: 6                │
│ Mídia: 1 arquivo                 │
│                                  │
│ ─── Histórico do Lead ───        │
│ 🔄 Lead recorrente (3 tickets)   │
│ 💰 2 vendas (R$ 1.500,00)        │
└──────────────────────────────────┘
```

---

## Interpretação Visual do Score

| Score | Cor | Label |
|-------|-----|-------|
| 0-30 | Vermelho | Frio |
| 31-50 | Laranja | Morno |
| 51-70 | Amarelo | Interessado |
| 71-85 | Verde claro | Quente |
| 86-100 | Verde | Muito quente |

---

## Badges Especiais

| Condição | Badge |
|----------|-------|
| `totalSales > 0` | 💰 Cliente |
| `totalSales > 2` | ⭐ Cliente fiel |
| `totalTickets > 1` | 🔄 Recorrente |
| `totalRevenue > avgTicket * 3` | 💎 Alto valor |

**Nota**: O badge "Alto valor" é dinâmico - usa o ticket médio da organização. Se o ticket médio é R$500, "alto valor" = R$1.500+. Se é R$5.000, "alto valor" = R$15.000+.
