import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { prisma } from '@/lib/db/prisma'
import { getConversationOpenDeal } from './conversation-deal.service'

describe('conversation-deal.service (Integration)', () => {
  let orgId: string
  let projectId: string
  let leadSourceId: string
  let dealStatusOpenId: string
  let leadId: string
  let instanceId: string
  let conversationId: string
  let dealStageId: string
  let dealId: string

  beforeEach(async () => {
    // 1. Create Organization & Project
    const org = await prisma.organization.create({
      data: {
        name: 'Conversations Test Org',
        slug: `conv-org-${Math.random().toString(36).substring(2, 9)}`,
      },
    })
    orgId = org.id


    const project = await prisma.project.create({
      data: {
        organizationId: orgId,
        name: 'Conversations Test Project',
        slug: `conv-project-${Math.random().toString(36).substring(2, 9)}`,
      },
    })
    projectId = project.id

    // 2. Query Lookups
    const leadSource = await prisma.leadSource.findFirst({
      where: { name: 'live_message' },
    })
    expect(leadSource).not.toBeNull()
    leadSourceId = leadSource?.id ?? ''

    const dealStatusOpen = await prisma.dealStatus.findFirst({
      where: { name: 'open' },
    })
    expect(dealStatusOpen).not.toBeNull()
    dealStatusOpenId = dealStatusOpen?.id ?? ''

    // 3. Create Lead
    const lead = await prisma.lead.create({
      data: {
        organizationId: orgId,
        projectId: projectId,
        sourceId: leadSourceId,
        phone: '5511999999999',
        waId: `5511999999999@c.us-${Math.random().toString(36).substring(2, 9)}`,
        totalDeals: 2,
        lifetimeValue: 199.9,
        firstMessageAt: new Date('2026-05-01T10:00:00Z'),
      },
    })
    leadId = lead.id

    // 4. Create WhatsApp Config (instance)
    const instance = await prisma.whatsAppConfig.create({
      data: {
        organizationId: orgId,
        projectId: projectId,
        status: 'active',
      },
    })
    instanceId = instance.id

    // 5. Create Conversation
    const conversation = await prisma.conversation.create({
      data: {
        organizationId: orgId,
        projectId: projectId,
        leadId: leadId,
        instanceId: instanceId,
      },
    })
    conversationId = conversation.id

    // 6. Create Deal Stage
    const dealStage = await prisma.dealStage.create({
      data: {
        organizationId: orgId,
        projectId: projectId,
        name: 'Open Deals Stage',
        color: '#6366f1',
        order: 0,
      },
    })
    dealStageId = dealStage.id

    // 7. Create Deal
    const deal = await prisma.deal.create({
      data: {
        organizationId: orgId,
        projectId: projectId,
        conversationId: conversationId,
        leadId: leadId,
        stageId: dealStageId,
        statusId: dealStatusOpenId,
        dealValue: 150.0,
        messagesCount: 10,
        inboundMessagesCount: 4,
        outboundMessagesCount: 6,
        firstResponseTimeSec: 120,
        resolutionTimeSec: 3600,
        windowOpen: true,
        windowExpiresAt: new Date('2026-05-21T18:00:00Z'),
      },
    })
    dealId = deal.id
  })

  afterEach(async () => {
    // Cascade delete of organization cleans up all other records
    if (orgId) {
      try {
        await prisma.organization.delete({
          where: { id: orgId },
        })
      } catch (err) {
        console.error('Failed to cleanup organization:', err)
      }
    }
  })

  it('retrieves the active open deal of a conversation with all structured details and KPIs', async () => {
    const result = await getConversationOpenDeal({
      organizationId: orgId,
      projectId: projectId,
      conversationId: conversationId,
    })

    expect(result.data).toBeDefined()
    expect(result.data).not.toBeNull()

    const data = result.data
    expect(data?.id).toBe(dealId)
    expect(data.status).toBe('open')
    expect(data.dealValue).toBe('150')
    expect(data.windowOpen).toBe(true)
    expect(data.windowExpiresAt).toBe(new Date('2026-05-21T18:00:00Z').toISOString())

    expect(data.stage.id).toBe(dealStageId)
    expect(data.stage.name).toBe('Open Deals Stage')

    expect(data.kpis.messagesCount).toBe(10)
    expect(data.kpis.inboundMessagesCount).toBe(4)
    expect(data.kpis.outboundMessagesCount).toBe(6)
    expect(data.kpis.firstResponseTimeSec).toBe(120)
    expect(data.kpis.resolutionTimeSec).toBe(3600)

    expect(data.leadInsights.totalDeals).toBe(2)
    expect(data.leadInsights.lifetimeValue).toBe('199.9')
    expect(data.leadInsights.firstMessageAt).toBe(new Date('2026-05-01T10:00:00Z').toISOString())
  })

  it('returns 404 error if conversation is not found or is in another organization', async () => {
    const result = await getConversationOpenDeal({
      organizationId: orgId,
      projectId: projectId,
      conversationId: '00000000-0000-0000-0000-000000000000', // non-existent UUID
    })

    expect(result.status).toBe(404)
    expect(result).toHaveProperty('error')
  })

  it('returns 404 with data: null if conversation exists but has no open deals', async () => {
    // Change deal status to closed (using seeded closed status)
    const dealStatusClosed = await prisma.dealStatus.findFirst({
      where: { name: 'closed' },
    })
    expect(dealStatusClosed).not.toBeNull()

    await prisma.deal.update({
      where: { id: dealId },
      data: { statusId: dealStatusClosed?.id ?? '' },
    })

    const result = await getConversationOpenDeal({
      organizationId: orgId,
      projectId: projectId,
      conversationId: conversationId,
    })

    expect(result.status).toBe(404)
    expect(result.data).toBeNull()
  })
})
