import { NextResponse } from 'next/server'

import { validateFullAccess } from '@/server/auth/validate-organization-access'
import { BillingService, BillingCustomerService } from '@/services/billing'
import { addPaymentMethodSchema } from '../schemas'
import type { BillingCustomerWithExternals } from '@/services/billing/billing-customer-service'

/**
 * GET /api/v1/billing/payment-methods
 *
 * List saved payment methods for the organization.
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
      return NextResponse.json({ data: [] })
    }

    // Return payment methods (without sensitive tokens)
    const paymentMethods = customer.paymentMethods?.map((pm) => ({
      id: pm.id,
      type: pm.type,
      brand: pm.brand,
      last4: pm.lastFourDigits,
      expiryMonth: pm.expiryMonth,
      expiryYear: pm.expiryYear,
      isDefault: pm.isDefault,
      createdAt: pm.createdAt,
    })) ?? []

    return NextResponse.json({ data: paymentMethods })
  } catch (error) {
    console.error('[api/billing/payment-methods] GET error', error)
    return NextResponse.json(
      { error: 'Failed to list payment methods' },
      { status: 500 }
    )
  }
}

/**
 * POST /api/v1/billing/payment-methods
 *
 * Add a new payment method (tokenize card).
 */
export async function POST(request: Request) {
  try {
    const access = await validateFullAccess(request)
    if (!access.hasAccess || !access.organizationId) {
      return NextResponse.json(
        { error: access.error ?? 'Access denied' },
        { status: 403 }
      )
    }

    const json = await request.json()
    const parsed = addPaymentMethodSchema.safeParse(json)

    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Invalid payload', details: parsed.error.flatten() },
        { status: 400 }
      )
    }

    // Get or create billing customer
    const billingService = new BillingService()
    const customer = await billingService.getOrCreateCustomer(
      access.organizationId
    )

    // Tokenize card
    const tokenResult = await billingService.tokenizeCard({
      billingCustomerId: customer.id,
      cardNumber: parsed.data.cardNumber,
      cardHolder: parsed.data.cardHolder,
      expiryMonth: parsed.data.expiryMonth,
      expiryYear: parsed.data.expiryYear,
      cvv: parsed.data.cvv,
    })

    // Return safe data (no full token)
    return NextResponse.json(
      {
        brand: tokenResult.brand,
        last4: tokenResult.last4,
        expiryMonth: tokenResult.expiryMonth,
        expiryYear: tokenResult.expiryYear,
      },
      { status: 201 }
    )
  } catch (error) {
    console.error('[api/billing/payment-methods] POST error', error)

    if (error instanceof Error) {
      if (error.message.includes('Customer not registered')) {
        return NextResponse.json(
          { error: 'Billing customer not found' },
          { status: 404 }
        )
      }
    }

    return NextResponse.json(
      { error: 'Failed to add payment method' },
      { status: 500 }
    )
  }
}
