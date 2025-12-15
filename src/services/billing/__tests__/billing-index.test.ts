import { describe, expect, it } from 'vitest'

/**
 * Barrel Export Test
 *
 * Verifica que todos os exports do módulo billing
 * estão acessíveis pelo index.
 */
describe('Billing Module Barrel Export', () => {
  describe('Types', () => {
    it('should export all Zod schemas', async () => {
      const module = await import('../index')

      // Address
      expect(module.AddressSchema).toBeDefined()

      // Customer
      expect(module.CreateCustomerParamsSchema).toBeDefined()
      expect(module.UpdateCustomerParamsSchema).toBeDefined()
      expect(module.CreateCustomerResultSchema).toBeDefined()

      // Subscription
      expect(module.BillingTypeSchema).toBeDefined()
      expect(module.IntervalSchema).toBeDefined()
      expect(module.CreateSubscriptionParamsSchema).toBeDefined()
      expect(module.CreateSubscriptionResultSchema).toBeDefined()
      expect(module.CancelSubscriptionParamsSchema).toBeDefined()
      expect(module.SubscriptionResultSchema).toBeDefined()

      // Payment
      expect(module.PaymentDataSchema).toBeDefined()
      expect(module.TokenizeCardParamsSchema).toBeDefined()
      expect(module.TokenizeCardResultSchema).toBeDefined()
      expect(module.PaymentResultSchema).toBeDefined()
      expect(module.RefundParamsSchema).toBeDefined()
      expect(module.RefundResultSchema).toBeDefined()

      // Invoice
      expect(module.InvoiceItemSchema).toBeDefined()
      expect(module.InvoiceResultSchema).toBeDefined()

      // Webhook
      expect(module.WebhookEventSchema).toBeDefined()
      expect(module.WebhookValidationResultSchema).toBeDefined()
    })
  })

  describe('Provider', () => {
    it('should export AbstractBillingProvider', async () => {
      const { AbstractBillingProvider } = await import('../index')
      expect(AbstractBillingProvider).toBeDefined()
      expect(typeof AbstractBillingProvider).toBe('function')
    })

    it('should export isBillingProvider', async () => {
      const { isBillingProvider } = await import('../index')
      expect(isBillingProvider).toBeDefined()
      expect(typeof isBillingProvider).toBe('function')
    })
  })

  describe('Errors', () => {
    it('should export all error classes', async () => {
      const module = await import('../index')

      expect(module.BillingError).toBeDefined()
      expect(module.PaymentFailedError).toBeDefined()
      expect(module.CustomerNotFoundError).toBeDefined()
      expect(module.SubscriptionNotFoundError).toBeDefined()
      expect(module.InvalidWebhookError).toBeDefined()
      expect(module.ProviderApiError).toBeDefined()
      expect(module.CardTokenizationError).toBeDefined()
      expect(module.InvoiceNotFoundError).toBeDefined()
      expect(module.RefundFailedError).toBeDefined()
    })

    it('should allow instantiating errors from barrel export', async () => {
      const { BillingError, PaymentFailedError } = await import('../index')

      const billingError = new BillingError('test')
      expect(billingError.message).toBe('test')

      const paymentError = new PaymentFailedError('failed', 'insufficient_funds')
      expect(paymentError.reason).toBe('insufficient_funds')
    })
  })

  describe('Integration', () => {
    it('should allow creating a mock provider using barrel exports', async () => {
      const { AbstractBillingProvider, isBillingProvider } = await import(
        '../index'
      )

      class TestProvider extends AbstractBillingProvider {
        readonly provider = 'asaas' as const
      }

      const provider = new TestProvider()
      expect(isBillingProvider(provider)).toBe(true)
    })
  })
})
