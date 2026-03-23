# Tasks: PRD-019 AI Agents Foundation

**Data:** 2026-03-23 (v1.0)
**Status:** Draft
**Total:** 14 tasks
**Estimado:** 3 fases
**Dependências:** PRD-018 ✅, PRD-012 (Fase 1-2 concluídas)

---

## Ordem De Execução

| Fase | Descrição | Tasks |
|------|-----------|-------|
| Fase 1 | Estrutura + Agente Reactive | T1-T5 |
| Fase 2 | Agentes Proactive + Analytical | T6-T10 |
| Fase 3 | Testes + Métricas + Validação | T11-T14 |

---

## FASE 1 - Estrutura + Agente Reactive (whatsapp-inbound)

### T1: Criar estrutura de diretórios e tipos base

**Files:**
- Create: `src/services/ai/agents/` (diretório raiz)
- Create: `src/services/ai/agents/types.ts`
- Create: `src/services/ai/agents/base.agent.ts`

**What to do:**

```typescript
// types.ts
export interface AgentContext {
  projectId: string
  organizationId: string
  leadId?: string
  ticketId?: string
  conversationHistory?: Array<{ role: 'user' | 'assistant', content: string }>
}

export interface AgentExecutionInput {
  agentSlug: string
  context: AgentContext
  input: string | Record<string, unknown>
}

export interface AgentExecutionOutput {
  text: string
  skillUsed?: string
  nextAgent?: string
  metrics: {
    latency: number
    tokensUsed: number
    confidence?: number
  }
}

// base.agent.ts - classe abstrata
export abstract class BaseAgent {
  abstract slug: string
  abstract type: 'reactive' | 'proactive' | 'analytical'

  abstract execute(input: AgentExecutionInput): Promise<Result<AgentExecutionOutput>>
}
```

**Diretório esperado:**
```
src/services/ai/agents/
├── types.ts
├── base.agent.ts
├── reactive/
│   └── whatsapp-inbound.agent.ts
├── proactive/
│   └── whatsapp-cadence.agent.ts
└── analytical/
    ├── audience-intelligence.agent.ts
    ├── crm-intelligence.agent.ts
    └── campaign-intelligence.agent.ts
```

**Verification:**
- Estrutura criada
- Types compilam sem erros

---

### T2: Implementar `whatsapp-inbound.agent.ts` (Reactive)

**Files:**
- Create: `src/services/ai/agents/reactive/whatsapp-inbound.agent.ts`

**What to do:**

```typescript
export class WhatsAppInboundAgent extends BaseAgent {
  slug = 'whatsapp-inbound'
  type = 'reactive'

  async execute(input: AgentExecutionInput): Promise<Result<AgentExecutionOutput>> {
    // 1. Validar contexto
    // 2. Carregar config do projeto
    // 3. Checar horário comercial + agent paused
    // 4. Chamar executePrompt() com contexto + mensagem
    // 5. Rodar skill baseado em resposta
    // 6. Retornar texto ou escalação
  }

  private async selectSkill(agentResponse: string): Promise<string>
  private async runSkill(skillSlug: string, context: AgentContext): Promise<string>
}
```

**Prompt base:**
```
Você é um agente de atendimento ao cliente em WhatsApp.

Contexto:
- Empresa: {businessName}
- Seu nome: {assistantName}
- Lead: {leadName}, localizado em {leadCity}, interesse: {leadInterest}
- Histórico recente: {conversationHistory}

Sua tarefa: responder a mensagem do cliente.

Você tem acesso a estas habilidades:
- send-welcome: enviar mensagem de boas-vindas
- collect-lead-qualification: fazer perguntas para qualificar lead
- explain-product-service: explicar produtos/serviços
- send-pricing: informar preços
- human-handoff: escalar para agente humano
- out-of-hours-reply: resposta padrão fora do horário

Decida:
1. Se conseguir responder com skill: indique qual
2. Se a pergunta é complexa ou sobre política: escalon para humano
3. Sempre responda em português brasileiro, amigável mas profissional

Responda no seguinte formato JSON:
{
  "action": "skill" | "escalate" | "wait",
  "skillSlug": "...",  // se action == skill
  "reasoning": "..."
}
```

**Verification:**
- Agent responde com JSON válido
- Skills são identadas corretamente

---

### T3: Implementar prompts para skills

**Files:**
- Create: `src/services/ai/agents/reactive/skills-prompts.ts`

**What to do:**

Definir prompt base para cada skill:

```typescript
const SKILLS_PROMPTS = {
  'send-welcome': {
    mode: 'deterministic',
    template: `Olá {leadName}! 👋 Bem-vindo à {businessName}. Como posso ajudar?`
  },
  'collect-lead-qualification': {
    mode: 'llm',
    prompt: `Você está qualificando um lead. Pergunte sobre:
      1. Qual é seu principal desafio?
      2. Quanto você gasta mensalmente nisso?
      3. Quando precisa resolver?

      Seja conversacional. Depois que tiver as 3 respostas, diga: QUALIFIED.`
  },
  'explain-product-service': {
    mode: 'llm',
    prompt: `Explique os produtos/serviços da {businessName} de forma simples:
      - Produto A: {productA_description}
      - Produto B: {productB_description}

      Lead interesse: {leadInterest}
      Foque em como cada produto resolve o problema dele.`
  },
  // ... restante
}
```

**Verification:**
- 6 prompts definidos
- Modo deterministic vs llm está correto

---

### T4: Criar serviço `executeAgent()`

**Files:**
- Create: `src/services/ai/agents/agent-executor.service.ts`

**What to do:**

```typescript
export async function executeAgent(input: AgentExecutionInput): Promise<Result<AgentExecutionOutput>> {
  // 1. Validar agente existe (via AiAgentRegistryService.getProjectConfig)
  // 2. Checar se agente está enabled
  // 3. Resgatar agent instance (factory pattern)
  // 4. Executar agent.execute()
  // 5. Registrar em AiEvent (type: AGENT_EXECUTION)
  // 6. Retornar resultado
  // 7. On error: log, alert, fallback
}

// Factory para instanciar agente por slug
function getAgent(slug: string): BaseAgent | null {
  const agents = {
    'whatsapp-inbound': new WhatsAppInboundAgent(),
    'whatsapp-cadence': new WhatsAppCadenceAgent(),
    'audience-intelligence': new AudienceIntelligenceAgent(),
    // ...
  }
  return agents[slug] || null
}
```

**Verification:**
- `executeAgent()` responde corretamente
- Erro é capturado e logado

---

### T5: Testes para whatsapp-inbound

**Files:**
- Create: `src/services/ai/agents/reactive/whatsapp-inbound.spec.ts`

**What to do:**

```typescript
describe('WhatsAppInboundAgent', () => {
  it('responde "pricing" quando perguntado sobre preço', async () => {
    // Mock executePrompt, skillRunner
    // Call agent.execute({ input: 'Quanto custa?' })
    // Expect skillUsed == 'send-pricing'
  })

  it('escalona quando pergunta é complexa', async () => {
    // Mock executePrompt com resposta: "escalate"
    // Expect skillUsed == 'human-handoff'
  })

  it('respeita horário comercial', async () => {
    // Mock: hora atual = 2am
    // Expect skillUsed == 'out-of-hours-reply'
  })

  it('falha quando agente está disabled', async () => {
    // Mock: AiAgentProjectConfig.enabled = false
    // Expect result.success == false
  })
})
```

**Verification:**
- 4+ testes passando
- Coverage > 80%

---

## FASE 2 - Agentes Proactive + Analytical

### T6: Implementar `whatsapp-cadence.agent.ts` (Proactive)

**Files:**
- Create: `src/services/ai/agents/proactive/whatsapp-cadence.agent.ts`

**What to do:**

Agente que:
- Não recebe mensagem do usuário
- Gera mensagens **proativas** baseado em cadence rules
- Respeita lead state, histórico, horário

```typescript
export class WhatsAppCadenceAgent extends BaseAgent {
  slug = 'whatsapp-cadence'
  type = 'proactive'

  async execute(input: AgentExecutionInput): Promise<Result<AgentExecutionOutput>> {
    // 1. Input é cadence slug + lead, não mensagem de usuário
    // 2. Fetch cadence rule + lead context
    // 3. Gerar mensagem via LLM
    // 4. Verificar se deve enviar (horário, preferências)
    // 5. Retornar mensagem ou skip
  }
}
```

**Verification:**
- Agent gera mensagem diferente para leads diferentes

---

### T7: Implementar agentes Analytical (3x)

**Files:**
- Create: `src/services/ai/agents/analytical/audience-intelligence.agent.ts`
- Create: `src/services/ai/agents/analytical/crm-intelligence.agent.ts`
- Create: `src/services/ai/agents/analytical/campaign-intelligence.agent.ts`

**What to do:**

```typescript
export class AudienceIntelligenceAgent extends BaseAgent {
  slug = 'audience-intelligence'
  type = 'analytical'

  async execute(input: AgentExecutionInput): Promise<Result<AgentExecutionOutput>> {
    // Input: projectId
    // Output: análise estruturada de audience
    // - Segmentos principais
    // - Score de engajamento
    // - Recomendações de abordagem
  }
}
```

**Verification:**
- 3 agentes implementados
- Cada um retorna dados estruturados (JSON, não texto livre)

---

### T8: Criar `agent-factory.service.ts`

**Files:**
- Create: `src/services/ai/agents/agent-factory.service.ts`

**What to do:**

Instanciar agentes dinamicamente baseado em slug:

```typescript
export class AgentFactory {
  static create(slug: string): BaseAgent | null {
    const agents: Record<string, () => BaseAgent> = {
      'whatsapp-inbound': () => new WhatsAppInboundAgent(),
      'whatsapp-cadence': () => new WhatsAppCadenceAgent(),
      'audience-intelligence': () => new AudienceIntelligenceAgent(),
      // ...
    }
    return agents[slug]?.() || null
  }
}
```

**Verification:**
- Factory cria agentes corretamente
- Retorna null para slug desconhecido

---

### T9: Integrar agentes no workflow do PRD-012

**Files:**
- Modify: `src/mastra/workflows/inbound-message.ts` (do PRD-012)

**What to do:**

No passo "Executar skill", chamar `executeAgent()` em vez de fazer lógica inline:

```typescript
// Antes (PRD-012 T12)
const skillOutput = await skillRunner.run(skillSlug, context)

// Depois (PRD-019 T9)
const agentOutput = await executeAgent({
  agentSlug: 'whatsapp-inbound',
  context: { projectId, leadId, conversationHistory },
  input: inboundMessage.text
})
```

**Verification:**
- Workflow chama agent factory
- Resultado é registrado em AiEvent

---

### T10: Criar seeds/configs para todos os 5 agentes

**Files:**
- Modify: `prisma/seeds/seed_ai_agents.ts` (do PRD-018)
- Modify: `src/services/ai/agents/agent-configs.ts` (novo)

**What to do:**

Definir defaultConfig para cada agente:

```typescript
const AGENT_CONFIGS: Record<string, AgentConfig> = {
  'whatsapp-inbound': {
    modelId: 'openai/gpt-4o-mini',
    temperature: 0.7,
    maxTokens: 500,
  },
  'whatsapp-cadence': {
    modelId: 'openai/gpt-4o-mini',
    temperature: 0.6,
    maxTokens: 300,
  },
  'audience-intelligence': {
    modelId: 'openai/gpt-4o',  // modelo mais poderoso
    temperature: 0.3,          // mais determinístico
    maxTokens: 2000,
  },
  // ...
}
```

**Verification:**
- Configs aplicadas aos agentes via seeds

---

## FASE 3 - Testes + Métricas + Validação

### T11: Criar dataset de test cases

**Files:**
- Create: `src/services/ai/agents/__fixtures__/test-cases.json`

**What to do:**

```json
{
  "whatsapp-inbound": [
    {
      "name": "Responde pricing quando perguntado",
      "input": "Quanto custa?",
      "expectedSkill": "send-pricing",
      "expectedMetrics": {
        "latency": { "max": 5000 },
        "tokensUsed": { "max": 500 }
      }
    },
    {
      "name": "Escalona quando pergunta é complexa",
      "input": "Como funciona a política de reembolso?",
      "expectedAction": "escalate"
    }
  ],
  "whatsapp-cadence": [
    // ...
  ]
}
```

**Verification:**
- Dataset tem 3+ cases por agente
- Casos cobrem sucesso + falha + edge cases

---

### T12: Criar test runner para validation

**Files:**
- Create: `src/services/ai/agents/agent-validator.service.ts`

**What to do:**

```typescript
export async function validateAgent(
  agentSlug: string,
  testCases: TestCase[]
): Promise<ValidationReport> {
  // 1. Para cada test case:
  //    a. Execute agent
  //    b. Compare resultado esperado vs real
  //    c. Registre métrica (latency, tokens, etc.)
  // 2. Agregue resultados
  // 3. Retorne relatório: passou? taxa de sucesso?
}
```

**Verification:**
- Validator roda todos os test cases
- Gera relatório em JSON

---

### T13: Implementar métricas e alertas

**Files:**
- Create: `src/services/ai/agents/agent-metrics.service.ts`
- Modify: `src/services/ai/ai-event.service.ts` (se necessário)

**What to do:**

Após cada execução de agente, registrar:

```typescript
await recordAgentMetrics({
  agentSlug: 'whatsapp-inbound',
  projectId: 'proj-1',
  success: true,
  latency: 1234,        // ms
  tokensUsed: 150,
  skillUsed: 'send-pricing',
  timestamp: new Date(),
})
```

Alertas:
- Se taxa de erro > 10% em 1h → alert
- Se latência média > 10s → alert
- Se custo diário > threshold → alert

**Verification:**
- Métricas são registradas
- Alertas funcionam

---

### T14: Validação final + documentação

**Files:**
- Create: `src/services/ai/agents/README.md`

**What to do:**

- `npm run lint` → 0 erros
- `npm run build` → sucesso
- `npm run test` → todos os testes passando
- Executar `validateAgent()` para todos os 5 agentes
- Documentar README com:
  - Como criar novo agente
  - Como testar um agente
  - Troubleshooting comum

**Verification:**
- Build + tests passam
- README é claro e completo
