import { NextResponse } from 'next/server'

import { apiError } from '@/lib/utils/api-response'
import { validateFullAccess } from '@/server/auth/validate-organization-access'
import { resolveProjectScope } from '@/server/project/project-scope'
import { createItemSchema, itemListQuerySchema } from '@/schemas/items/item-schemas'
import { createItem, listItems, type ListItemsParams } from '@/services/items/item.service'
import { logger } from '@/lib/utils/logger'

export async function GET(request: Request) {
  try {
    const access = await validateFullAccess(request)
    if (!access.hasAccess || !access.organizationId) {
      return apiError(access.error ?? 'Acesso negado', 403)
    }
    const organizationId = access.organizationId

    const searchParams = new URL(request.url).searchParams
    const parsed = itemListQuerySchema.safeParse({
      search: searchParams.get('search') ?? undefined,
      status: searchParams.get('status') ?? undefined,
      categoryId: searchParams.get('categoryId') ?? undefined,
      projectId: searchParams.get('projectId') ?? undefined,
      page: searchParams.get('page') ?? undefined,
      pageSize: searchParams.get('pageSize') ?? undefined,
    })

    if (!parsed.success) {
      return apiError('Invalid query params', 400)
    }

    const payload: ListItemsParams = {
      organizationId,
      projectId: await resolveProjectScope({
        organizationId,
        projectId: parsed.data.projectId,
      }),
      search: parsed.data.search,
      status: parsed.data.status,
      categoryId: parsed.data.categoryId,
      page: parsed.data.page,
      pageSize: parsed.data.pageSize,
    }

    return NextResponse.json(await listItems(payload))
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
    const organizationId = access.organizationId

    const json = await request.json()
    const parsed = createItemSchema.safeParse(json)

    if (!parsed.success) {
      return apiError('Invalid payload', 400, undefined, { details: parsed.error.flatten() })
    }

    const result = await createItem({
      organizationId,
      projectId: await resolveProjectScope({
        organizationId,
        projectId: parsed.data.projectId,
      }),
      name: parsed.data.name,
      categoryId: parsed.data.categoryId ?? null,
    })

    return NextResponse.json(result, { status: 201 })
  } catch (error) {
    logger.error({ err: error }, '[api/items] POST error')
    return apiError('Failed to create item', 500, error)
  }
}
