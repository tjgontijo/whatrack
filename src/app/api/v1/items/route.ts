import { NextResponse } from 'next/server'

import { validateFullAccess } from '@/server/auth/validate-organization-access'
import { createItemSchema, itemListQuerySchema } from '@/schemas/items/item-schemas'
import { createItem, listItems, type ListItemsParams } from '@/services/items/item.service'

export async function GET(request: Request) {
  try {
    const access = await validateFullAccess(request)
    if (!access.hasAccess || !access.organizationId) {
      return NextResponse.json({ error: access.error ?? 'Acesso negado' }, { status: 403 })
    }
    const organizationId = access.organizationId

    const searchParams = new URL(request.url).searchParams
    const parsed = itemListQuerySchema.safeParse({
      search: searchParams.get('search') ?? undefined,
      status: searchParams.get('status') ?? undefined,
      categoryId: searchParams.get('categoryId') ?? undefined,
      page: searchParams.get('page') ?? undefined,
      pageSize: searchParams.get('pageSize') ?? undefined,
    })

    if (!parsed.success) {
      return NextResponse.json({ error: 'Invalid query params' }, { status: 400 })
    }

    const payload: ListItemsParams = {
      organizationId,
      search: parsed.data.search,
      status: parsed.data.status,
      categoryId: parsed.data.categoryId,
      page: parsed.data.page,
      pageSize: parsed.data.pageSize,
    }

    return NextResponse.json(await listItems(payload))
  } catch (error) {
    console.error('[api/items] GET error', error)
    return NextResponse.json({ error: 'Failed to load items' }, { status: 500 })
  }
}

export async function POST(request: Request) {
  try {
    const access = await validateFullAccess(request)
    if (!access.hasAccess || !access.organizationId) {
      return NextResponse.json({ error: access.error ?? 'Acesso negado' }, { status: 403 })
    }
    const organizationId = access.organizationId

    const json = await request.json()
    const parsed = createItemSchema.safeParse(json)

    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Invalid payload', details: parsed.error.flatten() },
        { status: 400 }
      )
    }

    const result = await createItem({
      organizationId,
      name: parsed.data.name,
      categoryId: parsed.data.categoryId ?? null,
    })

    return NextResponse.json(result, { status: 201 })
  } catch (error) {
    console.error('[api/items] POST error', error)
    return NextResponse.json({ error: 'Failed to create item' }, { status: 500 })
  }
}
