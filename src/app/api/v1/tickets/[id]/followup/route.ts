/**
 * API Routes - /api/v1/tickets/[id]/followup
 *
 * GET   - Get follow-up status for a ticket
 * POST  - Enable follow-up for a ticket
 * DELETE - Disable follow-up for a ticket
 * PATCH - Skip to next step
 */

import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getOrSyncUser, getCurrentOrganization } from '@/server/auth/server'
import { enableFollowup, disableFollowup, skipToNextStep } from '@/server/followup/jobs/scheduler'

type RouteParams = {
  params: Promise<{ id: string }>
}

interface FollowupStatusResponse {
  enabled: boolean
  currentStep: number | null
  totalSteps: number
  nextScheduledAt: Date | null
  config: {
    isActive: boolean
    businessHoursOnly: boolean
    aiTone: string
    steps: Array<{
      order: number
      delayMinutes: number
    }>
  } | null
}

/**
 * GET - Get follow-up status for a ticket
 */
export async function GET(request: Request, { params }: RouteParams) {
  try {
    const { id } = await params

    const user = await getOrSyncUser(request)
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const organization = await getCurrentOrganization(request)
    if (!organization) {
      return NextResponse.json({ error: 'No organization' }, { status: 400 })
    }

    // Get ticket with follow-up info
    const ticket = await prisma.ticket.findFirst({
      where: {
        id,
        whatsappConversation: {
          organizationId: organization.id,
        },
      },
      include: {
        scheduledMessages: {
          where: {
            sentAt: null,
            cancelledAt: null,
          },
          orderBy: { scheduledAt: 'asc' },
          take: 1,
        },
      },
    })

    if (!ticket) {
      return NextResponse.json({ error: 'Ticket not found' }, { status: 404 })
    }

    // Get follow-up config
    const config = await prisma.followUpConfig.findUnique({
      where: { organizationId: organization.id },
      include: {
        steps: {
          orderBy: { order: 'asc' },
        },
      },
    })

    const response: FollowupStatusResponse = {
      enabled: ticket.followUpEnabled,
      currentStep: ticket.currentFollowUpStep,
      totalSteps: config?.steps.length ?? 0,
      nextScheduledAt: ticket.scheduledMessages[0]?.scheduledAt ?? null,
      config: config
        ? {
            isActive: config.isActive,
            businessHoursOnly: config.businessHoursOnly,
            aiTone: config.aiTone,
            steps: config.steps.map((s) => ({
              order: s.order,
              delayMinutes: s.delayMinutes,
            })),
          }
        : null,
    }

    return NextResponse.json(response)
  } catch (error) {
    console.error('Failed to get follow-up status:', error)
    return NextResponse.json({ error: 'Failed to get follow-up status' }, { status: 500 })
  }
}

/**
 * POST - Enable follow-up for a ticket
 */
export async function POST(request: Request, { params }: RouteParams) {
  try {
    const { id } = await params

    const user = await getOrSyncUser(request)
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const organization = await getCurrentOrganization(request)
    if (!organization) {
      return NextResponse.json({ error: 'No organization' }, { status: 400 })
    }

    // Verify ticket belongs to organization
    const ticket = await prisma.ticket.findFirst({
      where: {
        id,
        whatsappConversation: {
          organizationId: organization.id,
        },
      },
    })

    if (!ticket) {
      return NextResponse.json({ error: 'Ticket not found' }, { status: 404 })
    }

    if (ticket.followUpEnabled) {
      return NextResponse.json({ error: 'Follow-up already enabled' }, { status: 400 })
    }

    // Enable follow-up
    await enableFollowup(id, organization.id)

    return NextResponse.json({ success: true, message: 'Follow-up enabled' })
  } catch (error) {
    console.error('Failed to enable follow-up:', error)
    const message = error instanceof Error ? error.message : 'Failed to enable follow-up'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}

/**
 * DELETE - Disable follow-up for a ticket
 */
export async function DELETE(request: Request, { params }: RouteParams) {
  try {
    const { id } = await params

    const user = await getOrSyncUser(request)
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const organization = await getCurrentOrganization(request)
    if (!organization) {
      return NextResponse.json({ error: 'No organization' }, { status: 400 })
    }

    // Verify ticket belongs to organization
    const ticket = await prisma.ticket.findFirst({
      where: {
        id,
        whatsappConversation: {
          organizationId: organization.id,
        },
      },
    })

    if (!ticket) {
      return NextResponse.json({ error: 'Ticket not found' }, { status: 404 })
    }

    // Disable follow-up
    await disableFollowup(id)

    return NextResponse.json({ success: true, message: 'Follow-up disabled' })
  } catch (error) {
    console.error('Failed to disable follow-up:', error)
    return NextResponse.json({ error: 'Failed to disable follow-up' }, { status: 500 })
  }
}

/**
 * PATCH - Skip to next follow-up step
 */
export async function PATCH(request: Request, { params }: RouteParams) {
  try {
    const { id } = await params

    const user = await getOrSyncUser(request)
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const organization = await getCurrentOrganization(request)
    if (!organization) {
      return NextResponse.json({ error: 'No organization' }, { status: 400 })
    }

    // Verify ticket belongs to organization
    const ticket = await prisma.ticket.findFirst({
      where: {
        id,
        whatsappConversation: {
          organizationId: organization.id,
        },
      },
    })

    if (!ticket) {
      return NextResponse.json({ error: 'Ticket not found' }, { status: 404 })
    }

    if (!ticket.followUpEnabled) {
      return NextResponse.json({ error: 'Follow-up not enabled' }, { status: 400 })
    }

    // Skip to next step
    const hasNextStep = await skipToNextStep(id)

    return NextResponse.json({
      success: true,
      message: hasNextStep ? 'Skipped to next step' : 'No more steps, follow-up completed',
      hasNextStep,
    })
  } catch (error) {
    console.error('Failed to skip step:', error)
    return NextResponse.json({ error: 'Failed to skip step' }, { status: 500 })
  }
}
