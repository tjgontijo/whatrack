/**
 * Payment Providers Initialization
 *
 * This module initializes and registers all available payment providers.
 * Must be called once at the start of each request (not in layout.tsx).
 *
 * Usage:
 *   ensurePaymentProviders()
 *   const provider = providerRegistry.getActive()
 */

import { env } from '@/lib/env/env'
import { providerRegistry } from './providers/provider-registry'
import { StripeProvider } from './providers/stripe-provider'

let initialized = false

/**
 * Ensure payment providers are initialized.
 * Idempotent - safe to call multiple times.
 */
export function ensurePaymentProviders(): void {
  if (initialized) return

  // Register Stripe provider
  providerRegistry.register(
    'stripe',
    new StripeProvider(env.STRIPE_SECRET_KEY)
  )

  providerRegistry.setActive('stripe')

  initialized = true
}

// Export registry for direct access when needed
export { providerRegistry }
