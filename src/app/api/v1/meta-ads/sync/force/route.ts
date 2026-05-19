import 'server-only'
import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth/auth'
import { prisma } from '@/lib/db/prisma'
import { enqueueMetaInsightSync } from '@/server/queues/meta-insight-sync.queue'
import { logger } from '@/lib/utils/logger'

export async function POST(req: NextRequest) {
  try {
    const session = await auth()
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { organizationId, projectId, syncType = 'SYNC_TODAY' } = await req.json()

    // Validate organization access
    const org = await prisma.organization.findFirst({
      where: {
        id: organizationId,
        members: {
          some: {
            user: { email: session.user.email },
          },
        },
      },
    })

    if (!org) {
      return NextResponse.json({ error: 'Organization not found' }, { status: 404 })
    }

    // Enqueue with priority:1 (highest) for force refresh
    const job = await enqueueMetaInsightSync(organizationId, syncType, {
      projectId,
      priority: 1,
    })

    logger.info(
      { organizationId, jobId: job.id, syncType },
      '[Force Sync] Enqueued'
    )

    return NextResponse.json(
      { jobId: job.id, status: 'queued' },
      { status: 202 } // Accepted
    )
  } catch (error) {
    logger.error({ error }, '[Force Sync] Error')
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Internal server error' },
      { status: 500 }
    )
  }
}
