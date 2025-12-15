import { NextResponse } from 'next/server'

import { validateFullAccess } from '@/lib/auth/validate-organization-access'
import { BillingCustomerService } from '@/services/billing'
import { updateCustomerSchema } from '../schemas'

/**
 * GET /api/v1/billing/customer
 *
 * Get the billing customer data for the organization.
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

    const customerService = new BillingCustomerService()
    const customer = await customerService.getByOrganizationId(
      access.organizationId
    )

    if (!customer) {
      return NextResponse.json(
        { error: 'Billing customer not found' },
        { status: 404 }
      )
    }

    // Remove sensitive external IDs from response
    const { externalCustomers, ...safeCustomer } = customer

    return NextResponse.json({
      ...safeCustomer,
      hasPaymentMethods: (customer.paymentMethods?.length ?? 0) > 0,
    })
  } catch (error) {
    console.error('[api/billing/customer] GET error', error)
    return NextResponse.json(
      { error: 'Failed to get billing customer' },
      { status: 500 }
    )
  }
}

/**
 * PUT /api/v1/billing/customer
 *
 * Update the billing customer data.
 */
export async function PUT(request: Request) {
  try {
    const access = await validateFullAccess(request)
    if (!access.hasAccess || !access.organizationId) {
      return NextResponse.json(
        { error: access.error ?? 'Access denied' },
        { status: 403 }
      )
    }

    const json = await request.json()
    const parsed = updateCustomerSchema.safeParse(json)

    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Invalid payload', details: parsed.error.flatten() },
        { status: 400 }
      )
    }

    const customerService = new BillingCustomerService()

    // Get existing customer
    const existing = await customerService.getByOrganizationId(
      access.organizationId
    )

    if (!existing) {
      return NextResponse.json(
        { error: 'Billing customer not found' },
        { status: 404 }
      )
    }

    // Update customer
    const updated = await customerService.update(existing.id, parsed.data)

    // Remove sensitive data
    const { externalCustomers, ...safeCustomer } = updated

    return NextResponse.json(safeCustomer)
  } catch (error) {
    console.error('[api/billing/customer] PUT error', error)
    return NextResponse.json(
      { error: 'Failed to update billing customer' },
      { status: 500 }
    )
  }
}
