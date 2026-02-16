/**
 * History Handler Tests - PRD: WhatsApp History Sync
 *
 * Tests for history webhook processing:
 * - Creates/updates Leads with source='history_sync'
 * - Creates Messages with source='history'
 * - NEVER creates Tickets
 * - Idempotency via wamid
 * - Updates WhatsAppConfig progress
 */

import { prisma } from '@/lib/prisma';
import { historyHandler } from '../history.handler';

// Mock Prisma
jest.mock('@/lib/prisma', () => ({
  prisma: {
    whatsAppConfig: {
      findUnique: jest.fn(),
      update: jest.fn(),
    },
    lead: {
      upsert: jest.fn(),
    },
    conversation: {
      upsert: jest.fn(),
    },
    message: {
      upsert: jest.fn(),
    },
    whatsAppHistorySync: {
      create: jest.fn(),
      update: jest.fn(),
    },
  },
}));

describe('HistoryHandler', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  const mockConfig = {
    id: 'config-1',
    phoneId: 'phone-123',
    organizationId: 'org-1',
    historySyncStartedAt: null,
    historySyncProgress: 0,
  };

  const mockPayload = {
    metadata: {
      phone_number_id: 'phone-123',
    },
    history: [
      {
        metadata: {
          phase: 1,
          chunk_order: 1,
          progress: 50,
        },
        threads: [
          {
            id: 'thread-1',
            context: {
              wa_id: '551199999999',
              username: 'Test User',
            },
            messages: [
              {
                id: 'msg-1',
                from: '551199999999',
                timestamp: '1707840000',
                type: 'text',
                text: { body: 'Hello' },
                history_context: {
                  from_me: false,
                  status: 'read',
                },
              },
            ],
          },
        ],
      },
    ],
  };

  describe('Processing', () => {
    it('should find WhatsAppConfig by phoneId', async () => {
      (prisma.whatsAppConfig.findUnique as jest.Mock).mockResolvedValue(mockConfig);
      (prisma.whatsAppHistorySync.create as jest.Mock).mockResolvedValue({
        id: 'sync-1',
      });

      await historyHandler(mockPayload);

      expect(prisma.whatsAppConfig.findUnique).toHaveBeenCalledWith({
        where: { phoneId: 'phone-123' },
        include: { organization: true },
      });
    });

    it('should throw if config not found', async () => {
      (prisma.whatsAppConfig.findUnique as jest.Mock).mockResolvedValue(null);

      await expect(historyHandler(mockPayload)).rejects.toThrow(
        'WhatsAppConfig not found'
      );
    });

    it('should throw if phoneId missing', async () => {
      const invalidPayload = { metadata: {} };

      await expect(historyHandler(invalidPayload)).rejects.toThrow(
        'missing phone_number_id'
      );
    });
  });

  describe('Lead Creation', () => {
    it('should upsert Lead with source=history_sync', async () => {
      (prisma.whatsAppConfig.findUnique as jest.Mock).mockResolvedValue(mockConfig);
      (prisma.whatsAppHistorySync.create as jest.Mock).mockResolvedValue({
        id: 'sync-1',
      });
      (prisma.lead.upsert as jest.Mock).mockResolvedValue({
        id: 'lead-1',
        source: 'history_sync',
      });
      (prisma.conversation.upsert as jest.Mock).mockResolvedValue({
        id: 'conv-1',
      });
      (prisma.message.upsert as jest.Mock).mockResolvedValue({
        id: 'msg-1',
      });

      await historyHandler(mockPayload);

      expect(prisma.lead.upsert).toHaveBeenCalledWith(
        expect.objectContaining({
          create: expect.objectContaining({
            source: 'history_sync', // ✅ CRITICAL
          }),
        })
      );
    });

    it('should not override source on update', async () => {
      (prisma.whatsAppConfig.findUnique as jest.Mock).mockResolvedValue(mockConfig);
      (prisma.whatsAppHistorySync.create as jest.Mock).mockResolvedValue({
        id: 'sync-1',
      });
      (prisma.lead.upsert as jest.Mock).mockResolvedValue({
        id: 'lead-1',
        source: 'live_message',
      });
      (prisma.conversation.upsert as jest.Mock).mockResolvedValue({
        id: 'conv-1',
      });
      (prisma.message.upsert as jest.Mock).mockResolvedValue({
        id: 'msg-1',
      });

      await historyHandler(mockPayload);

      // Should not include source in update clause
      const upsertCall = (prisma.lead.upsert as jest.Mock).mock.calls[0][0];
      expect(upsertCall.update).not.toHaveProperty('source');
    });
  });

  describe('Message Creation', () => {
    it('should upsert Message with source=history', async () => {
      (prisma.whatsAppConfig.findUnique as jest.Mock).mockResolvedValue(mockConfig);
      (prisma.whatsAppHistorySync.create as jest.Mock).mockResolvedValue({
        id: 'sync-1',
      });
      (prisma.lead.upsert as jest.Mock).mockResolvedValue({
        id: 'lead-1',
      });
      (prisma.conversation.upsert as jest.Mock).mockResolvedValue({
        id: 'conv-1',
      });
      (prisma.message.upsert as jest.Mock).mockResolvedValue({
        id: 'msg-1',
      });

      await historyHandler(mockPayload);

      expect(prisma.message.upsert).toHaveBeenCalledWith(
        expect.objectContaining({
          create: expect.objectContaining({
            source: 'history', // ✅ CRITICAL
            ticketId: null, // ✅ NO TICKET
          }),
        })
      );
    });

    it('should use idempotency via wamid', async () => {
      (prisma.whatsAppConfig.findUnique as jest.Mock).mockResolvedValue(mockConfig);
      (prisma.whatsAppHistorySync.create as jest.Mock).mockResolvedValue({
        id: 'sync-1',
      });
      (prisma.lead.upsert as jest.Mock).mockResolvedValue({
        id: 'lead-1',
      });
      (prisma.conversation.upsert as jest.Mock).mockResolvedValue({
        id: 'conv-1',
      });
      (prisma.message.upsert as jest.Mock).mockResolvedValue({
        id: 'msg-1',
      });

      await historyHandler(mockPayload);

      // Verify wamid is used as unique key
      const messageCall = (prisma.message.upsert as jest.Mock).mock.calls[0][0];
      expect(messageCall.where.wamid).toBe('msg-1');
    });
  });

  describe('No Ticket Creation', () => {
    it('should NEVER call ticket.create during history processing', async () => {
      (prisma.whatsAppConfig.findUnique as jest.Mock).mockResolvedValue(mockConfig);
      (prisma.whatsAppHistorySync.create as jest.Mock).mockResolvedValue({
        id: 'sync-1',
      });
      (prisma.lead.upsert as jest.Mock).mockResolvedValue({
        id: 'lead-1',
      });
      (prisma.conversation.upsert as jest.Mock).mockResolvedValue({
        id: 'conv-1',
      });
      (prisma.message.upsert as jest.Mock).mockResolvedValue({
        id: 'msg-1',
      });

      // Add mock for ticket (should never be called)
      const ticketCreateMock = jest.fn();
      (prisma as any).ticket = { create: ticketCreateMock };

      await historyHandler(mockPayload);

      // ✅ CRITICAL: ticket.create should NOT be called
      expect(ticketCreateMock).not.toHaveBeenCalled();
    });
  });

  describe('Progress Tracking', () => {
    it('should update WhatsAppConfig with progress', async () => {
      (prisma.whatsAppConfig.findUnique as jest.Mock).mockResolvedValue(mockConfig);
      (prisma.whatsAppHistorySync.create as jest.Mock).mockResolvedValue({
        id: 'sync-1',
      });
      (prisma.lead.upsert as jest.Mock).mockResolvedValue({
        id: 'lead-1',
      });
      (prisma.conversation.upsert as jest.Mock).mockResolvedValue({
        id: 'conv-1',
      });
      (prisma.message.upsert as jest.Mock).mockResolvedValue({
        id: 'msg-1',
      });

      await historyHandler(mockPayload);

      expect(prisma.whatsAppConfig.update).toHaveBeenCalledWith({
        where: { id: 'config-1' },
        data: expect.objectContaining({
          historySyncProgress: 50,
          historySyncPhase: 1,
          historySyncChunkOrder: 1,
          historySyncStatus: 'syncing',
        }),
      });
    });

    it('should mark as completed when progress=100', async () => {
      const completedPayload = {
        ...mockPayload,
        history: [
          {
            ...mockPayload.history[0],
            metadata: { phase: 1, chunk_order: 10, progress: 100 },
          },
        ],
      };

      (prisma.whatsAppConfig.findUnique as jest.Mock).mockResolvedValue(mockConfig);
      (prisma.whatsAppHistorySync.create as jest.Mock).mockResolvedValue({
        id: 'sync-1',
      });
      (prisma.lead.upsert as jest.Mock).mockResolvedValue({
        id: 'lead-1',
      });
      (prisma.conversation.upsert as jest.Mock).mockResolvedValue({
        id: 'conv-1',
      });
      (prisma.message.upsert as jest.Mock).mockResolvedValue({
        id: 'msg-1',
      });

      await historyHandler(completedPayload);

      expect(prisma.whatsAppConfig.update).toHaveBeenCalledWith({
        where: { id: 'config-1' },
        data: expect.objectContaining({
          historySyncStatus: 'completed',
          historySyncCompletedAt: expect.any(Date),
        }),
      });
    });
  });

  describe('Error Handling', () => {
    it('should continue processing on message error', async () => {
      const multiMessagePayload = {
        ...mockPayload,
        history: [
          {
            ...mockPayload.history[0],
            threads: [
              {
                id: 'thread-1',
                context: { wa_id: '551199999999', username: 'User' },
                messages: [
                  { id: 'msg-1', from: '551199999999', timestamp: '1707840000', type: 'text' },
                  { id: 'msg-2', from: '551199999999', timestamp: '1707840000' }, // Missing required fields
                  { id: 'msg-3', from: '551199999999', timestamp: '1707840000', type: 'text' },
                ],
              },
            ],
          },
        ],
      };

      (prisma.whatsAppConfig.findUnique as jest.Mock).mockResolvedValue(mockConfig);
      (prisma.whatsAppHistorySync.create as jest.Mock).mockResolvedValue({
        id: 'sync-1',
      });
      (prisma.lead.upsert as jest.Mock).mockResolvedValue({
        id: 'lead-1',
      });
      (prisma.conversation.upsert as jest.Mock).mockResolvedValue({
        id: 'conv-1',
      });
      (prisma.message.upsert as jest.Mock).mockResolvedValue({
        id: 'msg-1',
      });

      // Should not throw, should continue
      await expect(historyHandler(multiMessagePayload)).resolves.not.toThrow();

      // Should have called for msg-1 and msg-3
      expect(prisma.message.upsert).toHaveBeenCalledTimes(2);
    });
  });
});
