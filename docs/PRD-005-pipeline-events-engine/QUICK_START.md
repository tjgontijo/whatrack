# Quick Start: PRD-005 Pipeline Events Engine

**TL;DR:** Infraestrutura CAPI ja existe. Falta schema configuravel, corrigir 1 server action, trocar heuristica por regras do banco via BullMQ, e UI.

---

## Resumo

| # | Problema | Fix |
|---|----------|-----|
| T1 | Schema sem MetaEventType e DealStageMetaRule | Criar models + migration + seed |
| T2 | Server Action do kanban bypassa hook CAPI | Trocar `prisma.deal.update` por `updateTicketAndTrackCapi` |
| T3 | Sem fila/worker para CAPI | Criar `meta-capi.queue.ts` + worker em `src/worker.ts` |
| T4 | Heuristica de nome em vez de regras | Remover `getCapiEventForStage`, enfileirar por `stage.metaRules` |
| T5 | `capi.service` nao recebe pixelId nem checa fireOnce | Atualizar assinatura e logica |
| T6 | Sem UI para criar regras | Modal na fase: select pixel + evento padrao/custom + fireOnce |

---

## Ordem de Execucao

```bash
# 1. Branch
git checkout -b feature/pipeline-events-engine

# 2. T1: Schema + seed
npx prisma migrate dev --name add_pipeline_events_engine
npx prisma db seed
git commit -m "feat(schema): add MetaEventType, DealStageMetaRule, update MetaConversionEvent"

# 3. T2: Bug critico
git commit -m "fix(deals): use updateTicketAndTrackCapi in stage action to trigger CAPI hook"

# 4. T3: Queue + Worker
git commit -m "feat(meta-ads): add meta-capi BullMQ queue and worker"

# 5. T5: capi.service
git commit -m "feat(meta-ads): update capi service to receive explicit pixelId and fireOnce check"

# 6. T4: Substituir heuristica
git commit -m "feat(deals): replace stage name heuristic with configurable meta rules queue dispatch"

# 7. T6: UI
git commit -m "feat(deals): add meta event rules configuration to stage settings"
```

---

## Nota sobre MetaConversionEvent

Sistema em desenvolvimento. `pixelId String @db.Uuid` NOT NULL direto, sem passos extras.
