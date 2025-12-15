/**
 * TDD Tests for Prisma Schema - New Chat Architecture
 *
 * These tests verify that the Prisma schema has the correct structure
 * according to prd-chat-refactor.md and prd-application-flow.md:
 *
 * - Lead (not Contact) is the person entity
 * - Conversation links 1:1 with Lead
 * - Ticket represents a session within a conversation
 * - Message links to Ticket (not directly to Conversation)
 * - MessageSenderType uses LEAD (not CONTACT)
 */

import { describe, expect, it } from 'vitest'
import {
  Prisma,
  MessageSenderType,
  TicketStatus,
  ConversationStatus,
} from '@prisma/client'

describe('Prisma Schema - Inbox Architecture', () => {
  describe('MessageSenderType enum', () => {
    it('should have LEAD as a valid sender type (not CONTACT)', () => {
      // LEAD should be a valid value
      expect(MessageSenderType.LEAD).toBe('LEAD')

      // CONTACT should not exist (old architecture)
      expect(Object.keys(MessageSenderType)).not.toContain('CONTACT')
    })

    it('should have USER, AI, and SYSTEM sender types', () => {
      expect(MessageSenderType.USER).toBe('USER')
      expect(MessageSenderType.AI).toBe('AI')
      expect(MessageSenderType.SYSTEM).toBe('SYSTEM')
    })
  })

  describe('TicketStatus enum', () => {
    it('should have OPEN status for new tickets', () => {
      expect(TicketStatus.OPEN).toBe('OPEN')
    })

    it('should have RESOLVED status for closed tickets', () => {
      expect(TicketStatus.RESOLVED).toBe('RESOLVED')
    })

    it('should have FOLLOW_UP status for automated follow-up', () => {
      expect(TicketStatus.FOLLOW_UP).toBe('FOLLOW_UP')
    })
  })

  describe('ConversationStatus enum', () => {
    it('should have standard statuses', () => {
      expect(ConversationStatus.OPEN).toBe('OPEN')
      expect(ConversationStatus.PENDING).toBe('PENDING')
      expect(ConversationStatus.RESOLVED).toBe('RESOLVED')
      expect(ConversationStatus.SNOOZED).toBe('SNOOZED')
    })
  })

  describe('Ticket model', () => {
    it('should have the correct create input shape', () => {
      // This test verifies the Ticket model exists with required fields
      const ticketInput: Prisma.TicketCreateInput = {
        conversation: { connect: { id: 'conv-123' } },
        status: TicketStatus.OPEN,
      }

      expect(ticketInput).toHaveProperty('conversation')
      expect(ticketInput).toHaveProperty('status')
    })

    it('should allow optional assignee', () => {
      const ticketInput: Prisma.TicketCreateInput = {
        conversation: { connect: { id: 'conv-123' } },
        status: TicketStatus.OPEN,
        assigneeId: 'user-123',
      }

      expect(ticketInput.assigneeId).toBe('user-123')
    })
  })

  describe('Conversation model', () => {
    it('should link to Lead (not ContactChannel)', () => {
      // Verify Conversation has leadId field, not contact_channel_id
      const conversationInput: Prisma.ConversationCreateInput = {
        organization: { connect: { id: 'org-123' } },
        lead: { connect: { id: 'lead-123' } },
        instanceId: 'instance-123',
      }

      expect(conversationInput).toHaveProperty('lead')
      expect(conversationInput).toHaveProperty('instanceId')
    })
  })

  describe('Message model', () => {
    it('should link to Ticket (not directly to Conversation)', () => {
      const messageInput: Prisma.MessageCreateInput = {
        ticket: { connect: { id: 'ticket-123' } },
        senderType: MessageSenderType.LEAD,
        content: 'Hello!',
        messageType: 'TEXT',
        sentAt: new Date(),
      }

      expect(messageInput).toHaveProperty('ticket')
      expect(messageInput.senderType).toBe('LEAD')
    })
  })
})
