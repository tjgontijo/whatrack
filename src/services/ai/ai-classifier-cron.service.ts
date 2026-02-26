import { prisma } from '@/lib/db/prisma'
import { dispatchAiEvent } from '@/services/ai/ai-execution.service'

export async function runAiClassifierCron() {
  const now = Date.now()
  const threeMinutesAgo = new Date(now - 3 * 60 * 1000)
  const twoHoursAgo = new Date(now - 2 * 60 * 60 * 1000)

  const eligibleTickets = await prisma.ticket.findMany({
    where: {
      status: 'open',
      messagesCount: { gte: 4 },
      conversation: {
        lead: {
          lastMessageAt: {
            lte: threeMinutesAgo,
            gte: twoHoursAgo,
          },
        },
      },
      NOT: {
        aiInsights: {
          some: {
            createdAt: { gte: twoHoursAgo },
          },
        },
      },
    },
    select: { id: true, organizationId: true },
    take: 20,
  })

  let analyzed = 0

  await Promise.allSettled(
    eligibleTickets.map(async (ticket) => {
      const generatedInsights = await dispatchAiEvent(
        'CONVERSATION_IDLE_3M',
        ticket.id,
        ticket.organizationId
      )

      analyzed += generatedInsights
    })
  )

  return {
    found: eligibleTickets.length,
    approvalsCreated: analyzed,
  }
}
