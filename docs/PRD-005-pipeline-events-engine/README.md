# PRD-005: Motor Deterministico de Eventos por Pipeline

**Status:** Final
**Data:** 2026-05-18
**Versao:** 3.0

---

## O Que e Este PRD?

Motor que vincula fases do kanban a eventos da Meta CAPI. Configuravel por fase: qual evento (padrao ou custom), para qual pixel, quantas vezes. Sem IA. Deterministic.

**Tempo Total:** ~9h de desenvolvimento.

---

## Estrutura

```txt
docs/PRD-005-pipeline-events-engine/
├── README.md (este arquivo)
├── CONTEXT.md (dominio, fluxo e schema final)
├── DIAGNOSTIC.md (auditoria do codebase + problemas reais)
├── TASKS.md (plano de implementacao detalhado)
└── QUICK_START.md (guia rapido)
```

---

## Resumo Executivo

O WhaTrack ja possui infraestrutura CAPI funcional. O motor dispara eventos por heuristica de nome de fase. Falta tornar isso **configuravel pelo usuario**.

### Schema Final

**Novo:** `MetaEventType` — lookup de eventos padrao (seed). Sem org/projeto.
**Novo:** `TicketStageMetaRule` — N regras por fase (pixelId + eventName + fireOnce).
**Atualizado:** `MetaConversionEvent` — adicionar `pixelId`, unique `[ticketId, pixelId, eventName]`.

Fase sem regras = nenhum evento. Sem flag `metaEventEnabled` necessario.

### Tasks

| Task | Problema | Severidade | Esforco |
|------|----------|------------|---------|
| T1 | Schema + seed | 🔴 Critico | 1.5h |
| T2 | Server Action bypassa hook CAPI | 🔴 Critico | 30min |
| T3 | Queue + Worker BullMQ meta-capi | 🟡 Moderado | 1h |
| T4 | Substituir heuristica por regras | 🟡 Moderado | 1.5h |
| T5 | capi.service recebe pixelId + fireOnce | 🟡 Moderado | 30min |
| T6 | UI de configuracao de regras por fase | 🟢 Menor | 4h |

**Total: ~9h**

---

## Arquivos Principais

- `prisma/schema.prisma` — MetaEventType, TicketStageMetaRule, update MetaConversionEvent.
- `prisma/seed.ts` — seed de eventos padrao.
- `src/features/tickets/actions/update-ticket-stage-action.ts` — corrigir bypass.
- `src/features/tickets/services/ticket.service.ts` — substituir heuristica.
- `src/server/queues/meta-capi.queue.ts` — nova fila BullMQ.
- `src/worker.ts` — adicionar worker meta-capi.
- `src/features/meta-ads/services/capi.service.ts` — receber pixelId + fireOnce.

---

## Como Comecar

```bash
git checkout -b feature/pipeline-events-engine
# Ordem: T1 → T2 → T3 → T5 → T4 → T6
```

Ver TASKS.md para detalhe de cada task.
