# Quick Start: PRD-018 WhatsApp Campaign A/B Testing

**Data:** 2026-03-25
**Status:** Draft
**Pre-requisito:** PRD-017 completo e mergeado em `main`

---

## Objetivo

Entregar testes A/B nativos para campanhas WhatsApp com:

- Ate 5 variacoes de template por campanha
- Split configuravel de audiencia (minimo 100 recipients por variante)
- Janela de teste de 4h a 48h
- Auto-promocao do vencedor por criterio definido
- Painel de metricas por variante em tempo real

---

## Configuracao da Branch

### Step 1 — Criar feature branch a partir de main com PRD-017 mergeado

```bash
git checkout main && git pull origin main
# Garantir que PRD-017 esta mergeado antes de prosseguir
git checkout -b feature/2026-03-25-whatsapp-ab-testing
```

### Step 2 — Primeiro commit e o PRD

```bash
git add docs/PRD/PRD-018-whatsapp-ab-testing/
git commit -m "docs: add PRD for WhatsApp campaign A/B testing"
```

### Step 3 — Cada task = um commit atomico

```bash
Task 1:  git commit -m "feat(whatsapp): add A/B testing schema and models"
Task 2:  git commit -m "feat(whatsapp): add A/B testing zod schemas"
Task 3:  git commit -m "feat(whatsapp): add campaign A/B service with split and winner logic"
Task 4:  git commit -m "feat(whatsapp): add A/B metrics service with per-variant rates"
Task 5:  git commit -m "feat(whatsapp): expose A/B routes and ab-winner-dispatch cron"
Task 6:  git commit -m "feat(whatsapp): add A/B step to campaign builder"
Task 7:  git commit -m "feat(whatsapp): integrate A/B creation into campaign POST route"
Task 8:  git commit -m "feat(whatsapp): add A/B metrics panel to campaign detail page"
Task 9:  git commit -m "feat(whatsapp): add A/B badge and status to campaign list"
Task 10: git commit -m "test(whatsapp): add integration tests for A/B testing flow"
```

---

## Ordem Recomendada de Leitura

1. `docs/PRD/PRD-017-whatsapp-campaign-audience-builder/` (pre-requisito)
2. `docs/PRD/PRD-018-whatsapp-ab-testing/README.md`
3. `docs/PRD/PRD-018-whatsapp-ab-testing/CONTEXT.md`
4. `docs/PRD/PRD-018-whatsapp-ab-testing/DIAGNOSTIC.md`
5. `docs/PRD/PRD-018-whatsapp-ab-testing/TASKS.md`

---

## Ordem de Execucao

1. Schema + migration (Task 1)
2. Schemas Zod (Task 2)
3. Services de A/B e metricas (Tasks 3 e 4 — paralelizaveis)
4. Routes e cron (Task 5)
5. Builder UI (Tasks 6 e 7)
6. Detalhe + listagem (Tasks 8 e 9)
7. Testes e limpeza (Task 10)

---

## Regras de Implementacao

### 1. Minimo de 100 recipients por variante

Validar no backend (schema Zod + service) E no frontend (builder bloqueia adicao).

A formula para numero maximo de variacoes:
```
audienciaDisponivel = totalEligible * (1 - remainderPercent / 100)
maxVariants = min(floor(audienciaDisponivel / 100), 5)
```

### 2. Split e determinista

O algoritmo de split deve produzir o mesmo resultado dado o mesmo input. Usar seed baseado em `campaignId` para ordenacao aleatoria dos recipients antes da divisao.

```typescript
// Exemplo simples de split determinista
const sorted = recipients.sort((a, b) =>
  hashString(campaignId + a.normalizedPhone).localeCompare(
    hashString(campaignId + b.normalizedPhone)
  )
)
```

### 3. Remainder so existe apos o vencedor

Nao criar `WhatsAppCampaignRecipient` para o remainder antes da promocao do vencedor. O grupo remainder existe no `dispatchGroup` mas sem recipients. Ao promover, criar os recipients e disparar.

### 4. Cron e idempotente

O cron `ab-winner-dispatch` deve verificar `abTestConfig.winnerVariantId !== null` antes de processar. Se o vencedor ja foi selecionado, ignorar a campanha silenciosamente.

### 5. Server Components por padrao na UI

- `campaign-ab-metrics.tsx`: Server Component apos COMPLETED; polling TanStack Query durante PROCESSING.
- `campaign-builder-ab-step.tsx`: `'use client'` (interativo — toggles, inputs, adicao de variacoes).
- Pagina de detalhe: Server Component que passa dados iniciais para o componente de metricas.

### 6. Zod em Todos os Limites

Validação com Zod em:
- Route handler payloads
- Server Action inputs
- Service inputs
- Environment variables

```typescript
// Route handler
import { AbTestCreateSchema, AbTestSelectWinnerSchema } from '@/lib/whatsapp/schemas'

export async function POST(request: Request) {
  try {
    const body = AbTestCreateSchema.parse(await request.json())
    // business logic
  } catch (err) {
    if (err instanceof z.ZodError) {
      return json({ error: 'Invalid input', details: err.errors }, { status: 400 })
    }
    // handle other errors
  }
}

// Server Action
'use server'

export async function selectWinnerAction(input: unknown) {
  const parsed = AbTestSelectWinnerSchema.safeParse(input)
  if (!parsed.success) {
    return fail('Invalid input')
  }

  return await selectWinner(parsed.data.variantId)
}

// Service receives validated Zod types
export async function selectWinner(variantId: string) {
  const config = AbTestConfigSchema.parse(campaign.abTestConfig)
  // business logic with type-safe input
}
```

### 7. Result<T> Pattern em Todos os Services

```typescript
import { ok, fail } from '@/lib/shared/result'
import type { Result } from '@/lib/shared/result'

// ✅ Correct
export async function createVariants(input: Input): Promise<Result<Variants>> {
  try {
    const variants = await db.create(...)
    logger.info({ count: variants.length }, '[AbTest] Created')
    return ok(variants)
  } catch (err) {
    logger.error({ err }, '[AbTest] Failed')
    return fail('Could not create variants')
  }
}

// ❌ Wrong - never throw for business errors
export async function createVariants(input: Input): Promise<Variants> {
  throw new Error('...') // bad
}
```

### 8. Pino Logging com Contexto

```typescript
import { logger } from '@/server/logger'

// ✅ Correct - structured context
logger.info({ campaignId, variantCount, duration }, '[AbTest] Split completed')
logger.warn({ campaignId, reason }, '[AbTest] Insufficient data')
logger.error({ err, campaignId }, '[AbTest] Split failed')

// ❌ Wrong - unclear logs
console.log('Split completed')
logger.info('Split completed for campaign')
```

---

## Campos CRM e Resolucao de Variaveis

Cada variante tem seu proprio template, mas todas as variacoes de uma campanha compartilham o mesmo mapeamento de variaveis. Nao e possivel configurar variaveis diferentes por variante na v1.

---

## Checklist Tecnico

- [ ] Schema com `WhatsAppCampaignVariant`, `isAbTest`, `variantId` em recipient
- [ ] Zod: `AbTestCreateSchema` valida soma de percentuais = 100
- [ ] Zod: `AbTestCreateSchema` valida templates nao duplicados entre variacoes
- [ ] Service: split determinista com seed por `campaignId`
- [ ] Service: threshold minimo de 100 recipients por variante
- [ ] Service: desempate por label (A > B > C > D > E)
- [ ] Service: evento `AB_INSUFFICIENT_DATA` quando dados insuficientes
- [ ] Cron: idempotente via `jobTracker.acquireLock`
- [ ] UI: builder bloqueia adicao de variante quando `audiencia / 100 <= variantCount`
- [ ] UI: polling a cada 5s durante PROCESSING (igual `/stats`)
- [ ] UI: badge "A/B" na listagem de campanhas
- [ ] Testes: split sem perda de recipients
- [ ] Testes: auto-selecao com empate
- [ ] Testes: cancelamento de teste em andamento

---

## Verificacao Sugerida

```bash
npm test -- src/lib/whatsapp/services/__tests__/whatsapp-campaign-ab.service.test.ts
npm test -- src/lib/whatsapp/services/__tests__/whatsapp-campaign-ab-metrics.service.test.ts
npm test -- src/lib/whatsapp/schemas/__tests__/whatsapp-ab-schemas.test.ts
```

---

## Resultado Esperado ao Final

Ao final da implementacao, o usuario devera conseguir:

1. Criar uma campanha com modo A/B ativado no builder.
2. Configurar ate 5 variacoes com templates diferentes e percentuais de split.
3. Definir janela de teste, criterio de vitoria e percentual do remainder.
4. Enviar ou agendar: o sistema divide a audiencia automaticamente.
5. Acompanhar metricas por variante em tempo real com badge "Lider".
6. Ver o vencedor selecionado automaticamente ao fim da janela (ou selecionar manualmente).
7. O remainder e disparado com o template do vencedor sem intervencao adicional.
