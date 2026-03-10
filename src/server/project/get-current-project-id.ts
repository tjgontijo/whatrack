import { cookies, headers } from 'next/headers'

import { PROJECT_COOKIE, PROJECT_HEADER } from '@/lib/constants/http-headers'
import { prisma } from '@/lib/db/prisma'
import { logger } from '@/lib/utils/logger'

export async function getCurrentProjectId(organizationId: string): Promise<string | null> {
  try {
    const h = await headers()
    const c = await cookies()

    const fromHeader = h.get(PROJECT_HEADER)?.trim()
    if (fromHeader) {
      const project = await prisma.project.findFirst({
        where: {
          id: fromHeader,
          organizationId,
        },
        select: { id: true },
      })

      if (project) {
        return project.id
      }
    }

    const fromCookie = c.get(PROJECT_COOKIE)?.value?.trim()
    if (fromCookie) {
      const project = await prisma.project.findFirst({
        where: {
          id: fromCookie,
          organizationId,
        },
        select: { id: true },
      })

      if (project) {
        return project.id
      }
    }

    return null
  } catch (error) {
    logger.error({ err: error }, '[getCurrentProjectId] Erro ao resolver projeto')
    return null
  }
}
