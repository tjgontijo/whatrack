import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db/prisma'
import { validateFullAccess } from '@/server/auth/validate-organization-access'
import { apiError } from '@/lib/utils/api-response'

export const dynamic = 'force-dynamic'

export async function GET(request: NextRequest) {
  try {
    const access = await validateFullAccess(request)
    if (!access.hasAccess || !access.organizationId) {
      return apiError('Unauthorized', 401)
    }

    const { searchParams } = new URL(request.url)
    const projectId = searchParams.get('projectId')

    if (!projectId) {
      return apiError('Project ID is required', 400)
    }

    const configs = await prisma.whatsAppConfig.findMany({
      where: {
        organizationId: access.organizationId,
        projectId,
      },
      orderBy: { createdAt: 'desc' },
    })

    const connections = await prisma.whatsAppConnection.findMany({
      where: {
        organizationId: access.organizationId,
        projectId,
      },
      orderBy: { createdAt: 'desc' },
    })

    const onboardings = await prisma.whatsAppOnboarding.findMany({
      where: {
        organizationId: access.organizationId,
        projectId,
      },
      orderBy: { createdAt: 'desc' },
    })

    return NextResponse.json({
      configs,
      connections,
      onboardings,
    })
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Unknown error'
    return apiError(message, 500)
  }
}
