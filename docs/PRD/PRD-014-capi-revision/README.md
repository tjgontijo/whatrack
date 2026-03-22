# PRD-014: Revisão do CAPI — Payload, Eventos e Mapeamento por Stage

## Sumário

Revisão completa da integração com a Meta Conversions API (CAPI) para:
1. Corrigir campos obrigatórios ausentes no payload (`messaging_channel`, `whatsapp_business_account_id`, `partner_agent`)
2. Expandir de 2 para 6 eventos suportados — os de maior impacto para otimização de anúncios
3. Substituir mapeamento hardcoded por nome de stage por configuração explícita no banco (`stage.capiEvent`)
4. Corrigir bug de log quando múltiplos pixels estão ativos

## Contexto

O agente de IA é o motor do pipeline. Ele analisa conversas no WhatsApp, move tickets entre stages e fecha negócios. O CAPI não é acionado diretamente pelo agente — ele dispara como efeito colateral dessas ações de pipeline. O usuário configura uma vez quais stages mapeiam para quais eventos CAPI; o agente executa; a Meta recebe os sinais.

```
Agente AI
  └─ moveStage(ticketId, stageId)
       └─ updateTicketAndTrackCapi()
            └─ lê stage.capiEvent do banco
                 └─ metaCapiService.dispatch(event, ticketId)  [fire-and-forget]

Agente AI
  └─ closeTicket(ticketId, 'won')
       └─ metaCapiService.dispatch('Purchase', ticketId)       [automático, sem configuração]
```

## Problema

### P1 — Payload incompleto

A documentação da Meta para Business Messaging exige campos que o payload atual não envia:

| Campo | Status | Correto |
|---|---|---|
| `messaging_channel` | ausente | `"whatsapp"` |
| `user_data.whatsapp_business_account_id` | ausente | WABA ID do pixel |
| `partner_agent` | ausente | `"whatrack"` |
| `event_source_url` | envia `""` quando vazio | omitir se vazio |

### P2 — Apenas 2 de 6 eventos implementados

| Evento | Tier | Valor | Status |
|---|---|---|---|
| `LeadSubmitted` | 1 | Sinaliza que o clique virou oportunidade real | implementado |
| `Purchase` | 1 | Sinal mais valioso — Meta otimiza quem compra | implementado |
| `QualifiedLead` | 2 | Sinais intermediários para funis longos | ausente |
| `InitiateCheckout` | 2 | Intenção forte antes da compra | ausente |
| `OrderCanceled` | — | Evita otimizar para perfis que não fecham | ausente |
| `RatingProvided` | — | Diferencia clientes de alto LTV | ausente |

### P3 — Mapeamento hardcoded por nome de stage

`getCapiEventForStage()` usa `includes('qualificado')` e `includes('venda')` para decidir o evento. Quebra com nomes personalizados de stage e não suporta nenhum dos 4 novos eventos.

### P4 — Bug com múltiplos pixels

`MetaConversionEvent` tem unique constraint em `(ticketId, eventName)`. Com 2 pixels ativos, o segundo envio sobrescreve o log do primeiro.

### P5 — `waba_id` não armazenado

`MetaPixel` não armazena o `whatsapp_business_account_id`, campo obrigatório no `user_data` para WhatsApp.

## Solução

### Arquitetura de gatilhos

**Automático (hardcoded):**
- `closeTicket(won)` → sempre dispara `Purchase`
- `closeTicket(lost)` → sempre dispara `OrderCanceled`

**Por stage (configurável pelo usuário via UI):**
- Qualquer stage pode ter `capiEvent` configurado
- Ao mover ticket para esse stage, o evento dispara automaticamente
- O agente AI não precisa saber nada sobre CAPI

### Mudanças de schema

```prisma
model MetaPixel {
  // + campo novo:
  wabaId  String?  // WhatsApp Business Account ID
}

model TicketStage {
  // + campo novo:
  capiEvent  String?  // ex: "LeadSubmitted" | "Purchase" | null
}

model MetaConversionEvent {
  // + campo novo:
  pixelId  String?  // Dataset/Pixel ID

  // unique constraint alterada:
  @@unique([ticketId, eventName, pixelId])  // era: [ticketId, eventName]
}
```

### Payload corrigido

```typescript
{
  data: [{
    event_name: eventName,
    event_time: Math.floor(Date.now() / 1000),
    action_source: 'business_messaging',
    messaging_channel: 'whatsapp',                              // NOVO
    event_id: options.eventId,
    ...(ticket.tracking.landingPage && {                        // fix: omite se vazio
      event_source_url: ticket.tracking.landingPage,
    }),
    user_data: {
      external_id: [hashData(ticket.conversation.lead.id)],
      ...(hashedPhone && { ph: [hashedPhone] }),
      ctwa_clid: ticket.tracking.ctwaclid,
      ...(pixel.wabaId && {                                     // NOVO
        whatsapp_business_account_id: pixel.wabaId,
      }),
    },
    custom_data: {
      ...(options.value !== undefined && { value: options.value }),
      currency: options.currency ?? 'BRL',
    },
  }],
  partner_agent: 'whatrack',                                    // NOVO
}
```

## Métricas de Sucesso

- Payload validado no Gerenciador de Eventos da Meta sem erros de campo obrigatório
- `messaging_channel` e `whatsapp_business_account_id` presentes em 100% dos envios com `wabaId` configurado
- Log individual por pixel em `MetaConversionEvent` (sem sobrescrita)
- `getCapiEventForStage()` removido — zero lógica hardcoded de nome de stage
- `closeTicket(won)` sempre dispara `Purchase` independente de configuração

## Fora do Escopo

- Retry automático de eventos com falha
- Suporte a Messenger ou Instagram
- Envio de eventos sem `ctwa_clid`
- Outros 8 eventos da Meta (`AddToCart`, `ViewContent`, `OrderCreated`, `OrderShipped`, `OrderDelivered`, `OrderReturned`, `CartAbandoned`, `ReviewProvided`)
