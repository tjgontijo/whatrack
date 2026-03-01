import { NextRequest, NextResponse } from 'next/server'

import { apiError } from '@/lib/utils/api-response'
import { validatePermissionAccess } from '@/server/auth/validate-organization-access'
import { updateOrganizationAiSettingsSchema } from '@/schemas/organizations/organization-schemas'
import {
  getOrganizationAiSettings,
  updateOrganizationAiSettings,
} from '@/services/organizations/organization-management.service'
import { logger } from '@/lib/utils/logger'

export async function GET(request: NextRequest) {
  try {
    const access = await validatePermissionAccess(request, 'view:ai')
    if (!access.hasAccess || !access.organizationId) {
      return apiError('Unauthorized', 401)
    }

    return NextResponse.json(await getOrganizationAiSettings(access.organizationId))
  } catch (error) {
    logger.error({ err: error }, '[GET ai-settings] Error')
    return apiError('Erro ao buscar configurações de IA', 500, error)
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const access = await validatePermissionAccess(request, 'manage:ai')
    if (!access.hasAccess || !access.organizationId) {
      return apiError('Unauthorized', 401)
    }

    const body = await request.json().catch(() => null)
    const parsed = updateOrganizationAiSettingsSchema.safeParse(body)
    if (!parsed.success) {
      return apiError('Dados inválidos', 400, undefined, { details: parsed.error.flatten() })
    }

    return NextResponse.json(
      await updateOrganizationAiSettings({
        organizationId: access.organizationId,
        data: parsed.data,
      })
    )
  } catch (error) {
    logger.error({ err: error }, '[PATCH ai-settings] Error')
    return apiError('Erro ao salvar configurações de IA', 500, error)
  }
}
