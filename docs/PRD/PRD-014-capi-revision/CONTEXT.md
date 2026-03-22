# CONTEXT — PRD-014: Revisão do CAPI

## Estado Atual do Código

### Arquivos relevantes

```
src/
├── services/meta-ads/
│   └── capi.service.ts                  # MetaCapiService — único ponto de envio CAPI
├── services/tickets/
│   └── ticket.service.ts                # triggerStageCapiEvent(), getCapiEventForStage()
├── types/meta-ads/
│   └── meta-ads.ts                      # tipos Meta Ads (CapiEventName não existe ainda)
├── schemas/meta-ads/
│   └── meta-ads-schemas.ts              # schemas Zod de pixel, account, etc.
├── app/api/v1/
│   └── tickets/[ticketId]/route.ts      # PATCH → updateTicketAndTrackCapi()
├── components/dashboard/meta-ads/settings/
│   └── meta-pixels-config-area.tsx      # UI de cadastro/edição de pixels
└── components/dashboard/pipeline/       # UI de configuração de stages (a confirmar path)
```

### `capi.service.ts` — estado atual

```typescript
// Eventos suportados (hardtype na assinatura):
eventName: 'LeadSubmitted' | 'Purchase'

// Payload atual — campos ausentes:
{
  data: [{
    event_name: eventName,
    event_time: ...,
    action_source: 'business_messaging',
    // FALTA: messaging_channel
    event_id: options.eventId,
    event_source_url: ticket.tracking.landingPage || '',  // BUG: envia "" se vazio
    user_data: {
      external_id: [hashData(lead.id)],
      ph: hashedPhone ? [hashedPhone] : [],
      ctwa_clid: ticket.tracking.ctwaclid,
      // FALTA: whatsapp_business_account_id
    },
    custom_data: { value: options.value, currency: options.currency || 'BRL' },
  }],
  access_token: pixel.capiToken,  // access_token no body (correto)
  // FALTA: partner_agent
}

// Upsert com bug de sobrescrita:
prisma.metaConversionEvent.upsert({
  where: { ticketId_eventName: { ticketId, eventName } },  // BUG: sem pixelId
  ...
})
```

### `ticket.service.ts` — lógica de gatilho atual

```typescript
// Mapeamento hardcoded por nome de stage (a remover):
function getCapiEventForStage(stageName: string): 'LeadSubmitted' | 'Purchase' | null {
  const name = stageName.toLowerCase()
  if (name.includes('qualificado') || name.includes('qualified')) return 'LeadSubmitted'
  if (name.includes('venda') || name.includes('pago') || name.includes('ganho') || name.includes('won'))
    return 'Purchase'
  return null
}

// Fire-and-forget (correto — manter esse padrão):
function triggerStageCapiEvent(input) {
  metaCapiService.sendEvent(...).catch(logger.error)
}

// Chamado apenas em updateTicketAndTrackCapi():
export async function updateTicketAndTrackCapi(params) {
  const result = await updateTicket(params)
  triggerStageCapiEvent({ stageId, previousStageId, stageName, dealValue })
  return result
}

// closeTicket() NÃO dispara nenhum evento CAPI hoje
```

### Schema atual relevante

```prisma
model MetaPixel {
  id             String   @id
  organizationId String
  projectId      String
  name           String?
  pixelId        String   // Dataset ID — endpoint de envio
  capiToken      String   // Access Token CAPI
  isActive       Boolean
  // FALTA: wabaId
}

model MetaConversionEvent {
  id             String
  organizationId String
  projectId      String?
  ticketId       String
  eventName      String   // "LeadSubmitted" | "Purchase"
  status         String   // PENDING | SENT | FAILED | ...
  eventId        String   @unique
  ctwaclid       String?
  metaAdId       String?
  fbtraceId      String?
  success        Boolean
  errorCode      String?
  errorMessage   String?
  value          Decimal?
  currency       String
  sentAt         DateTime
  // FALTA: pixelId

  @@unique([ticketId, eventName])  // BUG: sem pixelId → sobrescreve com múltiplos pixels
}

model TicketStage {
  id             String
  organizationId String
  name           String
  color          String?
  isDefault      Boolean
  isClosed       Boolean
  position       Int
  // FALTA: capiEvent
}
```

## Padrões do Projeto Relevantes

### Fire-and-forget para side effects externos

```typescript
// Padrão atual (correto — manter):
metaCapiService.sendEvent(...).catch((error) =>
  logger.error({ err: error }, `[CAPI] Fire-and-forget failed`)
)
```

O dispatch CAPI não deve bloquear a resposta da API. Erros são logados, não propagados.

### Serviços e schemas por domínio

```
src/services/meta-ads/    → lógica de negócio CAPI
src/schemas/meta-ads/     → validação Zod (pixels, accounts)
src/types/meta-ads/       → tipos TypeScript compartilhados
```

### Queries do TanStack no frontend

O componente de configuração de stages usa TanStack Query. A mutation de update do stage deve incluir `capiEvent` no payload — verificar o query key para invalidação.

## Dependências Críticas

1. **`closeTicket()`** precisa receber `ticketId` acessível para buscar `dealValue` → já recebe via `CloseTicketParams`

2. **`updateTicketAndTrackCapi()`** já recebe `stageId` e busca o stage — passar para o service é trivial, mas precisa incluir `capiEvent` no select do stage

3. **UI de stages** — o path exato do componente de configuração de pipeline/stages precisa ser confirmado antes de implementar o select de `capiEvent`

4. **Migração de banco** — nova migration com 3 mudanças de schema. Campos `wabaId` e `capiEvent` são opcionais (nullable), sem impacto em dados existentes. Mudança da unique constraint em `MetaConversionEvent` requer atenção — registros existentes com mesmo `(ticketId, eventName)` podem ter `pixelId = null`, o que mantém compatibilidade
