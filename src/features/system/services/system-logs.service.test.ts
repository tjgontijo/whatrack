import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { prisma } from '@/lib/db/prisma'
import { listSystemAuditLogs, listSystemAuditLogFilters } from './system-audit-log.service'
import { listSystemWebhookLogs } from './system-webhook-log.service'

describe('system-logs.service (Integration)', () => {
  let orgId: string

  beforeEach(async () => {
    // 1. Create Organization
    const org = await prisma.organization.create({
      data: {
        name: 'System Logs Test Org',
        slug: `sys-org-${Math.random().toString(36).substring(2, 9)}`,
      },
    })
    orgId = org.id
  })

  afterEach(async () => {
    if (orgId) {
      await prisma.organization.delete({ where: { id: orgId } }).catch(() => {})
    }
  })

  describe('listSystemAuditLogs', () => {
    it('filters audit logs by today preset', async () => {
      // Create a log for today
      await prisma.orgAuditLog.create({
        data: {
          organization: { connect: { id: orgId } },
          action: 'test.action',
          resourceType: 'TestResource',
        },
      })

      // Create a log for yesterday
      const yesterday = new Date()
      yesterday.setDate(yesterday.getDate() - 1)
      await prisma.orgAuditLog.create({
        data: {
          organization: { connect: { id: orgId } },
          action: 'old.action',
          resourceType: 'TestResource',
          createdAt: yesterday,
        },
      })

      const result = await listSystemAuditLogs({
        periodPreset: 'today',
        page: 1,
        pageSize: 10,
      })

      expect(result.data?.data).toHaveLength(1)
      expect(result.data?.data[0].action).toBe('test.action')
    })

    it('filters by resourceType and organizationId', async () => {
       await prisma.orgAuditLog.create({
        data: {
          organization: { connect: { id: orgId } },
          action: 'res1.action',
          resourceType: 'TypeA',
        },
      })

      await prisma.orgAuditLog.create({
        data: {
          organization: { connect: { id: orgId } },
          action: 'res2.action',
          resourceType: 'TypeB',
        },
      })

      const result = await listSystemAuditLogs({
        periodPreset: 'thisMonth',
        resourceType: 'TypeA',
        organizationId: orgId,
        page: 1,
        pageSize: 10,
      })

      expect(result.data?.data).toHaveLength(1)
      expect(result.data?.data[0].resourceType).toBe('TypeA')
    })
  })

  describe('listSystemAuditLogFilters', () => {
    it('returns distinct resource types and active organizations', async () => {
      await prisma.orgAuditLog.create({
        data: {
          organization: { connect: { id: orgId } },
          action: 'filter.test',
          resourceType: 'UniqueType',
        },
      })

      const result = await listSystemAuditLogFilters()
      expect(result.resourceTypes).toContain('UniqueType')
      expect(result.organizations.some(o => o.id === orgId)).toBe(true)
    })
  })

  describe('listSystemWebhookLogs', () => {
    it('lists recent webhook logs and event types', async () => {
      await prisma.whatsAppWebhookLog.create({
        data: {
          organization: { connect: { id: orgId } },
          payload: { event: 'msg' },
          eventType: 'messages',
        },
      })

      const result = await listSystemWebhookLogs()
      expect(result.logs.length).toBeGreaterThan(0)
      expect(result.eventTypes).toContain('messages')
    })
  })
})
