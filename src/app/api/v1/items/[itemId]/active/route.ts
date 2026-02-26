import { NextRequest, NextResponse } from 'next/server'
import { apiError } from '@/lib/utils/api-response'

import { validateFullAccess } from '@/server/auth/validate-organization-access'
import { toggleItemActive } from '@/services/items/item.service'

export async function PATCH(
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
    const updated = await toggleItemActive({
      organizationId,
      itemId,
    })

    if ('error' in updated) {
      return apiError(updated.error, updated.status)
    }

    return NextResponse.json(updated)
  } catch (error) {
    console.error('[api/items/[itemId]/active] PATCH error:', error)
    return apiError('Falha ao alterar status do item', 500, error)
  }
}
