import { type NextRequest, NextResponse } from 'next/server'
import { toggleItemActiveService } from '@/features/items/server'
import { apiError } from '@/lib/utils/api-response'
import { logger } from '@/lib/utils/logger'
import { validateFullAccess } from '@/server/auth/validate-organization-access'

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ itemId: string }> }) {
  const access = await validateFullAccess(req)
  if (!access.hasAccess || !access.organizationId) {
    return apiError(access.error ?? 'Acesso negado', 403)
  }

  const { itemId } = await params

  try {
    const updated = await toggleItemActiveService({
      organizationId: access.organizationId,
      itemId,
    })

    if ('error' in updated) {
      return apiError(updated.error, updated.status)
    }

    return NextResponse.json(updated)
  } catch (error) {
    logger.error({ err: error }, '[api/items/[itemId]/active] PATCH error')
    return apiError('Falha ao alterar status do item', 500, error)
  }
}
