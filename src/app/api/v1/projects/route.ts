import { revalidateTag } from 'next/cache'

import { apiError, apiSuccess } from '@/lib/utils/api-response'
import { validateFullAccess } from '@/server/auth/validate-organization-access'
import {
  projectCreateSchema,
  projectListQuerySchema,
} from '@/schemas/projects/project-schemas'
import { createProject, listProjects } from '@/services/projects/project.service'
import { logger } from '@/lib/utils/logger'

export async function GET(request: Request) {
  try {
    const access = await validateFullAccess(request)
    if (!access.hasAccess || !access.organizationId) {
      return apiError(access.error ?? 'Acesso negado', 403)
    }

    const searchParams = new URL(request.url).searchParams
    const parsed = projectListQuerySchema.safeParse({
      page: searchParams.get('page') ?? undefined,
      pageSize: searchParams.get('pageSize') ?? undefined,
      query: searchParams.get('query') ?? undefined,
    })

    if (!parsed.success) {
      return apiError('Invalid query params', 400, undefined, {
        details: parsed.error.flatten(),
      })
    }

    const result = await listProjects({
      organizationId: access.organizationId,
      query: parsed.data,
    })

    return apiSuccess(result)
  } catch (error) {
    logger.error({ err: error }, '[api/projects] GET error')
    return apiError('Failed to load projects', 500, error)
  }
}

export async function POST(request: Request) {
  try {
    const access = await validateFullAccess(request)
    if (!access.hasAccess || !access.organizationId) {
      return apiError(access.error ?? 'Acesso negado', 403)
    }

    const body = await request.json().catch(() => null)
    const parsed = projectCreateSchema.safeParse(body)

    if (!parsed.success) {
      return apiError('Invalid payload', 400, undefined, {
        details: parsed.error.flatten(),
      })
    }

    const result = await createProject({
      organizationId: access.organizationId,
      data: parsed.data,
    })

    if ('error' in result) {
      return apiError(result.error, result.status)
    }

    revalidateTag(`org-${access.organizationId}`, 'max')
    return apiSuccess(result, 201)
  } catch (error) {
    logger.error({ err: error }, '[api/projects] POST error')
    return apiError('Failed to create project', 500, error)
  }
}
