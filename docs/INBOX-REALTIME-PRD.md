# WhaTrack Inbox - Real-time com Centrifugo: PRD

## Visão Geral

Redesenhar o inbox atual (2 painéis) para uma interface profissional de **3 painéis redimensionáveis** com atualizações em **tempo real via Centrifugo**.

### Objetivos

1. **Melhor UX**: 3 painéis (Conversas | Mensagens | Detalhes do Ticket)
2. **Performance**: Real-time push (não polling) - reduz 95% das requisições
3. **Escalabilidade**: Suporta 100+ usuários simultâneos sem degradação
4. **Organização**: Seletor de instância WhatsApp para empresas com múltiplos números

---

## Arquitetura

### Layout de 3 Painéis

```
┌──────────────┬─────────────────────────┬─────────────────┐
│              │                         │                 │
│  Conversas   │       Mensagens         │  Ticket Panel   │
│              │                         │                 │
│  [Selector]  │  ┌─────────────────┐   │  Stage: 🟡 Em   │
│  Instance    │  │ Lead Avatar     │   │  Atendimento    │
│              │  │ +55 11 9999...  │   │                 │
│  🔴 João     │  └─────────────────┘   │  Atribuído:     │
│  🟡 Maria    │                         │  👤 Ana         │
│  🟢 Pedro    │  Msg 1: Oi!            │                 │
│              │  Msg 2: Tudo bem?       │  Valor:         │
│              │                         │  R$ 1.500       │
│              │  [Digite mensagem...]   │                 │
│              │                         │  Janela: 🟢 18h │
│              │                         │                 │
│              │                         │  Origem:        │
│              │                         │  📊 Google Ads  │
│              │                         │                 │
│              │                         │  [Fechar]       │
└──────────────┴─────────────────────────┴─────────────────┘
 25% (15-40%)       50% (30%+)           25% (20-40%, collapse)
```

### Real-time com Centrifugo

```
┌─────────────────────────────────────────────────────────────┐
│ Frontend (React)                                             │
│  ┌───────────────────────────────────────────────────────┐  │
│  │ InboxPage                                              │  │
│  │  - useRealtime(organizationId)                         │  │
│  │  - Subscribe: org:{id}:messages                        │  │
│  │  - Subscribe: org:{id}:tickets                         │  │
│  └───────────────────┬───────────────────────────────────┘  │
│                      │ WebSocket                             │
│                      ▼                                        │
│              ┌───────────────┐                               │
│              │  Centrifugo   │                               │
│              │    Server     │                               │
│              └───────┬───────┘                               │
│                      │ HTTP Publish API                      │
│                      ▲                                        │
└──────────────────────┼───────────────────────────────────────┘
                       │
┌──────────────────────┼───────────────────────────────────────┐
│ Backend (Next.js API)│                                        │
│                      │                                        │
│  ┌───────────────────┴──────────────┐                        │
│  │ Message Handler (webhook)        │                        │
│  │  1. Save message to DB            │                        │
│  │  2. publishToCentrifugo()         │                        │
│  │     channel: org:{id}:messages    │                        │
│  └──────────────────────────────────┘                        │
│                                                               │
│  ┌──────────────────────────────────┐                        │
│  │ Ticket Update (PATCH /tickets)   │                        │
│  │  1. Update ticket in DB           │                        │
│  │  2. publishToCentrifugo()         │                        │
│  │     channel: org:{id}:tickets     │                        │
│  └──────────────────────────────────┘                        │
└───────────────────────────────────────────────────────────────┘
```

**Benefício**:
- Polling: 100 usuários × 12 req/min = **1.200 req/min** = 20 req/s
- Centrifugo: 100 conexões × push quando necessário = **~10 req/min** total

**Redução: 99%** de carga no servidor.

---

## Componentes

### 1. Painel Esquerdo: Conversas

**Arquivo**: `src/features/whatsapp/inbox/components/chat-list.tsx`

**Novidades**:
- ✅ Instance Selector (dropdown no topo)
- ✅ Badge de status do ticket (🟡 aberto, 🟢 ganho, 🔴 perdido)
- ✅ Contador de mensagens não lidas
- ✅ Filtro por instância

**UI**:
```
┌────────────────────────────────┐
│ [Dropdown: Todas instâncias ▼]│
│ ┌────────────────────────────┐ │
│ │ 🔍 Buscar...               │ │
│ └────────────────────────────┘ │
│                                │
│ ┌────────────────────────────┐ │
│ │ 👤 João Silva          🔴3│ │ ← Unread count
│ │ 📱 +55 11 99999-8888       │ │
│ │ Último: "Olá, tudo bem?"   │ │
│ │ 🟡 Em Atendimento   10:30  │ │ ← Status badge
│ └────────────────────────────┘ │
│                                │
│ ┌────────────────────────────┐ │
│ │ 👤 Maria Santos            │ │
│ │ ...                        │ │
│ └────────────────────────────┘ │
└────────────────────────────────┘
```

### 2. Painel Central: Mensagens

**Arquivo**: `src/features/whatsapp/inbox/components/chat-window.tsx`

**Mudanças**: Mínimas
- Remove `refetchInterval` (Centrifugo cuida)
- Mantém scroll automático
- Mantém UI de mensagens

### 3. Painel Direito: Ticket Details (NOVO)

**Arquivo**: `src/features/whatsapp/inbox/components/ticket-panel.tsx`

**Seções**:

1. **Header**: Ticket ID + Status badge
2. **Stage**: Badge colorido + dropdown para mudar
3. **Assignee**: Avatar + nome + dropdown para reassign
4. **Deal Value**: Input editável (R$)
5. **Janela 24h**:
   - 🟢 Aberta (expira em 18h 30min)
   - 🔴 Expirada (Envie um template)
6. **Tracking**:
   - UTM params (source, medium, campaign)
   - Click IDs (gclid, fbclid, ctwaclid)
   - Source type badge
7. **Actions**:
   - Button: "Fechar como Ganho" (green)
   - Button: "Fechar como Perdido" (red)

**Props**:
```typescript
interface TicketPanelProps {
  conversationId: string
  organizationId: string
}
```

**Data Hook**: Usa `useQuery` + Centrifugo invalidation

---

## Centrifugo Integration

### Frontend

#### 1. Install Client
```bash
npm install centrifuge
```

#### 2. Create Centrifugo Client

**File**: `src/lib/centrifugo/client.ts`

```typescript
import Centrifuge from 'centrifuge'

export function createCentrifugoClient(token: string) {
  return new Centrifuge(process.env.NEXT_PUBLIC_CENTRIFUGO_URL!, {
    token,
  })
}

export function subscribeTo(
  client: Centrifuge,
  channel: string,
  onMessage: (data: any) => void
) {
  const sub = client.newSubscription(channel)
  sub.on('publication', (ctx) => onMessage(ctx.data))
  sub.subscribe()
  return sub
}
```

#### 3. Real-time Hook

**File**: `src/features/whatsapp/inbox/hooks/use-realtime.ts`

```typescript
import { useEffect } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { createCentrifugoClient, subscribeTo } from '@/lib/centrifugo/client'

export function useRealtime(organizationId: string, token: string) {
  const queryClient = useQueryClient()

  useEffect(() => {
    if (!token) return

    const client = createCentrifugoClient(token)
    client.connect()

    // Subscribe to messages
    const msgSub = subscribeTo(
      client,
      `org:${organizationId}:messages`,
      () => {
        queryClient.invalidateQueries({ queryKey: ['chat-messages'] })
        queryClient.invalidateQueries({ queryKey: ['whatsapp-chats'] })
      }
    )

    // Subscribe to tickets
    const ticketSub = subscribeTo(
      client,
      `org:${organizationId}:tickets`,
      () => {
        queryClient.invalidateQueries({ queryKey: ['conversation-ticket'] })
      }
    )

    return () => {
      msgSub.unsubscribe()
      ticketSub.unsubscribe()
      client.disconnect()
    }
  }, [organizationId, token, queryClient])
}
```

### Backend

#### 1. Token Generation

**File**: `src/app/api/v1/centrifugo/token/route.ts`

```typescript
import { NextResponse } from 'next/server'
import { createHmac } from 'crypto'
import { validateFullAccess } from '@/server/auth/validate-organization-access'

export async function GET(req: Request) {
  const access = await validateFullAccess(req)
  if (!access.hasAccess) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const claims = {
    sub: access.userId,
    exp: Math.floor(Date.now() / 1000) + 3600, // 1 hour
    info: { organizationId: access.organizationId },
  }

  const token = createHmac(
    'sha256',
    process.env.CENTRIFUGO_TOKEN_HMAC_SECRET_KEY!
  )
    .update(JSON.stringify(claims))
    .digest('hex')

  return NextResponse.json({ token })
}
```

#### 2. Publisher Service

**File**: `src/lib/centrifugo/server.ts`

```typescript
export async function publishToCentrifugo(channel: string, data: any) {
  await fetch(`${process.env.CENTRIFUGO_URL}/api/publish`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `apikey ${process.env.CENTRIFUGO_API_KEY}`,
    },
    body: JSON.stringify({ channel, data }),
  })
}
```

#### 3. Integrate in Message Handler

**File**: `src/services/whatsapp/handlers/message.handler.ts`

Add after saving message:

```typescript
import { publishToCentrifugo } from '@/lib/centrifugo/server'

// After message saved
await publishToCentrifugo(`org:${organizationId}:messages`, {
  type: 'new_message',
  leadId: lead.id,
  messageId: createdMessage.id,
})
```

#### 4. Integrate in Ticket Endpoints

**Files**:
- `src/app/api/v1/tickets/[ticketId]/route.ts` (PATCH)
- `src/app/api/v1/tickets/[ticketId]/close/route.ts` (POST)

Add after ticket update:

```typescript
await publishToCentrifugo(`org:${organizationId}:tickets`, {
  type: 'ticket_updated',
  ticketId: ticket.id,
})
```

---

## API Endpoints

### Novos Endpoints

| Método | Endpoint | Descrição |
|--------|----------|-----------|
| GET | `/api/v1/whatsapp/instances` | Lista instâncias WhatsApp da org |
| GET | `/api/v1/centrifugo/token` | Gera token JWT para Centrifugo |

### Endpoints Modificados

| Método | Endpoint | Modificação |
|--------|----------|-------------|
| GET | `/api/v1/whatsapp/chats` | Adiciona filtro `?instanceId=` |
| GET | `/api/v1/whatsapp/chats` | Inclui `currentTicket` no response |

---

## Dados e Tipos

### ChatItem (atualizado)

```typescript
interface ChatItem {
  id: string
  name: string
  phone: string | null
  profilePicUrl: string | null
  lastMessageAt: string | Date
  lastMessage: Message | null
  // NOVO:
  unreadCount?: number
  currentTicket?: {
    id: string
    status: string
    stage: {
      name: string
      color: string
    }
  }
}
```

### Instance

```typescript
interface WhatsAppInstance {
  id: string
  displayPhone: string
  verifiedName: string
  status: 'connected' | 'disconnected'
  wabaId: string
}
```

---

## Resizable Panels

Usando `react-resizable-panels` (já instalado):

```tsx
import {
  ResizablePanelGroup,
  ResizablePanel,
  ResizableHandle,
} from '@/components/ui/resizable'

<ResizablePanelGroup direction="horizontal">
  <ResizablePanel defaultSize={25} minSize={15} maxSize={40}>
    <ChatList />
  </ResizablePanel>

  <ResizableHandle withHandle />

  <ResizablePanel defaultSize={50} minSize={30}>
    <ChatWindow />
  </ResizablePanel>

  <ResizableHandle withHandle />

  <ResizablePanel defaultSize={25} minSize={20} maxSize={40} collapsible>
    <TicketPanel />
  </ResizablePanel>
</ResizablePanelGroup>
```

**Tamanhos**:
- Left: 25% default (15-40% range)
- Middle: 50% default (30%+ min)
- Right: 25% default (20-40% range, collapsible)

---

## Environment Variables

```env
# Backend
CENTRIFUGO_URL=http://localhost:8000
CENTRIFUGO_API_KEY=your-api-key
CENTRIFUGO_TOKEN_HMAC_SECRET_KEY=your-secret-key

# Frontend
NEXT_PUBLIC_CENTRIFUGO_URL=ws://localhost:8000/connection/websocket
```

**Nota**: Valores já configurados na infra atual.

---

## Implementação

### Fase 1: Setup Centrifugo
- [ ] Criar `src/lib/centrifugo/client.ts`
- [ ] Criar `src/lib/centrifugo/server.ts`
- [ ] Criar endpoint `/api/v1/centrifugo/token`
- [ ] Criar hook `use-realtime.ts`
- [ ] Testar conexão WebSocket

### Fase 2: Backend Integration
- [ ] Publicar em `message.handler.ts` (nova mensagem)
- [ ] Publicar em `PATCH /tickets/:id` (update ticket)
- [ ] Publicar em `POST /tickets/:id/close` (fechar ticket)
- [ ] Criar endpoint `/api/v1/whatsapp/instances`
- [ ] Adicionar filtro `instanceId` em `/api/v1/whatsapp/chats`
- [ ] Incluir `currentTicket` na response de chats

### Fase 3: UI Components
- [ ] Criar `instance-selector.tsx`
- [ ] Atualizar `chat-list.tsx` (badges, unread count)
- [ ] Criar `ticket-panel.tsx` (7 seções)
- [ ] Atualizar `types.ts` (ChatItem, Instance)

### Fase 4: Layout Refactor
- [ ] Refatorar `inbox/page.tsx` com ResizablePanelGroup
- [ ] Integrar `useRealtime()` hook
- [ ] Remover `refetchInterval` de queries
- [ ] Testar resize e collapse

### Fase 5: Polish
- [ ] Loading states
- [ ] Error boundaries
- [ ] Empty states
- [ ] Accessibility (keyboard nav)
- [ ] Mobile responsive (future)

---

## Testing Checklist

### Centrifugo
- [ ] Token gerado corretamente
- [ ] WebSocket conecta
- [ ] Subscrições funcionam
- [ ] Desconexão graceful
- [ ] Reconnect automático

### Real-time Updates
- [ ] Nova mensagem aparece instantaneamente
- [ ] Ticket update reflete em tempo real
- [ ] Lista de chats atualiza automaticamente
- [ ] Funciona com múltiplos usuários simultaneamente

### Instance Selector
- [ ] Lista todas as instâncias conectadas
- [ ] "Todas as instâncias" funciona
- [ ] Filtro por instância funciona
- [ ] Auto-select se apenas 1 instância

### Resizable Panels
- [ ] Drag left handle redimensiona
- [ ] Drag right handle redimensiona
- [ ] Min/max sizes respeitados
- [ ] Right panel collapsible funciona
- [ ] Layout responsivo

### Ticket Panel
- [ ] Mostra dados corretos
- [ ] Stage dropdown funciona
- [ ] Assignee dropdown funciona
- [ ] Deal value salva
- [ ] Janela 24h countdown atualiza
- [ ] Botões de fechar funcionam

---

## Performance

### Comparação: Polling vs Centrifugo

| Métrica | Polling (5s) | Centrifugo |
|---------|--------------|------------|
| Requests/min (100 users) | 1.200 | ~10 |
| Latência | 0-5s | <100ms |
| Load no DB | Alto | Baixo |
| Custo infra | Alto | Baixo |
| Escalabilidade | Ruim | Excelente |

### Otimizações

1. **React Query**:
   - `staleTime: 5 * 60 * 1000` (5 min)
   - Invalidate apenas quando Centrifugo notifica

2. **Centrifugo**:
   - Single connection per user
   - Token refresh automático (50min)
   - Graceful degradation

3. **Bundle**:
   - Centrifuge client: ~15KB gzipped
   - Lazy load TicketPanel

---

## Rollback Plan

Se houver problemas:
1. ✅ Código antigo ainda funciona (não há breaking changes)
2. ✅ Pode desabilitar Centrifugo e voltar para polling
3. ✅ Resizable panels são opt-in (pode reverter para w-80)

---

## Future Enhancements

- [ ] Unread message tracking (backend + DB)
- [ ] Panel size persistence (localStorage)
- [ ] Mobile responsive layout
- [ ] Keyboard shortcuts (Alt+1/2/3)
- [ ] Quick actions (templates, canned responses)
- [ ] Ticket history timeline
- [ ] Multi-tab ticket support

---

## Files Summary

### Arquivos Novos (9)
- `src/features/whatsapp/inbox/components/ticket-panel.tsx`
- `src/features/whatsapp/inbox/components/instance-selector.tsx`
- `src/features/whatsapp/inbox/hooks/use-realtime.ts`
- `src/app/api/v1/whatsapp/instances/route.ts`
- `src/app/api/v1/centrifugo/token/route.ts`
- `src/lib/centrifugo/client.ts`
- `src/lib/centrifugo/server.ts`
- `docs/INBOX-REALTIME-PRD.md` (este arquivo)

### Arquivos Modificados (5)
- `src/app/dashboard/whatsapp/inbox/page.tsx`
- `src/features/whatsapp/inbox/components/chat-list.tsx`
- `src/features/whatsapp/inbox/types.ts`
- `src/app/api/v1/whatsapp/chats/route.ts`
- `src/services/whatsapp/handlers/message.handler.ts`

**Total**: 14 arquivos (9 novos, 5 modificados)
