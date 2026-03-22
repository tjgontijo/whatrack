# QUICK START — PRD-014: Revisão do CAPI

## Visão rápida

Revisão da integração CAPI em 6 fases. Correção de payload, expansão de 2 para 6 eventos, mapeamento por stage no banco, e bug fix de múltiplos pixels.

---

## Setup

```bash
git checkout main && git pull
git checkout -b feature/2026-03-21-capi-revision
```

Sem nova dependência de pacote.

---

## Ordem de execução

```
Phase A → Phase B → Phase C → Phase D → Phase E → Phase F
 (schema)  (serviço) (gatilhos)  (API)    (UI)    (validação)
```

Fases A e B podem ser commitadas separadamente. Fases C e D dependem de A e B.

---

## Checklist de início rápido

### Phase A — Schema e Tipos (Tasks 1-5)
- [ ] Exportar `CapiEventName` e `CAPI_EVENT_NAMES` em `src/types/meta-ads/meta-ads.ts`
- [ ] Adicionar `wabaId String?` em `MetaPixel`
- [ ] Adicionar `capiEvent String?` em `TicketStage`
- [ ] Adicionar `pixelId String?` e nova unique constraint em `MetaConversionEvent`
- [ ] `npx prisma migrate dev --name capi_revision`

### Phase B — Serviço CAPI (Tasks 6-8)
- [ ] Corrigir payload: `messaging_channel`, `partner_agent`, `wabaId`, `event_source_url`
- [ ] Expandir assinatura `sendEvent` para `CapiEventName` (6 eventos)
- [ ] Corrigir upsert para usar `ticketId_eventName_pixelId`

### Phase C — Gatilhos (Tasks 9-11)
- [ ] Deletar `getCapiEventForStage()` e `triggerStageCapiEvent()`
- [ ] Ler `stage.capiEvent` em `updateTicketAndTrackCapi()`
- [ ] Disparar `Purchase` e `OrderCanceled` em `closeTicket()`

### Phase D — API e Schemas (Tasks 12-13)
- [ ] `wabaId` no schema Zod e rota de MetaPixel
- [ ] `capiEvent` no schema Zod e rota de TicketStage

### Phase E — UI (Tasks 14-15)
- [ ] Campo `wabaId` no formulário de MetaPixel
- [ ] Select de `capiEvent` no formulário de Stage

### Phase F — Validação (Task 16)
- [ ] `npm run lint` → 0 erros
- [ ] `npm run build` → sucesso
- [ ] `npm run test` → sem regressões

---

## Arquivos-chave

| Arquivo | Fase | Mudança |
|---|---|---|
| `src/types/meta-ads/meta-ads.ts` | A | `CapiEventName`, `CAPI_EVENT_NAMES` |
| `prisma/schema.prisma` | A | 3 mudanças de modelo |
| `src/services/meta-ads/capi.service.ts` | B | payload + tipo + upsert |
| `src/services/tickets/ticket.service.ts` | C | remover hardcode, add gatilhos |
| `src/schemas/meta-ads/meta-ads-schemas.ts` | D | `wabaId` opcional |
| Schema/rota de stages | D | `capiEvent` opcional |
| `meta-pixels-config-area.tsx` | E | campo `wabaId` |
| Componente de stage (dialog/drawer) | E | select `capiEvent` |

---

## Eventos CAPI configuráveis

| Evento | Label sugerido na UI | Gatilho |
|---|---|---|
| `LeadSubmitted` | Lead Recebido | Stage |
| `QualifiedLead` | Lead Qualificado | Stage |
| `InitiateCheckout` | Proposta Enviada | Stage |
| `Purchase` | Venda Fechada | Stage + `closeTicket(won)` automático |
| `OrderCanceled` | Negócio Perdido | Stage + `closeTicket(lost)` automático |
| `RatingProvided` | Avaliação Recebida | Stage |

---

## Smoke test pós-implementação

1. Cadastrar pixel com `wabaId` → salvo no banco
2. Configurar stage "Qualificado" com `capiEvent = QualifiedLead`
3. Mover ticket para stage → log em `MetaConversionEvent` com `pixelId` preenchido
4. Fechar ticket como ganho → log de `Purchase` criado automaticamente
5. Fechar ticket como perdido → log de `OrderCanceled` criado automaticamente
6. Com 2 pixels ativos → 2 registros distintos por evento no `MetaConversionEvent`
7. Inspecionar payload no Gerenciador de Eventos da Meta → `messaging_channel` e `partner_agent` presentes
