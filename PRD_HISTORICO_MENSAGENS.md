# PRD: Recuperação de Histórico de Mensagens ao Conectar Instância WhatsApp

**Versão:** 1.0
**Data:** 2026-02-16
**Prioridade:** Alta
**Epic:** WhatsApp Message History Recovery

---

## 1. Visão Geral

Quando um usuário conecta uma nova instância do WhatsApp (número de telefone) via OAuth, queremos recuperar o histórico de conversas e mensagens existentes do contato para sincronizar com nosso banco de dados, fornecendo contexto completo para o atendimento.

### 1.1 Limitação Técnica Importante

⚠️ **A Meta WhatsApp Cloud API não fornece endpoints nativos para recuperar histórico de mensagens anterior à data de conexão.** A API only permite:

1. **Receber novas mensagens** via webhooks em tempo real (ponto de conexão em diante)
2. **Enviar mensagens** usando a API
3. **Acessar informações de contato** (nome, foto do perfil, número)

**Implicação:** Não temos acesso a mensagens anteriores ao momento de conexão da API com a Meta.

### 1.2 Abordagem Alternativa Proposta

Implementar **message capture a partir do ponto de onboarding**, capturando:
- ✅ Novos contatos criados após a conexão
- ✅ Todas as mensagens desses contatos (inbound/outbound)
- ✅ Mensagens bidirecionais (lead → agent e agent → lead)
- ✅ Contexto de conversas (threads, replies)
- ✅ Metadados de status (entregue, lido, falha)

---

## 2. Contexto Técnico

### 2.1 Como Funciona a API Meta WhatsApp Cloud

```
┌─────────────────────────────────────────────────────────────┐
│                    Meta WhatsApp Cloud                       │
│  (Número telefônico, tokens, webhook registration)           │
└────────────────┬────────────────────────────────────────────┘
                 │
                 │ 1. Webhook Registration
                 │    POST /phone_number_id/subscribed_apps
                 │
                 ├─── 2. User sends message ───┐
                 │                              │
                 └─→ Webhook Event (HTTPS POST)┘
                     X-Hub-Signature-256 validation
                     Event JSON with message body
```

### 2.2 Fluxo de Onboarding Atual

```
1. User clicks "Nova Instância"
2. EmbeddedSignupButton → Meta OAuth Flow
3. Meta calls callback com authorization_code
4. System exchanges code for access_token + WABA info
5. Token stored (encrypted AES-256-GCM)
6. Webhook registered on Meta infrastructure
7. WhatsAppConfig created in DB
```

### 2.3 Estrutura de Dados Existente

**Tabelas principais:**
- `whatsapp_configs` - Instância conectada (WABA ID, token)
- `leads` - Contatos (waId, number, pushName, profilePicUrl)
- `whatsapp_messages` - Mensagens (direction, type, body, status)
- `conversations` - Agrupa mensagens por lead+instância
- `tickets` - Agrupa conversas para atendimento

**Webhook types já suportados:**
- `messages` - Mensagens recebidas
- `statuses` - Atualizações de entrega/leitura
- `account_update` - Eventos de onboarding
- `message_template_status_update` - Aprovações

---

## 3. Solução: Message Capture & Synchronization

### 3.1 Arquitetura de Recuperação

Como não temos acesso a histórico anterior, implementaremos:

#### Fase 1: **Data de Conexão + Primeira Sincronização**
- Registrar exatamente quando o webhook foi ativado
- Marcar no `whatsapp_configs.webhookActivatedAt`
- Todas as mensagens são a partir deste ponto

#### Fase 2: **Captura de Novos Contatos**
- Quando um novo contato envia primeira mensagem via webhook
- Requisitar dados do contato via Meta API: `/phone_id/contacts`
- Armazenar metadados iniciais (nome, foto perfil, status ativo)

#### Fase 3: **Sincronização de Histórico (Simulado)**
- Para contatos existentes, buscar informações via Graph API
- Rastrear timespan de conversas (firstMessageAt, lastMessageAt)
- Nota: **Apenas dados novos serão capturados**

### 3.2 Nova API: GET /conversations/sync

Endpoint para sincronizar histórico de um contato:

```typescript
GET /api/v1/whatsapp/conversations/sync

Query Parameters:
- leadId: string (UUID do lead)
- limit: number = 100 (max 1000)
- cursor: string (para pagination)
- fromDate: ISO8601 (filtro de data)

Response:
{
  messages: [
    {
      id: string,
      wamid: string,
      type: "text" | "image" | "video" | etc,
      body: string,
      mediaUrl?: string,
      direction: "INBOUND" | "OUTBOUND",
      timestamp: ISO8601,
      status: "sent" | "delivered" | "read" | "failed",
      from: { name: string, number: string },
      context?: { messageId: string } // reply_to
    }
  ],
  pagination: {
    cursor: string | null,
    hasMore: boolean,
    total: number
  },
  metadata: {
    firstMessageAt: ISO8601,
    lastMessageAt: ISO8601,
    totalMessages: number,
    syncedUpTo: ISO8601
  }
}
```

### 3.3 Webhook Enhancement para Message Batching

Modificar `WebhookProcessor` para:

```typescript
// Novo campo em whatsapp_messages
batchId: string (agrupa msgs recebidas no mesmo webhook)
batchReceivedAt: timestamp

// Novo handler: message.batch.handler.ts
ProcessMessageBatch() {
  // Agrupa mensagens do mesmo webhook
  // Detecta padrões (bot responses, auto-replies)
  // Marca como "initial_sync" se primeira mensagem
}
```

---

## 4. Implementação Detalhada

### 4.1 Migração de Schema

**Novo arquivo:** `prisma/migrations/whatsapp_conversation_sync.sql`

```sql
-- Adicionar à tabela whatsapp_messages
ALTER TABLE whatsapp_messages ADD COLUMN (
  batch_id UUID,
  is_sync_initial BOOLEAN DEFAULT false,
  sync_source VARCHAR(50), -- 'webhook', 'manual_sync', 'batch_recover'
  FOREIGN KEY (batch_id) REFERENCES whatsapp_webhook_logs(id)
);

-- Adicionar à tabela whatsapp_configs
ALTER TABLE whatsapp_configs ADD COLUMN (
  webhook_activated_at TIMESTAMP,
  last_sync_at TIMESTAMP,
  sync_status VARCHAR(50), -- 'pending', 'in_progress', 'completed', 'failed'
  sync_error TEXT
);

-- Nova tabela para rastreamento de sincronização
CREATE TABLE whatsapp_sync_logs (
  id UUID PRIMARY KEY,
  instance_id UUID NOT NULL REFERENCES whatsapp_configs(id),
  lead_id UUID REFERENCES leads(id),
  sync_type VARCHAR(50), -- 'initial_contact', 'manual_recovery', 'batch'
  messages_imported INT,
  status VARCHAR(50),
  error_message TEXT,
  started_at TIMESTAMP,
  completed_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_whatsapp_sync_logs_instance_id ON whatsapp_sync_logs(instance_id);
CREATE INDEX idx_whatsapp_sync_logs_lead_id ON whatsapp_sync_logs(lead_id);
```

### 4.2 Novos Serviços

#### Arquivo: `src/services/whatsapp/message-sync.service.ts`

```typescript
export class WhatsAppMessageSyncService {

  /**
   * Sincronizar mensagens de um contato do banco de dados local
   * (não traz dados da Meta, apenas reorganiza o que já temos)
   */
  async syncLeadMessages(leadId: string, limit = 100): Promise<{
    messages: Message[],
    pagination: { cursor: string | null, hasMore: boolean },
    metadata: { firstMessageAt: Date, lastMessageAt: Date, total: number }
  }>

  /**
   * Importar contatos conectados via Meta Graph API
   * Busca lista de contatos que interagiram com o número
   */
  async importConnectedContacts(instanceId: string): Promise<{
    imported: number,
    failed: number,
    contacts: Contact[]
  }>

  /**
   * Recuperar dados de um contato existente da Meta
   * (foto, nome, número verificado, etc)
   */
  async enrich LeadProfile(waId: string): Promise<Contact>

  /**
   * Iniciar sincronização manual para um lead
   * Cria SyncLog entry e processa em background
   */
  async startManualSync(leadId: string): Promise<{ syncId: string }>

  /**
   * Processar webhook batch: agrupa e deduplicaa mensagens
   */
  async processBatch(webhookId: string): Promise<{ deduplicated: number }>
}
```

#### Arquivo: `src/services/whatsapp/contact-enrichment.service.ts`

```typescript
export class ContactEnrichmentService {

  /**
   * Enriquecer dados de contato com informações da Meta
   */
  async enrichFromMeta(waId: string, accessToken: string): Promise<{
    name: string,
    profilePictureUrl: string,
    verified: boolean,
    lastSeen: Date | null,
    status: 'ACTIVE' | 'INACTIVE'
  }>

  /**
   * Detectar contatos novos no webhook
   */
  detectNewContact(webhookPayload: any): boolean

  /**
   * Criar lead automaticamente para novo contato
   */
  async createLeadFromContact(
    contact: WebhookContact,
    instanceId: string
  ): Promise<Lead>
}
```

### 4.3 Modificações em Handlers

**Arquivo:** `src/services/whatsapp/handlers/message.handler.ts`

```typescript
// Adicionar ao final do processamento de mensagem:

async handleIncomingMessage(payload: WebhookMessage) {
  // ... código existente ...

  // Novo: Verificar se é primeiro contato
  if (!existingLead) {
    const newLead = await contactEnrichmentService.createLeadFromContact(
      payload.contacts[0],
      instanceId
    );

    // Log sincronização
    await db.whatsapp_sync_logs.create({
      instanceId,
      leadId: newLead.id,
      syncType: 'initial_contact',
      messagesImported: 1,
      status: 'completed'
    });
  }

  // Capturar mensagem com metadata de sincronização
  await db.whatsapp_messages.create({
    ...messageData,
    batchId: payload.webhookId,
    isSyncInitial: !existingLead,
    syncSource: 'webhook'
  });
}
```

### 4.4 Novo Endpoint: Sincronização Manual

**Arquivo:** `src/app/api/v1/whatsapp/conversations/sync/route.ts`

```typescript
export async function GET(req: Request) {
  const { leadId, limit = 100, cursor } = parseQuery(req.url);

  // Validação
  if (!leadId) return error(400, 'leadId required');

  const lead = await db.leads.findUnique({ where: { id: leadId } });
  if (!lead) return error(404, 'Lead not found');

  // Buscar mensagens do banco local
  const messages = await db.whatsapp_messages.findMany({
    where: { leadId },
    orderBy: { timestamp: 'asc' },
    take: limit + 1,
    cursor: cursor ? { id: cursor } : undefined,
    select: {
      id, wamid, type, body, mediaUrl, direction, timestamp,
      status, syncSource, isSyncInitial,
      instance: { select: { id, phone } },
      lead: { select: { id, number, pushName, profilePicUrl } }
    }
  });

  const hasMore = messages.length > limit;
  const pageMessages = messages.slice(0, limit);

  return success({
    messages: pageMessages.map(m => ({
      id: m.id,
      wamid: m.wamid,
      type: m.type,
      body: m.body,
      mediaUrl: m.mediaUrl,
      direction: m.direction,
      timestamp: m.timestamp,
      status: m.status,
      from: {
        name: m.lead.pushName || 'Unknown',
        number: m.lead.number
      }
    })),
    pagination: {
      cursor: hasMore ? pageMessages[pageMessages.length - 1].id : null,
      hasMore
    },
    metadata: {
      firstMessageAt: pageMessages[0]?.timestamp || null,
      lastMessageAt: pageMessages[pageMessages.length - 1]?.timestamp || null,
      total: await db.whatsapp_messages.count({ where: { leadId } })
    }
  });
}

// POST: Iniciar sincronização manual
export async function POST(req: Request) {
  const { leadId } = await req.json();

  if (!leadId) return error(400, 'leadId required');

  const syncLog = await db.whatsapp_sync_logs.create({
    data: {
      leadId,
      syncType: 'manual_recovery',
      status: 'in_progress',
      startedAt: new Date()
    }
  });

  // Disparar background job
  queue.enqueue('sync_lead_messages', { syncLogId: syncLog.id, leadId });

  return success({ syncId: syncLog.id });
}
```

### 4.5 UI Component: Message History Panel

**Arquivo:** `src/components/whatsapp/message-history-panel.tsx`

```typescript
'use client'

export function MessageHistoryPanel({ lead, instance }) {
  const [messages, setMessages] = useState([]);
  const [loading, setLoading] = useState(false);
  const [cursor, setCursor] = useState<string | null>(null);

  const fetchMessages = async (nextCursor = null) => {
    setLoading(true);
    const res = await fetch(
      `/api/v1/whatsapp/conversations/sync?` +
      `leadId=${lead.id}&limit=50&${nextCursor ? `cursor=${nextCursor}` : ''}`
    );
    const data = await res.json();

    if (nextCursor) {
      setMessages(m => [...m, ...data.messages]);
    } else {
      setMessages(data.messages);
    }

    setCursor(data.pagination.cursor);
    setLoading(false);
  };

  useEffect(() => {
    fetchMessages();
  }, [lead.id]);

  return (
    <div className="message-history">
      <div className="header">
        <h3>{lead.pushName || lead.number}</h3>
        <span className="text-xs text-muted">
          {messages.length} mensagens
        </span>
      </div>

      <div className="messages-container">
        {messages.map(msg => (
          <div key={msg.id} className={`message ${msg.direction}`}>
            <div className="body">{msg.body}</div>
            <div className="meta">
              {msg.status && <span className="status">{msg.status}</span>}
              <span className="time">{formatTime(msg.timestamp)}</span>
            </div>
          </div>
        ))}
      </div>

      {cursor && (
        <Button onClick={() => fetchMessages(cursor)}>
          Carregar mais
        </Button>
      )}
    </div>
  );
}
```

---

## 5. Fluxo de Implementação

### Fase 1: Infraestrutura (Sprint 1)
- [ ] Criar migrations do banco de dados
- [ ] Implementar `MessageSyncService`
- [ ] Implementar `ContactEnrichmentService`
- [ ] Adicionar logs e telemetria

### Fase 2: Integração com Webhook (Sprint 2)
- [ ] Modificar `message.handler.ts` para detectar novos contatos
- [ ] Implementar deduplicação de mensagens (batchId)
- [ ] Criar background job para processamento de sync
- [ ] Testar com dados reais

### Fase 3: API & UI (Sprint 3)
- [ ] Implementar endpoint GET `/conversations/sync`
- [ ] Implementar endpoint POST para sincronização manual
- [ ] Criar UI Component `MessageHistoryPanel`
- [ ] Integrar no inbox e detalhes do lead

### Fase 4: Otimizações (Sprint 4)
- [ ] Cache de mensagens recentes
- [ ] Paginação e lazy loading
- [ ] Busca e filtros
- [ ] Export de histórico

---

## 6. Considerações de Segurança

✅ **Implementado:**
- Tokens criptografados com AES-256-GCM
- Validação HMAC-SHA256 de webhooks
- Rate limiting (1000 req/hora por IP)
- Auditoria de ações

⚠️ **Novos:**
- Validar acesso ao lead (usuário tem permissão?)
- Rate limiting na API de sincronização (100 req/min por user)
- Logs de acesso ao histórico
- GDPR compliance (direito de esquecimento)

---

## 7. Métricas de Sucesso

| Métrica | Alvo |
|---------|------|
| Tempo de carga do histórico | < 500ms para 100 msgs |
| Taxa de deduplicação | > 99.9% |
| Disponibilidade do endpoint | > 99.9% |
| Latência de novo contato | < 1s |
| Espaço de armazenamento | < 10MB por 10k mensagens |

---

## 8. Dependências & Riscos

### Dependências
- [ ] Schema Prisma atualizado e migrado
- [ ] Serviço de queue para background jobs
- [ ] Cache Redis operacional

### Riscos
| Risco | Probabilidade | Impacto | Mitigação |
|-------|--------------|--------|-----------|
| Webhook duplicado | Média | Alto | Usar batchId, deduplicação |
| Dados inconsistentes | Baixa | Alto | Transações ACID, validação |
| Limite de taxa da Meta | Baixa | Médio | Cache agressivo, backoff |
| Armazenamento crescente | Alta | Médio | Arquivamento de msgs antigo |

---

## 9. Documentação de Referência

### Meta Developer Docs (não acessíveis via Cloud)
A API Meta **NÃO fornece:**
- ❌ Endpoint para recuperar histórico anterior
- ❌ Batch import de conversas
- ❌ Backup/restore de mensagens

A API **FORNECE:**
- ✅ Webhooks em tempo real
- ✅ Graph API para info de contatos
- ✅ Send message API

### Fontes Consultadas
- [WhatsApp Cloud API - Postman](https://www.postman.com/meta/whatsapp-business-platform/documentation/wlk6lh4/whatsapp-cloud-api)
- [Whapi Cloud Documentation](https://whapi.cloud/docs)
- [Unipile WhatsApp API Guide 2026](https://www.unipile.com/whatsapp-api-a-complete-guide-to-integration/)
- [Support WhatsApp - Chat History](https://support.whapi.cloud/help-desk/receiving/http-api/retrieve-a-specific-users-chat-history)

---

## 10. Próximos Passos

1. **Design Review:** Validar arquitetura com time
2. **PoC:** Implementar Phase 1 com dados de teste
3. **QA:** Testes com múltiplas instâncias simultâneas
4. **Deploy:** Prod em staged rollout (10% → 50% → 100%)
5. **Monitoring:** Alertas para falhas de sincronização

---

**Documento preparado em:** 2026-02-16
**Revisado por:** [Seu nome]
**Status:** Pronto para refinamento
