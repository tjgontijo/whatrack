import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { prisma } from '@/lib/db/prisma'
import { getConversionFunnel } from './conversion-funnel'
import { getEfficiencyMetrics } from './efficiency-metrics'
import { getHourlyHeatmap } from './hourly-heatmap'
import { getLeadActivity } from './lead-activity'
import { getSlaMetrics } from './sla-metrics'

describe('analytics.service (Integration)', () => {
  let orgId: string
  let projectId: string
  let openStatusId: string
  let wonStatusId: string
  let leadStageId: string
  let wonStageId: string
  let leadId: string
  let conversationId: string
  let instanceId: string
  let inboundDirectionId: string

  beforeEach(async () => {
    // 1. Setup Organization and Project
    const org = await prisma.organization.create({
      data: { name: 'Analytics Test Org', slug: `ana-org-${Math.random().toString(36).substring(2, 9)}` }
    })
    orgId = org.id
    const project = await prisma.project.create({
      data: { organizationId: orgId, name: 'Analytics Project', slug: `ana-proj-${Math.random().toString(36).substring(2, 9)}` }
    })
    projectId = project.id

    // 2. Setup Lookups (ensure they exist)
    const openStatus = await prisma.dealStatus.upsert({
      where: { name: 'open' },
      update: {},
      create: { name: 'open', description: 'Open' }
    })
    openStatusId = openStatus.id

    const wonStatus = await prisma.dealStatus.upsert({
      where: { name: 'closed_won' },
      update: {},
      create: { name: 'closed_won', description: 'Won' }
    })
    wonStatusId = wonStatus.id

    const inboundDirection = await prisma.messageDirection.upsert({
      where: { name: 'INBOUND' },
      update: {},
      create: { name: 'INBOUND', description: 'Inbound' }
    })
    inboundDirectionId = inboundDirection.id

    const source = await prisma.leadSource.upsert({
        where: { name: 'live_message' },
        update: {},
        create: { name: 'live_message', description: 'Live' }
    })

    // 3. Setup Stages
    const leadStage = await prisma.dealStage.create({
      data: { organization: { connect: { id: orgId } }, projectId, name: 'Lead', order: 0, color: '#000' }
    })
    leadStageId = leadStage.id

    const wonStage = await prisma.dealStage.create({
      data: { organization: { connect: { id: orgId } }, projectId, name: 'Won', order: 1, color: '#0f0' }
    })
    wonStageId = wonStage.id

    // 4. Setup Instance, Lead, Conversation
    const instance = await prisma.whatsAppConfig.create({
      data: { organization: { connect: { id: orgId } }, project: { connect: { id: projectId } }, status: 'connected' }
    })
    instanceId = instance.id

    const lead = await prisma.lead.create({
      data: { organization: { connect: { id: orgId } }, project: { connect: { id: projectId } }, phone: '5511999999999', source: { connect: { id: source.id } }, pushName: 'Tester' }
    })
    leadId = lead.id

    const conversation = await prisma.conversation.create({
      data: { organization: { connect: { id: orgId } }, projectId, lead: { connect: { id: leadId } }, instance: { connect: { id: instanceId } }, lastInboundAt: new Date() }
    })
    conversationId = conversation.id
  })

  afterEach(async () => {
    if (orgId) {
      await prisma.organization.delete({ where: { id: orgId } }).catch(() => {})
    }
  })

  it('computes conversion funnel accurately', async () => {
    // Create one open deal in Lead stage
    await prisma.deal.create({
      data: {
        organization: { connect: { id: orgId } },
        project: { connect: { id: projectId } },
        lead: { connect: { id: leadId } },
        conversation: { connect: { id: conversationId } },
        stage: { connect: { id: leadStageId } },
        status: { connect: { id: openStatusId } },
        dealValue: 100,
      }
    })

    // Create one won deal in Won stage
    await prisma.deal.create({
      data: {
        organization: { connect: { id: orgId } },
        project: { connect: { id: projectId } },
        lead: { connect: { id: leadId } },
        conversation: { connect: { id: conversationId } },
        stage: { connect: { id: wonStageId } },
        status: { connect: { id: wonStatusId } },
        dealValue: 500,
      }
    })

    const start = new Date(Date.now() - 3600000)
    const end = new Date(Date.now() + 3600000)
    const result = await getConversionFunnel(orgId, start, end, projectId)

    expect(result.statusOverview).toHaveLength(2)
    const openResult = result.statusOverview.find((s: any) => s.status === 'open')
    expect(openResult.count).toBe(1)
    expect(Number(openResult.total_value)).toBe(100)

    expect(result.stageOverview).toHaveLength(2)
    expect(result.stageOverview[0].deal_count).toBe(1)
    expect(result.stageOverview[1].deal_count).toBe(1)
  })

  it('computes efficiency metrics accurately', async () => {
    await prisma.deal.create({
      data: {
        organization: { connect: { id: orgId } },
        project: { connect: { id: projectId } },
        lead: { connect: { id: leadId } },
        conversation: { connect: { id: conversationId } },
        stage: { connect: { id: wonStageId } },
        status: { connect: { id: wonStatusId } },
        dealValue: 1000,
        inboundMessagesCount: 5,
        outboundMessagesCount: 5,
        resolutionTimeSec: 3600,
      }
    })

    const start = new Date(Date.now() - 3600000)
    const end = new Date(Date.now() + 3600000)
    const result = await getEfficiencyMetrics(orgId, start, end, projectId)

    expect(result.aggregated).toHaveLength(1)
    expect(Number(result.aggregated[0].avg_deal_value)).toBe(1000)
    expect(Number(result.aggregated[0].avg_messages)).toBe(10)
  })

  it('computes hourly heatmap accurately', async () => {
    // Use a fixed date in May 2026.
    // 2026-05-18T10:00:00Z (UTC)
    const messageTime = new Date('2026-05-18T10:00:00Z')

    await prisma.message.create({
      data: {
        wamid: 'test-wamid',
        lead: { connect: { id: leadId } },
        instance: { connect: { id: instanceId } },
        direction: { connect: { id: inboundDirectionId } },
        type: 'text',
        status: 'received',
        timestamp: messageTime,
      }
    })

    const start = new Date('2026-05-18T00:00:00Z')
    const end = new Date('2026-05-18T23:59:59Z')
    const result = await getHourlyHeatmap(orgId, start, end, projectId)

    expect(result).toHaveLength(1)
    // DOW and Hour depend on DB timezone. 
    // We expect it to be 10 if DB is in UTC.
    expect(result[0].message_count).toBe(1)
  })

  it('identifies waiting and forgotten leads', async () => {
    // Use a new lead to avoid unique constraint on (leadId, instanceId) for conversation
    const newLead = await prisma.lead.create({
        data: {
            organization: { connect: { id: orgId } },
            project: { connect: { id: projectId } },
            phone: '5511888888888',
            source: { connect: { id: (await prisma.leadSource.findFirst({ where: { name: 'live_message' } }))!.id } }
        }
    })

    // Waiting lead: lastInboundAt > lastOutboundAt
    const waitingConversation = await prisma.conversation.create({
      data: {
        organization: { connect: { id: orgId } },
        projectId,
        lead: { connect: { id: newLead.id } },
        instance: { connect: { id: instanceId } },
        lastInboundAt: new Date(),
        lastOutboundAt: new Date(Date.now() - 60000),
      }
    })
    
    await prisma.deal.create({
      data: {
        organization: { connect: { id: orgId } },
        project: { connect: { id: projectId } },
        lead: { connect: { id: newLead.id } },
        conversation: { connect: { id: waitingConversation.id } },
        stage: { connect: { id: leadStageId } },
        status: { connect: { id: openStatusId } },
      }
    })

    const result = await getLeadActivity(orgId, projectId)
    expect(result.waitingLeads.length).toBeGreaterThan(0)
    expect(result.waitingLeads.some((l: any) => l.id === newLead.id)).toBe(true)
  })

  it('computes SLA metrics accurately', async () => {
    await prisma.deal.create({
      data: {
        organization: { connect: { id: orgId } },
        project: { connect: { id: projectId } },
        lead: { connect: { id: leadId } },
        conversation: { connect: { id: conversationId } },
        stage: { connect: { id: leadStageId } },
        status: { connect: { id: openStatusId } },
        firstResponseTimeSec: 120, // 2 mins -> '1-5 min' bucket
      }
    })

    const start = new Date(Date.now() - 3600000)
    const end = new Date(Date.now() + 3600000)
    const result = await getSlaMetrics(orgId, start, end, projectId)

    expect(result.distribution).toHaveLength(1)
    expect(result.distribution[0].bucket).toBe('1-5 min')
    expect(result.distribution[0].count).toBe(1)
  })
})
