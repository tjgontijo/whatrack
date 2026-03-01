/**
 * API Routes - /api/v1/organizations/[id]
 *
 * PATCH - Update an existing organization
 */

import { NextResponse } from 'next/server'

import { apiError } from '@/lib/utils/api-response'
import { getOrSyncUser } from '@/server/auth/server'
import { updateOrganizationByIdSchema } from '@/schemas/organizations/organization-schemas'
import { updateOrganizationById } from '@/services/organizations/organization-management.service'
import { logger } from '@/lib/utils/logger'

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const user = await getOrSyncUser(request)

    if (!user) {
      return apiError('Unauthorized', 401)
    }

    const { id: organizationId } = await params
    const rawBody = await request.json().catch(() => null)
    const parsed = updateOrganizationByIdSchema.safeParse(rawBody)
    if (!parsed.success) {
      return apiError('Dados inválidos', 400, undefined, { details: parsed.error.flatten() })
    }

    const result = await updateOrganizationById({
      organizationId,
      userId: user.id,
      data: parsed.data,
    })

    if ('error' in result) {
      return apiError(result.error, result.status)
    }

    return NextResponse.json(result, { status: 200 })
  } catch (error) {
    logger.error({ err: error }, 'Failed to update organization')
    return apiError('Failed to update organization', 500, error)
  }
}
