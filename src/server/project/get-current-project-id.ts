import { cookies, headers } from 'next/headers'

import { PROJECT_COOKIE, PROJECT_HEADER } from '@/lib/constants/http-headers'
import { getServerSession } from '@/server/auth/server'
import { prisma } from '@/lib/db/prisma'
import { logger } from '@/lib/utils/logger'

export async function getCurrentProjectId(organizationId: string): Promise<string | null> {
  try {
    const h = await headers()
    const c = await cookies()

    // 1. Check header first
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

    // 2. Check session
    const session = await getServerSession()
    const fromSession = (session?.session as any)?.activeProjectId?.trim?.()
    if (fromSession) {
      const project = await prisma.project.findFirst({
        where: {
          id: fromSession,
          organizationId,
        },
        select: { id: true },
      })

      if (project) {
        return project.id
      }
    }

    // 3. Fall back to cookie for backward compatibility
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
