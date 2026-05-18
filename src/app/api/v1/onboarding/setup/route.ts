import { cookies } from 'next/headers'
import { setupOnboardingService } from '@/features/onboarding/services/setup-onboarding.service'
import { ORGANIZATION_COOKIE, PROJECT_COOKIE } from '@/lib/constants/http-headers'
import { apiError, apiSuccess } from '@/lib/utils/api-response'
import { logger } from '@/lib/utils/logger'
import { getOrSyncUser } from '@/server/auth/server'

export async function POST(request: Request) {
  try {
    const user = await getOrSyncUser(request)
    if (!user) return apiError('Unauthorized', 401)

    const body = await request.json().catch(() => null)
    const result = await setupOnboardingService(user, body)

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

    return apiSuccess({ organization: result.organization, project: result.project }, 201)
  } catch (error) {
    logger.error({ err: error }, '[api/onboarding/setup] error')
    return apiError('Falha ao configurar conta', 500, error)
  }
}
