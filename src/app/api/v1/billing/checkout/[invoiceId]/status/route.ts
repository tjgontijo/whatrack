import { NextRequest, NextResponse } from 'next/server'
import { validateFullAccess } from '@/server/auth/validate-organization-access'
import { CheckoutStatusTokenService } from '@/services/billing/checkout-status-token.service'
import { prisma } from '@/lib/db/prisma'
import { apiError, apiSuccess } from '@/lib/utils/api-response'

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ invoiceId: string }> }
) {
  const { invoiceId } = await params
  // Try authenticated access first
  const auth = await validateFullAccess(request)

  if (auth.hasAccess && auth.organizationId) {
    // Authenticated user - can access their own invoice
    const invoice = await prisma.billingInvoice.findFirst({
      where: { id: invoiceId, organizationId: auth.organizationId },
      select: { id: true, status: true, asaasId: true },
    })

    if (!invoice) {
      return apiError('Invoice not found', 404)
    }

    return apiSuccess({ id: invoice.id, status: invoice.status })
  }

  // Try token-based access for guests
  const tokenParam = request.nextUrl.searchParams.get('token')
  if (!tokenParam || !CheckoutStatusTokenService.verifyInvoiceToken(tokenParam, invoiceId)) {
    return apiError('Unauthorized', 403)
  }

  // Token valid - allow guest access
  const invoice = await prisma.billingInvoice.findUnique({
    where: { id: invoiceId },
    select: { id: true, status: true, asaasId: true },
  })

  if (!invoice) {
    return apiError('Invoice not found', 404)
  }

  return apiSuccess({ id: invoice.id, status: invoice.status })
}
