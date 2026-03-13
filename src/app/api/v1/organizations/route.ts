/**
 * API Routes - /api/v1/organizations
 *
 * POST - Create a new organization from explicit onboarding (PF/PJ)
 */

import { NextResponse } from 'next/server'
import { Prisma } from '@generated/prisma/client'

import { apiError } from '@/lib/utils/api-response'
import { getOrSyncUser } from '@/server/auth/server'
import { organizationOnboardingSchema } from '@/schemas/organizations/organization-onboarding'
import { createOrganizationFromOnboarding } from '@/services/organizations/organization-management.service'
import { logger } from '@/lib/utils/logger'

export async function POST(request: Request) {
  try {
    const user = await getOrSyncUser(request)

    if (!user) {
      return apiError('Unauthorized', 401)
    }

    const body = await request.json().catch(() => null)
    const parsed = organizationOnboardingSchema.safeParse(body)
    if (!parsed.success) {
      return apiError('Dados inválidos', 400, undefined, { details: parsed.error.flatten() })
    }

    const result = await createOrganizationFromOnboarding({
      user,
      data: parsed.data,
    })

    if ('error' in result) {
      return apiError(
        result.error,
        result.status,
        undefined,
        result.organizationId ? { organizationId: result.organizationId } : undefined
      )
    }

    return NextResponse.json(result, { status: 201 })
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
      return apiError('Documento já cadastrado em outra organização.', 409)
    }

    logger.error({ err: error }, 'Failed to create organization')
    return apiError('Failed to create organization', 500, error)
  }
}
