import { revalidateTag } from 'next/cache'
import { NextResponse } from 'next/server'
// import { dealLineItemSchema } from '@/features/deals/schemas/deal.schemas'
// import { addDealLineItem } from '@/features/deals/services/add-deal-line-item'
import { apiError } from '@/lib/utils/api-response'
import { logger } from '@/lib/utils/logger'
import { validatePermissionAccess } from '@/server/auth/validate-organization-access'

export async function POST(
  req: Request,
  { params }: { params: Promise<{ dealId: string }> }
) {
  const { dealId } = await params
  const access = await validatePermissionAccess(req, 'manage:deals')
  if (!access.hasAccess || !access.organizationId) {
    return apiError(access.error ?? 'Acesso negado', 403)
  }

  try {
    // TODO: Implementar adição de line items para deals
    return apiError('Funcionalidade não implementada', 501)
  } catch (error) {
    logger.error({ err: error, dealId }, '[api/deals/line-items] POST error')
    return apiError('Falha ao adicionar item', 500, error)
  }
}
