/**
 * TDD Tests for Chat Service Functions
 *
 * Tests the service functions used by the webhook handler:
 * - upsertLead: Find or create lead by phone/remoteJid
 * - upsertConversation: Find or create conversation for lead
 * - resolveTicket: Find open ticket or create new one
 * - createMessage: Create message linked to ticket
 */

import { describe, expect, it, vi, beforeEach } from 'vitest'

// Create mock prisma
const mockPrisma = {
  lead: {
    findFirst: vi.fn(),
    findUnique: vi.fn(),
    create: vi.fn(),
    update: vi.fn(),
  },
  conversation: {
    findFirst: vi.fn(),
    findUnique: vi.fn(),
    create: vi.fn(),
    update: vi.fn(),
  },
  ticket: {
    findFirst: vi.fn(),
    findUnique: vi.fn(),
    create: vi.fn(),
    update: vi.fn(),
  },
  message: {
    findFirst: vi.fn(),
    findUnique: vi.fn(),
    findMany: vi.fn(),
    create: vi.fn(),
    update: vi.fn(),
  },
}

// Mock the prisma module
vi.mock('@/lib/prisma', () => ({
  prisma: mockPrisma,
}))

describe('Inbox Service', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('upsertLead', () => {
    it('should export upsertLead function', async () => {
      const { upsertLead } = await import('../service')
      expect(typeof upsertLead).toBe('function')
    })

    it('should find existing lead by remoteJid', async () => {
      const existingLead = {
        id: 'lead-123',
        organizationId: 'org-1',
        name: 'John',
        phone: '+5511999999999',
        remoteJid: '5511999999999@s.whatsapp.net',
        createdAt: new Date(),
        updatedAt: new Date(),
      }

      mockPrisma.lead.findFirst.mockResolvedValueOnce(existingLead)

      const { upsertLead } = await import('../service')
      const result = await upsertLead({
        organizationId: 'org-1',
        remoteJid: '5511999999999@s.whatsapp.net',
        phone: '+5511999999999',
        name: 'John',
      })

      expect(mockPrisma.lead.findFirst).toHaveBeenCalledWith({
        where: {
          organizationId: 'org-1',
          OR: [
            { remoteJid: '5511999999999@s.whatsapp.net' },
            { phone: '+5511999999999' },
          ],
        },
      })
      expect(result).toEqual(existingLead)
    })

    it('should create new lead if not found', async () => {
      const newLead = {
        id: 'lead-new',
        organizationId: 'org-1',
        name: 'Jane',
        phone: '+5511888888888',
        remoteJid: '5511888888888@s.whatsapp.net',
        createdAt: new Date(),
        updatedAt: new Date(),
      }

      mockPrisma.lead.findFirst.mockResolvedValueOnce(null)
      mockPrisma.lead.create.mockResolvedValueOnce(newLead)

      const { upsertLead } = await import('../service')
      const result = await upsertLead({
        organizationId: 'org-1',
        remoteJid: '5511888888888@s.whatsapp.net',
        phone: '+5511888888888',
        name: 'Jane',
      })

      expect(mockPrisma.lead.create).toHaveBeenCalledWith({
        data: {
          organizationId: 'org-1',
          remoteJid: '5511888888888@s.whatsapp.net',
          phone: '+5511888888888',
          name: 'Jane',
        },
      })
      expect(result).toEqual(newLead)
    })

    it('should update existing lead name if provided and lead has no name', async () => {
      const existingLead = {
        id: 'lead-123',
        organizationId: 'org-1',
        name: null,
        phone: '+5511999999999',
        remoteJid: '5511999999999@s.whatsapp.net',
        createdAt: new Date(),
        updatedAt: new Date(),
      }

      const updatedLead = { ...existingLead, name: 'Updated Name' }

      mockPrisma.lead.findFirst.mockResolvedValueOnce(existingLead)
      mockPrisma.lead.update.mockResolvedValueOnce(updatedLead)

      const { upsertLead } = await import('../service')
      const result = await upsertLead({
        organizationId: 'org-1',
        remoteJid: '5511999999999@s.whatsapp.net',
        phone: '+5511999999999',
        name: 'Updated Name',
      })

      expect(mockPrisma.lead.update).toHaveBeenCalledWith({
        where: { id: 'lead-123' },
        data: { name: 'Updated Name' },
      })
      expect(result.name).toBe('Updated Name')
    })
  })

  describe('upsertConversation', () => {
    it('should export upsertConversation function', async () => {
      const { upsertConversation } = await import('../service')
      expect(typeof upsertConversation).toBe('function')
    })

    it('should find existing conversation for lead', async () => {
      const existingConversation = {
        id: 'conv-123',
        organizationId: 'org-1',
        leadId: 'lead-123',
        instanceId: 'instance-1',
        status: 'OPEN',
        priority: 'MEDIUM',
        unreadCount: 0,
        lastMessageAt: new Date(),
        createdAt: new Date(),
        updatedAt: new Date(),
      }

      mockPrisma.conversation.findUnique.mockResolvedValueOnce(existingConversation)

      const { upsertConversation } = await import('../service')
      const result = await upsertConversation({
        organizationId: 'org-1',
        leadId: 'lead-123',
        instanceId: 'instance-1',
      })

      expect(mockPrisma.conversation.findUnique).toHaveBeenCalledWith({
        where: { leadId: 'lead-123' },
      })
      expect(result).toEqual(existingConversation)
    })

    it('should create new conversation if not found', async () => {
      const newConversation = {
        id: 'conv-new',
        organizationId: 'org-1',
        leadId: 'lead-456',
        instanceId: 'instance-1',
        status: 'OPEN',
        priority: 'MEDIUM',
        unreadCount: 0,
        lastMessageAt: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      }

      mockPrisma.conversation.findUnique.mockResolvedValueOnce(null)
      mockPrisma.conversation.create.mockResolvedValueOnce(newConversation)

      const { upsertConversation } = await import('../service')
      const result = await upsertConversation({
        organizationId: 'org-1',
        leadId: 'lead-456',
        instanceId: 'instance-1',
      })

      expect(mockPrisma.conversation.create).toHaveBeenCalledWith({
        data: {
          organizationId: 'org-1',
          leadId: 'lead-456',
          instanceId: 'instance-1',
        },
      })
      expect(result).toEqual(newConversation)
    })
  })

  describe('resolveTicket', () => {
    it('should export resolveTicket function', async () => {
      const { resolveTicket } = await import('../service')
      expect(typeof resolveTicket).toBe('function')
    })

    it('should find existing open ticket', async () => {
      const existingTicket = {
        id: 'ticket-123',
        conversationId: 'conv-123',
        status: 'OPEN',
        assigneeId: null,
        resolvedAt: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      }

      mockPrisma.ticket.findFirst.mockResolvedValueOnce(existingTicket)

      const { resolveTicket } = await import('../service')
      const result = await resolveTicket('conv-123')

      expect(mockPrisma.ticket.findFirst).toHaveBeenCalledWith({
        where: {
          conversationId: 'conv-123',
          status: 'OPEN',
        },
        orderBy: { createdAt: 'desc' },
      })
      expect(result).toEqual(existingTicket)
    })

    it('should create new ticket if no open ticket exists', async () => {
      const newTicket = {
        id: 'ticket-new',
        conversationId: 'conv-456',
        status: 'OPEN',
        assigneeId: null,
        resolvedAt: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      }

      mockPrisma.ticket.findFirst.mockResolvedValueOnce(null)
      mockPrisma.ticket.create.mockResolvedValueOnce(newTicket)

      const { resolveTicket } = await import('../service')
      const result = await resolveTicket('conv-456')

      expect(mockPrisma.ticket.create).toHaveBeenCalledWith({
        data: {
          conversationId: 'conv-456',
          status: 'OPEN',
        },
      })
      expect(result).toEqual(newTicket)
    })
  })

  describe('createMessage', () => {
    it('should export createMessage function', async () => {
      const { createMessage } = await import('../service')
      expect(typeof createMessage).toBe('function')
    })

    it('should create message linked to ticket', async () => {
      const sentAt = new Date()
      const newMessage = {
        id: 'msg-123',
        ticketId: 'ticket-123',
        senderType: 'LEAD',
        senderId: 'lead-123',
        senderName: 'John',
        messageType: 'TEXT',
        content: 'Hello!',
        status: 'RECEIVED',
        sentAt,
        createdAt: new Date(),
        updatedAt: new Date(),
      }

      mockPrisma.message.create.mockResolvedValueOnce(newMessage)

      const { createMessage } = await import('../service')
      const result = await createMessage({
        ticketId: 'ticket-123',
        senderType: 'LEAD',
        senderId: 'lead-123',
        senderName: 'John',
        messageType: 'TEXT',
        content: 'Hello!',
        sentAt,
      })

      expect(mockPrisma.message.create).toHaveBeenCalledWith({
        data: {
          ticketId: 'ticket-123',
          senderType: 'LEAD',
          senderId: 'lead-123',
          senderName: 'John',
          messageType: 'TEXT',
          content: 'Hello!',
          sentAt,
          status: 'DELIVERED',
          mediaUrl: undefined,
          mediaType: undefined,
          fileName: undefined,
        },
      })
      expect(result).toEqual(newMessage)
    })

    it('should create message with media', async () => {
      const sentAt = new Date()
      const mediaMessage = {
        id: 'msg-media',
        ticketId: 'ticket-123',
        senderType: 'LEAD',
        senderId: 'lead-123',
        senderName: 'John',
        messageType: 'IMAGE',
        content: null,
        mediaUrl: 'https://example.com/image.jpg',
        mediaType: 'image/jpeg',
        fileName: 'photo.jpg',
        status: 'RECEIVED',
        sentAt,
        createdAt: new Date(),
        updatedAt: new Date(),
      }

      mockPrisma.message.create.mockResolvedValueOnce(mediaMessage)

      const { createMessage } = await import('../service')
      const result = await createMessage({
        ticketId: 'ticket-123',
        senderType: 'LEAD',
        senderId: 'lead-123',
        senderName: 'John',
        messageType: 'IMAGE',
        mediaUrl: 'https://example.com/image.jpg',
        mediaType: 'image/jpeg',
        fileName: 'photo.jpg',
        sentAt,
      })

      expect(mockPrisma.message.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          messageType: 'IMAGE',
          mediaUrl: 'https://example.com/image.jpg',
          mediaType: 'image/jpeg',
          fileName: 'photo.jpg',
        }),
      })
      expect(result).toEqual(mediaMessage)
    })
  })

  describe('updateConversationLastMessage', () => {
    it('should export updateConversationLastMessage function', async () => {
      const { updateConversationLastMessage } = await import('../service')
      expect(typeof updateConversationLastMessage).toBe('function')
    })

    it('should update conversation lastMessageAt and increment unreadCount', async () => {
      const messageTime = new Date()
      const updated = {
        id: 'conv-123',
        lastMessageAt: messageTime,
        unreadCount: 1,
      }

      mockPrisma.conversation.update.mockResolvedValueOnce(updated)

      const { updateConversationLastMessage } = await import('../service')
      const result = await updateConversationLastMessage('conv-123', messageTime)

      expect(mockPrisma.conversation.update).toHaveBeenCalledWith({
        where: { id: 'conv-123' },
        data: {
          lastMessageAt: messageTime,
          unreadCount: { increment: 1 },
        },
      })
      expect(result).toEqual(updated)
    })
  })
})
