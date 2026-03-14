import { NextRequest } from 'next/server'

import { apiError, apiSuccess } from '@/lib/utils/api-response'
import { whatsappInstanceProjectUpdateSchema } from '@/schemas/whatsapp/whatsapp-schemas'
import { validateFullAccess } from '@/server/auth/validate-organization-access'
import { resolveProjectScope } from '@/server/project/project-scope'
import {
  assignWhatsAppConfigProject,
  listWhatsAppInstances,
} from '@/services/whatsapp/whatsapp-config.service'
import { logger } from '@/lib/utils/logger'

export async function GET(request: NextRequest) {
  try {
    const access = await validateFullAccess(request)

    if (!access.hasAccess || !access.organizationId) {
      return apiError(access.error || 'Unauthorized', 401)
    }

    const { searchParams } = new URL(request.url)
    const projectId = await resolveProjectScope({
      organizationId: access.organizationId,
      projectId: searchParams.get('projectId') ?? undefined,
    })

    if (!projectId) {
      return apiError('Project not found', 400)
    }

    const response = await listWhatsAppInstances(access.organizationId, projectId)
    return apiSuccess(response)
  } catch (error) {
    logger.error({ err: error }, '[WhatsApp Instances] Error')
    return apiError('Failed to fetch instances', 500, error)
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const access = await validateFullAccess(request)

    if (!access.hasAccess || !access.organizationId) {
      return apiError(access.error || 'Unauthorized', 401)
    }

    const parsedBody = whatsappInstanceProjectUpdateSchema.safeParse(
      await request.json().catch(() => null),
    )
    if (!parsedBody.success) {
      return apiError('Body inválido', 400, undefined, {
        details: parsedBody.error.flatten(),
      })
    }

    const result = await assignWhatsAppConfigProject({
      organizationId: access.organizationId,
      configId: parsedBody.data.configId,
      projectId: parsedBody.data.projectId,
    })

    if ('error' in result) {
      return apiError(result.error, result.status)
    }

    return apiSuccess(result.data)
  } catch (error) {
    logger.error({ err: error }, '[WhatsApp Instances] PATCH error')
    return apiError('Failed to update instance project', 500, error)
  }
}
