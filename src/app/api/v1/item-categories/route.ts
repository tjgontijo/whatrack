import { NextResponse } from 'next/server'

import { apiError } from '@/lib/utils/api-response'
import { validateFullAccess } from '@/server/auth/validate-organization-access'
import {
  createItemCategorySchema,
  itemCategoryListQuerySchema,
} from '@/schemas/items/item-category-schemas'
import {
  createItemCategory,
  listItemCategories,
  type ListItemCategoriesParams,
} from '@/services/item-categories/item-category.service'

export async function GET(request: Request) {
  try {
    const access = await validateFullAccess(request)
    if (!access.hasAccess || !access.organizationId) {
      return apiError(access.error ?? 'Acesso negado', 403)
    }
    const organizationId = access.organizationId

    const searchParams = new URL(request.url).searchParams
    const parsed = itemCategoryListQuerySchema.safeParse({
      search: searchParams.get('search') ?? undefined,
      status: searchParams.get('status') ?? undefined,
      page: searchParams.get('page') ?? undefined,
      pageSize: searchParams.get('pageSize') ?? undefined,
    })

    if (!parsed.success) {
      return apiError('Invalid query params', 400)
    }

    const payload: ListItemCategoriesParams = {
      organizationId,
      search: parsed.data.search,
      status: parsed.data.status,
      page: parsed.data.page,
      pageSize: parsed.data.pageSize,
    }

    return NextResponse.json(await listItemCategories(payload))
  } catch (error) {
    console.error('[api/item-categories] GET error', error)
    return apiError('Failed to load categories', 500, error)
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
    const parsed = createItemCategorySchema.safeParse(json)

    if (!parsed.success) {
      return apiError('Invalid payload', 400, undefined, { details: parsed.error.flatten() })
    }

    const result = await createItemCategory({
      organizationId,
      name: parsed.data.name,
    })

    return NextResponse.json(result, { status: 201 })
  } catch (error) {
    console.error('[api/item-categories] POST error', error)
    return apiError('Failed to create category', 500, error)
  }
}
