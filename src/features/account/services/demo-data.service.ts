import 'server-only'
import { fakerPT_BR as faker } from '@faker-js/faker'
import { prisma } from '@/lib/db/prisma'
import { logger } from '@/lib/utils/logger'

async function resolveRequirements(organizationId: string, projectId: string) {
  const [existingStages, openStatus, source, existingConfig, inboundDir, outboundDir] =
    await Promise.all([
      prisma.dealStage.findMany({ where: { organizationId, projectId } }),
      prisma.dealStatus.findUnique({ where: { name: 'open' } }),
      prisma.leadSource.findFirst(),
      prisma.whatsAppConfig.findFirst({ where: { organizationId, projectId } }),
      prisma.messageDirection.findUnique({ where: { name: 'INBOUND' } }),
      prisma.messageDirection.findUnique({ where: { name: 'OUTBOUND' } }),
    ])

  if (!openStatus) throw new Error('DealStatus "open" not found — run DB seed')
  if (!inboundDir || !outboundDir) throw new Error('MessageDirection not found — run DB seed')
  if (!source) throw new Error('No LeadSource in database — run DB seed')

  let stages = existingStages
  if (stages.length === 0) {
    const defaultTemplate = await prisma.dealStageTemplate.findFirst({
      where: { isDefault: true },
      include: { items: { orderBy: { order: 'asc' } } },
    })
    const items = defaultTemplate?.items ?? []
    const fallback = items.length === 0
      ? [
          { name: 'Novo Contato', color: '#6366f1', order: 1, statusGroup: 'ACTIVE', probability: 0, isClosed: false, suggestedMetaEventName: null },
          { name: 'Em Negociação', color: '#f59e0b', order: 2, statusGroup: 'ACTIVE', probability: 0, isClosed: false, suggestedMetaEventName: null },
          { name: 'Proposta Enviada', color: '#10b981', order: 3, statusGroup: 'ACTIVE', probability: 0, isClosed: false, suggestedMetaEventName: null },
        ]
      : items.map((item) => ({
          name: item.name,
          color: item.color,
          order: item.order,
          statusGroup: item.statusGroup,
          probability: item.probability,
          isClosed: item.isFinal,
          suggestedMetaEventName: item.suggestedMetaEventName,
        }))
    stages = await Promise.all(
      fallback.map((s) => prisma.dealStage.create({ data: { ...s, organizationId, projectId } }))
    )
  }

  const whatsappConfig =
    existingConfig ??
    (await prisma.whatsAppConfig.create({
      data: {
        organizationId,
        projectId,
        verifiedName: 'Demo Instance',
        displayPhone: '+55 11 99999-0000',
        status: 'demo',
      },
    }))

  return { stages, openStatus, source, whatsappConfig, inboundDir, outboundDir }
}

export async function generateDemoData(params: {
  organizationId: string
  projectId: string
  count?: number
}) {
  const { organizationId, projectId } = params
  const count = Math.min(Math.max(1, params.count ?? 10), 50)

  logger.info({ organizationId, projectId, count }, '[demo-data] generating')

  const { stages, openStatus, source, whatsappConfig, inboundDir, outboundDir } =
    await resolveRequirements(organizationId, projectId)

  const maxPositions = await prisma.deal.groupBy({
    by: ['stageId'],
    where: { organizationId, projectId },
    _max: { position: true },
  })
  const stagePositionCursor = new Map<string, number>(
    maxPositions.map((r) => [r.stageId, r._max.position ?? 0])
  )

  for (let i = 0; i < count; i++) {
    const waId = `demo_${faker.string.uuid()}`
    const phone = faker.phone.number({ style: 'international' }).replace(/\D/g, '')

    const lead = await prisma.lead.create({
      data: {
        organizationId,
        projectId,
        name: faker.person.fullName(),
        phone,
        waId,
        sourceId: source.id,
        isActive: true,
      },
    })

    const inboundCount = faker.number.int({ min: 2, max: 15 })
    const outboundCount = faker.number.int({ min: 3, max: 15 })
    const lastInboundAt = faker.date.recent({ days: 2 })
    const lastOutboundAt = faker.date.recent({ days: 1 })
    const firstResponseTimeSec = faker.number.int({ min: 30, max: 600 })

    const conversation = await prisma.conversation.create({
      data: {
        organizationId,
        projectId,
        leadId: lead.id,
        instanceId: whatsappConfig.id,
        messagesCount: inboundCount + outboundCount,
        inboundMessagesCount: inboundCount,
        outboundMessagesCount: outboundCount,
        lastInboundAt,
        lastOutboundAt,
      },
    })

    const stage = faker.helpers.arrayElement(stages)
    const stagePos = (stagePositionCursor.get(stage.id) ?? 0) + 65536
    stagePositionCursor.set(stage.id, stagePos)

    const deal = await prisma.deal.create({
      data: {
        organizationId,
        projectId,
        leadId: lead.id,
        conversationId: conversation.id,
        stageId: stage.id,
        statusId: openStatus.id,
        dealValue: faker.finance.amount({ min: 500, max: 10000 }),
        source: 'demo_data',
        stageEnteredAt: faker.date.recent({ days: 5 }),
        messagesCount: inboundCount + outboundCount,
        inboundMessagesCount: inboundCount,
        outboundMessagesCount: outboundCount,
        lastInboundAt,
        lastOutboundAt,
        firstResponseTimeSec,
        position: stagePos,
      },
    })

    const messageCount = faker.number.int({ min: 3, max: 8 })
    for (let j = 0; j < messageCount; j++) {
      await prisma.message.create({
        data: {
          wamid: `demo_${faker.string.uuid()}`,
          leadId: lead.id,
          instanceId: whatsappConfig.id,
          appConversationId: conversation.id,
          dealId: deal.id,
          body: faker.lorem.sentence(),
          directionId: faker.helpers.arrayElement([inboundDir.id, outboundDir.id]),
          type: 'text',
          status: 'delivered',
          timestamp: faker.date.recent({ days: 3 }),
          source: 'demo_data',
        },
      })
    }
  }

  return { message: `${count} demo leads and deals generated successfully.`, count }
}

export async function clearDemoData(params: {
  organizationId: string
  projectId: string
}) {
  const { organizationId, projectId } = params

  logger.info({ organizationId, projectId }, '[demo-data] clearing')

  const demoDeals = await prisma.deal.findMany({
    where: { organizationId, projectId, source: 'demo_data' },
    select: { id: true, leadId: true, conversationId: true },
  })

  const dealIds = demoDeals.map((d) => d.id)
  const leadIds = demoDeals.map((d) => d.leadId)
  const conversationIds = demoDeals
    .map((d) => d.conversationId)
    .filter((id): id is string => id !== null)

  await prisma.message.deleteMany({
    where: { source: 'demo_data', appConversationId: { in: conversationIds } },
  })
  await prisma.deal.deleteMany({ where: { id: { in: dealIds } } })
  await prisma.conversation.deleteMany({ where: { id: { in: conversationIds } } })
  await prisma.lead.deleteMany({ where: { id: { in: leadIds } } })
  await prisma.whatsAppConfig.deleteMany({
    where: { organizationId, projectId, status: 'demo' },
  })

  // Remove stages that have no remaining deals (only affects stages created by demo)
  await prisma.dealStage.deleteMany({
    where: { organizationId, projectId, deals: { none: {} } },
  })

  return { message: 'Demo data cleared successfully.', deletedCount: dealIds.length }
}
