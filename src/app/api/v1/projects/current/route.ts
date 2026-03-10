import { cookies } from 'next/headers'

import { apiError, apiSuccess } from '@/lib/utils/api-response'
import { PROJECT_COOKIE } from '@/lib/constants/http-headers'
import { logger } from '@/lib/utils/logger'
import { prisma } from '@/lib/db/prisma'
import {
  projectCurrentUpdateSchema,
} from '@/schemas/projects/project-schemas'
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

    const project = await prisma.project.findFirst({
      where: {
        id: projectId,
        organizationId: access.organizationId,
      },
      select: {
        id: true,
        name: true,
      },
    })

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

    const parsed = projectCurrentUpdateSchema.safeParse(
      await request.json().catch(() => null),
    )

    if (!parsed.success) {
      return apiError('Invalid payload', 400, undefined, {
        details: parsed.error.flatten(),
      })
    }

    if (parsed.data.projectId) {
      const project = await prisma.project.findFirst({
        where: {
          id: parsed.data.projectId,
          organizationId: access.organizationId,
        },
        select: {
          id: true,
          name: true,
        },
      })

      if (!project) {
        return apiError('Projeto não encontrado', 404)
      }

      const cookieStore = await cookies()
      cookieStore.set(PROJECT_COOKIE, project.id, {
        path: '/',
        maxAge: 60 * 60 * 24 * 365,
        sameSite: 'lax',
      })

      return apiSuccess({
        projectId: project.id,
        project,
      })
    }

    const cookieStore = await cookies()
    cookieStore.delete(PROJECT_COOKIE)

    return apiSuccess({
      projectId: null,
      project: null,
    })
  } catch (error) {
    logger.error({ err: error }, '[api/projects/current] PATCH error')
    return apiError('Failed to update active project', 500, error)
  }
}
