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
import { AbacatepayProvider } from './providers/abacatepay-provider'
import { StripeProvider } from './providers/stripe-provider'

let initialized = false

/**
 * Ensure payment providers are initialized.
 * Idempotent - safe to call multiple times.
 */
export function ensurePaymentProviders(): void {
  if (initialized) return

  // Register AbacatePay provider (legacy, for backward compatibility)
  providerRegistry.register(
    'abacatepay',
    new AbacatepayProvider(env.ABACATEPAY_SECRET_KEY)
  )

  // Register Stripe provider
  providerRegistry.register(
    'stripe',
    new StripeProvider(env.STRIPE_SECRET_KEY)
  )

  // Set active provider based on env var
  const activeProvider = env.ACTIVE_PAYMENT_PROVIDER || 'stripe'
  providerRegistry.setActive(activeProvider)

  initialized = true
}

// Export registry for direct access when needed
export { providerRegistry }
