import type { Prisma } from '@generated/prisma'
import { prisma } from '@/lib/db/prisma'
import type { AudienceSegmentFilters } from '../schemas/audience'

export async function queryLeadsByFilters(organizationId: string, filters: AudienceSegmentFilters) {
  const where: Prisma.LeadWhereInput = {
    organizationId,
    // Filter by tags
    ...(filters.tagIds?.length
      ? {
          tagAssignments: {
            some: {
              tagId: { in: filters.tagIds },
            },
          },
        }
      : {}),

    // Filter by Deal Stage and Time in Stage
    ...(filters.stageId ||
    filters.stageTimeMinDays !== undefined ||
    filters.stageTimeMaxDays !== undefined ||
    filters.hasActiveTicket ||
    filters.sourceType
      ? {
          conversations: {
            some: {
              deals: {
                some: {
                  status: { name: 'open' },
                  ...(filters.stageId ? { stageId: filters.stageId } : {}),
                  ...(filters.stageTimeMinDays !== undefined
                    ? {
                        stageEnteredAt: {
                          lte: new Date(
                            Date.now() - filters.stageTimeMinDays * 24 * 60 * 60 * 1000
                          ),
                        },
                      }
                    : {}),
                  ...(filters.stageTimeMaxDays !== undefined
                    ? {
                        stageEnteredAt: {
                          gte: new Date(
                            Date.now() - filters.stageTimeMaxDays * 24 * 60 * 60 * 1000
                          ),
                        },
                      }
                    : {}),
                  ...(filters.sourceType ? { tracking: { sourceType: filters.sourceType } } : {}),
                },
              },
            },
          },
        }
      : {}),

    // Filter by metadata
    ...(filters.createdAtGte ? { createdAt: { gte: new Date(filters.createdAtGte) } } : {}),
    ...(filters.createdAtLte ? { createdAt: { lte: new Date(filters.createdAtLte) } } : {}),
    ...(filters.lastMessageGte ? { lastMessageAt: { gte: new Date(filters.lastMessageGte) } } : {}),
  }

  // Note: The reason for the nested query above is because Deal is related to instance,
  // and Lead has conversation with Instance.
  // Let's verify relation: Lead -> Conversation -> WhatsConfig -> Deal?
  // Wait, Deal belongs to Lead and Conversation directly in my schema!
  // Let's check Deal model.
  return prisma.lead.findMany({
    where,
    select: {
      id: true,
      name: true,
      phone: true,
      pushName: true,
      lastMessageAt: true,
    },
  })
}
