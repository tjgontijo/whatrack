import { NextResponse } from 'next/server'

import { apiError } from '@/lib/utils/api-response'
import { aiProjectConfigService } from '@/lib/ai/services/ai-project-config.service'
import {
  aiProjectConfigQuerySchema,
  aiProjectConfigUpdateSchema,
} from '@/lib/ai/schemas/ai-project-config'
import { validatePermissionAccess } from '@/server/auth/validate-organization-access'
import { resolveProjectScope } from '@/server/project/project-scope'
import { logger } from '@/lib/utils/logger'

export async function GET(request: Request) {
  try {
    const access = await validatePermissionAccess(request, 'manage:ai')
    if (!access.hasAccess || !access.organizationId) {
      return apiError(access.error ?? 'Acesso negado', 403)
    }

    const searchParams = new URL(request.url).searchParams
    const parsed = aiProjectConfigQuerySchema.safeParse({
      projectId: searchParams.get('projectId') ?? undefined,
    })

    if (!parsed.success) {
      return apiError('Invalid query params', 400, undefined, {
        details: parsed.error.flatten(),
      })
    }

    const projectId = await resolveProjectScope({
      organizationId: access.organizationId,
      projectId: parsed.data.projectId,
    })

    if (!projectId) {
      return apiError('Projeto não encontrado no escopo atual', 404)
    }

    const result = await aiProjectConfigService.getAiRuntimeConfig({
      organizationId: access.organizationId,
      projectId,
    })

    if (!result.success) {
      return apiError(result.error, 400)
    }

    return NextResponse.json(result.data)
  } catch (error) {
    logger.error({ err: error }, '[api/v1/ai/config] GET error')
    return apiError('Failed to load AI runtime config', 500, error)
  }
}

async function updateConfig(request: Request) {
  try {
    const access = await validatePermissionAccess(request, 'manage:ai')
    if (!access.hasAccess || !access.organizationId) {
      return apiError(access.error ?? 'Acesso negado', 403)
    }

    const parsed = aiProjectConfigUpdateSchema.safeParse(
      await request.json().catch(() => null)
    )

    if (!parsed.success) {
      return apiError('Invalid payload', 400, undefined, {
        details: parsed.error.flatten(),
      })
    }

    const projectId = await resolveProjectScope({
      organizationId: access.organizationId,
      projectId: parsed.data.projectId,
    })

    if (!projectId) {
      return apiError('Projeto não encontrado no escopo atual', 404)
    }

    const result = await aiProjectConfigService.updateAiRuntimeConfig({
      organizationId: access.organizationId,
      projectId,
      data: parsed.data,
    })

    if (!result.success) {
      return apiError(result.error, 400)
    }

    return NextResponse.json(result.data)
  } catch (error) {
    logger.error({ err: error }, '[api/v1/ai/config] update error')
    return apiError('Failed to update AI runtime config', 500, error)
  }
}

export async function PUT(request: Request) {
  return updateConfig(request)
}

export async function PATCH(request: Request) {
  return updateConfig(request)
}
