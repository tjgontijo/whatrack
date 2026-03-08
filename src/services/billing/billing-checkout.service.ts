/**
 * Billing Checkout Service
 *
 * Handles checkout session creation and redirects to payment provider
 */

import { providerRegistry } from '@/lib/billing/providers/init'
import type { SelfServePlanType } from '@/types/billing/billing'
import { createSubscription } from './billing-subscription.service'
import { logger } from '@/lib/utils/logger'

/**
 * Parameters for creating checkout session
 */
export interface CreateCheckoutSessionParams {
  organizationId: string
  planType: SelfServePlanType
  successUrl: string
  returnUrl: string
  userEmail?: string
  userName?: string
  userPhone?: string
  userTaxId?: string
  isPerson?: boolean
}

/**
 * Checkout session response
 */
export interface CheckoutSessionResponse {
  url: string
  provider: string
}

/**
 * Create a checkout session via payment provider
 */
export async function createCheckoutSessionWithProvider(
  params: CreateCheckoutSessionParams
): Promise<CheckoutSessionResponse> {
  const { organizationId, planType, successUrl, returnUrl } = params

  try {
    // Get active payment provider
    const provider = providerRegistry.getActive()

    // Create checkout session
    const session = await provider.createCheckoutSession({
      organizationId,
      planType,
      successUrl,
      returnUrl,
      userEmail: params.userEmail,
      userName: params.userName,
      userPhone: params.userPhone,
      userTaxId: params.userTaxId,
      isPerson: params.isPerson,
    })

    // Create subscription in database with 'paused' status (waiting for payment)
    logger.info({ organizationId, planType }, '[Checkout] Creating pending subscription')
    await createSubscription({
      organizationId,
      planType,
      provider: provider.getProviderId(),
      providerCustomerId: session.customerId,
      providerSubscriptionId: session.id,
      status: 'paused',
    })

    return {
      url: session.url,
      provider: provider.getProviderId(),
    }
  } catch (error) {
    throw new Error(
      `Failed to create checkout session: ${error instanceof Error ? error.message : String(error)}`
    )
  }
}
