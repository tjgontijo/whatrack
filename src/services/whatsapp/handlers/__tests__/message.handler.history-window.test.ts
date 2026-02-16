/**
 * Message Handler Tests - History Window Logic
 * PRD: WhatsApp History Sync - Conditional Message Window
 *
 * Tests the critical logic:
 * - Leads from history_sync: NO message window (null expiration)
 * - New leads: 24h message window
 * - Source tracking for tickets
 */

import { prisma } from '@/lib/prisma';
import { messageHandler } from '../message.handler';

// Mock Prisma and dependencies
jest.mock('@/lib/prisma', () => ({
  prisma: {
    whatsAppConfig: {
      findUnique: jest.fn(),
      update: jest.fn(),
    },
    lead: {
      findFirst: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
    },
    conversation: {
      upsert: jest.fn(),
    },
    ticket: {
      findFirst: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
    },
    message: {
      findUnique: jest.fn(),
      create: jest.fn(),
    },
    ticketTracking: {
      findUnique: jest.fn(),
      create: jest.fn(),
    },
    $transaction: jest.fn((callback) => callback(prisma)),
  },
}));

jest.mock('@/services/tickets/ensure-ticket-stages', () => ({
  getDefaultTicketStage: jest.fn().mockResolvedValue({
    id: 'stage-1',
    name: 'New',
  }),
}));

describe('MessageHandler - History Window Logic', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  const mockConfig = {
    id: 'config-1',
    organizationId: 'org-1',
    phoneId: 'phone-123',
  };

  const mockPayload = {
    entry: [
      {
        changes: [
          {
            field: 'messages',
            value: {
              metadata: { phone_number_id: 'phone-123' },
              messages: [
                {
                  id: 'msg-1',
                  from: '551199999999',
                  timestamp: '1707840000',
                  type: 'text',
                  text: { body: 'Hello' },
                },
              ],
              contacts: [
                {
                  wa_id: '551199999999',
                  profile: { name: 'Test User' },
                },
              ],
            },
          },
        ],
      },
    ],
  };

  describe('✅ History Lead - NO Window', () => {
    it('should set messageWindowExpiresAt=null for history_sync leads', async () => {
      const historyLead = {
        id: 'lead-1',
        source: 'history_sync', // ✅ From history
        phone: '551199999999',
        waId: '551199999999',
        pushName: 'Test User',
        organizationId: 'org-1',
      };

      (prisma.whatsAppConfig.findUnique as jest.Mock).mockResolvedValue(mockConfig);
      (prisma.lead.findFirst as jest.Mock).mockResolvedValue(historyLead);
      (prisma.conversation.upsert as jest.Mock).mockResolvedValue({
        id: 'conv-1',
      });
      (prisma.ticket.findFirst as jest.Mock).mockResolvedValue(null);
      (prisma.message.findUnique as jest.Mock).mockResolvedValue(null);
      (prisma.message.create as jest.Mock).mockResolvedValue({
        id: 'msg-1',
      });
      (prisma.ticket.create as jest.Mock).mockResolvedValue({
        id: 'ticket-1',
        windowExpiresAt: null,
      });

      await messageHandler(mockPayload);

      // ✅ CRITICAL: windowExpiresAt should be null
      expect(prisma.ticket.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          windowExpiresAt: null, // ← NO WINDOW
        }),
      });
    });

    it('should set originatedFrom=history_lead for history leads', async () => {
      const historyLead = {
        id: 'lead-1',
        source: 'history_sync',
        phone: '551199999999',
        waId: '551199999999',
        pushName: 'Test User',
        organizationId: 'org-1',
      };

      (prisma.whatsAppConfig.findUnique as jest.Mock).mockResolvedValue(mockConfig);
      (prisma.lead.findFirst as jest.Mock).mockResolvedValue(historyLead);
      (prisma.conversation.upsert as jest.Mock).mockResolvedValue({
        id: 'conv-1',
      });
      (prisma.ticket.findFirst as jest.Mock).mockResolvedValue(null);
      (prisma.message.findUnique as jest.Mock).mockResolvedValue(null);
      (prisma.message.create as jest.Mock).mockResolvedValue({
        id: 'msg-1',
      });
      (prisma.ticket.create as jest.Mock).mockResolvedValue({
        id: 'ticket-1',
      });

      await messageHandler(mockPayload);

      expect(prisma.ticket.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          originatedFrom: 'history_lead', // ← Origin tracked
        }),
      });
    });
  });

  describe('❌ New Lead - 24h Window', () => {
    it('should set messageWindowExpiresAt=now+24h for new leads', async () => {
      const beforeTime = new Date();

      (prisma.whatsAppConfig.findUnique as jest.Mock).mockResolvedValue(mockConfig);
      (prisma.lead.findFirst as jest.Mock).mockResolvedValue(null); // New lead
      (prisma.lead.create as jest.Mock).mockResolvedValue({
        id: 'lead-1',
        source: 'live_message',
        phone: '551199999999',
        waId: '551199999999',
        pushName: 'Test User',
        organizationId: 'org-1',
      });
      (prisma.conversation.upsert as jest.Mock).mockResolvedValue({
        id: 'conv-1',
      });
      (prisma.ticket.findFirst as jest.Mock).mockResolvedValue(null);
      (prisma.message.findUnique as jest.Mock).mockResolvedValue(null);
      (prisma.message.create as jest.Mock).mockResolvedValue({
        id: 'msg-1',
      });
      (prisma.ticket.create as jest.Mock).mockResolvedValue({
        id: 'ticket-1',
      });

      await messageHandler(mockPayload);

      const createCall = (prisma.ticket.create as jest.Mock).mock.calls[0][0];
      const windowExpires = createCall.data.windowExpiresAt;

      // ✅ Should have 24h window
      expect(windowExpires).not.toBeNull();
      expect(windowExpires.getTime()).toBeGreaterThan(beforeTime.getTime());
      expect(windowExpires.getTime()).toBeLessThan(
        beforeTime.getTime() + 25 * 60 * 60 * 1000 // Less than 25h
      );
    });

    it('should set originatedFrom=new_contact for new leads', async () => {
      (prisma.whatsAppConfig.findUnique as jest.Mock).mockResolvedValue(mockConfig);
      (prisma.lead.findFirst as jest.Mock).mockResolvedValue(null);
      (prisma.lead.create as jest.Mock).mockResolvedValue({
        id: 'lead-1',
        source: 'live_message',
        phone: '551199999999',
        waId: '551199999999',
        pushName: 'Test User',
        organizationId: 'org-1',
      });
      (prisma.conversation.upsert as jest.Mock).mockResolvedValue({
        id: 'conv-1',
      });
      (prisma.ticket.findFirst as jest.Mock).mockResolvedValue(null);
      (prisma.message.findUnique as jest.Mock).mockResolvedValue(null);
      (prisma.message.create as jest.Mock).mockResolvedValue({
        id: 'msg-1',
      });
      (prisma.ticket.create as jest.Mock).mockResolvedValue({
        id: 'ticket-1',
      });

      await messageHandler(mockPayload);

      expect(prisma.ticket.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          originatedFrom: 'new_contact', // ← New contact origin
        }),
      });
    });
  });

  describe('Source Tracking', () => {
    it('should set Message.source=live for incoming messages', async () => {
      const newLead = {
        id: 'lead-1',
        source: 'live_message',
        phone: '551199999999',
        waId: '551199999999',
        pushName: 'Test User',
        organizationId: 'org-1',
      };

      (prisma.whatsAppConfig.findUnique as jest.Mock).mockResolvedValue(mockConfig);
      (prisma.lead.findFirst as jest.Mock).mockResolvedValue(null);
      (prisma.lead.create as jest.Mock).mockResolvedValue(newLead);
      (prisma.conversation.upsert as jest.Mock).mockResolvedValue({
        id: 'conv-1',
      });
      (prisma.ticket.findFirst as jest.Mock).mockResolvedValue(null);
      (prisma.message.findUnique as jest.Mock).mockResolvedValue(null);
      (prisma.message.create as jest.Mock).mockResolvedValue({
        id: 'msg-1',
      });
      (prisma.ticket.create as jest.Mock).mockResolvedValue({
        id: 'ticket-1',
      });

      await messageHandler(mockPayload);

      expect(prisma.message.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          source: 'live', // ✅ Live message source
          rawMeta: expect.any(Object), // ✅ Raw payload stored
        }),
      });
    });

    it('should set Ticket.source=incoming_message', async () => {
      (prisma.whatsAppConfig.findUnique as jest.Mock).mockResolvedValue(mockConfig);
      (prisma.lead.findFirst as jest.Mock).mockResolvedValue(null);
      (prisma.lead.create as jest.Mock).mockResolvedValue({
        id: 'lead-1',
        source: 'live_message',
        phone: '551199999999',
        waId: '551199999999',
        pushName: 'Test User',
        organizationId: 'org-1',
      });
      (prisma.conversation.upsert as jest.Mock).mockResolvedValue({
        id: 'conv-1',
      });
      (prisma.ticket.findFirst as jest.Mock).mockResolvedValue(null);
      (prisma.message.findUnique as jest.Mock).mockResolvedValue(null);
      (prisma.message.create as jest.Mock).mockResolvedValue({
        id: 'msg-1',
      });
      (prisma.ticket.create as jest.Mock).mockResolvedValue({
        id: 'ticket-1',
      });

      await messageHandler(mockPayload);

      expect(prisma.ticket.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          source: 'incoming_message', // ✅ Source tracked
        }),
      });
    });
  });

  describe('Lead.source Preservation', () => {
    it('should not override existing Lead.source on update', async () => {
      const existingLead = {
        id: 'lead-1',
        source: 'history_sync', // Already marked as history
        phone: '551199999999',
        waId: '551199999999',
        pushName: 'Test User',
        organizationId: 'org-1',
      };

      (prisma.whatsAppConfig.findUnique as jest.Mock).mockResolvedValue(mockConfig);
      (prisma.lead.findFirst as jest.Mock).mockResolvedValue(existingLead);
      (prisma.lead.update as jest.Mock).mockResolvedValue(existingLead);
      (prisma.conversation.upsert as jest.Mock).mockResolvedValue({
        id: 'conv-1',
      });
      (prisma.ticket.findFirst as jest.Mock).mockResolvedValue(null);
      (prisma.message.findUnique as jest.Mock).mockResolvedValue(null);
      (prisma.message.create as jest.Mock).mockResolvedValue({
        id: 'msg-1',
      });
      (prisma.ticket.create as jest.Mock).mockResolvedValue({
        id: 'ticket-1',
      });

      await messageHandler(mockPayload);

      // Update should not include source field
      const updateCall = (prisma.lead.update as jest.Mock).mock.calls[0][0];
      expect(updateCall.data).not.toHaveProperty('source');
    });
  });

  describe('Idempotency', () => {
    it('should skip duplicate messages via wamid', async () => {
      const existingMessage = {
        id: 'msg-1',
        wamid: 'msg-1',
      };

      (prisma.whatsAppConfig.findUnique as jest.Mock).mockResolvedValue(mockConfig);
      (prisma.lead.findFirst as jest.Mock).mockResolvedValue({
        id: 'lead-1',
        phone: '551199999999',
        waId: '551199999999',
        organizationId: 'org-1',
      });
      (prisma.message.findUnique as jest.Mock).mockResolvedValue(existingMessage);

      await messageHandler(mockPayload);

      // Should skip creating duplicate
      expect(prisma.message.create).not.toHaveBeenCalled();
    });
  });
});
