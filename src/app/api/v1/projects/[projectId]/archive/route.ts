import { revalidateTag } from 'next/cache'
import { archiveProject } from '@/features/projects/server'
import { apiError, apiSuccess } from '@/lib/utils/api-response'
import { logger } from '@/lib/utils/logger'
import { validateFullAccess } from '@/server/auth/validate-organization-access'

type RouteContext = {
  params: Promise<{
    projectId: string
  }>
}

export async function POST(request: Request, context: RouteContext) {
  try {
    const access = await validateFullAccess(request)
    if (!access.hasAccess || !access.organizationId) {
      return apiError(access.error ?? 'Acesso negado', 403)
    }

    const { projectId } = await context.params
    const result = await archiveProject({
      organizationId: access.organizationId,
      projectId,
    })

    if ('error' in result) {
      return apiError(result.error, result.status)
    }

    revalidateTag(`org-${access.organizationId}`, 'max')
    return apiSuccess(result)
  } catch (error) {
    logger.error({ err: error }, '[api/projects/[projectId]/archive] POST error')
    return apiError('Failed to archive project', 500, error)
  }
}
