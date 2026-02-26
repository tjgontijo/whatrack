import { prisma } from '@/lib/db/prisma'

export async function listAiInsights(organizationId: string, status: string) {
  return prisma.aiInsight.findMany({
    where: {
      organizationId,
      status,
      ticket: {
        status: 'open',
      },
    },
    select: {
      id: true,
      organizationId: true,
      ticketId: true,
      status: true,
      payload: true,
      createdAt: true,
      updatedAt: true,
      agent: {
        select: { name: true, icon: true },
      },
      ticket: {
        select: {
          id: true,
          conversationId: true,
          status: true,
          conversation: {
            select: {
              id: true,
              lead: {
                select: { name: true, phone: true, profilePicUrl: true },
              },
            },
          },
        },
      },
    },
    orderBy: { createdAt: 'desc' },
  })
}

export async function rejectAiInsight(organizationId: string, insightId: string) {
  const insight = await prisma.aiInsight.findUnique({
    where: { id: insightId },
  })

  if (!insight || insight.organizationId !== organizationId) {
    return { error: 'Insight não encontrado' as const, status: 404 as const }
  }

  if (insight.status !== 'SUGGESTION') {
    return { error: 'Este insight já foi resolvido' as const, status: 400 as const }
  }

  await prisma.aiInsight.update({
    where: { id: insight.id },
    data: { status: 'DISMISSED' },
  })

  return {
    data: {
      success: true,
      message: 'Insight descartado (falso positivo).',
    },
  }
}
