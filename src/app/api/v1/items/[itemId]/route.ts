import { NextRequest, NextResponse } from 'next/server'
import { apiError } from '@/lib/utils/api-response'

import { validateFullAccess } from '@/server/auth/validate-organization-access'
import { updateItemSchema } from '@/schemas/items/item-schemas'
import { deleteItem, getItemById, updateItem } from '@/services/items/item.service'

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ itemId: string }> }
) {
  const access = await validateFullAccess(req)
  if (!access.hasAccess || !access.organizationId) {
    return apiError(access.error ?? 'Acesso negado', 403)
  }
  const organizationId = access.organizationId
  const { itemId } = await params

  try {
    const item = await getItemById({ organizationId, itemId })
    if (!item) {
      return apiError('Item não encontrado', 404)
    }

    return NextResponse.json(item)
  } catch (error) {
    console.error('[api/items/[itemId]] GET error:', error)
    return apiError('Falha ao buscar item', 500, error)
  }
}

export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ itemId: string }> }
) {
  const access = await validateFullAccess(req)
  if (!access.hasAccess || !access.organizationId) {
    return apiError(access.error ?? 'Acesso negado', 403)
  }
  const organizationId = access.organizationId
  const { itemId } = await params

  try {
    const body = await req.json()
    const validated = updateItemSchema.parse(body)

    const updated = await updateItem({
      organizationId,
      itemId,
      name: validated.name,
      categoryId: validated.categoryId,
      active: validated.active,
    })

    if ('error' in updated) {
      return apiError(updated.error, updated.status)
    }

    return NextResponse.json(updated)
  } catch (error) {
    console.error('[api/items/[itemId]] PUT error:', error)
    return apiError('Falha ao atualizar item', 500, error)
  }
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ itemId: string }> }
) {
  const access = await validateFullAccess(req)
  if (!access.hasAccess || !access.organizationId) {
    return apiError(access.error ?? 'Acesso negado', 403)
  }
  const organizationId = access.organizationId
  const { itemId } = await params

  try {
    const result = await deleteItem({
      organizationId,
      itemId,
    })

    if ('error' in result) {
      return apiError(result.error, result.status)
    }

    return NextResponse.json(result)
  } catch (error) {
    console.error('[api/items/[itemId]] DELETE error:', error)
    return apiError('Falha ao deletar item', 500, error)
  }
}
