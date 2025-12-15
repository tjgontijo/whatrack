/**
 * Follow-up Sender Worker
 * Processes scheduled follow-up messages from BullMQ
 */

import { Worker, Job } from 'bullmq'
import { prisma } from '@/lib/prisma'
import { getRedisClient } from '@/lib/redis/redis-client'
import { generateFollowupMessage } from '@/services/ai/followup-generator'
import { messagingAdapter } from '@/services/messaging'
import { scheduleFollowupStep, disableFollowup } from '@/server/followup/jobs/scheduler'
import { aiCreditsService } from '@/services/credits/ai-credits-service'
import { AI_CREDIT_COSTS } from '@/services/credits/types'
import type { FollowupJobData } from '@/lib/bullmq/queues'

let worker: Worker<FollowupJobData> | null = null

/**
 * Process a follow-up job
 */
async function processFollowup(job: Job<FollowupJobData>): Promise<void> {
  const { scheduledMessageId, ticketId, organizationId, step } = job.data

  console.log(`[followup-worker] Processing job ${job.id} for ticket ${ticketId}, step ${step}`)

  // 1. Get the scheduled message and verify it's still valid
  const scheduled = await prisma.scheduledMessage.findUnique({
    where: { id: scheduledMessageId },
  })

  if (!scheduled) {
    console.log(`[followup-worker] Scheduled message ${scheduledMessageId} not found`)
    return
  }

  if (scheduled.sentAt || scheduled.cancelledAt) {
    console.log(`[followup-worker] Scheduled message already processed or cancelled`)
    return
  }

  // 2. Get ticket with conversation, lead, and messages
  const ticket = await prisma.ticket.findUnique({
    where: { id: ticketId },
    include: {
      conversation: {
        include: {
          lead: true,
        },
      },
      messages: {
        orderBy: { createdAt: 'desc' },
        take: 10,
        select: {
          content: true,
          senderType: true,
        },
      },
    },
  })

  if (!ticket || !ticket.followUpEnabled) {
    console.log(`[followup-worker] Ticket ${ticketId} not found or follow-up disabled`)
    await prisma.scheduledMessage.update({
      where: { id: scheduledMessageId },
      data: {
        cancelledAt: new Date(),
        cancelReason: 'ticket_not_found_or_disabled',
      },
    })
    return
  }

  const conversation = ticket.conversation

  // 3. Get WhatsApp instance separately (it's not a relation in Conversation)
  const instance = await prisma.whatsappInstance.findFirst({
    where: {
      organizationId,
      instanceId: conversation.instanceId,
    },
  })

  if (!instance) {
    console.error(`[followup-worker] No WhatsApp instance for conversation`)
    await prisma.scheduledMessage.update({
      where: { id: scheduledMessageId },
      data: {
        cancelledAt: new Date(),
        cancelReason: 'no_whatsapp_instance',
      },
    })
    return
  }

  // 4. Get follow-up config
  const config = await prisma.followUpConfig.findUnique({
    where: { organizationId },
    include: {
      steps: {
        orderBy: { order: 'asc' },
      },
    },
  })

  if (!config?.isActive) {
    console.log(`[followup-worker] Follow-up config not active for org ${organizationId}`)
    await prisma.scheduledMessage.update({
      where: { id: scheduledMessageId },
      data: {
        cancelledAt: new Date(),
        cancelReason: 'config_inactive',
      },
    })
    return
  }

  // 5. Check AI credits
  const hasCredits = await aiCreditsService.hasCredits(organizationId, 'followup_generation')
  if (!hasCredits) {
    console.log(`[followup-worker] No AI credits for org ${organizationId}`)
    await prisma.scheduledMessage.update({
      where: { id: scheduledMessageId },
      data: {
        cancelledAt: new Date(),
        cancelReason: 'no_credits',
      },
    })
    return
  }

  // 6. Generate AI message
  const maxSteps = config.steps.length
  const recentMessages = ticket.messages.map((m) => ({
    content: m.content,
    senderType: m.senderType,
  }))

  let messageContent: string
  try {
    messageContent = await generateFollowupMessage({
      organizationId,
      ticketId,
      step,
      maxSteps,
      recentMessages,
      aiTone: config.aiTone,
      businessType: config.businessType,
      productDescription: config.productDescription,
    })
  } catch (error) {
    console.error(`[followup-worker] AI generation failed:`, error)
    throw error // Will retry
  }

  // 7. Send message via WhatsApp
  const leadPhone = conversation.lead.phone
  if (!leadPhone) {
    console.error(`[followup-worker] Lead has no phone number`)
    await prisma.scheduledMessage.update({
      where: { id: scheduledMessageId },
      data: {
        cancelledAt: new Date(),
        cancelReason: 'no_phone',
      },
    })
    return
  }

  const result = await messagingAdapter.sendText(
    organizationId,
    instance.instanceId,
    leadPhone,
    messageContent
  )

  if (!result.success) {
    console.error(`[followup-worker] Failed to send message: ${result.error}`)
    throw new Error(result.error || 'Failed to send message')
  }

  // 8. Consume AI credits
  await aiCreditsService.consumeCredits({
    organizationId,
    amount: AI_CREDIT_COSTS.followup_generation,
    action: 'followup_generation',
    ticketId,
    contactPhone: leadPhone,
    triggeredBy: 'system',
  })

  // 9. Create message in database
  await prisma.message.create({
    data: {
      ticketId,
      content: messageContent,
      senderType: 'SYSTEM',
      messageType: 'TEXT',
      sentAt: new Date(),
    },
  })

  // 10. Update scheduled message as sent
  await prisma.scheduledMessage.update({
    where: { id: scheduledMessageId },
    data: {
      sentAt: new Date(),
      content: messageContent,
      creditsUsed: AI_CREDIT_COSTS.followup_generation,
    },
  })

  console.log(`[followup-worker] Message sent successfully for ticket ${ticketId}, step ${step}`)

  // 11. Schedule next step if available
  const nextStep = config.steps.find((s) => s.order === step + 1)

  if (nextStep) {
    await scheduleFollowupStep(
      ticketId,
      organizationId,
      nextStep.order,
      nextStep.delayMinutes,
      config
    )
    console.log(`[followup-worker] Scheduled next step ${nextStep.order} for ticket ${ticketId}`)
  } else {
    // Last step completed - disable follow-up
    await disableFollowup(ticketId)
    console.log(`[followup-worker] Follow-up sequence completed for ticket ${ticketId}`)
  }
}

/**
 * Start the follow-up worker
 */
export function startFollowupWorker(): Worker<FollowupJobData> {
  if (worker) {
    return worker
  }

  worker = new Worker<FollowupJobData>('followup', processFollowup, {
    connection: getRedisClient(),
    concurrency: 5,
  })

  worker.on('completed', (job) => {
    console.log(`[followup-worker] Job ${job.id} completed`)
  })

  worker.on('failed', (job, err) => {
    console.error(`[followup-worker] Job ${job?.id} failed:`, err.message)
  })

  worker.on('error', (err) => {
    console.error(`[followup-worker] Worker error:`, err)
  })

  console.log('[followup-worker] Worker started')

  return worker
}

/**
 * Stop the follow-up worker
 */
export async function stopFollowupWorker(): Promise<void> {
  if (worker) {
    await worker.close()
    worker = null
    console.log('[followup-worker] Worker stopped')
  }
}

/**
 * Get the current worker instance
 */
export function getFollowupWorker(): Worker<FollowupJobData> | null {
  return worker
}
