# PRD: AI Insights (Análise de Ticket)

## Problema

Lead Score básico não captura intenção, sentimento ou sinais de compra/objeção.

## Solução

Análise **automática ao fechar ticket** usando IA (Groq/Llama 3.3 70B):
- Sentimento e score de sentimento
- Sinais de compra detectados
- Sinais de objeção detectados
- Resumo do atendimento
- Tags inferidas
- Resultado do ticket

**Custo**: 2 créditos por análise (automático)

---

## Quando Executar

| Trigger | Ação |
|---------|------|
| Ticket fechado (status → RESOLVED/WON/LOST) | Executa análise automaticamente |
| Botão manual "Analisar" | Re-executa análise (atualiza) |

**Regra**: A análise é **por ticket**, não por conversa. Um lead com 3 tickets terá 3 análises separadas.

---

## Output da Análise

```typescript
interface TicketAnalysis {
  // Sentimento geral do atendimento
  sentiment: 'positive' | 'neutral' | 'negative' | 'frustrated'
  sentimentScore: number // -1.0 a 1.0

  // Sinais detectados durante o atendimento
  buyingSignals: BuyingSignal[]
  objectionSignals: ObjectionSignal[]

  // Lead Score calculado pela IA
  aiLeadScore: number // 0-100
  scoreFactors: {
    engagement: number  // Engajamento nas respostas
    intent: number      // Intenção de compra
    urgency: number     // Urgência demonstrada
    budget: number      // Sinais de orçamento
  }

  // Insights
  summary: string       // Resumo do atendimento
  tags: string[]        // Tags inferidas

  // Resultado do ticket (preenchido ao fechar)
  outcome: 'sale' | 'lost_price' | 'lost_competitor' | 'lost_timing' | 'lost_need' | 'abandoned'
  outcomeReason: string // Explicação detalhada
}
```

---

## Sinais de Compra

| Sinal | Exemplos | Peso |
|-------|----------|------|
| `askedPrice` | "Qual o valor?", "Quanto custa?" | +15 |
| `askedProposal` | "Pode enviar proposta?" | +20 |
| `mentionedBudget` | "Tenho X pra investir" | +10 |
| `mentionedTimeline` | "Preciso pra semana que vem" | +15 |
| `askedTechnical` | Perguntas técnicas detalhadas | +10 |
| `requestedDemo` | "Posso testar?", "Tem trial?" | +15 |
| `mentionedCompetitor` | "A empresa X oferece..." | +5 |

---

## Sinais de Objeção

| Sinal | Exemplos | Peso |
|-------|----------|------|
| `priceObjection` | "Tá caro", "Fora do orçamento" | -10 |
| `delayTactic` | "Vou pensar", "Depois vejo" | -5 |
| `authorityGap` | "Preciso falar com meu chefe" | 0 (neutro) |
| `notInterested` | "Não preciso agora" | -15 |
| `silentDrop` | Parou de responder | -15 |

---

## Prompt de Análise

```typescript
const ANALYSIS_PROMPT = `
Você é um analista de vendas especializado em atendimento via WhatsApp.
Analise o atendimento abaixo e retorne um JSON estruturado.

CONTEXTO DA EMPRESA:
- Tipo de negócio: {businessType}
- Produto/Serviço: {productDescription}

STATUS DO TICKET: {ticketStatus} (RESOLVED, WON, ou LOST)

MENSAGENS DO ATENDIMENTO:
{messages}

Analise o atendimento e retorne APENAS um JSON válido:
{
  "sentiment": "positive" | "neutral" | "negative" | "frustrated",
  "sentimentScore": -1.0 a 1.0,
  "buyingSignals": ["askedPrice", "mentionedTimeline", ...],
  "objectionSignals": ["priceObjection", ...],
  "aiLeadScore": 0-100,
  "scoreFactors": {
    "engagement": 0-100,
    "intent": 0-100,
    "urgency": 0-100,
    "budget": 0-100
  },
  "summary": "Resumo do atendimento em 1-2 frases",
  "tags": ["tag1", "tag2"],
  "outcome": "sale" | "lost_price" | "lost_competitor" | "lost_timing" | "lost_need" | "abandoned",
  "outcomeReason": "Explicação do resultado baseada na conversa"
}

OUTCOMES:
- sale: Fechou venda
- lost_price: Perdeu por preço/orçamento
- lost_competitor: Perdeu para concorrente
- lost_timing: Perdeu por timing (não é o momento)
- lost_need: Perdeu por falta de necessidade real
- abandoned: Lead parou de responder
`
```

---

## Modelo de Dados

```prisma
model TicketAnalysis {
  id          String   @id @default(cuid())
  ticketId    String   @unique
  ticket      Ticket   @relation(fields: [ticketId], references: [id], onDelete: Cascade)

  // Sentimento geral do atendimento
  sentiment      String?  // "positive", "neutral", "negative", "frustrated"
  sentimentScore Float?   // -1.0 a 1.0

  // Sinais detectados
  buyingSignals    String[]  // ["askedPrice", "mentionedTimeline", ...]
  objectionSignals String[]  // ["priceObjection", "delayTactic", ...]

  // Score calculado pela IA
  aiLeadScore    Int?     // 0-100
  scoreFactors   Json?    // { engagement, intent, urgency, budget }

  // Insights
  summary        String?  // Resumo do atendimento em 1-2 frases
  tags           String[] // Tags inferidas ["urgente", "empresa", "preço"]

  // Resultado (preenchido pela IA ao fechar)
  outcome        String?  // "sale", "lost_price", "lost_competitor", "lost_timing", "abandoned"
  outcomeReason  String?  // Explicação do resultado

  // Tracking
  analyzedAt     DateTime // Quando foi analisado
  messageCount   Int      // Quantas msgs foram analisadas
  creditsUsed    Int      @default(2)

  createdAt      DateTime @default(now())
  updatedAt      DateTime @updatedAt

  @@map("ticket_analyses")
}
```

---

## API

```
# Dispara análise manualmente (re-análise)
POST /api/v1/tickets/:id/analyze
Response: TicketAnalysis

# Busca análise existente
GET /api/v1/tickets/:id/analysis
Response: TicketAnalysis | null

# Lista análises de um lead (histórico)
GET /api/v1/leads/:id/analyses
Response: TicketAnalysis[]
```

---

## Fluxo Automático (ao fechar ticket)

```
Ticket fechado (status → RESOLVED/WON/LOST)
        │
        ▼
┌──────────────────────┐
│ Verifica créditos    │──▶ Sem créditos? Não analisa, apenas fecha
│ (precisa de 2)       │
└──────────┬───────────┘
           │ (tem créditos)
           ▼
┌──────────────────────┐
│ Busca mensagens      │
│ do ticket            │
└──────────┬───────────┘
           │
           ▼
┌──────────────────────┐
│ Monta prompt com     │
│ contexto da org +    │
│ status de fechamento │
└──────────┬───────────┘
           │
           ▼
┌──────────────────────┐
│ Chama Groq/Llama     │
│ (~500ms, async)      │
└──────────┬───────────┘
           │
           ▼
┌──────────────────────┐
│ Consome 2 créditos   │
│ Salva TicketAnalysis │
│ Registra log de uso  │
└──────────────────────┘
```

**Nota**: A análise roda em background (BullMQ job) para não bloquear o fechamento do ticket.

---

## UI: Accordion de AI Insights

### Custo dos botões

| Ação | Créditos | Quando |
|------|----------|--------|
| Fechar ticket | 2 | Automático (se tiver créditos) |
| Analisar Agora | 2 | Manual, durante atendimento |
| Re-analisar | 2 | Manual, após fechado |

**Regra de UX**: Todo botão que consome créditos deve mostrar o custo claramente.

### Durante o atendimento (ticket aberto)
```
▼ AI Insights
┌──────────────────────────────────┐
│ ⚡ 45 créditos restantes         │
│                                  │
│ ⏳ Análise automática ao fechar  │
│    (consumirá 2 créditos)        │
│                                  │
│ ─── ou ───                       │
│                                  │
│ [🔍 Analisar Agora − 2 créditos] │
└──────────────────────────────────┘
```

### Sem créditos suficientes
```
▼ AI Insights
┌──────────────────────────────────┐
│ ⚠️ 0 créditos restantes          │
│                                  │
│ Análise não será gerada ao       │
│ fechar (sem créditos).           │
│                                  │
│ [Fazer Upgrade]                  │
└──────────────────────────────────┘
```

### Após fechar ticket (análise disponível)
```
▼ AI Insights
┌──────────────────────────────────┐
│ ⚡ 43 créditos restantes         │
│                                  │
│ Análise do Ticket #1234          │
│ Gerada em: 12/12/2024 às 15:30   │
│                                  │
│ ─── Resultado ───                │
│ 🏆 Venda fechada                 │
│ "Cliente fechou plano Business   │
│ após negociação de desconto"     │
│                                  │
│ ─── Sentimento ───               │
│ 😊 Positivo (0.7)                │
│                                  │
│ ─── Lead Score IA ───            │
│ 85/100                           │
│ • Engajamento: 90                │
│ • Intenção: 85                   │
│ • Urgência: 70                   │
│ • Orçamento: 80                  │
│                                  │
│ ─── Sinais de Compra ───         │
│ ✅ Pediu preço                   │
│ ✅ Mencionou prazo               │
│ ✅ Pediu proposta                │
│                                  │
│ ─── Objeções ───                 │
│ ⚠️ Objeção de preço (resolvida)  │
│                                  │
│ ─── Resumo ───                   │
│ "Cliente interessado em plano    │
│ empresarial para 10 usuários.    │
│ Negociou desconto de 10%."       │
│                                  │
│ Tags: #empresa #10users #desconto│
│                                  │
│ [🔄 Re-analisar − 2 créditos]    │
└──────────────────────────────────┘
```

### Histórico de análises do lead
```
▼ Histórico de Atendimentos
┌──────────────────────────────────┐
│ Este lead teve 3 tickets:        │
│                                  │
│ #1234 (12/12) 🏆 Venda - R$500   │
│ #1100 (10/11) ❌ Preço           │
│ #980  (05/10) 💤 Abandonado      │
│                                  │
│ Taxa de conversão: 33%           │
│ Tempo médio de atendimento: 2d   │
└──────────────────────────────────┘
```
