# TASKS — PRD-014: Revisão do CAPI

## Ordem de Execução

```
Fase A: Schema e tipos
  Task 1 → Exportar CapiEventName e CAPI_EVENT_NAMES
  Task 2 → Adicionar wabaId em MetaPixel
  Task 3 → Adicionar capiEvent em TicketStage
  Task 4 → Adicionar pixelId em MetaConversionEvent + nova unique constraint
  Task 5 → Gerar e aplicar migration

Fase B: Serviço CAPI
  Task 6 → Corrigir payload (messaging_channel, wabaId, partner_agent, event_source_url)
  Task 7 → Expandir sendEvent para todos os 6 eventos
  Task 8 → Corrigir upsert para incluir pixelId

Fase C: Gatilhos
  Task 9  → Remover getCapiEventForStage() e triggerStageCapiEvent()
  Task 10 → Ler stage.capiEvent em updateTicketAndTrackCapi()
  Task 11 → Disparar Purchase e OrderCanceled em closeTicket()

Fase D: API e schemas
  Task 12 → Incluir wabaId no schema/route de MetaPixel
  Task 13 → Incluir capiEvent no schema/route de TicketStage

Fase E: UI
  Task 14 → Campo wabaId no formulário de MetaPixel
  Task 15 → Select de capiEvent na configuração de stage

Fase F: Validação
  Task 16 → Lint + build + testes
```

---

## FASE A — Schema e Tipos

### Task 1: Exportar CapiEventName e CAPI_EVENT_NAMES

**Files:**
- Modify: `src/types/meta-ads/meta-ads.ts`

**O que fazer:**

Adicionar ao arquivo:

```typescript
export type CapiEventName =
  | 'LeadSubmitted'
  | 'QualifiedLead'
  | 'InitiateCheckout'
  | 'Purchase'
  | 'OrderCanceled'
  | 'RatingProvided'

export const CAPI_EVENT_NAMES: CapiEventName[] = [
  'LeadSubmitted',
  'QualifiedLead',
  'InitiateCheckout',
  'Purchase',
  'OrderCanceled',
  'RatingProvided',
]
```

**Verification:**
- TypeScript sem erros
- `CapiEventName` importável de `@/types/meta-ads/meta-ads`

---

### Task 2: Adicionar wabaId em MetaPixel

**Files:**
- Modify: `prisma/schema.prisma`

**O que fazer:**

No model `MetaPixel`, adicionar após `capiToken`:

```prisma
wabaId  String?  // WhatsApp Business Account ID — obrigatório para user_data.whatsapp_business_account_id
```

**Atenção:** Campo nullable — não quebra pixels existentes.

**Verification:**
- `prisma validate` sem erros

---

### Task 3: Adicionar capiEvent em TicketStage

**Files:**
- Modify: `prisma/schema.prisma`

**O que fazer:**

No model `TicketStage`, adicionar:

```prisma
capiEvent  String?  // CapiEventName | null — evento disparado ao entrar neste stage
```

**Atenção:** Campo nullable — stages existentes ficam com `null` (nenhum evento disparado), comportamento correto.

**Verification:**
- `prisma validate` sem erros

---

### Task 4: Adicionar pixelId em MetaConversionEvent + nova unique constraint

**Files:**
- Modify: `prisma/schema.prisma`

**O que fazer:**

No model `MetaConversionEvent`:

1. Adicionar campo:
```prisma
pixelId  String?  // Dataset/Pixel ID — permite múltiplos pixels por ticket
```

2. Substituir a unique constraint:
```prisma
// Remover:
@@unique([ticketId, eventName])

// Adicionar:
@@unique([ticketId, eventName, pixelId])
```

**Atenção:** Registros existentes têm `pixelId = null`. A nova constraint `(ticketId, eventName, null)` ainda é única — compatibilidade mantida.

**Verification:**
- `prisma validate` sem erros

---

### Task 5: Gerar e aplicar migration

**Files:**
- Create: `prisma/migrations/[timestamp]_capi_revision/migration.sql`

**O que fazer:**

```bash
npx prisma migrate dev --name capi_revision
```

**Atenção:** Verificar o SQL gerado antes de aplicar. Esperado:
- `ALTER TABLE meta_pixels ADD COLUMN waba_id TEXT`
- `ALTER TABLE ticket_stages ADD COLUMN capi_event TEXT`
- `ALTER TABLE meta_conversion_events ADD COLUMN pixel_id TEXT`
- `DROP INDEX` + `CREATE UNIQUE INDEX` na nova constraint

**Verification:**
- Migration aplicada sem erros
- `npx prisma generate` sem erros

---

## FASE B — Serviço CAPI

### Task 6: Corrigir payload

**Files:**
- Modify: `src/services/meta-ads/capi.service.ts`

**O que fazer:**

Substituir o bloco `payload` atual pelo payload corrigido:

```typescript
const payload = {
  data: [
    {
      event_name: eventName,
      event_time: Math.floor(Date.now() / 1000),
      action_source: 'business_messaging',
      messaging_channel: 'whatsapp',
      event_id: options.eventId,
      ...(ticket.tracking.landingPage && {
        event_source_url: ticket.tracking.landingPage,
      }),
      user_data: {
        external_id: [this.hashData(ticket.conversation.lead.id)],
        ...(hashedPhone && { ph: [hashedPhone] }),
        ctwa_clid: ticket.tracking.ctwaclid,
        ...(pixel.wabaId && {
          whatsapp_business_account_id: pixel.wabaId,
        }),
      },
      custom_data: {
        ...(options.value !== undefined && { value: options.value }),
        currency: options.currency ?? 'BRL',
      },
    },
  ],
  partner_agent: 'whatrack',
}
```

**Atenção:** O `access_token` não vai mais no body — vai como query param ou header? Verificar como a implementação atual passa o token e manter consistente. (Atualmente: no body junto com `data` — manter assim pois é o padrão da Graph API para CAPI.)

Corrigir: mover `access_token: pixel.capiToken` para fora do `data[]`, como campo raiz do payload (já está assim hoje — confirmar que continua).

**Verification:**
- Payload inclui `messaging_channel`, `partner_agent`
- `event_source_url` ausente quando `landingPage` é null/empty
- `whatsapp_business_account_id` presente quando `pixel.wabaId` existe

---

### Task 7: Expandir sendEvent para os 6 eventos

**Files:**
- Modify: `src/services/meta-ads/capi.service.ts`

**O que fazer:**

Atualizar a assinatura do método:

```typescript
// Antes:
async sendEvent(
  ticketId: string,
  eventName: 'LeadSubmitted' | 'Purchase',
  ...

// Depois:
async sendEvent(
  ticketId: string,
  eventName: CapiEventName,
  ...
```

Importar `CapiEventName` de `@/types/meta-ads/meta-ads`.

**Atenção:** Nenhuma lógica de negócio muda — apenas o tipo do parâmetro é expandido.

**Verification:**
- TypeScript aceita todos os 6 valores de `CapiEventName`
- Sem erros de compilação

---

### Task 8: Corrigir upsert para incluir pixelId

**Files:**
- Modify: `src/services/meta-ads/capi.service.ts`

**O que fazer:**

No loop `for (const pixel of targetPixels)`, atualizar ambos os `upsert` (success e error):

```typescript
// Sucesso:
await prisma.metaConversionEvent.upsert({
  where: {
    ticketId_eventName_pixelId: {   // nova constraint
      ticketId,
      eventName,
      pixelId: pixel.pixelId,
    },
  },
  update: {
    status: 'SENT',
    success: true,
    fbtraceId: response.headers['x-fb-trace-id'],
    sentAt: new Date(),
  },
  create: {
    organizationId: ticket.organizationId,
    ticketId,
    eventName,
    pixelId: pixel.pixelId,          // novo campo
    status: 'SENT',
    success: true,
    eventId: options.eventId,
    ctwaclid: ticket.tracking.ctwaclid,
    metaAdId: ticket.tracking.metaAdId,
    fbtraceId: response.headers['x-fb-trace-id'] as string,
    value: options.value,
    currency: options.currency ?? 'BRL',
  },
})

// Erro: mesmo padrão — incluir pixelId no where e create
```

**Atenção:** O nome do índice gerado pelo Prisma para `@@unique([ticketId, eventName, pixelId])` será `ticketId_eventName_pixelId` — confirmar após `prisma generate`.

**Verification:**
- Com 2 pixels ativos, são criados 2 registros distintos em `MetaConversionEvent`
- TypeScript sem erros

---

## FASE C — Gatilhos

### Task 9: Remover getCapiEventForStage() e triggerStageCapiEvent()

**Files:**
- Modify: `src/services/tickets/ticket.service.ts`

**O que fazer:**

Deletar completamente as funções:
- `getCapiEventForStage()`
- `triggerStageCapiEvent()`

**Atenção:** Confirmar que nenhum outro arquivo importa ou chama essas funções antes de deletar.

**Verification:**
- `grep -r "getCapiEventForStage\|triggerStageCapiEvent" src/` → 0 resultados
- TypeScript sem erros

---

### Task 10: Ler stage.capiEvent em updateTicketAndTrackCapi()

**Files:**
- Modify: `src/services/tickets/ticket.service.ts`

**O que fazer:**

Após atualizar o ticket, buscar o stage novo e verificar se tem `capiEvent`:

```typescript
export async function updateTicketAndTrackCapi(params: UpdateTicketParams) {
  const result = await updateTicket(params)
  if ('error' in result) return result

  // Disparar CAPI se o stage mudou e tem capiEvent configurado
  if (params.stageId && params.stageId !== result.previousStageId) {
    const stage = await prisma.ticketStage.findUnique({
      where: { id: params.stageId },
      select: { capiEvent: true },
    })
    if (stage?.capiEvent) {
      metaCapiService
        .sendEvent(params.ticketId, stage.capiEvent as CapiEventName, {
          eventId: `${stage.capiEvent.toLowerCase()}-${params.ticketId}`,
          value: result.data.dealValue ?? undefined,
        })
        .catch((err) => logger.error({ err }, `[CAPI] Fire-and-forget failed for ticket ${params.ticketId}`))
    }
  }

  return result
}
```

**Atenção:**
- Importar `CapiEventName` de `@/types/meta-ads/meta-ads`
- O cast `as CapiEventName` é seguro porque o banco só aceita valores válidos (garantido pela UI)
- Manter o padrão fire-and-forget com `.catch()`

**Verification:**
- Mover ticket para stage com `capiEvent = 'QualifiedLead'` → `sendEvent` chamado com `'QualifiedLead'`
- Mover para stage sem `capiEvent` → nada chamado
- Mover para mesmo stage → nada chamado

---

### Task 11: Disparar Purchase e OrderCanceled em closeTicket()

**Files:**
- Modify: `src/services/tickets/ticket.service.ts`

**O que fazer:**

Na função `closeTicket()`, após o update do ticket, adicionar:

```typescript
// Disparar CAPI automático baseado no motivo de fechamento
if (params.reason === 'won') {
  metaCapiService
    .sendEvent(params.ticketId, 'Purchase', {
      eventId: `purchase-${params.ticketId}`,
      value: params.dealValue ?? existing.dealValue ?? undefined,
    })
    .catch((err) => logger.error({ err }, `[CAPI] Purchase fire-and-forget failed for ticket ${params.ticketId}`))
} else if (params.reason === 'lost') {
  metaCapiService
    .sendEvent(params.ticketId, 'OrderCanceled', {
      eventId: `ordercanceled-${params.ticketId}`,
    })
    .catch((err) => logger.error({ err }, `[CAPI] OrderCanceled fire-and-forget failed for ticket ${params.ticketId}`))
}
```

**Atenção:**
- `Purchase` em `closeTicket` e `Purchase` via stage podem disparar duas vezes se o usuário configurar o stage de fechamento com `capiEvent = 'Purchase'`. O `eventId` determinístico (`purchase-{ticketId}`) faz a Meta deduplicar automaticamente — comportamento correto.
- Buscar `existing.dealValue` se `params.dealValue` não for passado — verificar se já está no select da query de `existing`

**Verification:**
- `closeTicket(reason: 'won')` → `sendEvent('Purchase', ...)` chamado
- `closeTicket(reason: 'lost')` → `sendEvent('OrderCanceled', ...)` chamado
- Erros não propagam para o caller de `closeTicket`

---

## FASE D — API e Schemas

### Task 12: Incluir wabaId no schema/route de MetaPixel

**Files:**
- Read + Modify: `src/schemas/meta-ads/meta-ads-schemas.ts`
- Read + Modify: rota de criação/edição de pixels (verificar path em `src/app/api/v1/meta-ads/pixels/`)

**O que fazer:**

No schema Zod de criação/edição de pixel, adicionar:

```typescript
wabaId: z.string().optional(),
```

Na rota de API, incluir `wabaId` nos dados passados ao Prisma (create e update).

**Verification:**
- POST/PATCH de pixel com `wabaId` → salvo no banco
- POST/PATCH sem `wabaId` → funciona normalmente (campo opcional)

---

### Task 13: Incluir capiEvent no schema/route de TicketStage

**Files:**
- Read + Modify: schema Zod de TicketStage
- Read + Modify: rota de criação/edição de stages

**O que fazer:**

No schema Zod de stage, adicionar:

```typescript
import { CAPI_EVENT_NAMES } from '@/types/meta-ads/meta-ads'

capiEvent: z.enum(CAPI_EVENT_NAMES as [string, ...string[]]).nullable().optional(),
```

Na rota de API, incluir `capiEvent` nos dados passados ao Prisma.

**Verification:**
- PATCH de stage com `capiEvent: 'LeadSubmitted'` → salvo no banco
- PATCH de stage com `capiEvent: null` → limpa o evento
- PATCH com valor inválido → erro de validação Zod

---

## FASE E — UI

### Task 14: Campo wabaId no formulário de MetaPixel

**Files:**
- Read + Modify: `src/components/dashboard/meta-ads/settings/meta-pixels-config-area.tsx`

**O que fazer:**

No formulário de criação/edição de pixel, adicionar campo após `capiToken`:

```tsx
<SettingsRow
  title="WABA ID"
  description="WhatsApp Business Account ID. Encontrado em Meta Business Manager → WhatsApp Accounts."
>
  <Input
    placeholder="Ex: 123456789012345"
    {...register('wabaId')}
  />
</SettingsRow>
```

**Atenção:** Campo opcional — não bloquear o save se estiver vazio. Exibir tooltip ou link para onde encontrar o WABA ID no Meta Business Manager.

**Verification:**
- Campo renderiza no formulário de pixel
- Valor salvo e carregado corretamente
- Formulário salva sem WABA ID sem erros

---

### Task 15: Select de capiEvent na configuração de stage

**Files:**
- Read: componente atual de configuração de stages (confirmar path — provavelmente `src/components/dashboard/pipeline/` ou similar)
- Modify: componente de criação/edição de stage (dialog ou drawer)

**O que fazer:**

No formulário de stage (create/edit dialog), adicionar campo após `color`:

```tsx
<div className="flex flex-col gap-1.5">
  <label className="text-sm font-medium">Evento CAPI</label>
  <Select
    value={capiEvent ?? ''}
    onValueChange={(val) => setCapiEvent(val || null)}
  >
    <SelectTrigger>
      <SelectValue placeholder="Nenhum evento" />
    </SelectTrigger>
    <SelectContent>
      <SelectItem value="">Nenhum evento</SelectItem>
      {CAPI_EVENT_NAMES.map((event) => (
        <SelectItem key={event} value={event}>
          {CAPI_EVENT_LABELS[event]}
        </SelectItem>
      ))}
    </SelectContent>
  </Select>
  <p className="text-xs text-muted-foreground">
    Evento enviado à Meta quando um ticket entra neste stage.
  </p>
</div>
```

Definir labels amigáveis:

```typescript
const CAPI_EVENT_LABELS: Record<CapiEventName, string> = {
  LeadSubmitted: 'Lead Recebido',
  QualifiedLead: 'Lead Qualificado',
  InitiateCheckout: 'Proposta Enviada',
  Purchase: 'Venda Fechada',
  OrderCanceled: 'Negócio Perdido',
  RatingProvided: 'Avaliação Recebida',
}
```

**Atenção:** O select pode ser definido localmente no componente se `CAPI_EVENT_LABELS` não for reutilizado em outros lugares.

**Verification:**
- Select aparece no formulário de stage
- Selecionar evento → salvo no banco via mutation
- Selecionar "Nenhum evento" → salva `null`
- Stage sem evento → comportamento anterior mantido

---

## FASE F — Validação

### Task 16: Lint + build + testes

**O que fazer:**

```bash
npm run lint
npm run build
npm run test
```

**Checklist funcional:**

- [ ] Payload CAPI inclui `messaging_channel: "whatsapp"`
- [ ] Payload CAPI inclui `partner_agent: "whatrack"`
- [ ] `event_source_url` ausente quando `landingPage` é null
- [ ] `whatsapp_business_account_id` presente quando `pixel.wabaId` configurado
- [ ] Mover ticket para stage com `capiEvent` → evento disparado
- [ ] Mover ticket para stage sem `capiEvent` → nada disparado
- [ ] `closeTicket(won)` → `Purchase` disparado
- [ ] `closeTicket(lost)` → `OrderCanceled` disparado
- [ ] 2 pixels ativos → 2 registros distintos em `MetaConversionEvent`
- [ ] Formulário de pixel: campo `wabaId` salva e carrega
- [ ] Formulário de stage: select de `capiEvent` salva e carrega
- [ ] `getCapiEventForStage` não existe mais no codebase

**Verification:**
- `npm run lint` → 0 erros
- `npm run build` → sucesso
- `npm run test` → sem regressões
