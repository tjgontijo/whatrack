import { NextResponse } from 'next/server'

import { validateFullAccess } from '@/server/auth/validate-organization-access'
import { BillingCustomerService, InvoiceService } from '@/services/billing'

interface RouteParams {
  params: Promise<{ id: string }>
}

/**
 * GET /api/v1/billing/invoices/[id]
 *
 * Get a specific invoice by ID.
 */
export async function GET(request: Request, { params }: RouteParams) {
  try {
    const access = await validateFullAccess(request)
    if (!access.hasAccess || !access.organizationId) {
      return NextResponse.json(
        { error: access.error ?? 'Access denied' },
        { status: 403 }
      )
    }

    const { id } = await params

    // Get invoice
    const invoiceService = new InvoiceService()
    const invoice = await invoiceService.getById(id)

    if (!invoice) {
      return NextResponse.json({ error: 'Invoice not found' }, { status: 404 })
    }

    // Verify ownership through billing customer
    const customerService = new BillingCustomerService()
    const customer = await customerService.getByOrganizationId(
      access.organizationId
    )

    if (!customer || invoice.billingCustomerId !== customer.id) {
      return NextResponse.json({ error: 'Invoice not found' }, { status: 404 })
    }

    return NextResponse.json(invoice)
  } catch (error) {
    console.error('[api/billing/invoices/[id]] GET error', error)
    return NextResponse.json(
      { error: 'Failed to get invoice' },
      { status: 500 }
    )
  }
}
