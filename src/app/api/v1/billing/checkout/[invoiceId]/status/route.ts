import type { NextRequest } from 'next/server'
import {
  findInvoiceStatusById,
  findInvoiceStatusForOrg,
} from '@/features/billing/repositories/find-invoice-status.repository'
import { CheckoutStatusTokenService } from '@/features/billing/services/checkout-status-token.service'
import { apiError, apiSuccess } from '@/lib/utils/api-response'
import { validateFullAccess } from '@/server/auth/validate-organization-access'

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ invoiceId: string }> }
) {
  const { invoiceId } = await params
  const auth = await validateFullAccess(request)

  if (auth.hasAccess && auth.organizationId) {
    const invoice = await findInvoiceStatusForOrg(invoiceId, auth.organizationId)
    if (!invoice) return apiError('Invoice not found', 404)
    return apiSuccess({ id: invoice.id, status: invoice.status })
  }

  const tokenParam = request.nextUrl.searchParams.get('token')
  if (!tokenParam || !CheckoutStatusTokenService.verifyInvoiceToken(tokenParam, invoiceId)) {
    return apiError('Unauthorized', 403)
  }

  const invoice = await findInvoiceStatusById(invoiceId)
  if (!invoice) return apiError('Invoice not found', 404)
  return apiSuccess({ id: invoice.id, status: invoice.status })
}
