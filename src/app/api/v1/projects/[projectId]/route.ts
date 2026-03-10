import { revalidateTag } from 'next/cache'

import { apiError, apiSuccess } from '@/lib/utils/api-response'
import { validateFullAccess } from '@/server/auth/validate-organization-access'
import {
  projectDeleteQuerySchema,
  projectUpdateSchema,
} from '@/schemas/projects/project-schemas'
import {
  deleteProject,
  getProjectById,
  updateProject,
} from '@/services/projects/project.service'
import { logger } from '@/lib/utils/logger'

type RouteContext = {
  params: Promise<{
    projectId: string
  }>
}

export async function GET(request: Request, context: RouteContext) {
  try {
    const access = await validateFullAccess(request)
    if (!access.hasAccess || !access.organizationId) {
      return apiError(access.error ?? 'Acesso negado', 403)
    }

    const { projectId } = await context.params
    const result = await getProjectById({
      organizationId: access.organizationId,
      projectId,
    })

    if (!result) {
      return apiError('Projeto não encontrado', 404)
    }

    return apiSuccess(result)
  } catch (error) {
    logger.error({ err: error }, '[api/projects/[projectId]] GET error')
    return apiError('Failed to load project', 500, error)
  }
}

export async function PATCH(request: Request, context: RouteContext) {
  try {
    const access = await validateFullAccess(request)
    if (!access.hasAccess || !access.organizationId) {
      return apiError(access.error ?? 'Acesso negado', 403)
    }

    const body = await request.json().catch(() => null)
    const parsed = projectUpdateSchema.safeParse(body)

    if (!parsed.success) {
      return apiError('Invalid payload', 400, undefined, {
        details: parsed.error.flatten(),
      })
    }

    const { projectId } = await context.params
    const result = await updateProject({
      organizationId: access.organizationId,
      projectId,
      data: parsed.data,
    })

    if ('error' in result) {
      return apiError(result.error, result.status)
    }

    revalidateTag(`org-${access.organizationId}`, 'max')
    return apiSuccess(result)
  } catch (error) {
    logger.error({ err: error }, '[api/projects/[projectId]] PATCH error')
    return apiError('Failed to update project', 500, error)
  }
}

export async function DELETE(request: Request, context: RouteContext) {
  try {
    const access = await validateFullAccess(request)
    if (!access.hasAccess || !access.organizationId) {
      return apiError(access.error ?? 'Acesso negado', 403)
    }

    const searchParams = new URL(request.url).searchParams
    const parsed = projectDeleteQuerySchema.safeParse({
      force: searchParams.get('force') ?? undefined,
    })

    if (!parsed.success) {
      return apiError('Invalid query params', 400, undefined, {
        details: parsed.error.flatten(),
      })
    }

    const { projectId } = await context.params
    const result = await deleteProject({
      organizationId: access.organizationId,
      projectId,
      force: parsed.data.force,
    })

    if ('error' in result) {
      return apiError(
        result.error,
        result.status,
        undefined,
        result.status === 409 && 'counts' in result
          ? {
              counts: result.counts,
            }
          : undefined,
      )
    }

    revalidateTag(`org-${access.organizationId}`, 'max')
    return apiSuccess(result)
  } catch (error) {
    logger.error({ err: error }, '[api/projects/[projectId]] DELETE error')
    return apiError('Failed to delete project', 500, error)
  }
}
