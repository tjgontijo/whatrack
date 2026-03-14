import { cookies } from 'next/headers'

import { apiError, apiSuccess } from '@/lib/utils/api-response'
import { ORGANIZATION_COOKIE, PROJECT_COOKIE } from '@/lib/constants/http-headers'
import { getOrSyncUser, getServerSession } from '@/server/auth/server'
import { logger } from '@/lib/utils/logger'
import { welcomeOnboardingSchema } from '@/schemas/onboarding/welcome-onboarding'
import { completeWelcomeOnboarding } from '@/services/onboarding/welcome-onboarding.service'
import { prisma } from '@/lib/db/prisma'

export async function POST(request: Request) {
  try {
    const user = await getOrSyncUser(request)

    if (!user) {
      return apiError('Unauthorized', 401)
    }

    const parsed = welcomeOnboardingSchema.safeParse(
      await request.json().catch(() => null),
    )

    if (!parsed.success) {
      return apiError('Dados inválidos', 400, undefined, {
        details: parsed.error.flatten(),
      })
    }

    const result = await completeWelcomeOnboarding({
      user,
      data: parsed.data,
    })

    // Update session with activeOrganizationId and activeProjectId
    const session = await getServerSession(request)
    if (session?.session?.id) {
      try {
        await prisma.session.update({
          where: { id: session.session.id },
          data: {
            activeOrganizationId: result.organization.id,
            activeProjectId: result.project.id,
          },
        })
      } catch (error) {
        logger.error({ err: error }, '[api/onboarding/welcome] Failed to update session')
        // Continue even if session update fails, cookies are fallback
      }
    }

    // Keep cookies as fallback for backward compatibility
    const cookieStore = await cookies()
    cookieStore.set(ORGANIZATION_COOKIE, result.organization.id, {
      path: '/',
      maxAge: 60 * 60 * 24 * 365,
      sameSite: 'lax',
    })
    cookieStore.set(PROJECT_COOKIE, result.project.id, {
      path: '/',
      maxAge: 60 * 60 * 24 * 365,
      sameSite: 'lax',
    })

    return apiSuccess(result, 201)
  } catch (error) {
    logger.error({ err: error }, '[api/onboarding/welcome] error')
    return apiError('Failed to complete onboarding', 500, error)
  }
}
