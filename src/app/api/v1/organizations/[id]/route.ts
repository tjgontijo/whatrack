/**
 * API Routes - /api/v1/organizations/[id]
 *
 * PATCH - Update an existing organization
 */

import { NextResponse } from 'next/server'

import { getOrSyncUser } from '@/server/auth/server'
import { updateOrganizationByIdSchema } from '@/schemas/organization-schemas'
import { updateOrganizationById } from '@/services/organizations/organization-management.service'

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const user = await getOrSyncUser(request)

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { id: organizationId } = await params
    const rawBody = await request.json().catch(() => null)
    const parsed = updateOrganizationByIdSchema.safeParse(rawBody)
    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Dados inválidos', details: parsed.error.flatten() },
        { status: 400 }
      )
    }

    const result = await updateOrganizationById({
      organizationId,
      userId: user.id,
      data: parsed.data,
    })

    if ('error' in result) {
      return NextResponse.json({ error: result.error }, { status: result.status })
    }

    return NextResponse.json(result, { status: 200 })
  } catch (error) {
    console.error('Failed to update organization:', error)
    return NextResponse.json({ error: 'Failed to update organization' }, { status: 500 })
  }
}
