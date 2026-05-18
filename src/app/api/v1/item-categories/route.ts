import { NextResponse } from 'next/server'
import {
  createItemCategoryService,
  listItemCategoriesService,
} from '@/features/item-categories/server'
import { apiError } from '@/lib/utils/api-response'
import { logger } from '@/lib/utils/logger'
import { validateFullAccess } from '@/server/auth/validate-organization-access'

export async function GET(request: Request) {
  try {
    const access = await validateFullAccess(request)
    if (!access.hasAccess || !access.organizationId) {
      return apiError(access.error ?? 'Acesso negado', 403)
    }

    const searchParams = new URL(request.url).searchParams
    const filters = {
      search: searchParams.get('search') ?? undefined,
      status: searchParams.get('status') ?? undefined,
      projectId: searchParams.get('projectId') ?? undefined,
      page: searchParams.get('page') ?? undefined,
      pageSize: searchParams.get('pageSize') ?? undefined,
    }

    return NextResponse.json(
      await listItemCategoriesService({
        organizationId: access.organizationId,
        filters,
      })
    )
  } catch (error) {
    logger.error({ err: error }, '[api/item-categories] GET error')
    return apiError('Failed to load categories', 500, error)
  }
}

export async function POST(request: Request) {
  try {
    const access = await validateFullAccess(request)
    if (!access.hasAccess || !access.organizationId) {
      return apiError(access.error ?? 'Acesso negado', 403)
    }

    const payload = await request.json()
    const result = await createItemCategoryService({
      organizationId: access.organizationId,
      payload,
    })

    return NextResponse.json(result, { status: 201 })
  } catch (error) {
    logger.error({ err: error }, '[api/item-categories] POST error')
    return apiError('Failed to create category', 500, error)
  }
}
