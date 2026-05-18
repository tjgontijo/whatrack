# Diagnostic: Motor Deterministico de Eventos por Pipeline

**Data:** 2026-05-18
**Status:** Final apos auditoria do codebase

---

## Resumo

O WhaTrack ja possui infraestrutura CAPI funcional. O motor dispara eventos hoje, mas de forma heuristica (nome da fase) e sem configuracao pelo usuario. A lacuna real e pequena.

---

## O Que Ja Existe (nao reimplementar)

| Item | Arquivo | Detalhe |
|------|---------|---------|
| CAPI service | `src/features/meta-ads/services/capi.service.ts` | Busca deal, hash phone, envia, loga em MetaConversionEvent |
| Hook de mudanca de fase | `deal.service.ts:592` | `updateTicketAndTrackCapi` chama `triggerStageCapiEvent` apos update |
| Dedup no banco | `MetaConversionEvent @@unique([dealId, eventName])` | Existe, precisa adicionar `pixelId` |
| BullMQ | `package.json` + `src/worker.ts` | Instalado e em uso (campaign-dispatch) |
| Modelagem de conversoes | `MetaConversionEvent` | Tabela com status, ctwaclid, eventId, errorCode |

---

## Problemas Reais

### 🔴 P1: Schema sem tabela de regras e sem lookup de eventos

**Problema:** Nao existe vinculo configuravel entre `DealStage` e pixels/eventos. Nao existe tabela de tipos de eventos padrao da Meta.

**Solucao:**
1. Criar `MetaEventType` — lookup de eventos padrao com seed.
2. Criar `DealStageMetaRule` com `stageId`, `pixelId`, `eventName`, `fireOnce`.
3. Adicionar `pixelId` ao `MetaConversionEvent` e atualizar unique constraint para `[dealId, pixelId, eventName]`.
4. Adicionar relacoes em `DealStage` e `MetaPixel`.

---

### 🔴 P2: `updateTicketStageAction` bypassa o hook CAPI

**Problema:** Server Action do drag-and-drop do kanban (`deals/actions/update-deal-stage-action.ts:30`) faz `prisma.deal.update` diretamente — nenhum evento CAPI dispara hoje ao mover cards.

**Solucao:** Substituir `prisma.deal.update` por `updateTicketAndTrackCapi`.

---

### 🟡 P3: Logica de disparo usa heuristica de nome

**Problema:** `getCapiEventForStage` em `deal.service.ts:315` mapeia nome da fase para evento por substring match. Nao configuravel, nao suporta multiplos pixels.

**Solucao:** Remover heuristica. Substituir por leitura de `stage.metaRules` e enfileiramento de job BullMQ por regra.

---

### 🟡 P4: `capi.service` nao recebe pixelId nem checa fireOnce

**Problema:** Hoje busca todos pixels ativos do projeto. Nao tem logica de `fireOnce`.

**Solucao:** Atualizar assinatura para receber `pixelId` e `fireOnce`. Filtrar pixel especifico. Checar `MetaConversionEvent` antes de enviar se `fireOnce=true`.

---

### 🟡 P5: Worker BullMQ para CAPI inexistente

**Problema:** Nao ha consumer para a fila `meta-capi`. O padrao do projeto e ter workers em `src/worker.ts`.

**Solucao:** Criar `src/server/queues/meta-capi.queue.ts` (padrao igual ao `campaign.queue.ts`) e adicionar worker em `src/worker.ts`.

---

### 🟢 P6: UI de configuracao inexistente

**Problema:** Sem interface para criar/editar `DealStageMetaRule`.

**Solucao:** Modal nas propriedades da fase com lista de regras (pixel + evento padrao/custom + fireOnce).

---

## O Que Estava Errado no Diagnostico Original

| PRD Original Dizia | Realidade |
|---|---|
| Hook de fase nao existe (T2) | Existe — `updateTicketAndTrackCapi` em `deal.service.ts:592` |
| Worker CAPI inexistente (T3) | `capi.service.ts` existe e e funcional |
| Dedup nao implementado (T4) | Unique constraint ja existe no banco |
| Estimativa: 18h total | Real: ~9h |

---

## Matriz de Risco

| Problema | Severidade | Esforco |
|----------|------------|---------|
| P1: Schema (MetaEventType + DealStageMetaRule + MetaConversionEvent) | Alto | 1.5h |
| P2: Server Action bypassa hook | Alto | 30min |
| P3: Substituir heuristica por regras | Medio | 1.5h |
| P4: capi.service recebe pixelId + fireOnce | Medio | 30min |
| P5: Worker BullMQ meta-capi | Medio | 1h |
| P6: UI configuracao de regras | Baixo | 4h |

**Total: ~9h**
