# Contexto

## Princípio

Este PRD expõe fatos. Não classifica, não interpreta, não recomenda. Cada campo do DTO é um dado objetivo derivado diretamente do banco ou de cálculo matemático (diff de timestamps, ratio de contagens).

## Estado Atual

Os dados já existem no banco — dispersos em `Conversation`, `Deal`, `Lead` e `DealTracking`. O `DealPanel` já exibe alguns (volume, 1ª resposta, resolução). Este PRD consolida tudo em um endpoint e exibe no acordeão da 3ª coluna.

## DTO de Saída

```ts
type ConversationIntelligenceDTO = {
  computedAt: string // ISO timestamp do cálculo

  timing: {
    firstResponseTimeSec: number | null       // já no banco
    avgResponseTimeSec: number | null         // já no banco
    secondsSinceLastInbound: number | null    // now - lastInboundAt
    secondsSinceLastOutbound: number | null   // now - lastOutboundAt
    lastMessageDirection: 'inbound' | 'outbound' | null
    lastInboundAt: string | null
    lastOutboundAt: string | null
  }

  volume: {
    inboundMessagesCount: number
    outboundMessagesCount: number
    totalMessagesCount: number
    inboundOutboundRatio: number | null  // inbound / outbound, null se outbound = 0
  }

  pipeline: {
    dealCreatedAt: string
    dealAgeSec: number              // now - deal.createdAt
    stageEnteredAt: string | null
    stageAgeSec: number | null      // now - stageEnteredAt
    windowOpen: boolean
    windowExpiresAt: string | null
    windowSecondsRemaining: number | null  // windowExpiresAt - now (negativo se expirado)
  }

  lead: {
    totalDeals: number               // total histórico de negociações do lead
    lifetimeValue: string            // valor total gerado, formatado como decimal string
    firstMessageAt: string | null    // primeira mensagem de qualquer conversa
    leadCreatedAt: string
  }

  attribution: {
    sourceType: string | null        // "organic", "paid", etc
    utmSource: string | null
    utmMedium: string | null
    utmCampaign: string | null
    utmContent: string | null
    utmTerm: string | null
    ctwaclid: string | null
    referrerUrl: string | null
    landingPage: string | null
  }
}
```

## Fontes de Dados

| Campo DTO | Modelo | Campo banco |
|-----------|--------|-------------|
| `firstResponseTimeSec` | `Deal` | `firstResponseTimeSec` |
| `avgResponseTimeSec` | `Conversation` | `avgResponseTimeSec` |
| `lastInboundAt` | `Deal` | `lastInboundAt` |
| `lastOutboundAt` | `Deal` | `lastOutboundAt` |
| `inboundMessagesCount` | `Deal` | `inboundMessagesCount` |
| `outboundMessagesCount` | `Deal` | `outboundMessagesCount` |
| `totalMessagesCount` | `Deal` | `messagesCount` |
| `dealCreatedAt` | `Deal` | `createdAt` |
| `stageEnteredAt` | `Deal` | `stageEnteredAt` |
| `windowOpen` | `Deal` | `windowOpen` |
| `windowExpiresAt` | `Deal` | `windowExpiresAt` |
| `totalDeals` | `Lead` | `totalDeals` |
| `lifetimeValue` | `Lead` | `lifetimeValue` |
| `firstMessageAt` | `Lead` | `firstMessageAt` |
| `leadCreatedAt` | `Lead` | `createdAt` |
| `sourceType` | `DealTracking` | `sourceType` |
| `utmSource` | `DealTracking` | `utmSource` |
| `utmMedium` | `DealTracking` | `utmMedium` |
| `utmCampaign` | `DealTracking` | `utmCampaign` |
| `utmContent` | `DealTracking` | `utmContent` |
| `utmTerm` | `DealTracking` | `utmTerm` |
| `ctwaclid` | `DealTracking` | `ctwaclid` |
| `referrerUrl` | `DealTracking` | `referrerUrl` |
| `landingPage` | `DealTracking` | `landingPage` |

## Derivações matemáticas (sem interpretação)

- `secondsSinceLastInbound` = `Math.floor((now - lastInboundAt) / 1000)`
- `secondsSinceLastOutbound` = `Math.floor((now - lastOutboundAt) / 1000)`
- `dealAgeSec` = `Math.floor((now - deal.createdAt) / 1000)`
- `stageAgeSec` = `stageEnteredAt ? Math.floor((now - stageEnteredAt) / 1000) : null`
- `windowSecondsRemaining` = `windowExpiresAt ? Math.floor((windowExpiresAt - now) / 1000) : null` (negativo = já expirou)
- `inboundOutboundRatio` = `outbound > 0 ? inbound / outbound : null`
- `lastMessageDirection` = `lastInboundAt && lastOutboundAt ? (lastInboundAt > lastOutboundAt ? 'inbound' : 'outbound') : lastInboundAt ? 'inbound' : lastOutboundAt ? 'outbound' : null`

## UI — Acordeão no DealPanel

Seções colapsáveis na 3ª coluna da inbox, abaixo das seções existentes:

### Seção: Atendimento

```
1ª resposta:          4min 23s
Tempo médio resp.:    8min 12s
Última msg do lead:   2h 15min atrás
Último contato:       3h 42min atrás
Quem falou por último: Lead
```

### Seção: Mensagens

```
Recebidas:   12
Enviadas:    8
Total:       20
Ratio:       1.5
```

### Seção: Pipeline

```
Deal criado:       8 dias atrás
Etapa atual há:    3 dias
Janela WhatsApp:   1h 30min restantes
                   (ou: Expirada há 2h / Sem janela)
```

### Seção: Lead

```
Negociações totais: 4
Valor gerado (LTV): R$ 2.400,00
Primeiro contato:   15 jan 2024
Cliente desde:      10 jan 2024
```

### Seção: Origem

```
Tipo:         Pago
Fonte:        Facebook
Meio:         CPC
Campanha:     promo-maio
Landing page: /landing/oferta
ID do clique: abc123...
```

Seções sem dados são ocultadas. Nenhuma seção exibe badges de status, cores de alerta ou textos interpretativos.

## Fronteira com message.handler.ts

O handler faz apenas incrementos e updates de timestamp durante a ingestão. Nenhum cálculo de status ou derivação complexa. Os diffs são calculados sob demanda pelo service no momento da leitura.

## Consumo pelo PRD-009

O PRD-009 recebe o DTO completo como contexto e a IA interpreta os valores. Não recalcula nenhum campo.
