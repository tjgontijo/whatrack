/**
 * State Sync Handler Tests - PRD: WhatsApp History Sync
 *
 * Tests for smb_app_state_sync webhook processing:
 * - Creates/updates Leads with source='state_sync'
 * - Handles add/update/delete actions
 * - NEVER creates Tickets
 */

import { prisma } from '@/lib/prisma';
import { stateSyncHandler } from '../state-sync.handler';

// Mock Prisma
jest.mock('@/lib/prisma', () => ({
  prisma: {
    whatsAppConfig: {
      findUnique: jest.fn(),
      update: jest.fn(),
    },
    lead: {
      upsert: jest.fn(),
      findFirst: jest.fn(),
      update: jest.fn(),
    },
  },
}));

describe('StateSyncHandler', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  const mockConfig = {
    id: 'config-1',
    phoneId: 'phone-123',
    organizationId: 'org-1',
    historySyncStatus: 'pending_consent',
  };

  const mockPayload = {
    metadata: {
      phone_number_id: 'phone-123',
    },
    state_sync: [
      {
        type: 'contact',
        action: 'add',
        contact: {
          wa_id: '551199999999',
          phone_number: '551199999999',
          full_name: 'John Doe',
          first_name: 'John',
        },
        metadata: {
          timestamp: '1707840000',
          version: 1,
        },
      },
    ],
  };

  describe('Processing', () => {
    it('should find WhatsAppConfig by phoneId', async () => {
      (prisma.whatsAppConfig.findUnique as jest.Mock).mockResolvedValue(mockConfig);

      await stateSyncHandler(mockPayload);

      expect(prisma.whatsAppConfig.findUnique).toHaveBeenCalledWith({
        where: { phoneId: 'phone-123' },
        include: { organization: true },
      });
    });

    it('should throw if config not found', async () => {
      (prisma.whatsAppConfig.findUnique as jest.Mock).mockResolvedValue(null);

      await expect(stateSyncHandler(mockPayload)).rejects.toThrow(
        'WhatsAppConfig not found'
      );
    });

    it('should throw if phoneId missing', async () => {
      const invalidPayload = { metadata: {} };

      await expect(stateSyncHandler(invalidPayload)).rejects.toThrow(
        'missing phone_number_id'
      );
    });

    it('should handle empty state_sync gracefully', async () => {
      (prisma.whatsAppConfig.findUnique as jest.Mock).mockResolvedValue(mockConfig);

      const emptyPayload = {
        metadata: { phone_number_id: 'phone-123' },
        state_sync: [],
      };

      // Should not throw
      await expect(stateSyncHandler(emptyPayload)).resolves.not.toThrow();

      // Should still update config
      expect(prisma.whatsAppConfig.update).toHaveBeenCalled();
    });
  });

  describe('Contact Add Action', () => {
    it('should upsert Lead with source=state_sync on add', async () => {
      (prisma.whatsAppConfig.findUnique as jest.Mock).mockResolvedValue(mockConfig);
      (prisma.lead.upsert as jest.Mock).mockResolvedValue({
        id: 'lead-1',
        source: 'state_sync',
      });

      await stateSyncHandler(mockPayload);

      expect(prisma.lead.upsert).toHaveBeenCalledWith(
        expect.objectContaining({
          create: expect.objectContaining({
            source: 'state_sync', // ✅ CRITICAL
          }),
        })
      );
    });

    it('should use full_name or first_name for display', async () => {
      (prisma.whatsAppConfig.findUnique as jest.Mock).mockResolvedValue(mockConfig);
      (prisma.lead.upsert as jest.Mock).mockResolvedValue({
        id: 'lead-1',
      });

      await stateSyncHandler(mockPayload);

      const upsertCall = (prisma.lead.upsert as jest.Mock).mock.calls[0][0];
      expect(upsertCall.create.pushName).toBe('John Doe');
    });
  });

  describe('Contact Update Action', () => {
    it('should handle update action', async () => {
      const updatePayload = {
        ...mockPayload,
        state_sync: [
          {
            ...mockPayload.state_sync[0],
            action: 'update',
          },
        ],
      };

      (prisma.whatsAppConfig.findUnique as jest.Mock).mockResolvedValue(mockConfig);
      (prisma.lead.upsert as jest.Mock).mockResolvedValue({
        id: 'lead-1',
      });

      await stateSyncHandler(updatePayload);

      // Should still upsert with state_sync source
      expect(prisma.lead.upsert).toHaveBeenCalledWith(
        expect.objectContaining({
          create: expect.objectContaining({
            source: 'state_sync',
          }),
        })
      );
    });
  });

  describe('Contact Delete Action', () => {
    it('should deactivate Lead on delete', async () => {
      const deletePayload = {
        ...mockPayload,
        state_sync: [
          {
            ...mockPayload.state_sync[0],
            action: 'delete',
          },
        ],
      };

      (prisma.whatsAppConfig.findUnique as jest.Mock).mockResolvedValue(mockConfig);
      (prisma.lead.findFirst as jest.Mock).mockResolvedValue({
        id: 'lead-1',
      });
      (prisma.lead.update as jest.Mock).mockResolvedValue({
        id: 'lead-1',
        isActive: false,
      });

      await stateSyncHandler(deletePayload);

      // Should find and deactivate
      expect(prisma.lead.findFirst).toHaveBeenCalled();
      expect(prisma.lead.update).toHaveBeenCalledWith({
        where: { id: 'lead-1' },
        data: {
          isActive: false,
          deletedAt: expect.any(Date),
        },
      });
    });

    it('should reactivate deleted Lead if re-added', async () => {
      (prisma.whatsAppConfig.findUnique as jest.Mock).mockResolvedValue(mockConfig);
      (prisma.lead.upsert as jest.Mock).mockResolvedValue({
        id: 'lead-1',
        isActive: true,
        deletedAt: null,
      });

      await stateSyncHandler(mockPayload);

      // Update should include reactivation
      const upsertCall = (prisma.lead.upsert as jest.Mock).mock.calls[0][0];
      expect(upsertCall.update.isActive).toBe(true);
      expect(upsertCall.update.deletedAt).toBeNull();
    });
  });

  describe('No Ticket Creation', () => {
    it('should NEVER call ticket.create', async () => {
      (prisma.whatsAppConfig.findUnique as jest.Mock).mockResolvedValue(mockConfig);
      (prisma.lead.upsert as jest.Mock).mockResolvedValue({
        id: 'lead-1',
      });

      // Add mock for ticket (should never be called)
      const ticketCreateMock = jest.fn();
      (prisma as any).ticket = { create: ticketCreateMock };

      await stateSyncHandler(mockPayload);

      // ✅ CRITICAL: ticket.create should NOT be called
      expect(ticketCreateMock).not.toHaveBeenCalled();
    });
  });

  describe('Config Status Update', () => {
    it('should update config status from pending_consent to pending_history', async () => {
      (prisma.whatsAppConfig.findUnique as jest.Mock).mockResolvedValue(mockConfig);
      (prisma.lead.upsert as jest.Mock).mockResolvedValue({
        id: 'lead-1',
      });

      await stateSyncHandler(mockPayload);

      // Should transition status
      expect(prisma.whatsAppConfig.update).toHaveBeenCalledWith({
        where: { id: 'config-1' },
        data: expect.objectContaining({
          historySyncStatus: 'pending_history',
          historySyncStartedAt: expect.any(Date),
        }),
      });
    });

    it('should not update status if not pending_consent', async () => {
      const configWithStatus = {
        ...mockConfig,
        historySyncStatus: 'syncing',
      };

      (prisma.whatsAppConfig.findUnique as jest.Mock).mockResolvedValue(
        configWithStatus
      );
      (prisma.lead.upsert as jest.Mock).mockResolvedValue({
        id: 'lead-1',
      });

      await stateSyncHandler(mockPayload);

      // Should not change status
      const updateCall = (prisma.whatsAppConfig.update as jest.Mock).mock.calls[0][0];
      expect(updateCall.data.historySyncStatus).toBeUndefined();
    });
  });

  describe('Normalization', () => {
    it('should normalize phone number with +', async () => {
      const payloadWithoutPlus = {
        ...mockPayload,
        state_sync: [
          {
            ...mockPayload.state_sync[0],
            contact: {
              ...mockPayload.state_sync[0].contact,
              wa_id: '551199999999', // Without +
              phone_number: '551199999999',
            },
          },
        ],
      };

      (prisma.whatsAppConfig.findUnique as jest.Mock).mockResolvedValue(mockConfig);
      (prisma.lead.upsert as jest.Mock).mockResolvedValue({
        id: 'lead-1',
      });

      await stateSyncHandler(payloadWithoutPlus);

      const upsertCall = (prisma.lead.upsert as jest.Mock).mock.calls[0][0];
      expect(upsertCall.create.phone).toBe('+551199999999');
    });
  });

  describe('Error Handling', () => {
    it('should continue processing on individual contact error', async () => {
      const multiContactPayload = {
        ...mockPayload,
        state_sync: [
          mockPayload.state_sync[0],
          {
            type: 'contact',
            action: 'add',
            contact: {}, // Missing required fields
          },
          {
            type: 'contact',
            action: 'add',
            contact: {
              wa_id: '551188888888',
              phone_number: '551188888888',
              full_name: 'Jane Doe',
            },
          },
        ],
      };

      (prisma.whatsAppConfig.findUnique as jest.Mock).mockResolvedValue(mockConfig);
      (prisma.lead.upsert as jest.Mock).mockResolvedValue({
        id: 'lead-1',
      });

      // Should not throw, should continue
      await expect(stateSyncHandler(multiContactPayload)).resolves.not.toThrow();

      // Should have processed valid contacts
      expect(prisma.lead.upsert).toHaveBeenCalledTimes(2);
    });

    it('should skip non-contact items', async () => {
      const mixedPayload = {
        ...mockPayload,
        state_sync: [
          mockPayload.state_sync[0],
          {
            type: 'group', // Not a contact
            action: 'add',
          },
        ],
      };

      (prisma.whatsAppConfig.findUnique as jest.Mock).mockResolvedValue(mockConfig);
      (prisma.lead.upsert as jest.Mock).mockResolvedValue({
        id: 'lead-1',
      });

      await stateSyncHandler(mixedPayload);

      // Should only process contact, not group
      expect(prisma.lead.upsert).toHaveBeenCalledTimes(1);
    });
  });
});
