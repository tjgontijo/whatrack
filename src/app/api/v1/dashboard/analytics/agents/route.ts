/**
 * Dashboard Agents Analytics API
 * GET - Get per-agent performance metrics
 */

import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { validateFullAccess } from '@/server/auth/validate-organization-access'

export const dynamic = 'force-dynamic'

function resolvePeriodDateRange(period: string): { gte: Date; lte: Date } {
  const now = new Date()
  const lte = now

  let gte: Date
  switch (period) {
    case '7d':
      gte = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000)
      break
    case '30d':
      gte = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000)
      break
    case '90d':
      gte = new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000)
      break
    default:
      gte = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000)
  }

  return { gte, lte }
}

interface AgentData {
  userId: string
  name: string
  email: string
  image: string | null
  ticketsAssigned: number
  ticketsClosed: number
  ticketsWon: number
  salesCount: number
  messagesSent: number
  avgResponseTimeMs: number | null
  avgSentimentScore: number | null
  conversionRate: number
}

export async function GET(request: Request) {
  try {
    const access = await validateFullAccess(request)
    if (!access.hasAccess) {
      return NextResponse.json({ error: access.error }, { status: 403 })
    }

    const organizationId = access.organizationId!

    const { searchParams } = new URL(request.url)
    const period = searchParams.get('period') ?? '7d'
    const dateRange = resolvePeriodDateRange(period)

    // First check if we have UserDailyMetrics data
    const hasUserMetrics = await prisma.userDailyMetrics.findFirst({
      where: { organizationId },
    })

    if (hasUserMetrics) {
      // Use pre-aggregated UserDailyMetrics
      const agentMetrics = await prisma.userDailyMetrics.groupBy({
        by: ['userId'],
        where: {
          organizationId,
          date: { gte: dateRange.gte, lte: dateRange.lte },
        },
        _sum: {
          ticketsAssigned: true,
          ticketsClosed: true,
          ticketsWon: true,
          salesCount: true,
          messagesSent: true,
        },
        _avg: {
          avgResponseTimeMs: true,
          avgSentimentScore: true,
        },
      })

      // Get user details
      const userIds = agentMetrics.map((m) => m.userId)
      const users = await prisma.user.findMany({
        where: { id: { in: userIds } },
        select: {
          id: true,
          name: true,
          email: true,
          image: true,
        },
      })

      const usersMap = new Map(users.map((u) => [u.id, u]))

      const agents: AgentData[] = agentMetrics.map((m) => {
        const user = usersMap.get(m.userId)
        const totalDecided =
          (m._sum.ticketsWon ?? 0) +
          ((m._sum.ticketsClosed ?? 0) - (m._sum.ticketsWon ?? 0))
        const conversionRate =
          totalDecided > 0 ? (m._sum.ticketsWon ?? 0) / totalDecided : 0

        return {
          userId: m.userId,
          name: user?.name ?? 'Unknown',
          email: user?.email ?? '',
          image: user?.image ?? null,
          ticketsAssigned: m._sum.ticketsAssigned ?? 0,
          ticketsClosed: m._sum.ticketsClosed ?? 0,
          ticketsWon: m._sum.ticketsWon ?? 0,
          salesCount: m._sum.salesCount ?? 0,
          messagesSent: m._sum.messagesSent ?? 0,
          avgResponseTimeMs: m._avg.avgResponseTimeMs ?? null,
          avgSentimentScore: m._avg.avgSentimentScore ?? null,
          conversionRate: Math.round(conversionRate * 100),
        }
      })

      // Sort by tickets closed (best performers first)
      agents.sort((a, b) => b.ticketsClosed - a.ticketsClosed)

      return NextResponse.json({
        agents,
        period,
        totalAgents: agents.length,
      })
    }

    // Fallback: calculate from raw data
    // Get organization and its members via memberships
    const organization = await prisma.organization.findUnique({
      where: { id: organizationId },
      include: {
        members: {
          include: {
            user: {
              select: {
                id: true,
                name: true,
                email: true,
                image: true,
              },
            },
          },
        },
      },
    })

    if (!organization) {
      return NextResponse.json({ error: 'Organization not found' }, { status: 404 })
    }

    const agents: AgentData[] = await Promise.all(
      organization.members.map(async (member) => {
        const [assignedCount, closedCount, messagesCount] = await Promise.all([
          prisma.ticket.count({
            where: {
              conversation: { organizationId },
              assigneeId: member.userId,
              createdAt: { gte: dateRange.gte, lte: dateRange.lte },
            },
          }),
          prisma.ticket.count({
            where: {
              conversation: { organizationId },
              assigneeId: member.userId,
              status: 'RESOLVED',
              updatedAt: { gte: dateRange.gte, lte: dateRange.lte },
            },
          }),
          prisma.message.count({
            where: {
              ticket: {
                conversation: { organizationId },
                assigneeId: member.userId,
              },
              senderType: 'USER',
              sentAt: { gte: dateRange.gte, lte: dateRange.lte },
            },
          }),
        ])

        const totalDecided = assignedCount
        const conversionRate = totalDecided > 0 ? closedCount / totalDecided : 0

        return {
          userId: member.userId,
          name: member.user.name ?? 'Unknown',
          email: member.user.email ?? '',
          image: member.user.image ?? null,
          ticketsAssigned: assignedCount,
          ticketsClosed: closedCount,
          ticketsWon: closedCount, // Use resolved as "won"
          salesCount: closedCount, // Approximate
          messagesSent: messagesCount,
          avgResponseTimeMs: null,
          avgSentimentScore: null,
          conversionRate: Math.round(conversionRate * 100),
        }
      })
    )

    // Filter out agents with no activity and sort
    const activeAgents = agents
      .filter(
        (a) => a.ticketsAssigned > 0 || a.ticketsClosed > 0 || a.messagesSent > 0
      )
      .sort((a, b) => b.ticketsClosed - a.ticketsClosed)

    return NextResponse.json({
      agents: activeAgents,
      period,
      totalAgents: activeAgents.length,
    })
  } catch (error) {
    console.error('[dashboard/analytics/agents] GET error:', error)
    return NextResponse.json(
      { error: 'Failed to load agent metrics' },
      { status: 500 }
    )
  }
}
