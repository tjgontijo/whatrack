# Tasks: PRD-018 WhatsApp Campaign A/B Testing

**Data:** 2026-03-25
**Status:** Draft
**Total:** 10
**Estimado:** 2 a 3 sprints
**Depende de:** PRD-017 completo e mergeado

---

## Fase 1: Modelagem

### Task 1: Adicionar modelos e campos de A/B Testing ao schema

**Files:**
- Modify: `prisma/schema.prisma`
- Create: `prisma/migrations/<timestamp>_whatsapp_campaign_ab_testing/migration.sql`

**What to do:**
- Criar modelo `WhatsAppCampaignVariant`:
  ```
  id              String   @id @default(cuid())
  campaignId      String
  label           String   -- 'A' | 'B' | 'C' | 'D' | 'E'
  dispatchGroupId String   @unique
  splitPercent    Int
  createdAt       DateTime @default(now())

  campaign        WhatsAppCampaign        @relation(...)
  dispatchGroup   WhatsAppCampaignDispatchGroup @relation(...)
  ```
- Adicionar em `WhatsAppCampaign`:
  - `isAbTest       Boolean  @default(false)`
  - `abTestConfig   Json?`   — `{ windowHours, winnerCriteria, remainderPercent, winnerVariantId, winnerSelectedAt }`
- Adicionar em `WhatsAppCampaignDispatchGroup`:
  - `isRemainder    Boolean  @default(false)`
- Adicionar em `WhatsAppCampaignRecipient`:
  - `variantId      String?` — FK para `WhatsAppCampaignVariant`
- Adicionar ao enum `WhatsAppCampaignEventType` (criado no PRD-017):
  - `AB_WINNER_SELECTED`
  - `AB_REMAINDER_DISPATCHED`
  - `AB_INSUFFICIENT_DATA`

**Verification:**
- `prisma validate` passa sem erros.
- A migration cria `WhatsAppCampaignVariant` e os novos campos.
- O enum de eventos contem os 3 novos tipos.

**Depends on:** PRD-017 Task 1 (schema base)

---

## Fase 2: Backend

### Task 2: Criar schemas Zod para A/B Testing

**Files:**
- Create: `src/lib/whatsapp/schemas/whatsapp-ab-schemas.ts`
- Test: `src/lib/whatsapp/schemas/__tests__/whatsapp-ab-schemas.test.ts`

**What to do:**
- `AbTestVariantSchema`: `{ label, templateName, templateLang, splitPercent }`. Validar que label e unico por array.
- `AbTestConfigSchema`: `{ windowHours: enum(4, 8, 12, 24, 48), winnerCriteria: enum('RESPONSE_RATE', 'READ_RATE', 'MANUAL'), remainderPercent: number.min(0).max(50).optional() }`.
- `AbTestCreateSchema`: array de 2-5 variantes + config. Validar que `sum(splitPercent) + remainderPercent === 100`. Validar que nenhum template e duplicado entre variacoes.
- `AbTestSelectWinnerSchema`: `{ variantId: string }`.
- `AbTestMetricsQuerySchema`: query params de paginacao/periodo.

**Verification:**
- Testes cobrem: soma de percentuais invalida, menos de 2 variacoes, mais de 5 variacoes, templates duplicados.

**Depends on:** Task 1

---

### Task 3: Implementar servico de A/B Testing

**Files:**
- Create: `src/lib/whatsapp/services/whatsapp-campaign-ab.service.ts`
- Test: `src/lib/whatsapp/services/__tests__/whatsapp-campaign-ab.service.test.ts`

**What to do:**
- `createAbTestVariants(campaignId, input, organizationId)`: cria `WhatsAppCampaignVariant` + `dispatchGroup` por variante + grupo remainder se `remainderPercent > 0`. Retorna `Result<{ variants, remainderGroupId }>`.
- `splitAudienceForAbTest(campaignId)`: chamado pelo snapshot service (PRD-017 Task 11). Divide recipients por `splitPercent` de forma aleatoria deterministica (seed = `campaignId`). Atribui `variantId` a cada recipient. Recipients do remainder ficam em grupo separado sem recipients ate a promocao. Retorna `Result<{ splitSummary }>`.
- `selectWinner(campaignId, variantId, userId)`: valida criterio, atualiza `abTestConfig.winnerVariantId`, registra evento `AB_WINNER_SELECTED`, dispara remainder via `runCampaignDispatch`. Retorna `Result<void>`.
- `autoSelectWinner(campaignId)`: chamado pelo cron. Busca metricas das variacoes, aplica criterio de vitoria, verifica threshold minimo (100 recipients enviados por variante). Se insuficiente, registra `AB_INSUFFICIENT_DATA` e retorna sem promover. Caso contrario, chama `selectWinner`. Retorna `Result<{ selected: boolean, variantId?: string }>`.

**Logging points:**
```typescript
logger.info({ campaignId, variantCount, splitSummary }, '[AbTest] Audience split completed')
logger.info({ campaignId, variantId, criteria }, '[AbTest] Winner selected')
logger.warn({ campaignId }, '[AbTest] Insufficient data for auto-promotion')
logger.error({ err, campaignId }, '[AbTest] Winner selection failed')
```

**Verification:**
- Split distribui todos os recipients sem perda nem duplicata.
- Selecao de vencedor com criterio `RESPONSE_RATE` escolhe a variante com maior taxa.
- `autoSelectWinner` nao promove quando alguma variante tem < 100 enviados.
- Empate desempata por label (A > B > C).

**Depends on:** Task 2

---

### Task 4: Implementar servico de metricas por variante

**Files:**
- Create: `src/lib/whatsapp/services/whatsapp-campaign-ab-metrics.service.ts`
- Test: `src/lib/whatsapp/services/__tests__/whatsapp-campaign-ab-metrics.service.test.ts`

**What to do:**
- `getAbTestMetrics(campaignId, organizationId)`: retorna array por variante com `{ variantId, label, templateName, totalCount, sentCount, deliveredCount, readCount, respondedCount, failCount, responseRate, readRate }`.
- `getAbTestLeader(campaignId, criteria)`: retorna `variantId` da variante lider pelo criterio dado, ou `null` se empate tecnico ou dados insuficientes.
- Calcular `responseRate = respondedCount / sentCount`, `readRate = readCount / sentCount`.
- Metricas derivadas de `WhatsAppCampaignRecipient` agrupadas por `variantId`.

**Logging points:**
```typescript
logger.info({ campaignId, leader, criteria }, '[AbTest] Leader calculated')
```

**Verification:**
- Metricas somadas de todas as variacoes batem com total da campanha.
- `getAbTestLeader` retorna null quando variacoes tem 0 enviados.

**Depends on:** Task 3

---

### Task 5: Expor endpoints de A/B Testing e cron de winner dispatch

**Files:**
- Create: `src/app/api/v1/whatsapp/campaigns/[campaignId]/ab/route.ts`
- Create: `src/app/api/v1/whatsapp/campaigns/[campaignId]/ab/select-winner/route.ts`
- Create: `src/app/api/v1/cron/whatsapp/ab-winner-dispatch/route.ts`
- Modify: `src/app/api/v1/whatsapp/campaigns/[campaignId]/dispatch/route.ts`

**What to do:**
- `GET /campaigns/[campaignId]/ab`: retorna config A/B + metricas por variante + lider atual. Delegar para `getAbTestMetrics` + `getAbTestLeader`.
- `POST /campaigns/[campaignId]/ab/select-winner`: body `{ variantId }`, validar com `AbTestSelectWinnerSchema`, chamar `selectWinner`, registrar evento.
- `POST /cron/whatsapp/ab-winner-dispatch`:
  - Protegido por `authorizeCronRequest` + `jobTracker.acquireLock('whatsapp-ab-winner-dispatch')`.
  - Buscar campanhas A/B com `isAbTest = true`, `status IN ('PROCESSING', 'COMPLETED')`, `abTestConfig.winnerVariantId = null`, janela expirada (`startedAt + windowHours <= now`).
  - Chamar `autoSelectWinner` para cada campanha encontrada.
- `dispatch/route.ts`: ao criar campanha A/B, chamar `splitAudienceForAbTest` antes de iniciar a execucao.

**Zod validation:**
```typescript
const body = AbTestSelectWinnerSchema.parse(await request.json())
```

**Verification:**
- `GET /ab` retorna 404 para campanha que nao e A/B.
- `POST /select-winner` retorna erro se campanha ja tem vencedor.
- Cron usa lock e nao processa dois batches simultaneos.

**Depends on:** Task 4

---

## Fase 3: Integracao com Builder e UI

### Task 6: Adicionar etapa A/B no Campaign Builder v2

**Files:**
- Modify: `src/components/dashboard/whatsapp/campaigns/campaign-builder-page.tsx`
- Create: `src/components/dashboard/whatsapp/campaigns/campaign-builder-ab-step.tsx`
- Modify: `src/lib/whatsapp/schemas/whatsapp-ab-schemas.ts`

**What to do:**
- Adicionar toggle "Teste A/B" no step de Template do builder.
- Ao ativar, exibir o componente `campaign-builder-ab-step.tsx`:
  - Lista de variacoes (A, B, ...) com campo de template e percentual do split.
  - Botao "Adicionar variante" (bloqueado se `floor(audiencia / 100) <= variantCount`).
  - Campo "Percentual para vencedor" (remainder, opcional, 0-50%).
  - Campo "Janela de teste" (select: 4h, 8h, 12h, 24h, 48h).
  - Campo "Criterio de vitoria" (select: Taxa de resposta, Taxa de leitura, Manual).
  - Aviso dinamico: "Com X contatos, voce pode testar no maximo Y templates".
  - Barra de soma de percentuais com indicador verde/vermelho (deve somar 100%).
- `campaign-builder-ab-step.tsx` e `'use client'` (interativo).
- Ao submeter o builder, incluir config A/B no payload de criacao de campanha.

**Verification:**
- Nao e possivel adicionar variante se audiencia < 200 (minimo 2 x 100).
- A barra de soma fica vermelha se nao somar 100%.
- O mesmo template nao pode ser selecionado em duas variacoes.
- Desativar "Teste A/B" limpa as variacoes sem alterar o template principal.

**Depends on:** Task 5

---

### Task 7: Atualizar criacao de campanha para suportar A/B

**Files:**
- Modify: `src/app/api/v1/whatsapp/campaigns/route.ts`
- Modify: `src/lib/whatsapp/services/whatsapp-campaign.service.ts` (ou `src/services/whatsapp/whatsapp-campaign.service.ts`)

**What to do:**
- No `POST /campaigns`, se `isAbTest = true`, apos criar a campanha chamar `createAbTestVariants`.
- Validar payload com `AbTestCreateSchema` quando `isAbTest = true`.
- Retornar `{ campaignId, variants: [{ variantId, label }] }` na resposta.

**Verification:**
- Criar campanha A/B gera `WhatsAppCampaignVariant` + `dispatchGroups` corretos.
- Criar campanha normal (sem `isAbTest`) nao cria variantes.

**Depends on:** Task 6

---

### Task 8: Painel de metricas A/B na pagina de detalhe

**Files:**
- Modify: `src/app/(dashboard)/[organizationSlug]/[projectSlug]/whatsapp/campaigns/[campaignId]/page.tsx`
- Create: `src/components/dashboard/whatsapp/campaigns/campaign-ab-metrics.tsx`

**What to do:**
- Na pagina de detalhe, detectar `campaign.isAbTest === true`.
- Exibir `campaign-ab-metrics.tsx` no lugar (ou abaixo) do funil de engajamento normal.
- `campaign-ab-metrics.tsx` mostra por variante:
  - Label (A, B, C...) + nome do template.
  - Percentual da audiencia que recebeu.
  - Contadores: Enviados / Entregues / Lidos / Responderam.
  - Taxa de resposta e taxa de leitura em destaque.
  - Badge "Lider" na variante com melhor performance pelo criterio configurado.
  - Badge "Vencedor" na variante promovida (se ja selecionada).
- Exibir barra de progresso do teste: "Janela encerra em X horas" ou "Vencedor selecionado".
- Botao "Selecionar vencedor manualmente" (visivel se `winnerCriteria = 'MANUAL'` ou se janela ainda nao expirou).
- Durante `PROCESSING`: polling a cada 5s (mesmo padrao do `/stats` da campanha normal).
- Apos `COMPLETED`: Server Component estatico com dados finais.

**Verification:**
- Badge "Lider" atualiza em tempo real durante PROCESSING.
- Botao "Selecionar vencedor" chama `POST /ab/select-winner` e atualiza UI.
- Campanha normal nao exibe o painel A/B.

**Depends on:** Task 7

---

### Task 9: Atualizar listagem de campanhas com badge A/B

**Files:**
- Modify: `src/components/dashboard/whatsapp/campaigns/campaigns-page.tsx`

**What to do:**
- Na coluna "Campanha" da listagem, exibir badge "A/B" ao lado do nome se `isAbTest = true`.
- Adicionar coluna ou indicador de "Variacoes" com contagem (ex: "3 variantes").
- Exibir status do teste: "Em teste", "Vencedor: Template X", "Aguardando selecao manual".

**Verification:**
- Badge "A/B" aparece apenas em campanhas com `isAbTest = true`.
- Status do teste e coerente com o `abTestConfig.winnerVariantId`.

**Depends on:** Task 8

---

### Task 10: Testes de integracao e limpeza

**Files:**
- Test: `src/lib/whatsapp/services/__tests__/whatsapp-campaign-ab.service.test.ts` (expandir)
- Test: `src/lib/whatsapp/services/__tests__/whatsapp-campaign-ab-metrics.service.test.ts` (expandir)
- Test: `src/app/api/v1/cron/whatsapp/ab-winner-dispatch/__tests__/route.test.ts`

**What to do:**
- Testar fluxo completo: criar campanha A/B → split → execucao parcial → selecao de vencedor → dispatch remainder.
- Testar cron: janela expirada com dados suficientes → seleciona; dados insuficientes → nao seleciona.
- Testar empate: verifica desempate por label.
- Testar cancelamento com teste em andamento.

**Verification:**
- `npm test` passa sem regressoes.
- Cobertura das regras de negocio principais (split determinismo, threshold, empate).

**Depends on:** Task 9

---

## Ordem de Execucao

`1 -> 2 -> 3 -> 4 -> 5 -> 6 -> 7 -> 8 -> 9 -> 10`

Todas as tasks sao sequenciais. Tasks 3 e 4 podem ser desenvolvidas em paralelo (servicos independentes), ambas dependem de Task 2.

Ordem alternativa com paralelismo:

`1 -> 2 -> [3 || 4] -> 5 -> 6 -> 7 -> 8 -> 9 -> 10`

---

## Padroes de Implementacao (nextjs-feature-dev)

### 1. Result<T> Pattern

Todas as funcoes de servico retornam `Result<T>`:

```typescript
import { ok, fail } from '@/lib/shared/result'
import type { Result } from '@/lib/shared/result'

export async function createAbTestVariants(
  campaignId: string,
  input: AbTestCreateInput,
  organizationId: string
): Promise<Result<{ variants: Variant[]; remainderGroupId: string }>> {
  try {
    // Validar
    const config = AbTestConfigSchema.parse(input)

    // Processar
    const variants = await db.whatsAppCampaignVariant.createMany(...)
    const remainderGroup = await db.whatsAppCampaignDispatchGroup.create(...)

    // Log
    logger.info({ campaignId, variantCount: variants.length }, '[AbTest] Variants created')

    return ok({ variants, remainderGroupId: remainderGroup.id })
  } catch (err) {
    logger.error({ err, campaignId }, '[AbTest] Failed to create variants')
    return fail('Failed to create A/B test variants')
  }
}
```

### 2. Zod Validation

**Em schemas/**:
```typescript
// src/lib/whatsapp/schemas/whatsapp-ab-schemas.ts
export const AbTestCreateSchema = z.object({
  isAbTest: z.boolean(),
  variants: z.array(
    z.object({
      label: z.enum(['A', 'B', 'C', 'D', 'E']),
      templateName: z.string().min(1),
      splitPercent: z.number().min(0).max(100),
    })
  ).min(2).max(5),
  config: z.object({
    windowHours: z.enum([4, 8, 12, 24, 48]),
    winnerCriteria: z.enum(['RESPONSE_RATE', 'READ_RATE', 'MANUAL']),
    remainderPercent: z.number().min(0).max(50).optional(),
  }),
}).refine(
  (data) => {
    const variantsSum = data.variants.reduce((sum, v) => sum + v.splitPercent, 0)
    const remainder = data.config.remainderPercent ?? 0
    return variantsSum + remainder === 100
  },
  { message: 'Split percentages must sum to 100' }
)

export type AbTestCreateInput = z.infer<typeof AbTestCreateSchema>
```

**Em route handlers**:
```typescript
// src/app/api/v1/whatsapp/campaigns/[campaignId]/ab/select-winner/route.ts
export async function POST(request: Request, { params }: Props) {
  try {
    // Zod validation
    const body = AbTestSelectWinnerSchema.parse(await request.json())

    // Auth + authorization
    const session = await auth()
    if (!session) return json({ error: 'Unauthorized' }, { status: 401 })

    // Call service
    const result = await selectWinner(params.campaignId, body.variantId, session.user.id)

    if (!result.success) {
      return json({ error: result.error }, { status: 400 })
    }

    return json({ success: true })
  } catch (err) {
    logger.error({ err }, '[Route] select-winner failed')
    return json({ error: 'Internal server error' }, { status: 500 })
  }
}
```

### 3. Pino Structured Logging

**Em services:**
```typescript
import { logger } from '@/server/logger'

export async function splitAudienceForAbTest(campaignId: string) {
  const startTime = Date.now()

  try {
    const campaign = await db.whatsAppCampaign.findUnique({ where: { id: campaignId } })
    const recipients = await db.whatsAppCampaignRecipient.findMany(...)

    // Log com contexto
    logger.info(
      {
        campaignId,
        recipientCount: recipients.length,
        variantCount: campaign.variantCount,
        duration: Date.now() - startTime
      },
      '[AbTest] Audience split completed'
    )

    return ok({ splitSummary })
  } catch (err) {
    logger.error(
      {
        err,
        campaignId,
        duration: Date.now() - startTime
      },
      '[AbTest] Audience split failed'
    )
    return fail('Failed to split audience')
  }
}
```

### 4. Server Components vs Client

**Server Component (default)**:
```typescript
// campaign-ab-metrics.tsx
import { getAbTestMetrics } from '@/lib/whatsapp/queries/get-ab-metrics'

export async function CampaignAbMetrics({ campaignId }: Props) {
  'use cache'
  cacheTag(`ab-metrics-${campaignId}`)
  cacheLife('minutes')

  const metricsResult = await getAbTestMetrics(campaignId)
  if (!metricsResult.success) return <Error />

  return (
    <div>
      {metricsResult.data.map(metric => (
        <MetricCard key={metric.variantId} metric={metric} />
      ))}
    </div>
  )
}
```

**Client Component (only when needed)**:
```typescript
'use client'

import { useQuery } from '@tanstack/react-query'
import { CampaignAbMetrics } from './campaign-ab-metrics'

export function CampaignAbMetricsWithPolling({ campaignId }: Props) {
  // Only polling during PROCESSING
  const { data } = useQuery({
    queryKey: ['campaigns', campaignId, 'ab-metrics'],
    queryFn: () => fetch(`/api/v1/campaigns/${campaignId}/ab`).then(r => r.json()),
    refetchInterval: 5000,
    enabled: status === 'PROCESSING',
  })

  return <CampaignAbMetrics data={data} />
}
```

## Observacoes de Escopo

- O split e determinista: dado o mesmo `campaignId` e audiencia, o resultado e sempre o mesmo.
- Nenhuma variante pode ter menos de 100 recipients. O builder bloqueia antes do envio.
- O remainder so e criado no banco ao promover o vencedor (nao antes).
- O cron `ab-winner-dispatch` roda independente do `campaign-dispatch`. Nao conflitam.
- Nao implementar p-value, chi-square ou qualquer metrica de significancia estatistica nesta versao.
- A UI de metricas usa colunas lado a lado para 2-5 variacoes. Em telas menores, usar scroll horizontal.

---

## Commit Messages por Task

```bash
Task 1:  feat(whatsapp): add A/B testing schema and models
Task 2:  feat(whatsapp): add A/B testing zod schemas
Task 3:  feat(whatsapp): add campaign A/B service with split and winner logic
Task 4:  feat(whatsapp): add A/B metrics service with per-variant rates
Task 5:  feat(whatsapp): expose A/B routes and ab-winner-dispatch cron
Task 6:  feat(whatsapp): add A/B step to campaign builder
Task 7:  feat(whatsapp): integrate A/B creation into campaign POST route
Task 8:  feat(whatsapp): add A/B metrics panel to campaign detail page
Task 9:  feat(whatsapp): add A/B badge and status to campaign list
Task 10: test(whatsapp): add integration tests for A/B testing flow
```
