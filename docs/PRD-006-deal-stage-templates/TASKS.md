# Tasks: PRD-006 Deal Stage Templates (V2.0)

**Data:** 2026-05-18 | **Status:** Active | **Total Tasks:** 5 | **Estimado:** 4-5 dias

---

## 🔴 Fase 1: Schema + Seed (1 dia)

### T1: Schema com Status Groups + Meta Event Mapping (3h)

**O que fazer:**
1. Expandir `DealStageTemplateItem` com campos:
   - `statusGroup` (ACTIVE, WON, LOST, PAUSED)
   - `probability` (0-100)
   - `isFinal` (boolean)
   - `suggestedMetaEventName` (string nullable)
   - `suggestedMetaEventValue` (decimal nullable)

2. Criar novo modelo `DealStageMetaEventMapping`:
   - `dealStageId`, `projectId`
   - `metaEventName` (escolha do usuario)
   - `includeEmail`, `includePhone`, `includeFullName`, `includeAddress`, `includeExternalId` (booleans)
   - `customDataMapping` (JSON para campos customizados)
   - Constraint: unique(dealStageId, projectId)

3. Migration: `npx prisma migrate dev --name add_status_groups_meta_events`

**Aceitacao:** Schema implementado, migration executada, tabelas acessiveis.

---

### T2: Seed de 5 Indústrias com Status Groups (2h)

**O que fazer:** Criar `prisma/seeds/seed_deal_templates.ts` com:

```
1. Vendas Padrão
   - ACTIVE: Novo (20%), Qualificado (40%), Proposta (80%)
   - WON: Ganho (100%) → sugerido: Purchase
   - LOST: Perdido (0%)

2. Imobiliária
   - ACTIVE: Lead, Visita Agendada (40%), Proposta (70%)
   - WON: Vendido (100%) → sugerido: Purchase
   - LOST: Desistiu (0%)

3. SaaS B2B
   - ACTIVE: Triagem (20%), Demo (50%), Trial (70%), Proposta (90%)
   - WON: Ativo (100%) → sugerido: Purchase
   - LOST: Não Converteu (0%)

4. E-commerce
   - ACTIVE: Carrinho Abandonado (10%), Pagto Pendente (50%)
   - WON: Pago (100%) → sugerido: Purchase
   - LOST: Expirado (0%)

5. Estética/Saúde
   - ACTIVE: Interessado (20%), Avaliação (60%), Agendado (80%)
   - WON: Realizado (100%) → sugerido: Purchase
   - LOST: Cancelado (0%)
```

**Aceitacao:** `npx prisma db seed` popula templates com status groups e eventos sugeridos.

---

## 🟡 Fase 2: Modal "Edit Stages" + BullMQ Worker (2 dias)

### T3: Modal Editor + Polling (ClickUp/Notion Style) (12h)

**O que fazer:**

#### 3.1 Modal UI Component (6h)

**Arquivo:** `src/features/dashboard/components/pipeline/EditStagesModal.tsx`

Componente reutiliza Dialog/Modal do shadcn. 3 estados:
```
state = 'idle' | 'processing' | 'done' | 'error'

idle: mostra TemplateSelector + StatusGroupsEditor + Save button
processing: mostra ProgressBar + "Processando..." (tudo desabilitado)
done: mostra "✓ Pronto!" → fecha em 1.5s
error: mostra "❌ Erro" + botão retry
```

**Subcomponentes:**
- `TemplateSelector.tsx` - sidebar com lista de templates
- `StatusGroupsEditor.tsx` - 3-group layout (ACTIVE, DONE, CLOSED)
- `StatusRow.tsx` - row expandível de stage
- `StatusExpander.tsx` - checkboxes de user_data
- `ProgressOverlay.tsx` - barra de progresso + polling

**Fluxo UI:**
1. Click "Editar Stages" → abre modal (idle)
2. Click template → GET `/api/v1/templates/{id}` → carrega stages direita
3. Expande stage → mostra evento Meta dropdown + checkboxes
4. Click "Save" → POST `/api/v1/projects/{projectId}/stages`
   - Backend retorna `{ jobId }`
   - state muda para 'processing'
5. ProgressOverlay inicia polling a cada 500ms
   - GET `/api/jobs/{jobId}` → { progress, state }
   - atualiza ProgressBar
6. Quando state === 'completed' → state = 'done' → refetch Kanban → fecha

#### 3.2 API + BullMQ Integration (4h)

**Arquivo:** `src/server/queues/stages.queue.ts` (NOVO)

```ts
import { Queue } from 'bullmq'
import { getRedis } from '@/lib/db/redis'

export interface ApplyTemplateJobData {
  projectId: string
  templateId: string
  remappings: Record<string, string>
}

export const stagesQueue = new Queue<ApplyTemplateJobData>(
  'apply-template',
  { connection: getRedis() }
)
```

**Arquivo:** `src/app/api/v1/projects/[projectId]/stages/route.ts` (POST)

```ts
export async function POST(req: Request) {
  const { projectId, templateId, remappings } = await req.json()
  
  // Validar projeto
  const project = await prisma.project.findUnique({ where: { id: projectId } })
  if (!project) return error('Project not found', 404)
  
  // Contar deals (info para UI)
  const dealCount = await prisma.deal.count({
    where: { stage: { projectId } }
  })
  
  // Enfileira job
  const job = await stagesQueue.add('apply-template', {
    projectId,
    templateId,
    remappings
  })
  
  return success({
    jobId: job.id,
    estimatedSeconds: Math.ceil(dealCount / 1000) * 5
  })
}
```

**Arquivo:** `src/app/api/jobs/[jobId]/route.ts` (GET - polling)

```ts
export async function GET(req: Request, { params }: Props) {
  const job = await stagesQueue.getJob(params.jobId)
  if (!job) return error('Job not found', 404)
  
  const state = await job.getState() // 'active', 'completed', 'failed'
  const progress = job._progress || 0
  
  return success({
    jobId: job.id,
    state,
    progress,
    failedReason: job.failedReason
  })
}
```

#### 3.3 Worker (adicionar em src/worker.ts) (2h)

```ts
// src/worker.ts - ADICIONA ESTE BLOCO

import type { ApplyTemplateJobData } from '@/server/queues/stages.queue'
import { applyTemplateService } from '@/features/deal-stages/services/apply-template.service'

const applyTemplateWorker = new Worker<ApplyTemplateJobData>(
  'apply-template',
  async (job) => {
    const { projectId, templateId, remappings } = job.data
    logger.info({ projectId, jobId: job.id }, '[Worker] Applying template')
    
    await applyTemplateService.execute(projectId, templateId, remappings, (progress) => {
      job.progress(progress)
    })
    
    logger.info({ projectId, jobId: job.id }, '[Worker] Template applied')
  },
  {
    connection: getRedis(),
    concurrency: 2, // Leve, só 2 jobs paralelos
    attempts: 1 // Sem retry (atomicidade ou falha)
  }
)

applyTemplateWorker.on('failed', (job, err) => {
  logger.error({ jobId: job?.id, err }, '[ApplyTemplate Worker] Job failed')
})
```

#### 3.4 Service (Batch Logic)

**Arquivo:** `src/features/deal-stages/services/apply-template.service.ts` (NOVO)

```ts
export const applyTemplateService = {
  async execute(
    projectId: string,
    templateId: string,
    remappings: Record<string, string>,
    onProgress: (progress: number) => void
  ) {
    const batchSize = 500
    
    // 1. Fetch template + items
    const template = await prisma.dealStageTemplate.findUnique({
      where: { id: templateId },
      include: { items: true }
    })
    if (!template) throw new Error('Template not found')
    
    // 2. Count total deals
    const totalDeals = await prisma.deal.count({
      where: { stage: { projectId } }
    })
    
    onProgress(0)
    
    // 3. Batch loop: remap deals por stage antigo
    let processed = 0
    const oldStageIds = Object.keys(remappings)
    
    for (const oldStageId of oldStageIds) {
      let skip = 0
      
      while (true) {
        const deals = await prisma.deal.findMany({
          where: { stageId: oldStageId },
          take: batchSize,
          skip
        })
        
        if (deals.length === 0) break
        
        // Update batch em Promise.all
        await Promise.all(
          deals.map(d =>
            prisma.deal.update({
              where: { id: d.id },
              data: { stageId: remappings[oldStageId] }
            })
          )
        )
        
        processed += deals.length
        onProgress(Math.round((processed / totalDeals) * 90)) // 0-90%
        
        skip += batchSize
      }
    }
    
    onProgress(90) // Entrar phase transaction
    
    // 4. Atomic transaction: delete old + create new
    await prisma.$transaction(async (tx) => {
      // Delete old
      await tx.dealStage.deleteMany({ where: { projectId } })
      await tx.dealStageMetaEventMapping.deleteMany({ where: { projectId } })
      
      // Create new stages
      const newStages = await tx.dealStage.createMany({
        data: template.items.map((item, idx) => ({
          projectId,
          name: item.name,
          color: item.color,
          order: idx,
          statusGroup: item.statusGroup,
          probability: item.probability
        }))
      })
      
      // Fetch created para get IDs
      const createdStages = await tx.dealStage.findMany({
        where: { projectId }
      })
      
      // Create meta mappings
      const mappings = createdStages.map(stage => ({
        dealStageId: stage.id,
        projectId,
        metaEventName: template.items.find(i => i.name === stage.name)
          ?.suggestedMetaEventName || null,
        includeEmail: true,
        includePhone: true,
        includeFullName: true,
        includeAddress: false,
        includeExternalId: true
      }))
      
      await tx.dealStageMetaEventMapping.createMany({ data: mappings })
    })
    
    onProgress(100)
  }
}
```

**Aceitacao:**
- Modal mostra ProgressBar real (poll 500ms atualiza)
- Worker processa batches (500 deals/ciclo)
- 10k deals = ~10s total
- Transação final (90-100%) garante atomicidade
- Erro na transação = job falha, UI mostra retry

---

## 🟢 Fase 3: Refinamento (1 dia)

### T4: Criação de Custom Templates (4h)

**O que fazer:**
- Button "New template" na sidebar modal abre sub-form
- Usuario dá nome ao template customizado
- Salva stages atuais como novo template reutilizável
- Próximas vezes, template aparece em "TEMPLATES" lista

**Aceitacao:** Usuario consegue salvar sua própria configuração como template.

---

### T5: Onboarding - Modal automática no primeiro Setup (3h)

**O que fazer:**
- Se projeto NOVO (sem stages) e usuario entra em Kanban:
  - Detectar `project.dealStages.length === 0`
  - Mostrar modal "Editar Stages" automaticamente
  - Message: "Comece escolhendo um modelo de funil ou configure manualmente"

**Aceitacao:** Novo usuario ve modal automática, nao Kanban vazio.

---

## 📊 Dependências e Timeline

| Task | Tempo | Bloqueador | Inicio |
|------|-------|------------|--------|
| T1 | 3h | Nenhum | D1 08:00 |
| T2 | 2h | T1 | D1 11:00 |
| T3 | 12h | T2 | D2 08:00 |
| T4 | 4h | T3 | D3 12:00 |
| T5 | 3h | T4 | D3 16:00 |

**Total:** ~24 horas = ~4-5 dias (com revisao/testes).

---

## ⏳ O Que NÃO Entra (Futuro T6+)

- ❌ Envio real de evento Meta CAPI (implementado em T6 separado)
- ❌ Drag-drop de stages entre grupos (deixar static por agora)
- ❌ Validação de dados CAPI (EMQ score, hashing de PII)
- ❌ Sincronização de templates entre projetos (compartilhar templates)
