/**
 * Dashboard Analytics API
 * GET - Get analytics overview for conversations/tickets
 */

import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { validateFullAccess } from '@/lib/auth/validate-organization-access'

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

    // First check if we have DailyMetrics data
    const hasDailyMetrics = await prisma.dailyMetrics.findFirst({
      where: { organizationId },
    })

    if (hasDailyMetrics) {
      // Use pre-aggregated DailyMetrics
      const metrics = await prisma.dailyMetrics.aggregate({
        where: {
          organizationId,
          date: { gte: dateRange.gte, lte: dateRange.lte },
        },
        _sum: {
          ticketsOpened: true,
          ticketsClosed: true,
          ticketsWon: true,
          ticketsLost: true,
          newLeads: true,
          messagesReceived: true,
          messagesSent: true,
        },
        _avg: {
          avgResponseTimeMs: true,
          avgLeadScore: true,
        },
      })

      // Get daily breakdown for line chart
      const dailyData = await prisma.dailyMetrics.findMany({
        where: {
          organizationId,
          date: { gte: dateRange.gte, lte: dateRange.lte },
        },
        orderBy: { date: 'asc' },
        select: {
          date: true,
          ticketsOpened: true,
          ticketsClosed: true,
          newLeads: true,
          salesCount: true,
        },
      })

      const totalTickets =
        (metrics._sum.ticketsWon ?? 0) + (metrics._sum.ticketsLost ?? 0)
      const conversionRate =
        totalTickets > 0 ? (metrics._sum.ticketsWon ?? 0) / totalTickets : 0

      return NextResponse.json({
        cards: {
          totalLeads: metrics._sum.newLeads ?? 0,
          activeConversations: metrics._sum.ticketsOpened ?? 0,
          openTickets:
            (metrics._sum.ticketsOpened ?? 0) -
            (metrics._sum.ticketsClosed ?? 0),
          conversionRate: Math.round(conversionRate * 100),
          messagesReceived: metrics._sum.messagesReceived ?? 0,
          messagesSent: metrics._sum.messagesSent ?? 0,
        },
        charts: {
          volumeByDay: dailyData.map((d) => ({
            date: d.date.toISOString().split('T')[0],
            leads: d.newLeads,
            tickets: d.ticketsOpened,
            sales: d.salesCount,
          })),
          byStatus: {
            open:
              (metrics._sum.ticketsOpened ?? 0) -
              (metrics._sum.ticketsClosed ?? 0),
            closed: metrics._sum.ticketsClosed ?? 0,
            won: metrics._sum.ticketsWon ?? 0,
            lost: metrics._sum.ticketsLost ?? 0,
          },
        },
        avgResponseTime: metrics._avg.avgResponseTimeMs,
        avgLeadScore: metrics._avg.avgLeadScore,
      })
    }

    // Fallback: calculate from raw data
    const [
      leadsCount,
      conversationsCount,
      openTicketsCount,
      resolvedTicketsCount,
      followUpTicketsCount,
      messagesCount,
    ] = await Promise.all([
      prisma.lead.count({
        where: {
          organizationId,
          createdAt: { gte: dateRange.gte, lte: dateRange.lte },
        },
      }),
      prisma.conversation.count({
        where: {
          organizationId,
          createdAt: { gte: dateRange.gte, lte: dateRange.lte },
        },
      }),
      prisma.ticket.count({
        where: {
          conversation: { organizationId },
          status: 'OPEN',
        },
      }),
      prisma.ticket.count({
        where: {
          conversation: { organizationId },
          status: 'RESOLVED',
          createdAt: { gte: dateRange.gte, lte: dateRange.lte },
        },
      }),
      prisma.ticket.count({
        where: {
          conversation: { organizationId },
          status: 'FOLLOW_UP',
          createdAt: { gte: dateRange.gte, lte: dateRange.lte },
        },
      }),
      prisma.message.count({
        where: {
          ticket: { conversation: { organizationId } },
          createdAt: { gte: dateRange.gte, lte: dateRange.lte },
        },
      }),
    ])

    const totalTickets = openTicketsCount + resolvedTicketsCount + followUpTicketsCount
    const conversionRate = totalTickets > 0 ? resolvedTicketsCount / totalTickets : 0

    return NextResponse.json({
      cards: {
        totalLeads: leadsCount,
        activeConversations: conversationsCount,
        openTickets: openTicketsCount,
        conversionRate: Math.round(conversionRate * 100),
        messagesReceived: messagesCount,
        messagesSent: 0,
      },
      charts: {
        volumeByDay: [],
        byStatus: {
          open: openTicketsCount,
          closed: resolvedTicketsCount,
          won: resolvedTicketsCount, // Use resolved as "won" for backwards compat
          lost: followUpTicketsCount, // Use follow_up as "lost" for backwards compat
        },
      },
      avgResponseTime: null,
      avgLeadScore: null,
    })
  } catch (error) {
    console.error('[dashboard/analytics] GET error:', error)
    return NextResponse.json(
      { error: 'Failed to load analytics' },
      { status: 500 }
    )
  }
}
