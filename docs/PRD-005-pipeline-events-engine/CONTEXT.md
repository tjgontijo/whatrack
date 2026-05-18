# Context: Motor Deterministico de Eventos por Pipeline

**Ultima atualizacao:** 2026-05-18

---

## Definicao

Motor que vincula fases do kanban a eventos da Meta CAPI. Configuravel por fase: qual evento, para qual pixel, quantas vezes.

**O que e:**
- Disparador baseado em regras (fase X + pixel Y → evento Z).
- Sistema deterministico, sem IA.
- Fechar o ciclo de otimizacao para campanhas Click to WhatsApp (CTWA).

**O que NAO e:**
- Classificador automatico de leads por leitura de conversa.
- Chatbot ou IA.
- Automacao com condicoes multivariadas.

---

## Modelo de Negocio

- **Organization** = agencia de marketing.
- **Project** = cliente da agencia.
- **MetaPixel** = pixel de ads do cliente (scoped por `organizationId + projectId`).
- Uma fase pode ter **zero ou mais regras** de evento. Zero regras = nenhum evento disparado.
- Uma fase pode disparar para **multiplos pixels**, cada um com **evento independente**.
- Eventos podem ser **padrao** (lista da Meta) ou **personalizados** (nome livre digitado pelo usuario).

---

## Fluxo Completo

```txt
[Lead clica no Anuncio CTWA]
  ↓
[Inicia conversa no WhaTrack] → ctwa_clid salvo em DealTracking
  ↓                             (so existe se veio de anuncio)
[Vendedor avanca o Deal para fase "Venda Ganha"]
  ↓
[Gatilho do Motor] → carrega DealStageMetaRule[] da fase destino
  ↓                  (sem regras = nao faz nada)
[Para cada regra] → enfileira job no BullMQ (meta-capi queue)
  ↓
[Worker] → checa fireOnce, busca ctwa_clid, envia para pixel configurado
  ↓
[Resultado] → MetaConversionEvent salvo com status SENT / FAILED / SKIPPED_*
```

---

## Schema Final

### MetaEventType (lookup de eventos padrao)

```prisma
model MetaEventType {
  id    String @id @default(dbgenerated("gen_random_uuid()")) @db.Uuid
  name  String @unique  // valor enviado para Meta API: "Purchase", "QualifiedLead"
  label String          // label na UI: "Venda Realizada", "Lead Qualificado"

  @@map("meta_event_types")
}
```

Seed com eventos padrao do Meta CTWA. Sem relacao com org ou projeto.
Eventos personalizados: usuario digita nome livre na UI — salvo direto em `DealStageMetaRule.eventName`.

**Seed padrao:**

| name | label |
|------|-------|
| Lead | Lead Captado |
| QualifiedLead | Lead Qualificado |
| Purchase | Venda Realizada |
| Schedule | Agendamento |
| Contact | Contato |
| CompleteRegistration | Cadastro Concluido |

### DealStageMetaRule (regras por fase)

```prisma
model DealStageMetaRule {
  id        String    @id @default(dbgenerated("gen_random_uuid()")) @db.Uuid
  stageId   String    @db.Uuid
  pixelId   String    @db.Uuid
  eventName String    // padrao (ex: "Purchase") ou custom (ex: "MinhaVenda")
  fireOnce  Boolean   @default(true)

  stage DealStage @relation(fields: [stageId], references: [id], onDelete: Cascade)
  pixel MetaPixel   @relation(fields: [pixelId], references: [id], onDelete: Cascade)

  @@unique([stageId, pixelId, eventName])
  @@map("crm_deal_stage_meta_rules")
}
```

Fase sem regras = nenhum evento disparado. Nao ha flag `metaEventEnabled` — a existencia de regras e o proprio flag.

### MetaConversionEvent (atualizacao)

Adicionar `pixelId` e atualizar unique constraint:

```prisma
pixelId  String   @db.Uuid
@@unique([dealId, pixelId, eventName])
```

---

## Dedup em Dois Layers

1. **BullMQ** — `jobId: capi-{dealId}-{pixelId}-{eventName}` deterministico. Segundo enfileiramento ignorado se job ainda pendente.
2. **Banco** — `fireOnce=true` checa `MetaConversionEvent` com `status=SENT` antes de enviar. Bloqueia mesmo apos job completado e removido da fila.

---

## Infraestrutura Existente (nao reimplementar)

| Item | Localizacao | Status |
|------|-------------|--------|
| Envio CAPI para Meta | `src/features/meta-ads/services/capi.service.ts` | Funcional |
| Hook de mudanca de fase | `deal.service.ts:592` `updateTicketAndTrackCapi` | Funcional, usa heuristica de nome |
| Dedup via unique constraint | `MetaConversionEvent @@unique([dealId, eventName])` | Existe, precisa adicionar `pixelId` |
| BullMQ | `package.json bullmq@^5.76.10` + `src/worker.ts` | Instalado e em uso |

---

## Exemplo Real

```
Stage "Venda Ganha" tem 2 regras:
  ├── Pixel A + "Purchase" + fireOnce=true
  └── Pixel B + "Purchase" + fireOnce=true

Lead "Maria" (ctwaclid=12345) chega em "Venda Ganha":
  → Job enfileirado: [Maria, PixelA, Purchase]
  → Job enfileirado: [Maria, PixelB, Purchase]
  → Worker: MetaConversionEvent [Maria, PixelA, Purchase] → SENT
  → Worker: MetaConversionEvent [Maria, PixelB, Purchase] → SENT

Maria volta e vai para "Venda Ganha" de novo:
  → Job ignorado pelo BullMQ (jobId duplicado ainda pendente)
  OU
  → Worker: fireOnce check → SKIPPED_DUPLICATE

Lead "Joao" sem ctwaclid (veio organico, nao de anuncio):
  → Worker: SKIPPED_NO_CTWA (comportamento esperado)
```
