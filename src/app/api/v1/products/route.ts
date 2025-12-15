import { NextResponse } from 'next/server'
import { z } from 'zod'

import {
  listProducts,
  createProduct,
  type ListProductsParams,
} from '@/services/products/service'
import { validateFullAccess } from '@/lib/auth/validate-organization-access'

const getParamsSchema = z.object({
  search: z.string().optional(),
  status: z.enum(['active', 'inactive']).optional(),
  categoryId: z.string().optional(),
  page: z.coerce.number().optional(),
  pageSize: z.coerce.number().optional(),
})

const createSchema = z.object({
  name: z.string().min(1),
  categoryId: z.string().optional(),
  price: z.number().nonnegative().nullable().optional(),
  cost: z.number().nonnegative().nullable().optional(),
})

export async function GET(request: Request) {
  try {
    const access = await validateFullAccess(request)
    if (!access.hasAccess || !access.organizationId) {
      return NextResponse.json({ error: access.error ?? 'Acesso negado' }, { status: 403 })
    }
    const organizationId = access.organizationId

    const searchParams = new URL(request.url).searchParams
    const parsed = getParamsSchema.safeParse({
      search: searchParams.get('search') ?? undefined,
      status: searchParams.get('status') ?? undefined,
      categoryId: searchParams.get('categoryId') ?? undefined,
      page: searchParams.get('page') ?? undefined,
      pageSize: searchParams.get('pageSize') ?? undefined,
    })

    if (!parsed.success) {
      return NextResponse.json({ error: 'Invalid query params' }, { status: 400 })
    }

    const payload: ListProductsParams = {
      organizationId,
      search: parsed.data.search,
      status: parsed.data.status,
      categoryId: parsed.data.categoryId,
      page: parsed.data.page,
      pageSize: parsed.data.pageSize,
    }

    const response = await listProducts(payload)
    return NextResponse.json(response)
  } catch (error) {
    console.error('[api/products] GET error', error)
    return NextResponse.json({ error: 'Failed to load products' }, { status: 500 })
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
    const parsed = createSchema.safeParse(json)

    if (!parsed.success) {
      return NextResponse.json({ error: 'Invalid payload', details: parsed.error.flatten() }, { status: 400 })
    }

    const result = await createProduct({
      organizationId,
      name: parsed.data.name,
      categoryId: parsed.data.categoryId ?? null,
      price: parsed.data.price ?? null,
      cost: parsed.data.cost ?? null,
    })

    return NextResponse.json(result, { status: 201 })
  } catch (error) {
    console.error('[api/products] POST error', error)
    return NextResponse.json({ error: 'Failed to create product' }, { status: 500 })
  }
}
