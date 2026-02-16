1# WhatsApp History Sync - Implementation Guide

## 1. Fluxo Visual Completo

```
┌─────────────────────────────────────────────────────────────────────┐
│                        User Onboarding                               │
└─────────────────────────────────────────────────────────────────────┘
                              │
                              ▼
                    ┌──────────────────┐
                    │ Meta Oauth Flow  │
                    └──────────┬───────┘
                               │
        ┌──────────────────────┴──────────────────────┐
        │                                             │
        ▼                                             ▼
   ┌────────────┐                             ┌──────────────┐
   │ Cloud API  │                             │ App + Coexist│
   │ (Novo #)   │                             │ (Existing #) │
   └────┬───────┘                             └──────┬───────┘
        │                                            │
        │                                    Meta aprova histórico
        │                                            │
        │                                 ┌──────────▼──────────┐
        │                                 │ smb_app_state_sync   │
        │                                 │ (contatos)           │
        │                                 └──────────┬───────────┘
        │                                            │
        │                                 ┌──────────▼────────────┐
        │                                 │ Lead.upsert           │
        │                                 │ source='state_sync'   │
        │                                 │ ❌ SEM Ticket         │
        │                                 └──────────┬────────────┘
        │                                            │
        │                      ┌─────────────────────┘
        │                      │
        │                      ▼
        │              ┌──────────────────┐
        │              │ history webhook  │
        │              │ (chunk 1/N)      │
        │              └──────────┬───────┘
        │                         │
        │                ┌────────▼────────┐
        │                │ Processa msgs   │
        │                │ Message.upsert  │
        │                │ source='history'│
        │                │ ❌ SEM Ticket   │
        │                └────────┬────────┘
        │                         │
        │                      ...chunks...
        │                         │
        │                ┌────────▼────────┐
        │                │ history webhook │
        │                │ (chunk N/N)     │
        │                │ progress=100%   │
        │                └────────┬────────┘
        │                         │
        │                ┌────────▼──────────────┐
        │                │ Config.sync=completed │
        │                └────────┬──────────────┘
        │                         │
        │         ┌───────────────┴────────────┐
        │         │                            │
        │    Nova msg ao vivo            Lead ativo no histórico
        │    (novo contato)              aguarda msg novo
        │         │                            │
        │         ▼                            │
        │  ┌────────────────┐                 │
        │  │ messages       │                 │
        │  │ webhook        │                 │
        │  └────────┬───────┘                 │
        │           │                         │
        │    ┌──────▼──────────┐              │
        │    │ Lead.upsert     │              │
        │    │ (se novo)       │              │
        │    └──────┬──────────┘              │
        │           │                         │
        │    ┌──────▼──────────────┐          │
        │    │ Message.create      │          │
        │    │ source='live'       │          │
        │    └──────┬──────────────┘          │
        │           │                         │
        ▼           ▼                         ▼
    ┌────────────────────────────────────────────────┐
    │ Ticket.create                                   │
    │ source='incoming_message'                       │
    │ originatedFrom='new_contact' | 'history_lead'   │
    │                                                 │
    │ if (lead.source === 'history_sync') {          │
    │   messageWindowExpiresAt = null  ✅ SEM LIMITE  │
    │ } else {                                        │
    │   messageWindowExpiresAt = now + 24h            │
    │ }                                               │
    └────────────────────────────────────────────────┘
```

## 2. Handlers: Estrutura de Código

### A. message.handler.ts (modificado)

```typescript
// src/services/whatsapp/handlers/message.handler.ts

import { PrismaClient } from '@prisma/client';
import { logger } from '@/lib/logger';

export class MessageHandler {
  constructor(private db: PrismaClient) {}

  /**
   * Processa webhook de mensagens ao vivo
   * ⚠️ APENAS abre Ticket aqui, NÃO no handler de history
   */
  async handle(payload: {
    from: string;
    id: string;
    timestamp: string;
    type: string;
    text?: { body: string };
    image?: any;
    [key: string]: any;
  }, config: WhatsAppConfig) {
    try {
      // 1. Normalizar e buscar/criar lead
      const normalizedPhone = normalizeE164(payload.from);
      const wasHistoryLead = false;

      const lead = await this.db.lead.upsert({
        where: { waId: payload.from },
        create: {
          waId: payload.from,
          phoneNumber: normalizedPhone,
          organizationId: config.organizationId,
          source: 'live_message', // ← Origem ao vivo
        },
        update: {
          lastMessageAt: new Date(parseInt(payload.timestamp) * 1000),
          pushName: payload.from_user_id,
        },
      });

      // Verificar se foi originário de histórico
      if (lead.source === 'history_sync') {
        wasHistoryLead = true;
        // Não atualizar source, manter como 'history_sync'
        await this.db.lead.update({
          where: { id: lead.id },
          data: { lastMessageAt: new Date(parseInt(payload.timestamp) * 1000) },
        });
      }

      // 2. Criar/atualizar conversation
      const conversation = await this.db.conversation.upsert({
        where: {
          leadId_instanceId: {
            leadId: lead.id,
            instanceId: config.id,
          },
        },
        create: {
          leadId: lead.id,
          instanceId: config.id,
        },
        update: {
          updatedAt: new Date(),
        },
      });

      // 3. Criar message
      const message = await this.db.message.upsert({
        where: { wamid: payload.id },
        create: {
          wamid: payload.id,
          leadId: lead.id,
          conversationId: conversation.id,
          instanceId: config.id,
          direction: 'INBOUND',
          type: payload.type,
          body: payload.text?.body || null,
          timestamp: new Date(parseInt(payload.timestamp) * 1000),
          source: 'live', // ← Origem ao vivo
          status: 'received',
        },
        update: {
          status: 'received',
          updatedAt: new Date(),
        },
      });

      logger.info(`Message created: ${message.id} from lead: ${lead.id}`);

      // ⚠️ 4. APENAS AQUI criar Ticket
      // Verificar se já existe ticket ativo
      const existingTicket = await this.db.ticket.findFirst({
        where: {
          leadId: lead.id,
          conversationId: conversation.id,
          status: { not: 'closed' },
        },
      });

      if (!existingTicket) {
        const ticket = await this.db.ticket.create({
          data: {
            leadId: lead.id,
            conversationId: conversation.id,
            organizationId: config.organizationId,
            source: 'incoming_message',
            originatedFrom: wasHistoryLead ? 'history_lead' : 'new_contact',
            stage: 'new',
            status: 'open',

            // ⭐ CHAVE: Sem janela se foi histórico
            messageWindowExpiresAt: wasHistoryLead
              ? null // ✅ SEM LIMITE para histórico
              : addHours(new Date(), 24), // ⏰ 24h para novo contato
          },
        });

        logger.info(
          `Ticket created: ${ticket.id} ` +
          `(windowExpiresAt: ${ticket.messageWindowExpiresAt || 'null'})`
        );

        // Auditoria
        await this.db.whatsappAuditLog.create({
          data: {
            instanceId: config.id,
            action: 'TICKET_CREATED_FROM_MESSAGE',
            metadata: {
              ticketId: ticket.id,
              originatedFrom: ticket.originatedFrom,
              messageWindowExpiresAt: ticket.messageWindowExpiresAt,
            },
          },
        });
      } else {
        // Ticket já existe: apenas estender janela se necessário
        if (
          existingTicket.messageWindowExpiresAt &&
          existingTicket.messageWindowExpiresAt < new Date()
        ) {
          // Reabrir janela se expirou
          await this.db.ticket.update({
            where: { id: existingTicket.id },
            data: {
              messageWindowExpiresAt: addHours(new Date(), 24),
              status: 'open',
            },
          });
        }
      }

      return { success: true, messageId: message.id };
    } catch (error) {
      logger.error('Error handling message', { error, payload });
      throw error;
    }
  }
}
```

### B. history.handler.ts (novo)

```typescript
// src/services/whatsapp/handlers/history.handler.ts

import { PrismaClient } from '@prisma/client';
import { logger } from '@/lib/logger';

export class HistoryHandler {
  constructor(private db: PrismaClient) {}

  /**
   * Processa webhook de histórico
   * ⚠️ NUNCA criar Ticket, APENAS Lead + Messages
   */
  async handle(payload: {
    history: Array<{
      metadata: { phase: number; chunk_order: number; progress: number };
      threads: Array<{
        id: string;
        context: { wa_id: string; user_id: string; username: string };
        messages: Array<{
          id: string;
          from: string;
          timestamp: string;
          type: string;
          text?: { body: string };
          history_context: { status: string; from_me: boolean };
          [key: string]: any;
        }>;
      }>;
    }>;
    metadata: {
      display_phone_number: string;
      phone_number_id: string;
    };
  }, config: WhatsAppConfig) {
    try {
      const { history, metadata } = payload;
      const syncLog = await this.db.whatsappHistorySync.create({
        data: {
          connectionId: config.id,
          status: 'processing',
          phase: history[0]?.metadata?.phase || 0,
          chunkOrder: history[0]?.metadata?.chunk_order || 0,
          progress: history[0]?.metadata?.progress || 0,
        },
      });

      logger.info(
        `History webhook: phase=${history[0]?.metadata?.phase}, ` +
        `chunk=${history[0]?.metadata?.chunk_order}, ` +
        `progress=${history[0]?.metadata?.progress}%`
      );

      let totalMessagesImported = 0;

      // Processar cada thread (conversa)
      for (const thread of history[0]?.threads || []) {
        try {
          // 1. UPSERT Lead
          const lead = await this.db.lead.upsert({
            where: { waId: thread.context.wa_id },
            create: {
              waId: thread.context.wa_id,
              phoneNumber: normalizeE164(thread.context.wa_id),
              organizationId: config.organizationId,
              source: 'history_sync', // ← Origem: histórico
              pushName: thread.context.username,
            },
            update: {
              lastSyncedAt: new Date(),
            },
          });

          // 2. UPSERT Conversation
          const conversation = await this.db.conversation.upsert({
            where: {
              leadId_instanceId: {
                leadId: lead.id,
                instanceId: config.id,
              },
            },
            create: {
              leadId: lead.id,
              instanceId: config.id,
            },
            update: {
              updatedAt: new Date(),
            },
          });

          // 3. UPSERT Messages (idempotência via wamid)
          for (const msg of thread.messages) {
            try {
              await this.db.message.upsert({
                where: { wamid: msg.id },
                create: {
                  wamid: msg.id,
                  leadId: lead.id,
                  conversationId: conversation.id,
                  instanceId: config.id,
                  direction: msg.history_context.from_me ? 'OUTBOUND' : 'INBOUND',
                  type: msg.type,
                  body: msg.text?.body || null,
                  timestamp: new Date(parseInt(msg.timestamp) * 1000),
                  status: msg.history_context.status,
                  source: 'history', // ← Origem: histórico
                  rawMeta: msg, // ← Guardar payload completo
                },
                update: {
                  status: msg.history_context.status,
                  updatedAt: new Date(),
                },
              });

              totalMessagesImported++;
            } catch (msgError) {
              logger.warn(
                `Error importing message ${msg.id} from thread ${thread.id}`,
                { error: msgError }
              );
              // Continuar com próxima mensagem
            }
          }

          logger.info(
            `Imported thread: ${thread.id}, ` +
            `messages: ${thread.messages.length}`
          );
        } catch (threadError) {
          logger.warn(
            `Error processing thread ${thread.id}`,
            { error: threadError }
          );
          // Continuar com próxima thread
        }
      }

      // 4. Atualizar sync log
      await this.db.whatsappHistorySync.update({
        where: { id: syncLog.id },
        data: {
          status: 'completed',
          progress: history[0]?.metadata?.progress || 0,
          lastPayloadAt: new Date(),
        },
      });

      // 5. Atualizar config com progresso
      await this.db.whatsappConfig.update({
        where: { id: config.id },
        data: {
          historySyncProgress: history[0]?.metadata?.progress || 0,
          historySyncPhase: history[0]?.metadata?.phase || 0,
          historySyncChunkOrder: history[0]?.metadata?.chunk_order || 0,
          // Se último chunk (progress=100), marcar como completed
          ...(history[0]?.metadata?.progress === 100 && {
            historySyncStatus: 'completed',
            historySyncCompletedAt: new Date(),
          }),
        },
      });

      logger.info(
        `History sync chunk completed: ` +
        `${totalMessagesImported} messages imported`
      );

      return {
        success: true,
        messagesImported: totalMessagesImported,
        syncLogId: syncLog.id,
      };
    } catch (error) {
      logger.error('Error handling history', { error, payload });

      // Registrar erro no sync log
      await this.db.whatsappHistorySync.updateMany({
        where: {
          connectionId: config.id,
          status: 'processing',
        },
        data: {
          status: 'failed',
          errorCode: 'HISTORY_PROCESS_ERROR',
          errorMessage: error instanceof Error ? error.message : String(error),
        },
      });

      throw error;
    }
  }
}
```

### C. state-sync.handler.ts (novo)

```typescript
// src/services/whatsapp/handlers/state-sync.handler.ts

import { PrismaClient } from '@prisma/client';
import { logger } from '@/lib/logger';

export class StateSyncHandler {
  constructor(private db: PrismaClient) {}

  /**
   * Processa webhook smb_app_state_sync
   * Sincroniza lista de contatos do App Business
   * ⚠️ NÃO criar Ticket
   */
  async handle(payload: {
    state_sync: Array<{
      type: 'contact';
      contact: {
        full_name: string;
        first_name: string;
        phone_number: string;
        wa_id?: string;
      };
      action: 'add' | 'update' | 'delete';
      metadata: {
        timestamp: string;
        version: number;
      };
    }>;
    metadata: {
      display_phone_number: string;
      phone_number_id: string;
    };
  }, config: WhatsAppConfig) {
    try {
      let contactsAdded = 0;
      let contactsUpdated = 0;
      let contactsDeleted = 0;

      for (const contact of payload.state_sync) {
        if (contact.type !== 'contact') continue;

        const normalizedPhone = normalizeE164(contact.contact.phone_number);

        if (contact.action === 'add' || contact.action === 'update') {
          const result = await this.db.lead.upsert({
            where: { waId: contact.contact.wa_id || normalizedPhone },
            create: {
              waId: contact.contact.wa_id || normalizedPhone,
              phoneNumber: normalizedPhone,
              pushName: contact.contact.full_name || contact.contact.first_name,
              organizationId: config.organizationId,
              source: 'state_sync', // ← Origem: state sync
            },
            update: {
              pushName: contact.contact.full_name || contact.contact.first_name,
              lastSyncedAt: new Date(),
              isActive: true,
              deletedAt: null, // Reativar se estava deletado
            },
          });

          if (contact.action === 'add') {
            contactsAdded++;
          } else {
            contactsUpdated++;
          }
        } else if (contact.action === 'delete') {
          await this.db.lead.update({
            where: { phoneNumber: normalizedPhone },
            data: {
              isActive: false,
              deletedAt: new Date(),
            },
          });

          contactsDeleted++;
        }
      }

      logger.info(
        `State sync completed: ` +
        `added=${contactsAdded}, updated=${contactsUpdated}, deleted=${contactsDeleted}`
      );

      return {
        success: true,
        contactsAdded,
        contactsUpdated,
        contactsDeleted,
      };
    } catch (error) {
      logger.error('Error handling state sync', { error, payload });
      throw error;
    }
  }
}
```

## 3. Atualização de webhook-processor.ts

```typescript
// src/services/whatsapp/webhook-processor.ts

export class WebhookProcessor {
  constructor(
    private messageHandler: MessageHandler,
    private historyHandler: HistoryHandler,
    private stateSyncHandler: StateSyncHandler,
    private statusHandler: StatusHandler,
  ) {}

  async process(
    payload: Record<string, any>,
    config: WhatsAppConfig,
  ): Promise<void> {
    // Detectar tipo de webhook e rotear para handler correto
    if ('history' in payload) {
      // Webhook de histórico
      await this.historyHandler.handle(payload, config);
      await this.db.whatsappConfig.update({
        where: { id: config.id },
        data: { historySyncStatus: 'syncing' },
      });
    } else if ('state_sync' in payload) {
      // Webhook de contatos
      await this.stateSyncHandler.handle(payload, config);
      // Se primeira vez, marcar como pendente histórico
      if (config.historySyncStatus === 'pending_consent') {
        await this.db.whatsappConfig.update({
          where: { id: config.id },
          data: { historySyncStatus: 'pending_history' },
        });
      }
    } else if ('messages' in payload) {
      // Webhook de mensagens ao vivo
      for (const message of payload.messages) {
        await this.messageHandler.handle(message, config);
      }
    } else if ('statuses' in payload) {
      // Webhook de status
      for (const status of payload.statuses) {
        await this.statusHandler.handle(status, config);
      }
    }
  }
}
```

## 4. Schema Prisma - Campos Novos

```prisma
// prisma/schema.prisma

model Lead {
  id                String   @id @default(cuid())
  organizationId    String
  organization      Organization @relation(fields: [organizationId], references: [id])

  phoneNumber       String   @unique
  waId              String   @unique
  pushName          String?
  profilePictureUrl String?

  // ← NOVO: Origem do lead
  source            String   @default("direct_creation")  // 'direct_creation' | 'live_message' | 'history_sync' | 'state_sync'

  isActive          Boolean  @default(true)
  lastMessageAt     DateTime?
  lastSyncedAt      DateTime?
  deletedAt         DateTime?
  createdAt         DateTime @default(now())
  updatedAt         DateTime @updatedAt

  messages          Message[]
  conversations     Conversation[]
  tickets           Ticket[]

  @@index([organizationId])
  @@index([source])
  @@index([waId])
  @@index([phoneNumber])
}

model Message {
  id                String   @id @default(cuid())
  wamid             String   @unique

  leadId            String
  lead              Lead     @relation(fields: [leadId], references: [id])

  conversationId    String
  conversation      Conversation @relation(fields: [conversationId], references: [id])

  instanceId        String
  instance          WhatsAppConfig @relation(fields: [instanceId], references: [id])

  direction         String   // 'INBOUND' | 'OUTBOUND'
  type              String   // 'text' | 'image' | etc
  body              String?  // TEXT type
  mediaUrl          String?

  // ← NOVO: Origem da mensagem
  source            String   @default("live")  // 'live' | 'history' | 'app_echo'

  status            String?  // 'sent' | 'delivered' | 'read' | etc
  timestamp         DateTime
  rawMeta           Json?    // Guardar payload bruto

  createdAt         DateTime @default(now())
  updatedAt         DateTime @updatedAt

  @@index([wamid])
  @@index([leadId])
  @@index([conversationId])
  @@index([source])
  @@index([timestamp])
}

model Ticket {
  id                String   @id @default(cuid())
  organizationId    String

  leadId            String
  lead              Lead     @relation(fields: [leadId], references: [id])

  conversationId    String
  conversation      Conversation @relation(fields: [conversationId], references: [id])

  // ← NOVO: Origem e proveniência
  source            String   @default("incoming_message")  // 'incoming_message' | 'api' | 'manual'
  originatedFrom    String?  // 'new_contact' | 'history_lead' | 'existing'

  stage             String   // 'new' | 'open' | 'in_progress' | etc
  status            String   // 'open' | 'closed' | 'archived'

  // ← CRÍTICO: Sem janela para história
  messageWindowExpiresAt  DateTime?  // null = sem limite (história)

  createdAt         DateTime @default(now())
  updatedAt         DateTime @updatedAt
  closedAt          DateTime?

  @@index([organizationId])
  @@index([leadId])
  @@index([source])
  @@index([originatedFrom])
  @@index([messageWindowExpiresAt])
}

model WhatsAppConfig {
  id                String   @id @default(cuid())

  // ← NOVO: Status de sincronização
  historySyncStatus String?  // 'not_supported' | 'pending_consent' | 'pending_history' | 'syncing' | 'completed' | 'declined' | 'failed'
  historySyncStartedAt      DateTime?
  historySyncCompletedAt    DateTime?
  historySyncProgress       Int      @default(0)  // 0-100
  historySyncPhase          Int?
  historySyncChunkOrder     Int?
  historySyncError          String?

  // ... campos existentes ...

  @@index([historySyncStatus])
}

model WhatsAppHistorySync {
  id                String   @id @default(cuid())
  connectionId      String
  config            WhatsAppConfig @relation(fields: [connectionId], references: [id])

  status            String   // 'processing' | 'completed' | 'failed'
  phase             Int
  chunkOrder        Int
  progress          Int      // 0-100

  lastPayloadAt     DateTime?
  errorCode         String?
  errorMessage      String?

  createdAt         DateTime @default(now())
  updatedAt         DateTime @updatedAt

  @@index([connectionId])
  @@index([status])
}
```

## 5. Testes Unitários - Exemplo

```typescript
// src/services/whatsapp/handlers/__tests__/history.handler.test.ts

describe('HistoryHandler', () => {
  let handler: HistoryHandler;
  let mockDb: any;

  beforeEach(() => {
    mockDb = {
      lead: { upsert: jest.fn() },
      conversation: { upsert: jest.fn() },
      message: { upsert: jest.fn() },
      whatsappHistorySync: { create: jest.fn(), update: jest.fn() },
      whatsappConfig: { update: jest.fn() },
    };
    handler = new HistoryHandler(mockDb);
  });

  it('should NOT create ticket during history import', async () => {
    const payload = { /* history payload */ };
    const config = { id: 'config-1', organizationId: 'org-1' };

    await handler.handle(payload, config);

    // Verificar que ticket.create não foi chamado
    expect(mockDb.ticket?.create).not.toHaveBeenCalled();
  });

  it('should upsert lead with source=history_sync', async () => {
    const payload = { /* history payload */ };
    const config = { id: 'config-1', organizationId: 'org-1' };

    mockDb.lead.upsert.mockResolvedValue({
      id: 'lead-1',
      source: 'history_sync',
    });

    await handler.handle(payload, config);

    expect(mockDb.lead.upsert).toHaveBeenCalledWith(
      expect.objectContaining({
        create: expect.objectContaining({
          source: 'history_sync',
        }),
      })
    );
  });

  it('should set Message.source=history', async () => {
    const payload = { /* history payload */ };
    const config = { id: 'config-1', organizationId: 'org-1' };

    mockDb.message.upsert.mockResolvedValue({ id: 'msg-1' });

    await handler.handle(payload, config);

    expect(mockDb.message.upsert).toHaveBeenCalledWith(
      expect.objectContaining({
        create: expect.objectContaining({
          source: 'history',
        }),
      })
    );
  });

  it('should be idempotent with wamid', async () => {
    const payload = { /* history payload */ };
    const config = { id: 'config-1', organizationId: 'org-1' };

    mockDb.message.upsert.mockResolvedValue({ id: 'msg-1' });

    await handler.handle(payload, config);
    await handler.handle(payload, config); // Reprocessar

    // Mesmo wamid, deve fazer upsert (não duplicar)
    expect(mockDb.message.upsert).toHaveBeenCalledTimes(2);
  });
});

describe('MessageHandler', () => {
  // ... testes de message handler ...

  it('should create ticket with null window for history leads', async () => {
    const lead = {
      id: 'lead-1',
      source: 'history_sync', // Lead do histórico
    };
    const payload = { /* message payload */ };
    const config = { id: 'config-1', organizationId: 'org-1' };

    mockDb.lead.upsert.mockResolvedValue(lead);
    mockDb.ticket.create.mockResolvedValue({
      id: 'ticket-1',
      messageWindowExpiresAt: null,
    });

    await handler.handle(payload, config);

    expect(mockDb.ticket.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          messageWindowExpiresAt: null, // ✅ Sem janela
        }),
      })
    );
  });

  it('should create ticket with 24h window for new contacts', async () => {
    const lead = {
      id: 'lead-new',
      source: 'live_message', // Novo contato ao vivo
    };
    const payload = { /* message payload */ };
    const config = { id: 'config-1', organizationId: 'org-1' };

    mockDb.lead.upsert.mockResolvedValue(lead);
    mockDb.ticket.create.mockResolvedValue({
      id: 'ticket-2',
      messageWindowExpiresAt: expect.any(Date),
    });

    await handler.handle(payload, config);

    expect(mockDb.ticket.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          messageWindowExpiresAt: expect.any(Date), // ⏰ Com janela
        }),
      })
    );
  });
});
```

---

## Resumo das Implementações

| Componente | Mudança | Nota |
|-----------|---------|------|
| `Lead.source` | Campo novo | Rastreia origem (direct_creation, live_message, history_sync, state_sync) |
| `Message.source` | Campo novo | Rastreia origem (live, history, app_echo) |
| `Ticket.source` | Campo novo | Rastreia origem (incoming_message, api, manual) |
| `Ticket.originatedFrom` | Campo novo | Indica se foi criado por lead de histórico |
| `Ticket.messageWindowExpiresAt` | Condicionado | `null` se `lead.source === 'history_sync'`, senão 24h |
| `HistoryHandler` | Handler novo | Processa webhook `history` |
| `StateSyncHandler` | Handler novo | Processa webhook `smb_app_state_sync` |
| `MessageHandler` | Modificado | ⭐ **APENAS AQUI** criar Ticket |

---

**Princípio de Ouro:** Lead pode vir do histórico, mas Ticket APENAS quando há mensagem ao vivo.
