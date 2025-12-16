import { NextResponse } from 'next/server'

import { validateFullAccess } from '@/server/auth/validate-organization-access'
import { BillingCustomerService, InvoiceService } from '@/services/billing'
import { listInvoicesSchema, type PaginatedResponse } from '../schemas'

/**
 * GET /api/v1/billing/invoices
 *
 * List invoices for the organization with pagination.
 */
export async function GET(request: Request) {
  try {
    const access = await validateFullAccess(request)
    if (!access.hasAccess || !access.organizationId) {
      return NextResponse.json(
        { error: access.error ?? 'Access denied' },
        { status: 403 }
      )
    }

    // Parse query params
    const searchParams = new URL(request.url).searchParams
    const parsed = listInvoicesSchema.safeParse({
      page: searchParams.get('page') ?? undefined,
      pageSize: searchParams.get('pageSize') ?? undefined,
      status: searchParams.get('status') ?? undefined,
    })

    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Invalid query params', details: parsed.error.flatten() },
        { status: 400 }
      )
    }

    const { page, pageSize } = parsed.data

    // Get billing customer
    const customerService = new BillingCustomerService()
    const customer = await customerService.getByOrganizationId(
      access.organizationId
    )

    if (!customer) {
      // No billing customer = no invoices
      const response: PaginatedResponse<never> = {
        data: [],
        pagination: {
          page,
          pageSize,
          total: 0,
          totalPages: 0,
        },
      }
      return NextResponse.json(response)
    }

    // Get invoices
    const invoiceService = new InvoiceService()
    const invoices = await invoiceService.listByBillingCustomer(customer.id)

    // Filter by status if provided
    let filtered = invoices
    if (parsed.data.status) {
      filtered = invoices.filter((inv) => inv.status === parsed.data.status)
    }

    // Manual pagination
    const total = filtered.length
    const totalPages = Math.ceil(total / pageSize)
    const start = (page - 1) * pageSize
    const paginated = filtered.slice(start, start + pageSize)

    const response: PaginatedResponse<(typeof paginated)[0]> = {
      data: paginated,
      pagination: {
        page,
        pageSize,
        total,
        totalPages,
      },
    }

    return NextResponse.json(response)
  } catch (error) {
    console.error('[api/billing/invoices] GET error', error)
    return NextResponse.json(
      { error: 'Failed to list invoices' },
      { status: 500 }
    )
  }
}
