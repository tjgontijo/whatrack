import { type NextRequest, NextResponse } from 'next/server'
import { deleteItemService, getItemByIdService, updateItemService } from '@/features/items/server'
import { apiError } from '@/lib/utils/api-response'
import { logger } from '@/lib/utils/logger'
import { validateFullAccess } from '@/server/auth/validate-organization-access'

export async function GET(req: NextRequest, { params }: { params: Promise<{ itemId: string }> }) {
  const access = await validateFullAccess(req)
  if (!access.hasAccess || !access.organizationId) {
    return apiError(access.error ?? 'Acesso negado', 403)
  }

  const { itemId } = await params

  try {
    const item = await getItemByIdService({
      organizationId: access.organizationId,
      itemId,
    })

    if (!item) {
      return apiError('Item não encontrado', 404)
    }

    return NextResponse.json(item)
  } catch (error) {
    logger.error({ err: error }, '[api/items/[itemId]] GET error')
    return apiError('Falha ao buscar item', 500, error)
  }
}

export async function PUT(req: NextRequest, { params }: { params: Promise<{ itemId: string }> }) {
  const access = await validateFullAccess(req)
  if (!access.hasAccess || !access.organizationId) {
    return apiError(access.error ?? 'Acesso negado', 403)
  }

  const { itemId } = await params

  try {
    const payload = await req.json()
    const updated = await updateItemService({
      organizationId: access.organizationId,
      itemId,
      payload,
    })

    if ('error' in updated) {
      return apiError(updated.error, updated.status)
    }

    return NextResponse.json(updated)
  } catch (error) {
    logger.error({ err: error }, '[api/items/[itemId]] PUT error')
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

  const { itemId } = await params

  try {
    const result = await deleteItemService({
      organizationId: access.organizationId,
      itemId,
    })

    if ('error' in result) {
      return apiError(result.error, result.status)
    }

    return NextResponse.json(result)
  } catch (error) {
    logger.error({ err: error }, '[api/items/[itemId]] DELETE error')
    return apiError('Falha ao deletar item', 500, error)
  }
}
