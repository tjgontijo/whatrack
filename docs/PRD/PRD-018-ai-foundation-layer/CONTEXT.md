# Contexto: AI Foundation Layer

**Ultima atualizacao:** 2026-03-23

---

## Definicao

Este PRD entrega a infraestrutura de dados e servicos que permite ao WhaTrack operar como produto AI First. A premissa central e que IA nao e uma feature isolada — e um plano de execucao que permeia todo o produto.

O WhaTrack opera em dois planos de IA:

1. **Plano Inbound (agente para o cliente):** responde mensagens, qualifica leads, executa follow-ups, detecta crises.
2. **Plano Intelligence (IA para o operador):** analisa audiencia, sugere acoes no CRM, otimiza campanhas.

Ambos os planos compartilham a mesma fundacao:

- **LeadAiContext**: quem e o cliente, o que a IA sabe sobre ele, qual o proximo passo sugerido.
- **AiEvent**: o que a IA fez, quando e por que — visivel ao operador no mesmo timeline de acoes humanas.
- **AiAgent**: qual agente esta ativo, com qual configuracao, para qual projeto.
- **AiCadence**: qual sequencia de touchpoints esta planejada, em qual estagio, com qual comportamento de janela.

---

## Quem Usa

- **Agentes de IA** consomem `LeadAiContext` para tomar decisoes e registram `AiEvent` para cada acao.
- **Operadores** veem a timeline de `AiEvent` no CRM, junto de mensagens e acoes humanas.
- **Administradores** configuram agentes e cadencias via AI Studio (PRD-013).
- **Sistema de campanhas** consulta `LeadAiContext` para segmentacao inteligente (PRD-019).

---

## Modelos de Dados

### LeadAiContext

Contexto universal do cliente, compartilhado por todos os agentes. Existe um por lead.

```prisma
model LeadAiContext {
  id        String   @id @default(dbgenerated("gen_random_uuid()")) @db.Uuid
  leadId    String   @unique @db.Uuid
  orgId     String   @db.Uuid

  // Profile resumido pela IA
  profileSummary    String?   @db.Text
  detectedLanguage  String?   @db.VarChar(10)
  sentimentTrend    String?   @db.VarChar(20)  // positive | neutral | negative | mixed

  // Memoria longa (persistida entre conversas)
  longMemory        Json?     @db.JsonB  // { facts: string[], preferences: string[], history_summary: string }

  // Lifecycle
  lifecycleStage    String    @default("unknown") @db.VarChar(30)
  // unknown | new_lead | engaged | qualified | negotiating | customer | churning | lost

  // Scoring
  aiScore           Int?      // 0-100, calculado pelo agente
  aiScoreReason     String?   @db.Text
  aiScoreUpdatedAt  DateTime?

  // Proxima acao sugerida
  suggestedNextAction   String?   @db.Text
  suggestedNextActionAt DateTime?

  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt

  lead         Lead         @relation(fields: [leadId], references: [id], onDelete: Cascade)
  organization Organization @relation(fields: [orgId], references: [id], onDelete: Cascade)

  @@index([orgId])
  @@index([lifecycleStage])
  @@index([aiScore])
  @@map("ai_lead_contexts")
}
```

**Regras:**
- Um `LeadAiContext` por lead. Criado sob demanda na primeira interacao com IA.
- `longMemory` e um JSON livre que o agente atualiza ao final de cada conversa.
- `lifecycleStage` e atualizado pelo agente com base em sinais do CRM e da conversa.
- `aiScore` e um valor de 0-100 que indica qualidade/potencial do lead. O agente atualiza quando ha evidencia suficiente.
- `suggestedNextAction` e texto livre que o agente sugere como proxima acao ideal (ex: "enviar proposta", "agendar reuniao", "follow-up em 3 dias").

### AiEvent

Timeline append-only de todas as acoes de IA. Visivel no CRM ao lado de acoes humanas.

```prisma
model AiEvent {
  id        String   @id @default(dbgenerated("gen_random_uuid()")) @db.Uuid
  orgId     String   @db.Uuid
  projectId String?  @db.Uuid
  leadId    String?  @db.Uuid
  ticketId  String?  @db.Uuid
  agentId   String?  @db.Uuid

  type      String   @db.VarChar(50)
  // MESSAGE_SENT | MESSAGE_DRAFTED | SKILL_EXECUTED | CONTEXT_UPDATED |
  // CADENCE_ENROLLED | CADENCE_STEP_EXECUTED | CADENCE_INTERRUPTED |
  // CADENCE_COMPLETED | CRISIS_DETECTED | LEAD_SCORED | LEAD_STAGED |
  // SUGGESTION_MADE | TRIAGE_COMPLETED | TEMPLATE_SENT |
  // CAMPAIGN_ANALYZED | AUDIENCE_ANALYZED | ERROR

  channel   String?  @db.VarChar(20)  // whatsapp | internal | campaign
  direction String?  @db.VarChar(10)  // inbound | outbound | system

  // Payload especifico do tipo
  metadata  Json?    @db.JsonB

  // Custos (inline para evitar join)
  modelId       String?  @db.VarChar(60)
  inputTokens   Int?
  outputTokens  Int?
  costUsd       Decimal? @db.Decimal(10, 6)

  // Resultado
  status    String   @default("success") @db.VarChar(20)  // success | error | skipped
  errorMsg  String?  @db.Text

  createdAt DateTime @default(now())

  organization Organization @relation(fields: [orgId], references: [id], onDelete: Cascade)
  project      Project?     @relation(fields: [projectId], references: [id], onDelete: SetNull)
  lead         Lead?        @relation(fields: [leadId], references: [id], onDelete: SetNull)
  ticket       Ticket?      @relation(fields: [ticketId], references: [id], onDelete: SetNull)
  agent        AiAgent?     @relation(fields: [agentId], references: [id], onDelete: SetNull)

  @@index([orgId, createdAt])
  @@index([leadId, createdAt])
  @@index([ticketId, createdAt])
  @@index([agentId, createdAt])
  @@index([type])
  @@index([projectId, createdAt])
  @@map("ai_events")
}
```

**Regras:**
- Append-only. Nunca atualizar ou deletar eventos.
- Cada acao de IA gera no minimo um evento.
- O campo `metadata` guarda dados especificos por tipo (ex: `skillId`, `templateName`, `cadenceStepId`, `messageWamid`).
- Custos sao registrados inline para facilitar aggregacao sem join com tabela de custos.
- `AiEvent` substitui `AiInsight` e `AiInsightCost` como fonte unica de verdade para acoes de IA.

### AiAgent

Registry de agentes disponiveis e configuracao por projeto.

```prisma
model AiAgent {
  id          String   @id @default(dbgenerated("gen_random_uuid()")) @db.Uuid
  slug        String   @unique @db.VarChar(60)
  name        String   @db.VarChar(120)
  description String?  @db.Text
  type        String   @db.VarChar(30)  // reactive | proactive | analytical
  channel     String   @db.VarChar(20)  // whatsapp | internal | multi
  isSystem    Boolean  @default(true)

  // Configuracao default do agente
  defaultConfig Json?  @db.JsonB

  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt

  projectConfigs AiAgentProjectConfig[]
  events         AiEvent[]

  @@map("ai_agents")
}

model AiAgentProjectConfig {
  id        String   @id @default(dbgenerated("gen_random_uuid()")) @db.Uuid
  agentId   String   @db.Uuid
  projectId String   @db.Uuid
  orgId     String   @db.Uuid

  enabled   Boolean  @default(false)
  paused    Boolean  @default(false)

  // Configuracao especifica do projeto (override do default)
  config    Json?    @db.JsonB
  // Exemplo para agente reativo WhatsApp:
  // {
  //   blueprintSlug: "whatsapp-commercial-agent",
  //   modelId: "openai/gpt-4o",
  //   businessHours: { timezone: "America/Sao_Paulo", hours: "08:00-18:00" },
  //   maxTokensPerResponse: 500,
  //   testingMode: false,
  //   testingPhones: []
  // }

  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt

  agent        AiAgent      @relation(fields: [agentId], references: [id], onDelete: Cascade)
  project      Project      @relation(fields: [projectId], references: [id], onDelete: Cascade)
  organization Organization @relation(fields: [orgId], references: [id], onDelete: Cascade)

  @@unique([agentId, projectId])
  @@index([projectId])
  @@index([orgId])
  @@map("ai_agent_project_configs")
}
```

**Regras:**
- Agentes sao registrados no sistema com `isSystem: true`. Agentes custom podem ser criados futuramente.
- Cada projeto pode ter configuracao especifica por agente via `AiAgentProjectConfig`.
- `enabled: false` = agente nao executa para o projeto. `paused: true` = agente existe mas foi pausado manualmente.
- A configuracao usa JSON flexivel para acomodar diferentes tipos de agente sem schema rigido.
- Agentes nao sao instancias Mastra. Sao registros de configuracao. O runtime Mastra usa esses dados para instanciar o agente correto.

### AiCadence (sistema de follow-up)

```prisma
model AiCadence {
  id        String   @id @default(dbgenerated("gen_random_uuid()")) @db.Uuid
  orgId     String   @db.Uuid
  projectId String   @db.Uuid
  agentId   String?  @db.Uuid
  name      String   @db.VarChar(120)
  slug      String   @db.VarChar(60)
  trigger   String   @db.VarChar(60)
  // Triggers: ticket_created | ticket_stage_changed | lead_scored |
  //           manual | campaign_sent | inactivity

  isActive  Boolean  @default(true)
  config    Json?    @db.JsonB
  // Exemplo: { targetLifecycleStages: ["new_lead", "engaged"], maxEnrollmentsPerLead: 1 }

  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt

  steps       AiCadenceStep[]
  enrollments AiCadenceEnrollment[]
  organization Organization @relation(fields: [orgId], references: [id], onDelete: Cascade)
  project      Project      @relation(fields: [projectId], references: [id], onDelete: Cascade)
  agent        AiAgent?     @relation(fields: [agentId], references: [id], onDelete: SetNull)

  @@unique([orgId, slug])
  @@index([projectId])
  @@index([isActive])
  @@map("ai_cadences")
}

model AiCadenceStep {
  id         String   @id @default(dbgenerated("gen_random_uuid()")) @db.Uuid
  cadenceId  String   @db.Uuid
  order      Int
  delayHours Int      // horas de espera apos o step anterior (ou apos enrollment no step 1)

  windowMode String  @db.VarChar(10)  // OPEN | CLOSED | ANY
  // OPEN = so executa se janela 24h estiver aberta (free-form via skill)
  // CLOSED = so executa fora da janela (template obrigatorio)
  // ANY = executa independente da janela (decide runtime)

  // Acao
  actionType String  @db.VarChar(30)  // send_skill | send_template | update_stage | score_lead | wait_reply
  actionConfig Json? @db.JsonB
  // send_skill: { skillSlug: "follow-up-day-1" }
  // send_template: { templateName: "follow_up_d3", templateLang: "pt_BR", variables: {...} }
  // update_stage: { targetStageId: "..." }
  // score_lead: { scoreAdjustment: -10 }
  // wait_reply: { timeoutHours: 24 }

  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt

  cadence AiCadence @relation(fields: [cadenceId], references: [id], onDelete: Cascade)

  @@unique([cadenceId, order])
  @@index([cadenceId])
  @@map("ai_cadence_steps")
}

model AiCadenceEnrollment {
  id         String    @id @default(dbgenerated("gen_random_uuid()")) @db.Uuid
  cadenceId  String    @db.Uuid
  leadId     String    @db.Uuid
  ticketId   String?   @db.Uuid

  status     String    @default("active") @db.VarChar(20)
  // active | paused | completed | interrupted | failed

  currentStep   Int       @default(0)
  nextStepAt    DateTime?
  completedAt   DateTime?
  interruptedAt DateTime?
  interruptReason String? @db.VarChar(60)
  // customer_replied | manual_pause | agent_takeover | cadence_deactivated | lead_converted

  metadata   Json?     @db.JsonB

  createdAt  DateTime  @default(now())
  updatedAt  DateTime  @updatedAt

  cadence AiCadence @relation(fields: [cadenceId], references: [id], onDelete: Cascade)
  lead    Lead      @relation(fields: [leadId], references: [id], onDelete: Cascade)
  ticket  Ticket?   @relation(fields: [ticketId], references: [id], onDelete: SetNull)

  @@unique([cadenceId, leadId])
  @@index([leadId])
  @@index([status])
  @@index([nextStepAt])
  @@map("ai_cadence_enrollments")
}
```

**Regras de cadencia:**
- Uma cadencia e uma sequencia de steps com delays e acoes.
- `windowMode` determina o comportamento em relacao a janela de 24h do WhatsApp:
  - `OPEN`: so executa se a janela estiver aberta (mensagem livre via skill do agente)
  - `CLOSED`: so executa fora da janela (usa template aprovado pela Meta)
  - `ANY`: decide no runtime — se janela aberta, usa skill; se fechada, usa template
- Um lead so pode ter uma enrollment ativa por cadencia (`@@unique([cadenceId, leadId])`).
- Se o cliente responde durante a cadencia, o enrollment e interrompido com `customer_replied` e o agente reativo assume.
- `nextStepAt` e usado pelo cron/Inngest para saber quando executar o proximo step.
- A execucao real dos steps nao faz parte deste PRD (vide PRD-022).

---

## Infraestrutura

### Mastra

Mastra e o framework TypeScript para agentes de IA. Usado como runtime para:

- Definir agentes com identidade, instrucoes e tools
- Gerenciar memoria de conversa via `@mastra/pg`
- Executar workflows com steps encadeados

**Setup:**

```typescript
// src/lib/mastra/index.ts
import { Mastra } from '@mastra/core'
import { PgMemory } from '@mastra/pg'

export const mastra = new Mastra({
  memory: new PgMemory({
    connectionString: process.env.DATABASE_URL,
  }),
})
```

**Regra:** Mastra e usado como runtime de execucao. Os modelos de dados do WhaTrack (Prisma) sao a fonte de verdade para configuracao e estado. Mastra nao substitui o Prisma.

### Inngest

Inngest e a engine de eventos assincronos. Usado para:

- Debounce de mensagens inbound (`debounce` nativo por `conversationId`)
- Execucao de steps de cadencia via cron
- Dispatch de campanhas
- Qualquer operacao que precise de retry, concurrency control ou scheduling

**Setup:**

```typescript
// src/lib/inngest/client.ts
import { Inngest } from 'inngest'

export const inngest = new Inngest({
  id: 'whatrack',
  schemas: new EventSchemas().fromRecord<Events>(),
})
```

### executePrompt

Camada de abstracao que isola o produto de mudancas de API do Mastra ou de qualquer outro framework de IA.

```typescript
// src/services/ai/execute-prompt.ts
interface ExecutePromptInput {
  agentSlug: string
  prompt: string
  context?: Record<string, unknown>
  modelId?: string
  maxTokens?: number
}

interface ExecutePromptResult {
  text: string
  modelId: string
  inputTokens: number
  outputTokens: number
  durationMs: number
}

export async function executePrompt(input: ExecutePromptInput): Promise<Result<ExecutePromptResult>>
```

**Regra:** Nenhum service do produto chama Mastra diretamente. Todos passam por `executePrompt`. Se o Mastra mudar a API, so um arquivo precisa ser atualizado.

---

## Migracao de AiInsight / AiInsightCost

`AiEvent` substitui `AiInsight` e `AiInsightCost` como modelo unificado. A migracao deve:

1. Criar os novos modelos via Prisma migrate.
2. Migrar dados existentes de `AiInsight` e `AiInsightCost` para `AiEvent` com tipo `LEGACY_INSIGHT`.
3. Atualizar os services que consultam `AiInsight` para consultar `AiEvent`.
4. Atualizar o dashboard `/dashboard/ai/usage` para ler de `AiEvent`.
5. Remover `AiInsight` e `AiInsightCost` do schema apos validacao.

**Regra:** Nao dropar as tabelas legadas na mesma migracao que cria `AiEvent`. Fazer em duas migracoes separadas com validacao entre elas.

---

## Semantica de LeadAiContext

### Criacao

- `LeadAiContext` e criado sob demanda quando um agente interage com o lead pela primeira vez.
- O service `LeadAiContextService.ensureContext(leadId)` cria o registro se nao existir.
- Nao criar contexto para todos os leads existentes via migracao. So sob demanda.

### Atualizacao

- O agente atualiza `longMemory` ao final de cada conversa (append de fatos relevantes).
- `lifecycleStage` e atualizado quando o agente detecta mudanca de estagio.
- `aiScore` e atualizado quando o agente tem evidencia suficiente para recalcular.
- `suggestedNextAction` e atualizado ao final de cada interacao.

### Leitura

- Todo agente que interage com um lead carrega `LeadAiContext` como parte do prompt.
- O CRM exibe dados de `LeadAiContext` no detalhe do lead (score, lifecycle, sugestao).
- Segmentos de campanha podem filtrar por `lifecycleStage` e `aiScore`.

---

## Semantica de AiEvent

### Principios

- Append-only. Nunca atualizar, nunca deletar.
- Todo evento tem `orgId` e `createdAt` para particionamento futuro.
- `leadId` e opcional porque existem eventos de sistema (ex: campanha analisada) que nao se referem a um lead especifico.
- `metadata` e JSON livre, documentado por tipo no codigo.

### Tipos de evento

| Tipo | Quando | metadata exemplo |
|------|--------|-----------------|
| `MESSAGE_SENT` | Agente enviou mensagem | `{ wamid, skillSlug, text_preview }` |
| `TEMPLATE_SENT` | Agente enviou template (fora da janela) | `{ templateName, templateLang, wamid }` |
| `SKILL_EXECUTED` | Skill foi executado | `{ skillSlug, skillVersion, mode }` |
| `CONTEXT_UPDATED` | LeadAiContext foi atualizado | `{ fields: ["lifecycleStage", "aiScore"] }` |
| `CADENCE_ENROLLED` | Lead inscrito em cadencia | `{ cadenceSlug, stepCount }` |
| `CADENCE_STEP_EXECUTED` | Step de cadencia executado | `{ cadenceSlug, stepOrder, actionType }` |
| `CADENCE_INTERRUPTED` | Cadencia interrompida | `{ cadenceSlug, reason }` |
| `CADENCE_COMPLETED` | Cadencia completada | `{ cadenceSlug }` |
| `CRISIS_DETECTED` | Crise detectada na conversa | `{ keyword, severity }` |
| `LEAD_SCORED` | Score do lead atualizado | `{ oldScore, newScore, reason }` |
| `LEAD_STAGED` | Lifecycle stage atualizado | `{ oldStage, newStage }` |
| `SUGGESTION_MADE` | Sugestao de acao feita | `{ suggestion }` |
| `TRIAGE_COMPLETED` | Classificacao de intencao | `{ intent, segment, risk }` |
| `ERROR` | Erro na execucao de IA | `{ errorType, errorMessage, context }` |
| `LEGACY_INSIGHT` | Migrado de AiInsight | `{ originalId, originalType }` |

---

## Estado Desejado

Ao final deste PRD:

- O schema Prisma contem `LeadAiContext`, `AiEvent`, `AiAgent`, `AiAgentProjectConfig`, `AiCadence`, `AiCadenceStep`, `AiCadenceEnrollment`.
- `AiInsight` e `AiInsightCost` foram migrados para `AiEvent` e removidos do schema.
- `LeadAiContextService` cria, le e atualiza contexto de leads.
- `AiEventService` registra e consulta eventos com filtros.
- `AiAgentRegistryService` registra e consulta agentes e configuracoes por projeto.
- `executePrompt` funciona como camada de abstracao sobre Mastra.
- Mastra esta configurado com `@mastra/pg` para memoria de conversa.
- Inngest esta configurado como client.
- Todos os services tem testes unitarios.
- O dashboard `/dashboard/ai/usage` continua funcionando, agora lendo de `AiEvent`.
