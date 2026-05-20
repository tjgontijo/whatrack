import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { prisma } from '@/lib/db/prisma'
import { getConversationIntelligence } from './conversation-intelligence.service'

describe('conversation-intelligence.service (Integration)', () => {
  let orgId: string
  let projectId: string
  let leadId: string
  let conversationId: string
  let dealId: string

  beforeEach(async () => {
    // 1. Create Organization & Project
    const org = await prisma.organization.create({
      data: { name: 'CI Test Org', slug: `ci-org-${Math.random().toString(36).substring(2, 9)}` }
    })
    orgId = org.id
    const project = await prisma.project.create({
      data: { organizationId: orgId, name: 'CI Project', slug: `ci-proj-${Math.random().toString(36).substring(2, 9)}` }
    })
    projectId = project.id

    // 2. Create Lead Source
    const source = await prisma.leadSource.upsert({
      where: { name: 'live_message' },
      update: {},
      create: { name: 'live_message', description: 'Live' }
    })

    // 3. Create Lead
    const lead = await prisma.lead.create({
      data: { 
        organization: { connect: { id: orgId } }, 
        project: { connect: { id: projectId } }, 
        phone: '5511999999999', 
        source: { connect: { id: source.id } },
        totalDeals: 1,
        lifetimeValue: 250.0
      }
    })
    leadId = lead.id

    // 4. Create WhatsApp Config
    const instance = await prisma.whatsAppConfig.create({
      data: { organization: { connect: { id: orgId } }, project: { connect: { id: projectId } }, status: 'connected' }
    })

    // 5. Create Conversation
    const conversation = await prisma.conversation.create({
      data: { 
        organization: { connect: { id: orgId } }, 
        projectId, 
        lead: { connect: { id: leadId } }, 
        instance: { connect: { id: instance.id } },
        avgResponseTimeSec: 300
      }
    })
    conversationId = conversation.id

    // 6. Create Deal Status and Stage
    const openStatus = await prisma.dealStatus.upsert({
      where: { name: 'open' },
      update: {},
      create: { name: 'open', description: 'Open' }
    })
    const stage = await prisma.dealStage.create({
      data: { organization: { connect: { id: orgId } }, projectId, name: 'Initial', order: 0, color: '#000' }
    })

    // 7. Create Deal
    const deal = await prisma.deal.create({
      data: {
        organization: { connect: { id: orgId } },
        project: { connect: { id: projectId } },
        lead: { connect: { id: leadId } },
        conversation: { connect: { id: conversationId } },
        stage: { connect: { id: stage.id } },
        status: { connect: { id: openStatus.id } },
        firstResponseTimeSec: 60,
        messagesCount: 10,
        inboundMessagesCount: 4,
        outboundMessagesCount: 6,
        lastInboundAt: new Date(Date.now() - 120000),
        lastOutboundAt: new Date(Date.now() - 60000),
      }
    })
    dealId = deal.id

    // 8. Create Tracking
    await prisma.dealTracking.create({
      data: {
        dealId,
        utmSource: 'google',
        utmMedium: 'cpc',
        sourceType: 'paid'
      }
    })
  })

  afterEach(async () => {
    if (orgId) {
      await prisma.organization.delete({ where: { id: orgId } }).catch(() => {})
    }
  })

  it('returns 404 if conversation does not exist', async () => {
    const result = await getConversationIntelligence({
      organizationId: orgId,
      conversationId: '00000000-0000-0000-0000-000000000000'
    })
    expect('error' in result && result.status === 404).toBe(true)
  })

  it('returns full intelligence data for an active conversation with a deal', async () => {
    const result = await getConversationIntelligence({
      organizationId: orgId,
      conversationId
    })

    expect('data' in result).toBe(true)
    if ('data' in result) {
      expect(result.data.timing.firstResponseTimeSec).toBe(60)
      expect(result.data.timing.avgResponseTimeSec).toBe(300)
      expect(result.data.timing.lastMessageDirection).toBe('outbound')
      
      expect(result.data.volume?.totalMessagesCount).toBe(10)
      expect(result.data.volume?.inboundOutboundRatio).toBe(4/6)
      
      expect(result.data.lead?.totalDeals).toBe(1)
      expect(result.data.lead?.lifetimeValue).toBe('250')
      
      expect(result.data.attribution?.utmSource).toBe('google')
      expect(result.data.attribution?.sourceType).toBe('paid')
    }
  })

  it('returns data even if no open deal exists', async () => {
    // Close the deal
    const closedStatus = await prisma.dealStatus.upsert({
      where: { name: 'closed_won' },
      update: {},
      create: { name: 'closed_won', description: 'Won' }
    })
    await prisma.deal.update({
      where: { id: dealId },
      data: { status: { connect: { id: closedStatus.id } } }
    })

    const result = await getConversationIntelligence({
      organizationId: orgId,
      conversationId
    })

    expect('data' in result).toBe(true)
    if ('data' in result) {
      expect(result.data.timing.avgResponseTimeSec).toBe(300)
      expect(result.data.volume).toBeNull()
      expect(result.data.pipeline).toBeNull()
      expect(result.data.lead).toBeNull() // lead is null because it was fetched via deal.conversation.lead in the repository
    }
  })
})
