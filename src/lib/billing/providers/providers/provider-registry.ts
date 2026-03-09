/**
 * Payment Provider Registry
 *
 * Singleton that manages available payment providers.
 * Allows registering, retrieving, and switching between providers.
 */

import type { PaymentProvider } from './billing-provider'

type ProviderId = 'stripe'

class ProviderRegistry {
  private providers = new Map<ProviderId, PaymentProvider>()
  private activeId: ProviderId = 'stripe'

  /**
   * Register a new payment provider
   */
  register(id: ProviderId, provider: PaymentProvider): void {
    this.providers.set(id, provider)
  }

  /**
   * Get a specific provider by ID, or the active provider if not specified
   */
  get(id?: ProviderId): PaymentProvider {
    const key = id ?? this.activeId
    const provider = this.providers.get(key)

    if (!provider) {
      throw new Error(`Provider '${key}' not registered`)
    }

    if (!provider.isConfigured()) {
      throw new Error(`Provider '${key}' not configured`)
    }

    return provider
  }

  /**
   * Set the active provider
   */
  setActive(id: ProviderId): void {
    if (!this.providers.has(id)) {
      throw new Error(`Provider '${id}' not registered`)
    }
    this.activeId = id
  }

  /**
   * Get the currently active provider
   */
  getActive(): PaymentProvider {
    return this.get()
  }

  /**
   * Get the ID of the currently active provider
   */
  getActiveId(): ProviderId {
    return this.activeId
  }
}

// Singleton instance
export const providerRegistry = new ProviderRegistry()
