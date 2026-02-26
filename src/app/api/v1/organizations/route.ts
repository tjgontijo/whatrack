/**
 * API Routes - /api/v1/organizations
 *
 * POST - Create a new organization from explicit onboarding (PF/PJ)
 */

import { NextResponse } from 'next/server'
import { Prisma } from '@prisma/client'

import { getOrSyncUser } from '@/server/auth/server'
import { organizationOnboardingSchema } from '@/schemas/organization-onboarding'
import { createOrganizationFromOnboarding } from '@/services/organizations/organization-management.service'

export async function POST(request: Request) {
  try {
    const user = await getOrSyncUser(request)

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json().catch(() => null)
    const parsed = organizationOnboardingSchema.safeParse(body)
    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Dados inválidos', details: parsed.error.flatten() },
        { status: 400 }
      )
    }

    const result = await createOrganizationFromOnboarding({
      user,
      data: parsed.data,
    })

    if ('error' in result) {
      return NextResponse.json(
        {
          error: result.error,
          ...(result.organizationId ? { organizationId: result.organizationId } : {}),
        },
        { status: result.status }
      )
    }

    return NextResponse.json(result, { status: 201 })
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
      return NextResponse.json(
        { error: 'Documento já cadastrado em outra organização.' },
        { status: 409 }
      )
    }

    console.error('Failed to create organization:', error)
    return NextResponse.json({ error: 'Failed to create organization' }, { status: 500 })
  }
}
