# Quick Start

## Objetivo

Expor dados brutos de conversa, deal, lead e atribuição em um acordeão read-only no `DealPanel` da inbox. Sem interpretação.

## Sequência

### 1. Branch

```bash
git checkout -b feature/prd-008-conversation-intelligence
```

### 2. Schema

Criar `src/features/conversation-intelligence/schemas/conversation-intelligence.schemas.ts` com o DTO completo conforme CONTEXT.md.

### 3. Repository

Criar `src/features/conversation-intelligence/repositories/conversation-intelligence.repository.ts`.

Queries necessárias:
- `Conversation` (por `id` + `organizationId`): `avgResponseTimeSec`, `firstResponseTimeSec`
- `Deal` (deal aberto da conversa): `lastInboundAt`, `lastOutboundAt`, `messagesCount`, `inboundMessagesCount`, `outboundMessagesCount`, `firstResponseTimeSec`, `createdAt`, `stageEnteredAt`, `windowOpen`, `windowExpiresAt`
- `Lead` (via deal): `totalDeals`, `lifetimeValue`, `firstMessageAt`, `createdAt`
- `DealTracking` (via deal): todos os campos UTM + `sourceType`, `ctwaclid`, `referrerUrl`, `landingPage`

### 4. Service

Criar `src/features/conversation-intelligence/services/conversation-intelligence.service.ts`.

Derivações a implementar:
- `secondsSinceLastInbound` = `Math.floor((now - lastInboundAt) / 1000)`
- `secondsSinceLastOutbound` = `Math.floor((now - lastOutboundAt) / 1000)`
- `dealAgeSec` = `Math.floor((now - deal.createdAt) / 1000)`
- `stageAgeSec` = `stageEnteredAt ? Math.floor((now - stageEnteredAt) / 1000) : null`
- `windowSecondsRemaining` = `windowExpiresAt ? Math.floor((windowExpiresAt - now) / 1000) : null`
- `inboundOutboundRatio` = `outbound > 0 ? inbound / outbound : null`
- `lastMessageDirection` = comparar `lastInboundAt` vs `lastOutboundAt`

### 5. Endpoint

Criar `src/app/api/v1/conversations/[conversationId]/intelligence/route.ts`.

Padrão idêntico ao `/deal/route.ts` existente.

### 6. Componente

Criar `src/features/conversation-intelligence/components/conversation-intelligence-panel.tsx`.

Acordeão com 5 seções: Atendimento, Mensagens, Pipeline, Lead, Origem.

Integrar no final de `src/features/whatsapp/components/inbox/deal-panel.tsx`.

### 7. Testes

```bash
npx vitest run src/features/conversation-intelligence
```

### 8. Validação

```bash
npx tsc --noEmit --pretty false
npx biome lint .
```

## Definition of Done

- Endpoint retorna JSON com o DTO completo.
- Acordeão aparece na 3ª coluna da inbox ao selecionar um chat com deal aberto.
- Seções sem dados ficam ocultas.
- Nenhum campo exibe interpretação ou julgamento.
- TypeScript build passa sem erros.
