/**
 * Billing Checkout Service
 *
 * Handles checkout session creation and redirects to payment provider
 */

import { providerRegistry } from '@/lib/payments/init'
import type { PlanType } from '@/types/billing/billing'

/**
 * Parameters for creating checkout session
 */
export interface CreateCheckoutSessionParams {
  organizationId: string
  planType: PlanType
  successUrl: string
  returnUrl: string
  userEmail?: string
  userName?: string
  userPhone?: string
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
