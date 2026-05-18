import { NextResponse } from 'next/server'
import { createItemService, listItemsService } from '@/features/items/server'
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
      categoryId: searchParams.get('categoryId') ?? undefined,
      projectId: searchParams.get('projectId') ?? undefined,
      page: searchParams.get('page') ?? undefined,
      pageSize: searchParams.get('pageSize') ?? undefined,
    }

    return NextResponse.json(
      await listItemsService({
        organizationId: access.organizationId,
        filters,
      })
    )
  } catch (error) {
    logger.error({ err: error }, '[api/items] GET error')
    return apiError('Failed to load items', 500, error)
  }
}

export async function POST(request: Request) {
  try {
    const access = await validateFullAccess(request)
    if (!access.hasAccess || !access.organizationId) {
      return apiError(access.error ?? 'Acesso negado', 403)
    }

    const payload = await request.json()
    const result = await createItemService({
      organizationId: access.organizationId,
      payload,
    })

    return NextResponse.json(result, { status: 201 })
  } catch (error) {
    logger.error({ err: error }, '[api/items] POST error')
    return apiError('Failed to create item', 500, error)
  }
}
