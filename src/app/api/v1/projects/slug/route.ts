import { checkProjectSlugAvailability } from '@/features/projects/repositories/check-project-slug.repository'
import { projectSlugCheckSchema } from '@/features/projects'
import { apiError, apiSuccess } from '@/lib/utils/api-response'
import { logger } from '@/lib/utils/logger'
import { isValidSlug } from '@/lib/utils/slug'
import { validateFullAccess } from '@/server/auth/validate-organization-access'

export async function GET(request: Request) {
  try {
    const access = await validateFullAccess(request)
    if (!access.hasAccess || !access.organizationId) {
      return apiError(access.error ?? 'Acesso negado', 403)
    }

    const { searchParams } = new URL(request.url)
    const slug = searchParams.get('slug')
    const excludeProjectId = searchParams.get('excludeProjectId') ?? undefined

    const parsed = projectSlugCheckSchema.safeParse({ slug, excludeProjectId })
    if (!parsed.success) {
      return apiError('Parâmetros inválidos', 400, undefined, {
        details: parsed.error.flatten(),
      })
    }

    const { slug: validatedSlug } = parsed.data

    if (!isValidSlug(validatedSlug)) {
      return apiSuccess({ available: false, slug: validatedSlug })
    }

    const result = await checkProjectSlugAvailability(
      access.organizationId,
      validatedSlug,
      parsed.data.excludeProjectId
    )

    return apiSuccess(result)
  } catch (error) {
    logger.error({ err: error }, '[api/projects/slug] GET error')
    return apiError('Failed to check slug availability', 500, error)
  }
}
