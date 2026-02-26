import { NextRequest, NextResponse } from 'next/server'

import { validatePermissionAccess } from '@/server/auth/validate-organization-access'
import { updateOrganizationAiSettingsSchema } from '@/schemas/organizations/organization-schemas'
import {
  getOrganizationAiSettings,
  updateOrganizationAiSettings,
} from '@/services/organizations/organization-management.service'

export async function GET(request: NextRequest) {
  try {
    const access = await validatePermissionAccess(request, 'view:ai')
    if (!access.hasAccess || !access.organizationId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    return NextResponse.json(await getOrganizationAiSettings(access.organizationId))
  } catch (error) {
    console.error('[GET ai-settings] Error:', error)
    return NextResponse.json({ error: 'Erro ao buscar configurações de IA' }, { status: 500 })
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const access = await validatePermissionAccess(request, 'manage:ai')
    if (!access.hasAccess || !access.organizationId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json().catch(() => null)
    const parsed = updateOrganizationAiSettingsSchema.safeParse(body)
    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Dados inválidos', details: parsed.error.flatten() },
        { status: 400 }
      )
    }

    return NextResponse.json(
      await updateOrganizationAiSettings({
        organizationId: access.organizationId,
        data: parsed.data,
      })
    )
  } catch (error) {
    console.error('[PATCH ai-settings] Error:', error)
    return NextResponse.json({ error: 'Erro ao salvar configurações de IA' }, { status: 500 })
  }
}
