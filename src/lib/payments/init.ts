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

let initialized = false

/**
 * Ensure payment providers are initialized.
 * Idempotent - safe to call multiple times.
 */
export function ensurePaymentProviders(): void {
  if (initialized) return

  // Register AbacatePay provider
  providerRegistry.register(
    'abacatepay',
    new AbacatepayProvider(env.ABACATEPAY_SECRET_KEY)
  )

  // Set active provider (can be changed via env var in future)
  providerRegistry.setActive('abacatepay')

  initialized = true
}

// Export registry for direct access when needed
export { providerRegistry }
