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

    // Set cookies for organization and project selection
    // activeProjectId is managed by the application via PROJECT_COOKIE
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
