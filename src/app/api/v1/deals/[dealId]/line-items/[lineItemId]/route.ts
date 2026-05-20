import { revalidateTag } from 'next/cache'
import { NextResponse } from 'next/server'
// import { dealLineItemSchema } from '@/features/deals/schemas/deal.schemas'
// import { updateDealLineItem } from '@/features/deals/services/update-deal-line-item'
import { apiError } from '@/lib/utils/api-response'
import { logger } from '@/lib/utils/logger'
import { validatePermissionAccess } from '@/server/auth/validate-organization-access'

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ dealId: string; lineItemId: string }> }
) {
  const { dealId, lineItemId } = await params
  const access = await validatePermissionAccess(req, 'manage:deals')
  if (!access.hasAccess || !access.organizationId) {
    return apiError(access.error ?? 'Acesso negado', 403)
  }

  try {
    // TODO: Implementar atualização de line items para deals
    return apiError('Funcionalidade não implementada', 501)
  } catch (error) {
    logger.error({ err: error, dealId, lineItemId }, '[api/deals/line-items] PATCH error')
    return apiError('Falha ao atualizar item', 500, error)
  }
}
