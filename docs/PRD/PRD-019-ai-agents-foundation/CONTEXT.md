# CONTEXT.md: AI Agents Foundation

## O que é um Agente?

Um **agente** é uma entidade inteligente que:
- Recebe um **input** (mensagem, contexto, comando)
- Processa com **inteligência** (LLM, lógica, memória)
- Produz um **output** (resposta, ação, estado)

No WhaTrack, temos 3 tipos de agentes criados em PRD-018:

---

## Tipos de Agentes

### 1. **Reactive Agents** (reagem em tempo real)

**Exemplo:** `whatsapp-inbound`

**O que faz:**
- Escuta mensagens chegando em tempo real
- Processa **imediatamente**
- Responde no mesmo canal

**Características:**
- Stateless (sem memória entre requisições)
- Latência baixa (< 5s)
- Executam skills determinísticas + LLM
- Decisão: responder agora ou escalar

**Exemplo de fluxo:**
```
Cliente: "Qual é o preço?"
→ Agente lê contexto (lead data)
→ Agente executa skill "explain-product-service"
→ Agente responde com preço
→ Evento registrado em AiEvent
```

---

### 2. **Proactive Agents** (iniciam ações)

**Exemplo:** `whatsapp-cadence`

**O que faz:**
- Não espera por input
- **Inicia** conversas baseado em regras ou cronograma
- Envia mensagens programadas

**Características:**
- Memória persistente (cadence state)
- Latência flexível (podem rodar em background)
- Decisão: qual mensagem enviar, para quem
- Respeitam horário comercial, preferências de lead

**Exemplo de fluxo:**
```
Cadence: "Enviar follow-up em 2h"
→ Agente verifica lead status, histórico
→ Agente gera mensagem personalizada
→ Agente envia via WhatsApp
→ Agente registra tentativa em AiEvent
```

---

### 3. **Analytical Agents** (analisam dados)

**Exemplos:** `audience-intelligence`, `crm-intelligence`, `campaign-intelligence`

**O que fazem:**
- Analisam **dados agregados**, não conversas individuais
- Produzem **insights** (relatórios, recomendações)
- Usados pelo usuário (PRD-011) ou por automações

**Características:**
- Não interagem diretamente com customers
- Input é sempre **dados internos** (database, APIs)
- Output é **relatório estruturado** ou **recomendações**
- Latência flexível

**Exemplo de fluxo:**
```
Usuário: "Qual é meu audience profile?"
→ Agent "audience-intelligence" coleta dados
→ Agrupa por: localização, interesse, score
→ Gera insights + recomendações
→ Retorna relatório estruturado
```

---

## Ciclo de Vida de um Agente

```
DRAFT
  ↓ (configurar prompts, skills)
TESTING
  ↓ (validar em sandbox)
PUBLISHED
  ↓ (pode ser usado em produção)
ACTIVE (em uso)
  ↓ (parar de usar)
PAUSED
  ↓ (ou deletar)
ARCHIVED
```

**Quem controla:**
- Desenvolvedores de agentes: DRAFT → PUBLISHED
- Usuários de projeto: PUBLISHED → ACTIVE/PAUSED

---

## Anatomia de um Agente

```prisma
model AiAgent {
  id            String  @id
  slug          String  @unique         // whatsapp-inbound, audience-intelligence
  name          String                  // "Agente Inbound WhatsApp"
  type          String                  // reactive | proactive | analytical
  channel       String                  // whatsapp | internal

  // Configuracao
  defaultConfig Json?                   // { modelId, maxTokens, temperature }

  // Metadados
  isSystem      Boolean @default(false) // true = criado pelo sistema
  description   String?

  // Estado do agente
  isActive      Boolean @default(true)

  // Relacoes
  projectConfigs AiAgentProjectConfig[]
  executionLogs  AiSkillExecutionLog[]
  versions       AiAgentVersion[]?      // future: versionamento

  createdAt     DateTime @default(now())
  updatedAt     DateTime @updatedAt
}
```

---

## Configuração de um Agente

Cada agente tem 2 níveis de config:

### **Nível 1: Padrão Global** (AiAgent.defaultConfig)

```typescript
{
  modelId: "openai/gpt-4o-mini",      // qual LLM usar
  maxTokensPerResponse: 500,
  temperature: 0.7,                   // criatividade
  timeout: 30000,                     // ms
}
```

### **Nível 2: Por Projeto** (AiAgentProjectConfig)

```typescript
{
  agentId: "agent-1",
  projectId: "proj-1",

  enabled: true,                      // kill switch
  paused: false,                       // pausa temporária

  // Overrides do padrão
  config?: {
    modelId?: "openai/gpt-4o",        // usar modelo diferente
    temperature?: 0.5,
  }
}
```

---

## Prompts e Capabilities

### **Reactive Agent (whatsapp-inbound)**

**Prompt base:**
```
Você é um agente de atendimento ao cliente em WhatsApp.

Contexto:
- Empresa: {businessName}
- Seu nome: {assistantName}
- Lead info: {leadContext}
- Histórico: {conversationHistory}

Sua decisão:
1. Se conseguir resolver com skills: execute a skill apropriada
2. Se não conseguir ou for complexo: human-handoff
3. Sempre respeite horário comercial

Responda em português brasileiro, de forma amigável mas profissional.
```

**Capabilities (skills):**
- send-welcome
- collect-lead-qualification
- explain-product-service
- send-pricing
- human-handoff
- out-of-hours-reply

---

## Testes de Agentes

**O que testar:**

1. **Accuracy** — agente dá respostas corretas?
2. **Safety** — evita respostas perigosas?
3. **Performance** — latência aceitável?
4. **Consistency** — respostas similares para inputs similares?

**Exemplo de teste:**

```typescript
describe('whatsapp-inbound agent', () => {
  it('responde "pricing" quando perguntado sobre preço', async () => {
    const result = await agent.execute({
      message: 'Quanto custa?',
      context: { leadId: 'lead-1', projectId: 'proj-1' }
    })

    expect(result.text).toContain('preço')
    expect(result.skillUsed).toBe('send-pricing')
  })

  it('escalona quando perguntado sobre devolução', async () => {
    const result = await agent.execute({
      message: 'Como faço uma devolução?',
      context: { leadId: 'lead-1' }
    })

    expect(result.action).toBe('human-handoff')
  })
})
```

---

## Métricas e Monitoramento

**Para cada agente, rastreamos:**

```typescript
interface AgentMetrics {
  // Execução
  executionCount: number
  successRate: number              // % de sucessos
  averageLatency: number           // ms

  // Comportamento
  skillDistribution: Record<string, number>  // qual skill mais usada?
  escalationRate: number           // % que escalona

  // Qualidade
  customerSatisfaction?: number    // rating (quando disponível)
  errorRate: number                // % de erros

  // Financeiro
  totalTokensUsed: number
  estimatedCost: number
}
```

---

## Versionamento (Future)

Para o futuro, PRD-020+ pode adicionar:

```prisma
model AiAgentVersion {
  id            String
  agentId       String
  versionNumber Int

  // Configs dessa versão
  modelId       String
  temperature   Float

  // Status
  isPublished   Boolean @default(false)
  isDraft       Boolean @default(true)

  // Rollback
  previousVersion AiAgentVersion?

  createdAt     DateTime @default(now())
}
```

Isso permite: testar nova versão em paralelo, rollback fácil, A/B testing.

---

## Roadmap (Será estudado em PRDs futuras)

1. **PRD-019** (agora) — Foundation, testes, métricas
2. **PRD-020** — Agent Studio (UI para criar/editar agentes)
3. **PRD-021** — Agent Versioning (versionamento + rollback)
4. **PRD-022** — Multi-Agent Orchestration (agentes chamando agentes)
5. **PRD-023** — Agent Analytics (dashboard de performance)
