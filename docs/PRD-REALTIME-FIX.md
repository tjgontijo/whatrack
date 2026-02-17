# PRD: Correção e Simplificação do Real-Time com Centrifugo

**Data**: 2026-02-17
**Status**: Draft
**Prioridade**: CRÍTICA
**Autor**: Análise técnica

---

## 1. Resumo Executivo

A implementação de real-time com Centrifugo está **90% correta**, porém com **1 bug crítico** que impede completamente o funcionamento, além de **código duplicado** que adiciona complexidade desnecessária.

### Problema Principal
O header de autenticação em `src/lib/centrifugo/server.ts` está **errado**, causando 401 em todas as publicações. Mensagens são salvas no banco, mas nunca chegam ao frontend via WebSocket.

### Resultado Atual
- Usuário envia mensagem no WhatsApp
- Mensagem é salva no banco de dados ✅
- Publicação para Centrifugo falha silenciosamente ❌
- Frontend não recebe evento ❌
- Usuário precisa dar refresh manual para ver mensagem ❌

---

## 2. Arquitetura Atual

### 2.1 Diagrama de Fluxo

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                              FLUXO COMPLETO                                 │
└─────────────────────────────────────────────────────────────────────────────┘

  WhatsApp User                Meta Cloud API              WhaTrack Backend
       │                            │                            │
       │  Envia mensagem            │                            │
       ├───────────────────────────►│                            │
       │                            │  POST /api/v1/whatsapp/webhook
       │                            ├───────────────────────────►│
       │                            │                            │
       │                            │                   ┌────────┴────────┐
       │                            │                   │ webhook/route.ts │
       │                            │                   │  - Rate limit    │
       │                            │                   │  - Log webhook   │
       │                            │                   │  - Verify sig    │
       │                            │                   └────────┬────────┘
       │                            │                            │
       │                            │                   ┌────────┴────────┐
       │                            │                   │WebhookProcessor │
       │                            │                   │  - Route events │
       │                            │                   └────────┬────────┘
       │                            │                            │
       │                            │                   ┌────────┴────────┐
       │                            │                   │ messageHandler  │
       │                            │                   │  - Create Lead  │
       │                            │                   │  - Create Conv  │
       │                            │                   │  - Create Ticket│
       │                            │                   │  - Save Message │
       │                            │                   │  - Publish event│
       │                            │                   └────────┬────────┘
       │                            │                            │
       │                            │                   ┌────────┴────────┐
       │                            │                   │publishToCentri- │
       │                            │                   │fugo() ❌ FALHA  │
       │                            │                   │ Header errado   │
       │                            │                   └────────┬────────┘
       │                            │                            │
       │                            │                            ▼
       │                            │                     Centrifugo
       │                            │                    (nunca recebe)
       │                            │                            │
       │                            │                            ▼
       │                            │                     Frontend
       │                            │                  (nunca atualiza)
```

### 2.2 Mapa de Arquivos

```
src/
├── lib/centrifugo/
│   ├── server.ts          # ❌ BUG CRÍTICO - Header auth errado
│   └── client.ts          # ✅ OK - Cliente WebSocket frontend
│
├── app/api/v1/
│   ├── centrifugo/
│   │   ├── token/route.ts     # ✅ OK - Gera JWT para conexão
│   │   └── publish/route.ts   # ⚠️ REDUNDANTE - Não usado
│   │
│   └── whatsapp/
│       ├── webhook/route.ts   # ⚠️ DUPLICAÇÃO - Processa 2x
│       ├── chats/route.ts     # ✅ OK - Lista conversas
│       └── chats/[leadId]/messages/route.ts  # ✅ OK
│
├── services/
│   ├── whatsapp/
│   │   ├── webhook-processor.ts   # ✅ OK - Router de eventos
│   │   └── handlers/
│   │       ├── message.handler.ts # ✅ OK - Processa mensagens (publica)
│   │       ├── history.handler.ts # ✅ OK - Sync histórico
│   │       └── state-sync.handler.ts # ✅ OK - Sync contatos
│   │
│   └── whatsapp-chat.service.ts   # ⚠️ LEGACY DUPLICADO - Mesmo que message.handler
│
└── features/whatsapp/inbox/
    ├── hooks/
    │   └── use-realtime.ts    # ⚠️ INEFICIENTE - Invalida todas queries
    │
    └── components/
        ├── chat-list.tsx      # ✅ OK
        ├── chat-window.tsx    # ✅ OK
        ├── ticket-panel.tsx   # ✅ OK
        └── centrifugo-status.tsx  # ✅ OK (debug only)
```

---

## 3. Descrição Detalhada dos Arquivos

### 3.1 BACKEND - Publicação de Eventos

#### `src/lib/centrifugo/server.ts` ❌ BUG CRÍTICO

**Propósito**: Publicar eventos para o Centrifugo via HTTP API

**Código atual (ERRADO)**:
```typescript
export async function publishToCentrifugo(channel: string, data: any) {
  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-API-Key': process.env.CENTRIFUGO_API_KEY!,  // ❌ ERRADO
    },
    body: JSON.stringify({ channel, data }),
  })
}
```

**Problema**: O Centrifugo espera `Authorization: apikey <KEY>`, não `X-API-Key`.

**Código correto**:
```typescript
'Authorization': `apikey ${process.env.CENTRIFUGO_API_KEY}`,  // ✅ CORRETO
```

**Evidência**: O arquivo `src/app/api/v1/centrifugo/publish/route.ts:66` usa o formato correto.

---

#### `src/app/api/v1/centrifugo/token/route.ts` ✅ FUNCIONAL

**Propósito**: Gera JWT para autenticação WebSocket do frontend

**Fluxo**:
1. Valida autenticação do usuário
2. Extrai `userId` e `organizationId`
3. Gera JWT com HMAC-SHA256
4. Token expira em 1 hora

**Usado por**: `use-realtime.ts` (linha 31)

---

#### `src/app/api/v1/centrifugo/publish/route.ts` ⚠️ REDUNDANTE

**Propósito**: Endpoint HTTP para publicar (alternativo ao server.ts)

**Status**: Não está sendo usado. O `messageHandler` usa `publishToCentrifugo()` direto.

**Ação**: Pode ser removido após corrigir `server.ts`.

---

### 3.2 BACKEND - Processamento de Webhooks

#### `src/app/api/v1/whatsapp/webhook/route.ts` ⚠️ CÓDIGO DUPLICADO

**Propósito**: Recebe webhooks da Meta (mensagens, status, etc)

**Fluxo atual**:
```
1. Rate limiting
2. Log webhook (DLQ)
3. Verificar assinatura HMAC-SHA256
4. WebhookProcessor.process() ← PROCESSA MENSAGEM
5. WhatsAppChatService.processIncomingMessage() ← PROCESSA DE NOVO! ⚠️
6. WhatsAppChatService.processMessageEcho()
7. WhatsAppChatService.processStatusUpdate()
8. Marcar como processado
```

**Problema**: Linhas 175-188 processam mensagens **novamente** após o WebhookProcessor já ter processado. A deduplicação por `wamid` evita duplicatas no banco, mas gera processamento desnecessário.

**Código problemático**:
```typescript
// Linha 130-144: WebhookProcessor processa
await processor.process(payload)

// Linha 175-188: Legacy service processa DE NOVO
if (value?.messages && instanceId) {
    for (const msg of value.messages) {
        await WhatsAppChatService.processIncomingMessage(...)  // ⚠️ DUPLICADO
    }
}
```

---

#### `src/services/whatsapp/webhook-processor.ts` ✅ FUNCIONAL

**Propósito**: Router que direciona eventos para handlers específicos

**Eventos suportados**:
| Evento | Handler | Status |
|--------|---------|--------|
| `PARTNER_ADDED/REMOVED/REINSTATED` | `onboardingHandler` | ✅ |
| `messages` | `messageHandler` | ✅ |
| `history` | `historyHandler` | ✅ |
| `smb_app_state_sync` | `stateSyncHandler` | ✅ |
| `statuses` | - | TODO |
| `message_template_status_update` | - | TODO |

---

#### `src/services/whatsapp/handlers/message.handler.ts` ✅ FUNCIONAL

**Propósito**: Processa mensagens de entrada do WhatsApp

**Fluxo**:
1. Extrai dados do payload
2. Encontra `WhatsAppConfig` pelo `phoneNumberId`
3. Para cada mensagem (dentro de transaction):
   - Cria/atualiza Lead (`source: 'live_message'`)
   - Cria/atualiza Conversation
   - Cria/atualiza Ticket (com `windowExpiresAt` condicional)
   - Salva Message (`source: 'live'`)
   - Extrai tracking (UTM, click IDs)
   - **Coleta evento para publicar**
4. Após transaction: `publishToCentrifugo()` ← Falha por bug no header

**Payload publicado**:
```typescript
{
  channel: `org:${organizationId}:messages`,
  data: {
    type: 'message_created',
    conversationId: conversation.id,  // ✅ Disponível para invalidação específica
    messageId: createdMessage.id,
    leadId: lead.id,
    body: messageBody,
    timestamp: messageTimestamp,
    direction: 'INBOUND',
  }
}
```

---

#### `src/services/whatsapp-chat.service.ts` ⚠️ LEGACY DUPLICADO

**Propósito**: Mesmo que `message.handler.ts` (código antigo)

**Métodos**:
- `processIncomingMessage()` - Duplica lógica do `messageHandler`
- `processMessageEcho()` - Processa mensagens enviadas de outro dispositivo
- `processStatusUpdate()` - Atualiza status (sent, delivered, read)

**Diferenças do messageHandler**:
- Não publica eventos para Centrifugo
- Não extrai tracking (UTM, click IDs)
- Usa `upsert` ao invés de `findFirst` + `create`

**Ação**: Manter apenas `processMessageEcho()` e `processStatusUpdate()`. Remover `processIncomingMessage()`.

---

### 3.3 FRONTEND - Conexão WebSocket

#### `src/lib/centrifugo/client.ts` ✅ FUNCIONAL

**Propósito**: Factory para cliente Centrifugo no browser

**Funções**:
```typescript
createCentrifugoClient(token: string)  // Cria instância com token JWT
subscribeTo(client, channel, onMessage)  // Inscreve em canal
```

**Dependência**: `centrifuge@^5.5.3`

---

#### `src/features/whatsapp/inbox/hooks/use-realtime.ts` ⚠️ INEFICIENTE

**Propósito**: Hook React para gerenciar conexão WebSocket e subscriptions

**Fluxo**:
1. Fetch token via `/api/v1/centrifugo/token`
2. Cria cliente Centrifugo
3. Conecta WebSocket
4. Inscreve em canais:
   - `org:{organizationId}:messages` → invalida queries
   - `org:{organizationId}:tickets` → invalida queries
5. Auto-refresh token a cada 50 minutos

**Problema**: Invalidação genérica

```typescript
// Código atual - invalida TODAS as queries
queryClient.invalidateQueries({ queryKey: ['chat-messages'] })
queryClient.invalidateQueries({ queryKey: ['whatsapp-chats'] })

// Deveria ser - invalida apenas o chat específico
queryClient.invalidateQueries({
  queryKey: ['chat-messages', data.conversationId]
})
```

**Impacto**: Com 10 chats abertos, dispara 10 refetches desnecessários.

---

### 3.4 FRONTEND - Componentes

#### `src/app/dashboard/whatsapp/inbox/page.tsx` ✅ FUNCIONAL

**Propósito**: Página principal do inbox com 3 painéis

**Layout**:
```
┌─────────────────────────────────────────────────────────────┐
│  ChatList (25%)  │  ChatWindow (50%)  │  TicketPanel (25%) │
└─────────────────────────────────────────────────────────────┘
```

**Real-time**: Ativa via `useRealtime(organizationId)` na linha 31.

---

## 4. Problemas Identificados

### 4.1 CRÍTICO (Bloqueia funcionamento)

| # | Arquivo | Linha | Problema | Impacto |
|---|---------|-------|----------|---------|
| 1 | `server.ts` | 9 | Header `X-API-Key` ao invés de `Authorization: apikey` | 100% das publicações falham com 401 |

### 4.2 ALTO (Código duplicado/desnecessário)

| # | Arquivo | Linhas | Problema | Impacto |
|---|---------|--------|----------|---------|
| 2 | `webhook/route.ts` | 175-188 | Chama `WhatsAppChatService.processIncomingMessage()` após `WebhookProcessor` já ter processado | Processamento duplicado, queries extras no DB |
| 3 | `whatsapp-chat.service.ts` | 33-225 | Método `processIncomingMessage` duplica lógica do `messageHandler` | Manutenção duplicada, código confuso |

### 4.3 MÉDIO (Performance/Eficiência)

| # | Arquivo | Linhas | Problema | Impacto |
|---|---------|--------|----------|---------|
| 4 | `use-realtime.ts` | 84-86 | Invalida todas queries `chat-messages` ao invés de específica | Refetches desnecessários |

### 4.4 BAIXO (Limpeza)

| # | Arquivo | Problema | Impacto |
|---|---------|----------|---------|
| 5 | `publish/route.ts` | Endpoint não utilizado | Código morto |

---

## 5. Plano de Correção

### FASE 1: Correção Crítica (5 minutos)

**Arquivo**: `src/lib/centrifugo/server.ts`

```diff
  headers: {
    'Content-Type': 'application/json',
-   'X-API-Key': process.env.CENTRIFUGO_API_KEY!,
+   'Authorization': `apikey ${process.env.CENTRIFUGO_API_KEY}`,
  },
```

**Validação**:
1. Enviar mensagem de teste no WhatsApp
2. Verificar log: `[MessageHandler] ✓ Published to Centrifugo`
3. Confirmar mensagem aparece na tela sem refresh

---

### FASE 2: Remover Duplicação (15 minutos)

**Arquivo**: `src/app/api/v1/whatsapp/webhook/route.ts`

Remover linhas 174-188 (processamento legacy de mensagens):

```diff
- // Handle legacy message processing
- if (value?.messages && instanceId) {
-     for (const msg of value.messages) {
-         try {
-             const contactProfile = value.contacts?.find((c: any) => c.wa_id === msg.from)
-             await WhatsAppChatService.processIncomingMessage(
-                 instanceId,
-                 msg,
-                 contactProfile ? { name: contactProfile.profile.name } : undefined
-             )
-         } catch (err) {
-             console.error('[webhook] Error processing message:', msg.id, err)
-         }
-     }
- }
```

**Manter**: `processMessageEcho()` e `processStatusUpdate()` (linhas 191-211) - ainda são necessários.

---

### FASE 3: Otimizar Invalidação (10 minutos)

**Arquivo**: `src/features/whatsapp/inbox/hooks/use-realtime.ts`

```diff
  const messagesSub = subscribeTo(
    centrifuge,
    `org:${organizationId}:messages`,
    (data) => {
      console.log('[Centrifugo] Message event:', data)
-     queryClient.invalidateQueries({ queryKey: ['chat-messages'] })
+     // Invalidar apenas o chat específico
+     if (data.conversationId) {
+       queryClient.invalidateQueries({
+         queryKey: ['chat-messages', data.conversationId]
+       })
+     }
      queryClient.invalidateQueries({ queryKey: ['whatsapp-chats'] })
    }
  )
```

---

### FASE 4: Limpeza (Opcional)

1. **Remover** `src/app/api/v1/centrifugo/publish/route.ts` (não usado)
2. **Remover** `WhatsAppChatService.processIncomingMessage()` após validar que `messageHandler` funciona
3. **Atualizar** `.env.example` com variáveis do Centrifugo

---

## 6. Checklist de Validação

Após aplicar correções:

- [ ] Log mostra `[Centrifugo] ✓ Published to org:xxx:messages`
- [ ] Mensagem aparece em < 1 segundo sem refresh
- [ ] DevTools > Network > WS mostra eventos chegando
- [ ] Console mostra `[Centrifugo] Message event: {...}`
- [ ] Múltiplos chats abertos não causam refetch em cascata
- [ ] Status do componente (dev) mostra "Connected"

---

## 7. Resumo das Mudanças

| Fase | Arquivo | Ação | Linhas |
|------|---------|------|--------|
| 1 | `lib/centrifugo/server.ts` | Corrigir header | 9 |
| 2 | `webhook/route.ts` | Remover código duplicado | 174-188 |
| 3 | `use-realtime.ts` | Invalidação específica | 84-86 |
| 4 | `publish/route.ts` | Deletar arquivo | todo |

**Total de linhas a modificar**: ~20 linhas
**Total de linhas a remover**: ~30 linhas

---

## 8. Conclusão

O problema de 2 dias é causado por **uma única linha de código** com o header de autenticação errado. A correção é trivial (mudar `X-API-Key` para `Authorization: apikey`), mas o impacto é total - sem isso, nenhuma mensagem aparece em tempo real.

As demais correções (fases 2-4) são melhorias de qualidade: remover código duplicado e otimizar performance. Não são bloqueantes, mas deixam o código mais limpo e manutenível.
