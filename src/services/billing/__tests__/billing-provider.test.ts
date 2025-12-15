import { describe, expect, it } from 'vitest'

/**
 * Billing Provider Tests
 *
 * Verifica que a interface IBillingProvider está definida
 * através do AbstractBillingProvider que a implementa.
 */
describe('IBillingProvider Interface', () => {
  it('should export isBillingProvider type guard', async () => {
    const { isBillingProvider } = await import('../provider')
    expect(isBillingProvider).toBeDefined()
    expect(typeof isBillingProvider).toBe('function')
  })

  it('should validate provider objects correctly', async () => {
    const { isBillingProvider, AbstractBillingProvider } = await import(
      '../provider'
    )

    // Create a mock provider
    class MockProvider extends AbstractBillingProvider {
      readonly provider = 'asaas' as const
    }

    const mock = new MockProvider()
    expect(isBillingProvider(mock)).toBe(true)
    expect(isBillingProvider({})).toBe(false)
    expect(isBillingProvider(null)).toBe(false)
  })
})

describe('AbstractBillingProvider', () => {
  it('should export AbstractBillingProvider class', async () => {
    const { AbstractBillingProvider } = await import('../provider')
    expect(AbstractBillingProvider).toBeDefined()
    expect(typeof AbstractBillingProvider).toBe('function')
  })

  it('should have all required abstract methods', async () => {
    const { AbstractBillingProvider } = await import('../provider')

    // Get prototype methods
    const proto = AbstractBillingProvider.prototype
    const methods = Object.getOwnPropertyNames(proto)

    // Check method existence (they should throw NotImplementedError)
    expect(methods).toContain('createCustomer')
    expect(methods).toContain('updateCustomer')
    expect(methods).toContain('createSubscription')
    expect(methods).toContain('cancelSubscription')
    expect(methods).toContain('pauseSubscription')
    expect(methods).toContain('resumeSubscription')
    expect(methods).toContain('tokenizeCard')
    expect(methods).toContain('getPayment')
    expect(methods).toContain('refundPayment')
    expect(methods).toContain('validateWebhookSignature')
  })
})
