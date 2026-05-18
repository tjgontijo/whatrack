# Tasks: PRD-005 Motor Deterministico de Eventos

**Data:** 2026-05-18 | **Status:** Final | **Total Tasks:** 6 | **Estimado:** ~9h

---

## 🔴 Fase 1: Schema (1.5h)

### T1: Schema — MetaEventType + TicketStageMetaRule + MetaConversionEvent (1.5h)

**Localizacao:** `prisma/schema.prisma`

**O que fazer:**

1. Criar `MetaEventType`:

```prisma
model MetaEventType {
  id    String @id @default(dbgenerated("gen_random_uuid()")) @db.Uuid
  name  String @unique  // valor enviado para Meta API
  label String          // label na UI

  @@map("meta_event_types")
}
```

2. Criar `TicketStageMetaRule`:

```prisma
model TicketStageMetaRule {
  id        String    @id @default(dbgenerated("gen_random_uuid()")) @db.Uuid
  stageId   String    @db.Uuid
  pixelId   String    @db.Uuid
  eventName String    // padrao (ex: "Purchase") ou custom digitado pelo usuario
  fireOnce  Boolean   @default(true)

  stage TicketStage @relation(fields: [stageId], references: [id], onDelete: Cascade)
  pixel MetaPixel   @relation(fields: [pixelId], references: [id], onDelete: Cascade)

  @@unique([stageId, pixelId, eventName])
  @@map("crm_ticket_stage_meta_rules")
}
```

3. Adicionar em `TicketStage`:
```prisma
metaRules TicketStageMetaRule[]
```

4. Adicionar em `MetaPixel`:
```prisma
stageRules TicketStageMetaRule[]
```

5. Em `MetaConversionEvent`: adicionar `pixelId` e atualizar unique:
```prisma
pixelId  String  @db.Uuid
// remover: @@unique([ticketId, eventName])
// adicionar:
@@unique([ticketId, pixelId, eventName])
```

6. Rodar migration: `npx prisma migrate dev --name add_pipeline_events_engine`

7. Criar seed em `prisma/seed.ts` para `MetaEventType`:

```typescript
const standardEvents = [
  { name: 'Lead', label: 'Lead Captado' },
  { name: 'QualifiedLead', label: 'Lead Qualificado' },
  { name: 'Purchase', label: 'Venda Realizada' },
  { name: 'Schedule', label: 'Agendamento' },
  { name: 'Contact', label: 'Contato' },
  { name: 'CompleteRegistration', label: 'Cadastro Concluido' },
]

for (const event of standardEvents) {
  await prisma.metaEventType.upsert({
    where: { name: event.name },
    update: {},
    create: event,
  })
}
```

**Aceitacao:**
- [ ] Migration gerada sem erros.
- [ ] Tipos Prisma gerados.
- [ ] Seed popula `MetaEventType` sem erros.

---

## 🔴 Fase 2: Bug Critico (30min)

### T2: Corrigir updateTicketStageAction (30min)

**Problema:** Server Action do kanban bypassa hook CAPI — nenhum evento dispara ao mover cards hoje.

**Localizacao:** `src/features/tickets/actions/update-ticket-stage-action.ts`

**O que fazer:**

```typescript
// Remover:
await prisma.ticket.update({
  where: { id: params.ticketId },
  data: { stageId: params.stageId },
})

// Adicionar:
const result = await updateTicketAndTrackCapi({
  organizationId: params.organizationId,
  ticketId: params.ticketId,
  stageId: params.stageId,
})
if ('error' in result) {
  throw new Error(result.error)
}
```

**Aceitacao:**
- [ ] Mover card no kanban enfileira jobs CAPI.
- [ ] UI nao bloqueia (jobs sao async).

---

## 🟡 Fase 3: Motor de Disparo (3h)

### T3: Criar meta-capi.queue + Worker (1h)

**Localizacao:** `src/server/queues/meta-capi.queue.ts` + `src/worker.ts`

**O que fazer:**

1. Criar `src/server/queues/meta-capi.queue.ts` (padrao igual ao `campaign.queue.ts`):

```typescript
import { Queue } from 'bullmq'
import { getRedis } from '@/lib/db/redis'

export interface MetaCapiJobData {
  ticketId: string
  pixelId: string
  eventName: string
  fireOnce: boolean
  dealValue?: number
}

const QUEUE_NAME = 'meta-capi'

let queue: Queue<MetaCapiJobData> | null = null

export function getMetaCapiQueue(): Queue<MetaCapiJobData> {
  if (!queue) {
    queue = new Queue(QUEUE_NAME, {
      connection: getRedis(),
      defaultJobOptions: {
        attempts: 3,
        backoff: { type: 'exponential', delay: 5000 },
        removeOnComplete: 100,
        removeOnFail: 200,
      },
    })
  }
  return queue
}

export function enqueueMetaCapiEvent(data: MetaCapiJobData) {
  return getMetaCapiQueue().add('send-event', data, {
    jobId: `capi-${data.ticketId}-${data.pixelId}-${data.eventName}`,
  })
}
```

2. Adicionar worker em `src/worker.ts`:

```typescript
import { metaCapiService } from './features/meta-ads/services/capi.service'
import type { MetaCapiJobData } from './server/queues/meta-capi.queue'

const metaCapiWorker = new Worker<MetaCapiJobData>(
  'meta-capi',
  async (job) => {
    const { ticketId, pixelId, eventName, fireOnce, dealValue } = job.data
    logger.info({ ticketId, pixelId, eventName, jobId: job.id }, '[CAPI Worker] Processing')
    await metaCapiService.sendEvent(ticketId, eventName, pixelId, {
      eventId: `${eventName.toLowerCase()}-${ticketId}-${pixelId}`,
      value: dealValue,
      fireOnce,
    })
    logger.info({ ticketId, jobId: job.id }, '[CAPI Worker] Done')
  },
  { connection: getRedis(), concurrency: 10 }
)

metaCapiWorker.on('failed', (job, err) => {
  logger.error({ jobId: job?.id, err }, '[CAPI Worker] Job failed')
})
```

**Aceitacao:**
- [ ] Worker inicia sem erros junto com o processo.
- [ ] Job com mesmo `jobId` ignorado pelo BullMQ.

---

### T4: Substituir Heuristica por Enfileiramento por Regra (1.5h)

**Localizacao:** `src/features/tickets/services/ticket.service.ts`

**O que fazer:**

1. Remover `getCapiEventForStage` inteiro.
2. Incluir `metaRules` no select do stage dentro de `updateTicket`:

```typescript
stage: {
  select: {
    id: true,
    name: true,
    color: true,
    metaRules: { select: { pixelId: true, eventName: true, fireOnce: true } },
  },
},
```

3. Reescrever `triggerStageCapiEvent` para enfileirar por regra:

```typescript
async function triggerStageCapiEvents(input: {
  ticketId: string
  stageId?: string
  previousStageId: string
  dealValue: number | null
  metaRules: Array<{ pixelId: string; eventName: string; fireOnce: boolean }>
}) {
  if (!input.stageId || input.stageId === input.previousStageId) return
  if (!input.metaRules.length) return

  for (const rule of input.metaRules) {
    await enqueueMetaCapiEvent({
      ticketId: input.ticketId,
      pixelId: rule.pixelId,
      eventName: rule.eventName,
      fireOnce: rule.fireOnce,
      dealValue: input.dealValue ?? undefined,
    })
  }
}
```

4. Passar `metaRules` para `triggerStageCapiEvents` em `updateTicketAndTrackCapi`.

**Aceitacao:**
- [ ] Stage sem regras: nao enfileira nada.
- [ ] Stage com 2 regras: 2 jobs independentes.

---

### T5: Atualizar capi.service para receber pixelId + fireOnce (30min)

**Localizacao:** `src/features/meta-ads/services/capi.service.ts`

**O que fazer:**

1. Atualizar assinatura de `sendEvent`:

```typescript
async sendEvent(
  ticketId: string,
  eventName: string,
  pixelId: string,
  options: { eventId: string; value?: number; currency?: string; fireOnce?: boolean }
)
```

2. Checar `fireOnce` antes de enviar:

```typescript
if (options.fireOnce) {
  const existing = await prisma.metaConversionEvent.findFirst({
    where: { ticketId, pixelId, eventName, status: 'SENT' },
  })
  if (existing) {
    logger.info(`[CAPI] SKIPPED_DUPLICATE ticket=${ticketId} pixel=${pixelId} event=${eventName}`)
    return
  }
}
```

3. Buscar pixel especifico (nao todos ativos):

```typescript
const pixel = await prisma.metaPixel.findFirst({
  where: { id: pixelId, organizationId: ticket.organizationId, isActive: true },
  select: { pixelId: true, capiToken: true },
})
```

4. Incluir `pixelId` no `create` e `update` do `metaConversionEvent`.

5. Verificar call sites do `sendEvent` — assinatura muda, TypeScript vai apontar onde quebra.

**Aceitacao:**
- [ ] Envio duplicado bloqueado quando `fireOnce=true`.
- [ ] Pixel inativo ou inexistente: skip com log.
- [ ] `pixelId` salvo em `MetaConversionEvent`.

---

## 🟢 Fase 4: UI (4h)

### T6: Interface de Configuracao de Regras por Fase (4h)

**Localizacao:** Componente de edicao de `TicketStage`.

**O que fazer:**

1. Buscar `stage.metaRules` com pixel name na query da fase.
2. Listar regras existentes com botao de remover.
3. Botao "Adicionar regra":
   - Select de pixels do projeto (`MetaPixel` por `projectId`).
   - Select/combobox de evento: lista `MetaEventType` (padrao) + opcao "Personalizado" com input livre.
   - Toggle `fireOnce`.
4. Server Actions de CRUD para `TicketStageMetaRule`.
5. Aviso na UI ao deletar pixel que tem regras ativas.

**Aceitacao:**
- [ ] Adicionar/remover regras funciona.
- [ ] Select de pixels mostra apenas pixels do projeto.
- [ ] Evento personalizado aceita nome livre.
- [ ] Deletar pixel com regras: exibe aviso com lista de fases impactadas.

---

## Resumo

| Task | Tempo | Bloqueador |
|------|-------|------------|
| T1 | 1.5h | Nenhum |
| T2 | 30min | Espera T1 |
| T3 | 1h | Nenhum |
| T4 | 1.5h | Espera T1 + T3 |
| T5 | 30min | Espera T1 |
| T6 | 4h | Espera T1 |

**Total: ~9h**
