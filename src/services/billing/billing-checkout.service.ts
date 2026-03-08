/**
 * Billing Checkout Service
 *
 * Handles checkout session creation and redirects to payment provider
 */

import { ensurePaymentProviders, providerRegistry } from '@/lib/billing/providers/init'
import { prisma } from '@/lib/db/prisma'
import { resolveInternalPath } from '@/lib/utils/internal-path'
import { logger } from '@/lib/utils/logger'
import { BillingPlanCatalogError, requireCheckoutReadyBillingPlan } from './billing-plan-catalog.service'

export class BillingCheckoutError extends Error {
  constructor(
    message: string,
    public readonly status: number
  ) {
    super(message)
    this.name = 'BillingCheckoutError'
  }
}

/**
 * Parameters for creating checkout session
 */
export interface CreateCheckoutSessionParams {
  organizationId: string
  userId: string
  planType: string
  origin: string
  redirectPath?: string
}

/**
 * Checkout session response
 */
export interface CheckoutSessionResponse {
  url: string
  provider: string
}

/**
 * Create a checkout session with the active payment provider
 */
export async function createCheckoutSession(
  params: CreateCheckoutSessionParams
): Promise<CheckoutSessionResponse> {
  ensurePaymentProviders()

  const customerContext = await resolveCheckoutCustomerContext(params.organizationId, params.userId)
  let plan

  try {
    plan = await requireCheckoutReadyBillingPlan(params.planType)
  } catch (error) {
    if (error instanceof BillingPlanCatalogError) {
      throw new BillingCheckoutError(error.message, error.status)
    }

    throw error
  }
  const { successUrl, returnUrl } = buildCheckoutUrls(params, plan.name)

  try {
    const provider = providerRegistry.getActive()

    const session = await provider.createCheckoutSession({
      organizationId: params.organizationId,
      planType: params.planType,
      successUrl,
      returnUrl,
      userEmail: customerContext.userEmail,
      userName: customerContext.userName,
      userPhone: customerContext.userPhone,
      userTaxId: customerContext.userTaxId,
      isPerson: customerContext.isPerson,
    })

    logger.info(
      { organizationId: params.organizationId, planType: params.planType },
      '[Checkout] Checkout session created; awaiting Stripe webhook to persist subscription'
    )

    return {
      url: session.url,
      provider: provider.getProviderId(),
    }
  } catch (error) {
    logger.error({ err: error }, '[Checkout] Failed to create checkout session')
    throw error
  }
}

interface CheckoutCustomerContext {
  userEmail: string
  userName: string
  userPhone: string
  userTaxId: string
  isPerson: boolean
}

async function resolveCheckoutCustomerContext(
  organizationId: string,
  userId: string
): Promise<CheckoutCustomerContext> {
  const [user, orgProfile, orgCompany] = await Promise.all([
    prisma.user.findUnique({
      where: { id: userId },
      select: {
        email: true,
        name: true,
        phone: true,
      },
    }),
    prisma.organizationProfile.findUnique({
      where: { organizationId },
      select: {
        cpf: true,
      },
    }),
    prisma.organizationCompany.findUnique({
      where: { organizationId },
      select: {
        cnpj: true,
      },
    }),
  ])

  if (!user) {
    throw new BillingCheckoutError('User profile not found', 404)
  }

  if (!user.email || !user.name) {
    throw new BillingCheckoutError('User email and name are required for checkout', 400)
  }

  if (!user.phone) {
    throw new BillingCheckoutError('User phone is required for checkout', 400)
  }

  const taxId = orgProfile?.cpf || orgCompany?.cnpj
  if (!taxId) {
    throw new BillingCheckoutError('Organization tax ID (CPF or CNPJ) is required for checkout', 400)
  }

  return {
    userEmail: user.email,
    userName: user.name,
    userPhone: user.phone,
    userTaxId: taxId,
    isPerson: Boolean(orgProfile?.cpf),
  }
}

function buildCheckoutUrls(
  params: CreateCheckoutSessionParams,
  planName: string,
) {
  const redirectPath = resolveInternalPath(params.redirectPath, '/dashboard/billing')
  const successUrl = new URL('/billing/success', params.origin)
  successUrl.searchParams.set('plan', params.planType)
  successUrl.searchParams.set('planName', planName)
  successUrl.searchParams.set('next', redirectPath)

  return {
    successUrl: successUrl.toString(),
    returnUrl: new URL(redirectPath, params.origin).toString(),
  }
}
