import { cookies } from 'next/headers'
import { findProjectInOrg } from '@/features/projects/repositories/find-project-in-org.repository'
import { projectCurrentUpdateSchema } from '@/features/projects'
import { PROJECT_COOKIE } from '@/lib/constants/http-headers'
import { apiError, apiSuccess } from '@/lib/utils/api-response'
import { logger } from '@/lib/utils/logger'
import { validateFullAccess } from '@/server/auth/validate-organization-access'
import { getCurrentProjectId } from '@/server/project/get-current-project-id'

export async function GET(request: Request) {
  try {
    const access = await validateFullAccess(request)
    if (!access.hasAccess || !access.organizationId) {
      return apiError(access.error ?? 'Acesso negado', 403)
    }

    const projectId = await getCurrentProjectId(access.organizationId)
    if (!projectId) {
      return apiSuccess({ projectId: null, project: null })
    }

    const project = await findProjectInOrg(projectId, access.organizationId)

    return apiSuccess({
      projectId: project?.id ?? null,
      project,
    })
  } catch (error) {
    logger.error({ err: error }, '[api/projects/current] GET error')
    return apiError('Failed to load active project', 500, error)
  }
}

export async function PATCH(request: Request) {
  try {
    const access = await validateFullAccess(request)
    if (!access.hasAccess || !access.organizationId) {
      return apiError(access.error ?? 'Acesso negado', 403)
    }

    const parsed = projectCurrentUpdateSchema.safeParse(await request.json().catch(() => null))
    if (!parsed.success) {
      return apiError('Invalid payload', 400, undefined, {
        details: parsed.error.flatten(),
      })
    }

    const cookieStore = await cookies()

    if (parsed.data.projectId) {
      const project = await findProjectInOrg(parsed.data.projectId, access.organizationId)
      if (!project) {
        return apiError('Projeto não encontrado', 404)
      }

      cookieStore.set(PROJECT_COOKIE, project.id, {
        path: '/',
        maxAge: 60 * 60 * 24 * 365,
        sameSite: 'lax',
      })

      return apiSuccess({ projectId: project.id, project })
    }

    cookieStore.delete(PROJECT_COOKIE)
    return apiSuccess({ projectId: null, project: null })
  } catch (error) {
    logger.error({ err: error }, '[api/projects/current] PATCH error')
    return apiError('Failed to update active project', 500, error)
  }
}
