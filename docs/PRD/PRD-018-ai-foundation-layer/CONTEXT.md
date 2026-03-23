# Contexto: AI Foundation Layer

**Ultima atualizacao:** 2026-03-23

---

## Definicao

Este PRD entrega a base de dados, contratos e runtime que permite ao WhaTrack operar features de IA de forma consistente. A base precisa servir tanto para o plano inbound quanto para os fluxos analiticos, sem duplicar modelos ou criar trilhas paralelas de auditoria.

A regra central aqui e simples: a fundacao de IA e sempre `organization-scoped`, mas precisa ser tambem `project-aware`. Em outras palavras, os dados continuam pertencendo a uma organizacao, porem toda leitura operacional, agregacao, timeline ou configuracao que fizer sentido por projeto deve carregar `projectId` de forma explicita.

---

## Quem Usa

- Agentes de IA para carregar contexto, executar prompts e registrar eventos
- Operadores para visualizar historico e estado da IA por ticket, lead e projeto
- Administradores para configurar agentes e cadencias por projeto
- Fluxos futuros de campanhas e inteligencia para segmentar por `projectId`, `lifecycleStage` e `aiScore`

---

## Fluxo Atual

Hoje, apos o PRD-011:

- O schema nao possui `LeadAiContext`, `AiEvent`, `AiAgent`, `AiCadence` nem seus relacionamentos
- O legado `AiInsight` / `AiInsightCost` ja foi removido; este PRD nao precisa migrar dados antigos
- O dominio principal do produto ja e organizado por `organizationId` e `projectId` em `Lead`, `Ticket` e `Project`
- `@mastra/core` ja existe em `package.json`, mas o runtime com `@mastra/pg` ainda nao foi configurado
- Nao existe client Inngest, nem rota `/api/inngest`
- Nao existe helper compartilhado `Result<T>` para os novos servicos de IA

Sem esta camada, cada PRD subsequente corre o risco de reintroduzir contratos diferentes para contexto, eventos, scoping por projeto e execucao assicrona.

---

## Regras de Negocio Relevantes

- Existe no maximo um `LeadAiContext` por lead
- `LeadAiContext` e criado sob demanda, nunca por backfill em massa
- `LeadAiContext.projectId` espelha `Lead.projectId`; quando o projeto do lead mudar, o contexto deve ser sincronizado
- `AiEvent` e append-only; nao pode existir update ou delete funcional
- Toda operacao consultavel em UI ou automacao deve aceitar filtro por `organizationId` e, quando aplicavel, por `projectId`
- `AiAgent` e um registry de sistema; a configuracao ligada ao projeto fica em `AiAgentProjectConfig`
- `AiCadenceEnrollment` permite re-enrollment historico; a regra "apenas uma enrollment ativa por lead/cadencia" fica no service layer, nao em `@@unique`
- Nenhum servico de negocio pode chamar Mastra diretamente; toda execucao passa por `executePrompt`

---

## Dados e Integracoes

### Modelos Prisma

#### `LeadAiContext`

Contexto persistido do lead para uso em prompts e segmentacoes.

Campos principais:

- `id: String @db.Uuid`
- `organizationId: String @db.Uuid`
- `projectId: String? @db.Uuid`
- `leadId: String @unique @db.Uuid`
- `profileSummary: String?`
- `detectedLanguage: String?`
- `sentimentTrend: String?`
- `longMemory: Json?`
- `lifecycleStage: String @default("unknown")`
- `aiScore: Int?`
- `aiScoreReason: String?`
- `aiScoreUpdatedAt: DateTime?`
- `suggestedNextAction: String?`
- `suggestedNextActionAt: DateTime?`
- `createdAt`, `updatedAt`

Relacoes:

- `organization -> Organization`
- `project -> Project?`
- `lead -> Lead`

Indices obrigatorios:

- `@@unique([leadId])`
- `@@index([organizationId, projectId])`
- `@@index([projectId, lifecycleStage])`
- `@@index([projectId, aiScore])`

Regras:

- `projectId` nao e fonte primaria de verdade; ele espelha o `Lead.projectId` para leitura eficiente
- `longMemory` segue o shape `{ facts, preferences, history_summary }`
- `history_summary` e substituido, nao appendado

#### `AiEvent`

Timeline unificada de acoes de IA.

Campos principais:

- `id: String @db.Uuid`
- `organizationId: String @db.Uuid`
- `projectId: String? @db.Uuid`
- `leadId: String? @db.Uuid`
- `ticketId: String? @db.Uuid`
- `agentId: String? @db.Uuid`
- `type: String`
- `channel: String?`
- `direction: String?`
- `metadata: Json?`
- `modelId: String?`
- `inputTokens: Int?`
- `outputTokens: Int?`
- `costUsd: Decimal?`
- `status: String @default("success")`
- `errorMsg: String?`
- `createdAt: DateTime @default(now())`

Relacoes:

- `organization -> Organization`
- `project -> Project?`
- `lead -> Lead?`
- `ticket -> Ticket?`
- `agent -> AiAgent?`

Indices obrigatorios:

- `@@index([organizationId, createdAt])`
- `@@index([projectId, createdAt])`
- `@@index([leadId, createdAt])`
- `@@index([ticketId, createdAt])`
- `@@index([organizationId, projectId, type])`

Regras:

- `projectId` deve ser preenchido sempre que o evento pertencer a um projeto
- se o input do servico vier apenas com `leadId` ou `ticketId`, o service tenta derivar `projectId`
- custos ficam inline no evento para agregacao simples

Tipos base de evento:

| Tipo | Quando | metadata exemplo |
|------|--------|-----------------|
| `MESSAGE_SENT` | agente enviou mensagem | `{ wamid, skillSlug, textPreview }` |
| `TEMPLATE_SENT` | agente enviou template | `{ templateName, templateLang, wamid }` |
| `SKILL_EXECUTED` | skill executada | `{ skillSlug, skillVersion, mode }` |
| `CONTEXT_UPDATED` | contexto alterado | `{ fields: ["lifecycleStage", "aiScore"] }` |
| `CADENCE_ENROLLED` | lead entrou em cadencia | `{ cadenceSlug, stepCount }` |
| `CADENCE_STEP_EXECUTED` | step executado | `{ cadenceSlug, stepOrder, actionType }` |
| `CADENCE_INTERRUPTED` | cadencia interrompida | `{ cadenceSlug, reason }` |
| `CADENCE_COMPLETED` | cadencia concluida | `{ cadenceSlug }` |
| `CRISIS_DETECTED` | crise detectada | `{ keyword, severity }` |
| `LEAD_SCORED` | score alterado | `{ oldScore, newScore, reason }` |
| `LEAD_STAGED` | stage alterado | `{ oldStage, newStage }` |
| `SUGGESTION_MADE` | sugestao emitida | `{ suggestion }` |
| `TRIAGE_COMPLETED` | triagem concluida | `{ intent, segment, risk }` |
| `ERROR` | erro de execucao | `{ errorType, errorMessage, context }` |

#### `AiAgent`

Registry global dos agentes disponiveis.

Campos principais:

- `id`, `slug`, `name`, `description`
- `type` (`reactive | proactive | analytical`)
- `channel` (`whatsapp | internal | multi`)
- `isSystem`
- `defaultConfig`
- `createdAt`, `updatedAt`

Regras:

- nao carrega `projectId`
- funciona como catalogo de agentes do sistema

#### `AiAgentProjectConfig`

Override por projeto para um agente do registry.

Campos principais:

- `id`
- `organizationId`
- `projectId`
- `agentId`
- `enabled`
- `paused`
- `config`
- `createdAt`, `updatedAt`

Indices obrigatorios:

- `@@unique([agentId, projectId])`
- `@@index([organizationId, projectId])`

Regras:

- `enabled = false` bloqueia execucao
- `paused = true` pausa um agente previamente habilitado

#### `AiCadence`

Definicao de uma sequencia de follow-up por projeto.

Campos principais:

- `id`
- `organizationId`
- `projectId`
- `agentId?`
- `name`
- `slug`
- `trigger`
- `isActive`
- `config`
- `createdAt`, `updatedAt`

Indices obrigatorios:

- `@@unique([organizationId, projectId, slug])`
- `@@index([projectId, isActive])`

#### `AiCadenceStep`

Step declarativo dentro da cadencia.

Campos principais:

- `id`
- `cadenceId`
- `order`
- `delayHours`
- `windowMode`
- `actionType`
- `actionConfig`
- `createdAt`, `updatedAt`

Indices obrigatorios:

- `@@unique([cadenceId, order])`
- `@@index([cadenceId])`

#### `AiCadenceEnrollment`

Estado operacional de um lead inscrito numa cadencia.

Campos principais:

- `id`
- `organizationId`
- `projectId`
- `cadenceId`
- `leadId`
- `ticketId?`
- `status`
- `currentStep`
- `nextStepAt`
- `completedAt`
- `interruptedAt`
- `interruptReason`
- `metadata`
- `createdAt`, `updatedAt`

Indices obrigatorios:

- `@@index([organizationId, projectId, status, nextStepAt])`
- `@@index([cadenceId, leadId])`
- `@@index([leadId, status])`

Regras:

- nao usar `@@unique([cadenceId, leadId])`
- uma mesma dupla lead/cadencia pode reaparecer em enrollments historicos
- a unicidade de enrollment ativa fica no service layer

### Servicos e Queries

Servicos previstos:

- `LeadAiContextService`
- `AiEventService`
- `AiAgentRegistryService`
- `executePrompt`

Queries previstas:

- timeline por lead
- timeline por ticket
- listagem e agregacao por `organizationId` + `projectId`
- uso/custos por periodo e projeto

Regra:

- metodos operacionais nao devem ser apenas `org-only`; quando o caso de uso for project-level, o contrato deve carregar `projectId`

### Infraestrutura

#### Mastra

Path alvo:

- `src/server/mastra/index.ts`
- `src/server/mastra/agents/index.ts`

Contrato minimo:

```ts
import { Mastra } from '@mastra/core'
import { PgMemory } from '@mastra/pg'
import { env } from '@/lib/env/env'

export const mastra = new Mastra({
  memory: new PgMemory({
    connectionString: env.DATABASE_URL,
  }),
})
```

Regras:

- Mastra e runtime; Prisma continua sendo a fonte de verdade de configuracao e estado
- agentes base aqui sao placeholders; comportamentos de negocio entram nos PRDs seguintes

#### Inngest

Paths alvo:

- `src/server/inngest/client.ts`
- `src/server/inngest/events.ts`
- `src/app/api/inngest/route.ts`

Contrato minimo:

```ts
import { EventSchemas, Inngest } from 'inngest'
import { type Events } from './events'

export const inngest = new Inngest({
  id: 'whatrack',
  schemas: new EventSchemas().fromRecord<Events>(),
})
```

Regras:

- este PRD cria o client e a rota
- functions concretas entram nos PRDs que precisam delas

#### `executePrompt`

Path alvo:

- `src/lib/ai/services/execute-prompt.ts`

Contrato minimo:

```ts
interface ExecutePromptInput {
  organizationId: string
  projectId?: string | null
  agentSlug: string
  prompt: string
  context?: Record<string, unknown>
  modelId?: string
  maxTokens?: number
  threadId?: string
}

interface ExecutePromptResult {
  text: string
  modelId: string
  inputTokens: number
  outputTokens: number
  durationMs: number
}
```

Regras:

- retorna `Result<T>`
- registra logs com `organizationId`, `projectId` e `agentSlug`
- nenhum servico pode chamar Mastra fora daqui

### Ambiente, validacao e logging

- `src/lib/env/env.ts` continua sendo a fonte unica para env vars
- `src/lib/utils/logger.ts` continua sendo o logger estruturado reutilizado pelos novos servicos
- novos inputs de servico e eventos devem ser validados com Zod em `src/lib/ai/schemas/*`

---

## Estado Desejado

Ao final deste PRD:

- o schema Prisma contem a fundacao de IA com filtros consistentes por `organizationId` e `projectId`
- nao existe nenhuma task de migracao legada pendente neste PRD
- `LeadAiContextService` consegue criar, sincronizar e consultar contexto project-aware
- `AiEventService` registra eventos append-only e agrega dados por organizacao e projeto
- `AiAgentRegistryService` controla configuracoes de agente por projeto
- `executePrompt` funciona como unica porta de entrada para execucao de prompt
- Mastra e Inngest estao configurados no backend
- testes unitarios usam Vitest
- os PRDs subsequentes podem consumir esta fundacao sem redefinir modelos ou contratos
