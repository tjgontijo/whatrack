# WhaTrack - Sincronizacao de Historico ao Conectar Instancia (Coexistencia): PRD

## Visao Geral

Quando um cliente conecta uma instancia WhatsApp que ja usa o WhatsApp Business App, podemos habilitar a **Coexistencia** (uso simultaneo do App + Cloud API) e receber o **historico de conversas** via webhooks. O historico chega em eventos `history`, os contatos chegam via `smb_app_state_sync`, e novas mensagens enviadas pelo App depois do onboarding chegam via `smb_message_echoes`. Esses eventos permitem importar o passado e manter a inbox sincronizada com o App.

## Objetivos

1. Popular o inbox com conversas existentes no momento da conexao.
2. Reduzir tempo ate o primeiro atendimento com contexto.
3. Manter as mensagens enviadas no App sincronizadas no WhaTrack.
4. Registrar status e progresso da importacao por instancia.

## Nao Objetivos

- Nao buscar historico para numeros criados diretamente na Cloud API.
- Nao garantir 100% de historico alem do que a Meta enviar.
- Nao importar dados de WhatsApp pessoal.
- **Não criar Tickets durante sincronização de histórico.**
- **Não abrir/estender janela de 24h automaticamente para leads de histórico.**

## Premissas e Dependencias

- A sincronizacao de historico depende de **Coexistencia** (numero ativo no WhatsApp Business App).
- O usuario precisa **aprovar o compartilhamento de historico** durante o onboarding.
- O historico e entregue via webhooks em **chunks** com metadata de progresso.
- Webhooks necessarios:
  - `history` (historico passado)
  - `smb_app_state_sync` (contatos atuais e futuros)
  - `smb_message_echoes` (mensagens novas enviadas pelo App)
- O processamento precisa ser **assincorno** e **idempotente**.

## Fluxo do Usuario (UI)

### Entry point
**Arquivo**: `src/app/dashboard/settings/whatsapp/page.tsx`

1. Usuario clica em **Nova Instancia**.
2. Exibir escolha:
   - "Conectar numero existente (Coexistencia)"
   - "Criar novo numero (Cloud API)"
3. Se escolher Coexistencia, mostrar checkbox:
   - "Sincronizar historico de mensagens (requer aprovacao no WhatsApp Business App)"
4. Embedded Signup continua normalmente.
5. Ao final, mostrar status da importacao na lista de instancias (InstanceCard).

### Estados e Mensagens
- **Aguardando consentimento**
- **Sincronizando historico** (com % e fase)
- **Concluido**
- **Recusado pelo negocio**
- **Falhou (ver detalhes)**

## Requisitos Funcionais

1. Persistir status de sincronizacao por instancia.
2. Importar mensagens de `history` para `Message` e criar/atualizar `Lead` + `Conversation`.
3. Importar/atualizar contatos via `smb_app_state_sync`.
4. Inserir mensagens do App via `smb_message_echoes` como `Message` com origem especifica.
5. Exibir progresso na UI (fase, chunk, percent).
6. Permitir ver logs basicos e erro de importacao.
7. **NÃO criar Ticket durante sincronização de histórico.**
8. **NÃO abrir janela de 24h para leads originários de histórico.**

## Webhook Processing - Diferenças de Origem

### `smb_app_state_sync` (Contatos)
**Quando chega:** Na aprovação do sincronismo + continuamente
**O que fazer:**
```typescript
// Apenas UPSERT de Lead, SEM Ticket
for (const contact of payload.state_sync) {
  if (contact.action === 'add') {
    await db.lead.upsert({
      where: { phoneNumber: normalizeE164(contact.contact.phone_number) },
      create: {
        phoneNumber: normalizeE164(contact.contact.phone_number),
        pushName: contact.contact.full_name,
        source: 'state_sync',
        organizationId: config.organizationId,
      },
      update: {
        pushName: contact.contact.full_name,
        waId: contact.contact.wa_id,
        lastSyncedAt: new Date(),
      }
    });
  } else if (contact.action === 'delete') {
    // Marcar como inativo/deleted
    await db.lead.update({
      where: { phoneNumber: normalizeE164(contact.contact.phone_number) },
      data: { isActive: false, deletedAt: new Date() }
    });
  }
}
```

### `history` (Mensagens Passadas)
**Quando chega:** Após `smb_app_state_sync`, em chunks
**O que fazer:**
```typescript
// 1. UPSERT Lead (se não existe)
// 2. UPSERT Conversation
// 3. UPSERT Messages (source: 'history')
// 4. NÃO criar Ticket

for (const thread of payload.history) {
  const lead = await db.lead.upsert({
    where: { waId: thread.context.wa_id },
    create: {
      waId: thread.context.wa_id,
      source: 'history_sync',
      organizationId: config.organizationId,
    },
    update: { lastSyncedAt: new Date() }
  });

  const conversation = await db.conversation.upsert({
    where: { leadId_instanceId: { leadId: lead.id, instanceId: config.id } },
    create: { leadId: lead.id, instanceId: config.id },
    update: { updatedAt: new Date() }
  });

  for (const msg of thread.messages) {
    await db.message.upsert({
      where: { wamid: msg.id },
      create: {
        wamid: msg.id,
        leadId: lead.id,
        conversationId: conversation.id,
        instanceId: config.id,
        source: 'history',
        direction: msg.history_context.from_me ? 'OUTBOUND' : 'INBOUND',
        type: msg.type,
        body: msg.text?.body || null,
        timestamp: new Date(parseInt(msg.timestamp) * 1000),
        status: msg.history_context.status,
        // NÃO criar ticket aqui
      }
    });
  }
}
```

### `messages` (Novas mensagens ao vivo)
**Quando chega:** Quando novo contato envia OU histórico-lead responde
**O que fazer:**
```typescript
// 1. UPSERT Lead
// 2. UPSERT Conversation
// 3. Create Message (source: 'live')
// 4. **APENAS AGORA**: Create Ticket (sem messageWindowExpiresAt se history-lead)

const wasHistoryLead = lead.source === 'history_sync';

const ticket = await db.ticket.create({
  leadId: lead.id,
  conversationId: conversation.id,
  source: 'incoming_message',
  originatedFrom: wasHistoryLead ? 'history_lead' : 'new_contact',
  stage: 'new',
  status: 'open',

  // CHAVE: Sem janela para histórico
  messageWindowExpiresAt: wasHistoryLead ? null : addHours(now, 24),

  organizationId: lead.organizationId,
});
```

### `smb_message_echoes` (Mensagens enviadas pelo App)
**Quando chega:** Quando agent responde no WhaTrack após histórico
**O que fazer:**
```typescript
// 1. Encontrar Message existente (pode estar como 'pending')
// 2. Atualizar status para 'sent' ou 'delivered'
// 3. Registrar como echo confirmado

const message = await db.message.update({
  where: { wamid: payload.message_id },
  data: {
    source: 'app_echo',
    status: 'sent',
    metaConfirmedAt: new Date(),
  }
});
```

## Requisitos Tecnicos

### Webhooks
- Partner webhook deve receber `history` e `smb_app_state_sync`.
- Phone number webhook deve receber `smb_message_echoes`.
- Salvar payload bruto em `WhatsAppWebhookLog`.

### Processamento de Historico
- Para cada thread:
  - Normalizar numero do contato (E.164).
  - Upsert de `Lead` por telefone.
  - Upsert de `Conversation` por lead + instance.
  - Upsert de `Message` por `wamid` (idempotencia).
- Definir `direction` a partir do `from` vs numero da empresa.
- Usar `timestamp` do webhook como `Message.timestamp`.

### Assincrono e Resiliencia
- Enfileirar cada chunk de historico para processamento (fila/worker).
- Permitir retry em caso de erro parcial.
- Guardar `chunk_order`, `phase` e `progress` para UI.

## Modelo de Dados (Proposta)

### WhatsAppConnection (ou WhatsAppConfig)
- `historySyncStatus` (enum: not_supported | pending_consent | syncing | completed | declined | failed)
- `historySyncStartedAt`
- `historySyncCompletedAt`
- `historySyncProgress` (int 0-100)
- `historySyncPhase` (string)
- `historySyncChunkOrder` (int)
- `historySyncError` (string)

### WhatsAppHistorySync (nova tabela opcional)
- `id`
- `connectionId`
- `status`
- `phase`
- `chunkOrder`
- `progress`
- `lastPayloadAt`
- `errorCode`
- `errorMessage`

### Message (ajuste)
- `source` (enum: live | history | app_echo)
- `historyStatus` (string, de `history_context.status`)
- `rawMeta` (Json, opcional)

## Lead, Ticket e Origem - ESPECIFICAÇÕES CRÍTICAS

### 1. CRIAÇÃO DE LEAD ✅
**SIM, será criado automaticamente ao processar histórico**

Para cada thread no webhook `history`:
```typescript
const lead = await db.lead.upsert({
  where: { phoneNumber: normalizeE164(thread.context.wa_id) },
  update: {
    pushName: contact.full_name || contact.first_name,
    // Outros campos de atualização se necessário
  },
  create: {
    organizationId: config.organizationId,
    phoneNumber: normalizeE164(thread.context.wa_id),
    pushName: contact.full_name || contact.first_name,
    waId: thread.context.wa_id,
    source: 'history_sync', // Origem explícita
    lastMessageAt: new Date(parseInt(maxTimestamp) * 1000),
    // Não criar com status ativo até receber msg ao vivo
  }
});
```

**Campo novo:** `source` em Lead
- `'direct_creation'` - Número criado manualmente
- `'live_message'` - Primeiro webhook de mensagem ao vivo
- `'history_sync'` - Importado via histórico
- `'state_sync'` - Criado via `smb_app_state_sync`

### 2. NÃO CRIAR TICKET AUTOMATICAMENTE ❌
**NÃO criar Ticket durante importação de histórico**

Razões:
- Histórico é passado, conversas podem estar arquivadas
- Não queremos reabrir conversas antigas
- Lead sem atividade recente (histórico) não deve gerar ticket
- Evita clutter na fila de atendimento

**Fluxo correto:**
1. Histórico importado → Lead criado → **Sem ticket**
2. Nova mensagem ao vivo (`messages` webhook) → **Apenas aí cria ticket**

### 3. ORIGEM DO TICKET: `source` ✅
**Campo novo em Ticket:**
```prisma
source: String // enum: 'incoming_message' | 'api' | 'manual'
originatedFrom: String // Rastreia se foi histórico
```

Quando uma mensagem ao vivo chega após histórico:
```typescript
const ticket = await db.ticket.create({
  leadId: lead.id,
  conversationId: conversation.id,
  source: 'incoming_message',
  originatedFrom: lead.source === 'history_sync' ? 'history_lead' : 'new_contact',
  status: 'open',
  stage: 'new',
  // NÃO incluir messageWindowExpiresAt automaticamente
});
```

### 4. NÃO ABRIR JANELA DE 24H PARA HISTÓRICO ❌
**CRÍTICO: Sem expiração de janela para leads do histórico**

```typescript
// ERRADO ❌
const ticket = await db.ticket.create({
  ...
  messageWindowExpiresAt: addHours(now, 24), // NÃO FAZER ISSO
});

// CORRETO ✅
// Para lead com source = 'history_sync', NÃO setar janela
const ticket = await db.ticket.create({
  ...
  messageWindowExpiresAt: lead.source === 'history_sync'
    ? null  // Sem janela de 24h
    : addHours(now, 24), // Apenas para novos contatos ao vivo
});
```

**Lógica de Janela de Mensagem:**
- `history_sync` leads: **Sem janela** (pode responder sempre)
- Novos contatos ao vivo: **24h de janela** (padrão)
- Contatos que respondem: **Estender janela** (+24h)

### 5. WORKFLOW DE EXEMPLO

**Cenário: Lead com histórico recebe mensagem ao vivo**

```
1. Webhook history chega
   ├─ Lead criado (source: 'history_sync')
   ├─ Conversation criada
   ├─ Messages importadas (source: 'history')
   └─ NÃO cria ticket

2. Dias depois: Webhook messages (msg ao vivo)
   ├─ Message criada (source: 'live')
   ├─ Lead.lastMessageAt atualizado
   ├─ Ticket criado (source: 'incoming_message', originatedFrom: 'history_lead')
   ├─ messageWindowExpiresAt: null (SEM LIMITE)
   └─ Badge em InstanceCard: "Histórico + nova msg"

3. Agent clica no ticket
   ├─ Vê TODA conversa (histórico + ao vivo)
   ├─ Pode responder sem restrição de janela
   └─ lastMessageAt atualizado
```

### 6. API RESPONSES - Incluir Origem

```json
{
  "ticket": {
    "id": "uuid",
    "source": "incoming_message",
    "originatedFrom": "history_lead",
    "messageWindowExpiresAt": null,
    "lead": {
      "id": "uuid",
      "phoneNumber": "+5511999999999",
      "source": "history_sync",
      "createdAt": "2024-01-15T10:30:00Z",
      "lastMessageAt": "2024-01-20T14:45:00Z"
    },
    "messages": [
      {
        "id": "msg1",
        "source": "history",
        "timestamp": "2024-01-10T09:00:00Z",
        "body": "Oi, tudo bem?"
      },
      {
        "id": "msg2",
        "source": "live",
        "timestamp": "2024-01-20T14:45:00Z",
        "body": "Voltei a escrever!"
      }
    ]
  }
}
```

## UX - InstanceCard

- Badge: "Historico: 0% / 100% / Recusado"
- CTA: "Ver detalhes"
- Tooltip: "Historico depende de aprovacao no WhatsApp Business App"

## Observabilidade

- Contadores: mensagens importadas, contatos importados, tempo total.
- Logar inicio/fim de sync em `WhatsAppAuditLog`.
- Alertar se nao receber `history` em X minutos apos onboarding.

## Riscos e Limitacoes

- Historico pode ser recusado pelo usuario.
- Webhook pode chegar fora de ordem; usar `chunk_order`.
- Midia pode exigir download posterior.
- Coexistencia pode ter restricoes por pais/conta.

## MVP

1. Habilitar escolha de Coexistencia + checkbox de historico.
2. Capturar `history` e importar mensagens.
3. UI com status basico (syncing/ok/failed).

## Fora de Escopo (MVP)

- Analise de sentimento.
- Importacao retroativa via API manual.
- Exportacao de historico.

## Decisões de Design - CRÍTICAS

### D1: Lead SERÁ criado, Ticket NÃO será criado
**Decisão:** Durante `history` webhook, fazer UPSERT de Lead mas NÃO criar Ticket.

**Justificativa:**
- Conversas históricas podem estar encerradas/arquivadas
- Evita clutter na fila de atendimento com conversas antigas
- Lead fica disponível quando novo contato escrever (msg ao vivo)
- Melhor UX: inbox limpo, sem re-abertura automática de casos fechados

**Implementação:**
```typescript
// em handlers/history.handler.ts
async handleHistoryWebhook(payload) {
  for (const thread of payload.history) {
    // ✅ Cria Lead
    const lead = await createOrUpdateLead(thread);

    // ✅ Cria Messages
    await createMessages(thread.messages, lead);

    // ❌ NÃO cria Ticket
    // ❌ NÃO abre janela de 24h
  }
}
```

### D2: Sem Janela de 24h para Leads de Histórico
**Decisão:** Leads originários de `history_sync` NÃO têm `messageWindowExpiresAt`.

**Justificativa:**
- Contexto histórico indica relação estabelecida
- Meta permite respostas ilimitadas em conversas ativas
- Agent pode responder conforme necessário
- Protege contra perda de contexto por expiração artificial

**Implementação:**
```typescript
const ticket = await db.ticket.create({
  messageWindowExpiresAt: lead.source === 'history_sync'
    ? null  // ✅ Sem limite
    : addHours(now, 24), // ❌ Apenas novo contato ao vivo
});
```

### D3: Campo `source` Obrigatório em Todos os Recursos
**Decisão:** Rastrear origem em Lead, Message e Ticket.

**Valores:**
- **Lead.source**: `'direct_creation'` | `'live_message'` | `'history_sync'` | `'state_sync'`
- **Message.source**: `'live'` | `'history'` | `'app_echo'`
- **Ticket.source**: `'incoming_message'` | `'api'` | `'manual'`
- **Ticket.originatedFrom**: `'new_contact'` | `'history_lead'` | `'existing'`

**Justificativa:**
- Rastreabilidade completa
- Análises separadas: histórico vs ao vivo
- Debugging de sincronização
- Conformidade com auditoria

### D4: Ordem de Processamento dos Webhooks
**Ordem esperada da Meta:**
1. `smb_app_state_sync` (contatos) - uma vez
2. `history` chunks (mensagens) - múltiplas vezes com progresso
3. `messages` (novo ao vivo) - contínuo depois

**Processamento:**
```
Webhook 1: smb_app_state_sync
  → Cria/atualiza Leads
  → Config.historySyncStatus = 'pending_history'

Webhook 2-N: history (chunks)
  → Processa Messages
  → Atualiza Config.historySyncProgress
  → Config.historySyncStatus = 'syncing'

Webhook N+1: history (última chunk com progress=100)
  → Config.historySyncStatus = 'completed'

Webhook N+2+: messages (ao vivo)
  → Cria Ticket (sem janela se history-lead)
  → Config.messageWindowExpiresAt considerado
```

### D5: Idempotência via `wamid`
**Decisão:** Todas as Messages usam `wamid` como unique key.

**Proteção contra:**
- Webhooks duplicados
- Re-processamento de chunks
- Mensagens perdidas em retry

```typescript
await db.message.upsert({
  where: { wamid: msg.id },  // ← chave única
  create: { ... },
  update: { /* apenas campos seguros */ }
});
```

## Referencias

- Meta Developer Docs (Embedded Signup - Business App Users):
  https://developers.facebook.com/docs/whatsapp/embedded-signup/custom-flows/onboarding-business-app-users/
- 360dialog Coexistence Webhooks:
  https://docs.360dialog.com/partner/waba-management/whatsapp-coexistence/coexistence-webhooks
- 360dialog Coexistence Overview:
  https://docs.360dialog.com/docs/hub/embedded-signup/whatsapp-coexistence
