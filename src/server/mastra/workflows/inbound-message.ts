import 'server-only'

import type { Prisma } from '@/lib/db/client'
import { prisma } from '@/lib/db/prisma'
import { aiAgentRegistryService } from '@/lib/ai/services/ai-agent-registry.service'
import { aiConversationStateService } from '@/lib/ai/services/ai-conversation-state.service'
import { aiEventService } from '@/lib/ai/services/ai-event.service'
import { aiSkillExecutionLogService } from '@/lib/ai/services/ai-skill-execution-log.service'
import { leadAiContextService } from '@/lib/ai/services/lead-ai-context.service'
import { skillRunner } from '@/lib/ai/services/skill-runner'
import { whatsappAiSendService } from '@/lib/ai/services/whatsapp-ai-send.service'
import { logger } from '@/lib/utils/logger'

interface WorkflowSnapshot {
  state: {
    organizationId: string
    projectId: string
    lastProcessedFingerprint: string | null
    conversation: {
      id: string
      outboundMessagesCount: number
      lead: {
        id: string
        name: string | null
        pushName: string | null
        phone: string | null
        waId: string | null
      }
    }
  }
  pendingMessages: Array<{
    body: string | null
  }>
  fingerprint: string | null
  ticket: {
    id: string
    windowOpen: boolean
    windowExpiresAt: Date | null
  } | null
}

const DEFAULT_TEMPLATE_NAME = 'hello_world'

const businessHoursSchema = {
  parse(value: Prisma.JsonValue | null | undefined) {
    if (!value || typeof value !== 'object' || Array.isArray(value)) {
      return null
    }

    const record = value as Record<string, unknown>
    const schedulesValue = Array.isArray(record.schedules) ? record.schedules : []

    const schedules = schedulesValue
      .map((entry) => {
        if (!entry || typeof entry !== 'object' || Array.isArray(entry)) {
          return null
        }

        const item = entry as Record<string, unknown>
        const day = typeof item.day === 'number' ? item.day : Number(item.day)
        const open = typeof item.open === 'string' ? item.open : null
        const close = typeof item.close === 'string' ? item.close : null

        if (!Number.isInteger(day) || day < 0 || day > 6 || !open || !close) {
          return null
        }

        return { day, open, close }
      })
      .filter((entry): entry is { day: number; open: string; close: string } => Boolean(entry))

    const timezone =
      typeof record.timezone === 'string' && record.timezone.length > 0
        ? record.timezone
        : 'America/Sao_Paulo'

    return schedules.length > 0 ? { timezone, schedules } : null
  },
}

function normalizeText(value: string) {
  return value
    .normalize('NFD')
    .replace(/\p{Diacritic}/gu, '')
    .toLowerCase()
}

function toMinutes(value: string) {
  const [hour, minute] = value.split(':').map((part) => Number(part))
  if (!Number.isInteger(hour) || !Number.isInteger(minute)) {
    return null
  }

  return hour * 60 + minute
}

function isWithinBusinessHours(businessHours: Prisma.JsonValue | null | undefined) {
  const parsed = businessHoursSchema.parse(businessHours)
  if (!parsed) {
    return true
  }

  const formatter = new Intl.DateTimeFormat('en-US', {
    timeZone: parsed.timezone,
    weekday: 'short',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  })

  const parts = formatter.formatToParts(new Date())
  const weekday = parts.find((part) => part.type === 'weekday')?.value
  const hour = parts.find((part) => part.type === 'hour')?.value
  const minute = parts.find((part) => part.type === 'minute')?.value

  const dayMap: Record<string, number> = {
    Sun: 0,
    Mon: 1,
    Tue: 2,
    Wed: 3,
    Thu: 4,
    Fri: 5,
    Sat: 6,
  }

  const day = weekday ? dayMap[weekday] : undefined
  if (typeof day === 'undefined' || !hour || !minute) {
    return true
  }

  const nowMinutes = Number(hour) * 60 + Number(minute)
  const currentSchedule = parsed.schedules.find((item) => item.day === day)
  if (!currentSchedule) {
    return false
  }

  const openMinutes = toMinutes(currentSchedule.open)
  const closeMinutes = toMinutes(currentSchedule.close)
  if (openMinutes === null || closeMinutes === null) {
    return true
  }

  return nowMinutes >= openMinutes && nowMinutes < closeMinutes
}

function chooseSkill(input: {
  aggregatedText: string
  hasCrisis: boolean
  withinBusinessHours: boolean
  conversationOutboundCount: number
}) {
  const normalized = normalizeText(input.aggregatedText)

  if (input.hasCrisis) {
    return {
      slug: 'human-handoff',
      reason: 'crisis-keyword',
      templateName: DEFAULT_TEMPLATE_NAME,
    }
  }

  if (!input.withinBusinessHours) {
    return {
      slug: 'out-of-hours-reply',
      reason: 'outside-business-hours',
      templateName: DEFAULT_TEMPLATE_NAME,
    }
  }

  if (input.conversationOutboundCount === 0) {
    return {
      slug: 'send-welcome',
      reason: 'first-response',
      templateName: DEFAULT_TEMPLATE_NAME,
    }
  }

  if (/(preco|valor|orcamento|price|pricing)/.test(normalized)) {
    return {
      slug: 'send-pricing',
      reason: 'pricing-intent',
      templateName: DEFAULT_TEMPLATE_NAME,
    }
  }

  if (/(produto|servico|serviço|como funciona|detalhes|informacao|informação)/.test(normalized)) {
    return {
      slug: 'explain-product-service',
      reason: 'product-intent',
      templateName: DEFAULT_TEMPLATE_NAME,
    }
  }

  return {
    slug: 'collect-lead-qualification',
    reason: 'qualification-follow-up',
    templateName: DEFAULT_TEMPLATE_NAME,
  }
}

async function loadWorkflowScope(snapshot: WorkflowSnapshot) {
  const [projectConfig, crisisKeywords] = await Promise.all([
    prisma.aiProjectConfig.findUnique({
      where: { projectId: snapshot.state.projectId },
      select: {
        id: true,
        organizationId: true,
        projectId: true,
        businessName: true,
        productDescription: true,
        pricingInfo: true,
        nextStepType: true,
        assistantName: true,
        escalationContact: true,
        businessHours: true,
        testingModeEnabled: true,
        testingPhones: true,
      },
    }),
    prisma.aiCrisisKeyword.findMany({
      where: {
        organizationId: snapshot.state.organizationId,
        projectId: snapshot.state.projectId,
        isActive: true,
      },
      orderBy: {
        severity: 'desc',
      },
    }),
  ])

  return {
    projectConfig,
    crisisKeywords,
  }
}

async function updateLeadContextFromWorkflow(input: {
  leadId: string
  profileSummary: string
  skillSlug: string
}) {
  return leadAiContextService.updateContext(input.leadId, {
    profileSummary: input.profileSummary,
    suggestedNextAction: input.skillSlug,
    suggestedNextActionAt: new Date(),
  })
}

export async function runInboundMessageWorkflow(input: {
  organizationId: string
  projectId: string
  conversationId: string
  messageId: string
}) {
  const snapshotResult = await aiConversationStateService.getPendingSnapshot(
    input.conversationId
  )

  if (!snapshotResult.success) {
    return snapshotResult
  }

  const snapshot = snapshotResult.data as WorkflowSnapshot
  if (!snapshot.fingerprint || snapshot.pendingMessages.length === 0) {
    return {
      success: true,
      data: {
        status: 'noop',
        reason: 'empty-buffer',
      },
    }
  }

  if (snapshot.state.lastProcessedFingerprint === snapshot.fingerprint) {
    return {
      success: true,
      data: {
        status: 'noop',
        reason: 'already-processed',
      },
    }
  }

  const agentEnabled = await aiAgentRegistryService.isAgentEnabled(
    'whatsapp-inbound',
    input.projectId
  )

  if (!agentEnabled.success || !agentEnabled.data) {
    await aiConversationStateService.clearProcessedMessages({
      conversationId: input.conversationId,
      fingerprint: snapshot.fingerprint,
    })

    return {
      success: true,
      data: {
        status: 'skipped',
        reason: 'agent-disabled',
      },
    }
  }

  const scope = await loadWorkflowScope(snapshot)
  if (!scope.projectConfig) {
    return {
      success: false,
      error: `AiProjectConfig not found for project ${input.projectId}`,
    }
  }

  const lead = snapshot.state.conversation.lead
  const normalizedPhone = normalizeText(lead.phone ?? lead.waId ?? '')
  const testingPhones =
    Array.isArray(scope.projectConfig.testingPhones) ? scope.projectConfig.testingPhones : []

  if (
    scope.projectConfig.testingModeEnabled &&
    !testingPhones.some(
      (value) => typeof value === 'string' && normalizeText(value) === normalizedPhone
    )
  ) {
    await aiConversationStateService.clearProcessedMessages({
      conversationId: input.conversationId,
      fingerprint: snapshot.fingerprint,
    })

    return {
      success: true,
      data: {
        status: 'skipped',
        reason: 'testing-mode-filter',
      },
    }
  }

  const aggregatedText = snapshot.pendingMessages
    .map((message) => message.body?.trim())
    .filter((message): message is string => Boolean(message))
    .join('\n')
    .trim()

  const crisisKeyword = scope.crisisKeywords.find((item) =>
    normalizeText(aggregatedText).includes(normalizeText(item.keyword))
  )
  const withinBusinessHours = isWithinBusinessHours(scope.projectConfig.businessHours)
  const routing = chooseSkill({
    aggregatedText,
    hasCrisis: Boolean(crisisKeyword),
    withinBusinessHours,
    conversationOutboundCount: snapshot.state.conversation.outboundMessagesCount,
  })

  const triageEvent = await aiEventService.record({
    type: 'TRIAGE_COMPLETED',
    status: 'success',
    organizationId: input.organizationId,
    projectId: input.projectId,
    leadId: lead.id,
    ticketId: snapshot.ticket?.id,
    agentSlug: 'whatsapp-inbound',
    channel: 'whatsapp',
    direction: 'internal',
    metadata: {
      conversationId: input.conversationId,
      messageId: input.messageId,
      skillSlug: routing.slug,
      reason: routing.reason,
      withinBusinessHours,
      crisisKeyword: crisisKeyword?.keyword ?? null,
    },
  })

  let crisisEventId: string | null = null
  if (crisisKeyword) {
    const crisisEvent = await aiEventService.record({
      type: 'CRISIS_DETECTED',
      status: 'success',
      organizationId: input.organizationId,
      projectId: input.projectId,
      leadId: lead.id,
      ticketId: snapshot.ticket?.id,
      agentSlug: 'whatsapp-inbound',
      channel: 'whatsapp',
      direction: 'internal',
      metadata: {
        conversationId: input.conversationId,
        keyword: crisisKeyword.keyword,
        severity: crisisKeyword.severity,
      },
    })

    crisisEventId = crisisEvent.success ? crisisEvent.data.id : null
  }

  const executionKey = aiSkillExecutionLogService.buildExecutionKey({
    conversationId: input.conversationId,
    fingerprint: snapshot.fingerprint,
  })

  const resolvedSkill = await skillRunner.resolvePublishedSkill({
    skillSlug: routing.slug,
    organizationId: input.organizationId,
    projectId: input.projectId,
  })

  if (!resolvedSkill.success) {
    return {
      success: false,
      error: resolvedSkill.error,
    }
  }

  const claim = await aiSkillExecutionLogService.claimExecution({
    executionKey,
    organizationId: input.organizationId,
    projectId: input.projectId,
    conversationId: input.conversationId,
    ticketId: snapshot.ticket?.id,
    skillId: resolvedSkill.data.skill.id,
    skillVersion: resolvedSkill.data.version.version,
    routingDecision: {
      reason: routing.reason,
      crisisKeyword: crisisKeyword?.keyword ?? null,
      withinBusinessHours,
    },
  })

  if (!claim.success) {
    return claim
  }

  if (claim.data.status !== 'created') {
    return {
      success: true,
      data: {
        status: 'noop',
        reason: claim.data.status,
      },
    }
  }

  const executionLogId = claim.data.log.id
  const startedAt = Date.now()

  try {
    const skillResult = await skillRunner.runSkill({
      skillSlug: routing.slug,
      context: {
        organizationId: input.organizationId,
        projectId: input.projectId,
        leadId: lead.id,
        ticketId: snapshot.ticket?.id ?? undefined,
        pendingMessages: snapshot.pendingMessages,
        lead: {
          name: lead.name,
          pushName: lead.pushName,
          phone: lead.phone,
          waId: lead.waId,
        },
        projectConfig: {
          assistantName: scope.projectConfig.assistantName,
          businessName: scope.projectConfig.businessName,
          productDescription: scope.projectConfig.productDescription,
          pricingInfo: scope.projectConfig.pricingInfo,
          nextStepType: scope.projectConfig.nextStepType,
          escalationContact: scope.projectConfig.escalationContact,
          businessHours: scope.projectConfig.businessHours,
        },
      },
    })

    if (!skillResult.success) {
      throw new Error(skillResult.error)
    }

    const responseText = skillResult.data.text

    const sendResult = await whatsappAiSendService.sendWhatsAppAiReply({
      organizationId: input.organizationId,
      projectId: input.projectId,
      leadId: lead.id,
      ticketId: snapshot.ticket?.id,
      conversationId: input.conversationId,
      to: lead.waId ?? lead.phone ?? '',
      text: responseText,
      windowOpen: Boolean(
        snapshot.ticket?.windowOpen &&
          (!snapshot.ticket.windowExpiresAt ||
            snapshot.ticket.windowExpiresAt.getTime() > Date.now())
      ),
      templateName: routing.templateName,
    })

    if (!sendResult.success) {
      throw new Error(sendResult.error)
    }

    const skillEvent = await aiEventService.record({
      type: 'SKILL_EXECUTED',
      status: 'success',
      organizationId: input.organizationId,
      projectId: input.projectId,
      leadId: lead.id,
      ticketId: snapshot.ticket?.id,
      agentSlug: 'whatsapp-inbound',
      channel: 'whatsapp',
      direction: 'internal',
      metadata: {
        conversationId: input.conversationId,
        skillSlug: skillResult.data.resolvedSkillSlug,
        executionKey,
        outboundChannel: sendResult.data.channel,
      },
    })

    const contextResult = await updateLeadContextFromWorkflow({
      leadId: lead.id,
      profileSummary:
        skillResult.data.stateUpdates?.profileSummary ??
        `Última intenção detectada: ${aggregatedText.slice(0, 400)}`,
      skillSlug:
        skillResult.data.stateUpdates?.suggestedNextAction ??
        skillResult.data.resolvedSkillSlug,
    })

    let contextEventId: string | null = null
    if (contextResult.success) {
      const contextEvent = await aiEventService.record({
        type: 'CONTEXT_UPDATED',
        status: 'success',
        organizationId: input.organizationId,
        projectId: input.projectId,
        leadId: lead.id,
        ticketId: snapshot.ticket?.id,
        agentSlug: 'whatsapp-inbound',
        channel: 'whatsapp',
        direction: 'internal',
        metadata: {
          conversationId: input.conversationId,
          suggestedNextAction:
            skillResult.data.stateUpdates?.suggestedNextAction ??
            skillResult.data.resolvedSkillSlug,
        },
      })

      contextEventId = contextEvent.success ? contextEvent.data.id : null
    }

    const clearResult = await aiConversationStateService.clearProcessedMessages({
      conversationId: input.conversationId,
      fingerprint: snapshot.fingerprint,
    })

    await aiSkillExecutionLogService.completeExecution({
      executionLogId,
      output: responseText,
      outboundPayload: {
        text: responseText,
        windowOpen: sendResult.data.channel === 'message',
        templateName: sendResult.data.channel === 'template' ? routing.templateName : null,
      },
      outboundResult: sendResult.data.providerResult,
      relatedEventIds: [
        triageEvent.success ? triageEvent.data.id : null,
        crisisEventId,
        skillEvent.success ? skillEvent.data.id : null,
        sendResult.data.aiEventId,
        contextEventId,
      ].filter((value): value is string => Boolean(value)),
      durationMs: Date.now() - startedAt,
      errorMessage:
        clearResult.success && !clearResult.data.cleared
          ? `buffer_clear_skipped:${clearResult.data.reason}`
          : null,
    })

    return {
      success: true,
      data: {
        status: 'processed',
        executionLogId,
        skillSlug: skillResult.data.resolvedSkillSlug,
        outboundChannel: sendResult.data.channel,
      },
    }
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown inbound workflow error'

    logger.error(
      {
        err: error,
        organizationId: input.organizationId,
        projectId: input.projectId,
        conversationId: input.conversationId,
      },
      '[inbound-message-workflow] Failed to process inbound message'
    )

    await aiSkillExecutionLogService.failExecution({
      executionLogId,
      durationMs: Date.now() - startedAt,
      errorMessage: message,
    })

    await aiEventService.record({
      type: 'ERROR',
      organizationId: input.organizationId,
      projectId: input.projectId,
      leadId: lead.id,
      ticketId: snapshot.ticket?.id,
      agentSlug: 'whatsapp-inbound',
      channel: 'whatsapp',
      direction: 'internal',
      status: 'error',
      errorMsg: message,
      metadata: {
        conversationId: input.conversationId,
        executionKey,
      },
    })

    return {
      success: false,
      error: message,
    }
  }
}
