/**
 * Follow-up Scheduler Service
 * Manages enabling/disabling follow-ups and scheduling messages
 */

import { prisma } from '@/lib/prisma'
import { getFollowupQueue, FollowupJobData } from '@/lib/bullmq/queues'
import { adjustToBusinessHours } from '@/lib/date/business-hours'

/**
 * Enable follow-up for a ticket
 * Schedules the first follow-up step based on organization config
 */
export async function enableFollowup(
  ticketId: string,
  organizationId: string
): Promise<void> {
  const config = await prisma.followUpConfig.findUnique({
    where: { organizationId },
    include: {
      steps: {
        orderBy: { order: 'asc' },
      },
    },
  })

  if (!config?.isActive || !config.steps.length) {
    throw new Error('Follow-up not configured for this organization')
  }

  await prisma.ticket.update({
    where: { id: ticketId },
    data: {
      followUpEnabled: true,
      currentFollowUpStep: 1,
    },
  })

  // Schedule first step
  await scheduleFollowupStep(ticketId, organizationId, 1, config.steps[0].delayMinutes, config)
}

/**
 * Disable follow-up for a ticket
 * Cancels all pending scheduled messages
 */
export async function disableFollowup(ticketId: string): Promise<void> {
  const queue = getFollowupQueue()

  // Find and cancel all pending scheduled messages
  const pending = await prisma.scheduledMessage.findMany({
    where: {
      ticketId,
      sentAt: null,
      cancelledAt: null,
    },
  })

  for (const msg of pending) {
    if (msg.bullJobId) {
      try {
        await queue.remove(msg.bullJobId)
      } catch {
        // Job might already be processed or removed
      }
    }

    await prisma.scheduledMessage.update({
      where: { id: msg.id },
      data: {
        cancelledAt: new Date(),
        cancelReason: 'manual',
      },
    })
  }

  await prisma.ticket.update({
    where: { id: ticketId },
    data: {
      followUpEnabled: false,
      currentFollowUpStep: null,
    },
  })
}

/**
 * Cancel follow-ups when lead replies
 * Resets to step 1 and reschedules if follow-up is still enabled
 */
export async function cancelFollowupsOnReply(ticketId: string): Promise<void> {
  const ticket = await prisma.ticket.findUnique({
    where: { id: ticketId },
    include: {
      whatsappConversation: true,
    },
  })

  if (!ticket?.followUpEnabled) {
    return
  }

  const queue = getFollowupQueue()

  // Cancel all pending messages
  const pending = await prisma.scheduledMessage.findMany({
    where: {
      ticketId,
      sentAt: null,
      cancelledAt: null,
    },
  })

  for (const msg of pending) {
    if (msg.bullJobId) {
      try {
        await queue.remove(msg.bullJobId)
      } catch {
        // Job might already be processed
      }
    }

    await prisma.scheduledMessage.update({
      where: { id: msg.id },
      data: {
        cancelledAt: new Date(),
        cancelReason: 'lead_replied',
      },
    })
  }

  // Reset to step 1
  await prisma.ticket.update({
    where: { id: ticketId },
    data: {
      currentFollowUpStep: 1,
    },
  })

  // Re-schedule step 1
  const config = await prisma.followUpConfig.findUnique({
    where: { organizationId: ticket.whatsappConversation.organizationId },
    include: {
      steps: {
        orderBy: { order: 'asc' },
      },
    },
  })

  if (config?.steps.length) {
    await scheduleFollowupStep(
      ticketId,
      ticket.whatsappConversation.organizationId,
      1,
      config.steps[0].delayMinutes,
      config
    )
  }
}

interface FollowUpConfigWithSteps {
  businessHoursOnly: boolean
  businessStartHour: number
  businessEndHour: number
  businessDays: number[]
}

/**
 * Schedule a follow-up step
 */
export async function scheduleFollowupStep(
  ticketId: string,
  organizationId: string,
  step: number,
  delayMinutes: number,
  config?: FollowUpConfigWithSteps | null
): Promise<void> {
  let scheduledAt = new Date(Date.now() + delayMinutes * 60 * 1000)

  // Adjust to business hours if configured
  if (config?.businessHoursOnly) {
    scheduledAt = adjustToBusinessHours(scheduledAt, config)
  }

  const scheduled = await prisma.scheduledMessage.create({
    data: {
      organizationId,
      ticketId,
      step,
      scheduledAt,
    },
  })

  const jobData: FollowupJobData = {
    scheduledMessageId: scheduled.id,
    ticketId,
    organizationId,
    step,
  }

  const delayMs = scheduledAt.getTime() - Date.now()
  const queue = getFollowupQueue()

  const job = await queue.add('followup', jobData, {
    delay: Math.max(0, delayMs),
    jobId: `followup-${scheduled.id}`,
  })

  await prisma.scheduledMessage.update({
    where: { id: scheduled.id },
    data: { bullJobId: job.id },
  })

  await prisma.ticket.update({
    where: { id: ticketId },
    data: { currentFollowUpStep: step },
  })
}

/**
 * Skip to the next follow-up step
 */
export async function skipToNextStep(ticketId: string): Promise<boolean> {
  const ticket = await prisma.ticket.findUnique({
    where: { id: ticketId },
    include: {
      whatsappConversation: true,
    },
  })

  if (!ticket?.followUpEnabled || !ticket.currentFollowUpStep) {
    return false
  }

  const config = await prisma.followUpConfig.findUnique({
    where: { organizationId: ticket.whatsappConversation.organizationId },
    include: {
      steps: {
        orderBy: { order: 'asc' },
      },
    },
  })

  const nextStep = config?.steps.find((s) => s.order === (ticket.currentFollowUpStep ?? 0) + 1)

  if (!nextStep) {
    // No more steps, disable follow-up
    await disableFollowup(ticketId)
    return false
  }

  // Cancel current pending
  await cancelPendingMessages(ticketId)

  // Schedule next step with immediate delay
  await scheduleFollowupStep(
    ticketId,
    ticket.whatsappConversation.organizationId,
    nextStep.order,
    0, // Immediate
    config
  )

  return true
}

/**
 * Cancel all pending messages for a ticket without disabling follow-up
 */
async function cancelPendingMessages(ticketId: string): Promise<void> {
  const queue = getFollowupQueue()

  const pending = await prisma.scheduledMessage.findMany({
    where: {
      ticketId,
      sentAt: null,
      cancelledAt: null,
    },
  })

  for (const msg of pending) {
    if (msg.bullJobId) {
      try {
        await queue.remove(msg.bullJobId)
      } catch {
        // Ignore
      }
    }

    await prisma.scheduledMessage.update({
      where: { id: msg.id },
      data: {
        cancelledAt: new Date(),
        cancelReason: 'manual',
      },
    })
  }
}
