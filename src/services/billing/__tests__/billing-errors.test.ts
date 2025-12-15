import { describe, expect, it } from 'vitest'

/**
 * RED Phase: Billing Error Classes Test
 *
 * Verifica que as classes de erro de billing estão definidas
 * e funcionam corretamente.
 */
describe('Billing Error Classes', () => {
  describe('BillingError', () => {
    it('should export BillingError base class', async () => {
      const { BillingError } = await import('../errors')
      expect(BillingError).toBeDefined()
    })

    it('should be an instance of Error', async () => {
      const { BillingError } = await import('../errors')
      const error = new BillingError('test error')
      expect(error).toBeInstanceOf(Error)
      expect(error.name).toBe('BillingError')
      expect(error.message).toBe('test error')
    })

    it('should have code and provider properties', async () => {
      const { BillingError } = await import('../errors')
      const error = new BillingError('test', 'TEST_CODE', 'asaas')
      expect(error.code).toBe('TEST_CODE')
      expect(error.provider).toBe('asaas')
    })
  })

  describe('PaymentFailedError', () => {
    it('should export PaymentFailedError class', async () => {
      const { PaymentFailedError } = await import('../errors')
      expect(PaymentFailedError).toBeDefined()
    })

    it('should extend BillingError', async () => {
      const { PaymentFailedError, BillingError } = await import('../errors')
      const error = new PaymentFailedError('payment failed', 'insufficient_funds')
      expect(error).toBeInstanceOf(BillingError)
      expect(error.name).toBe('PaymentFailedError')
      expect(error.reason).toBe('insufficient_funds')
    })
  })

  describe('CustomerNotFoundError', () => {
    it('should export CustomerNotFoundError class', async () => {
      const { CustomerNotFoundError } = await import('../errors')
      expect(CustomerNotFoundError).toBeDefined()
    })

    it('should extend BillingError', async () => {
      const { CustomerNotFoundError, BillingError } = await import('../errors')
      const error = new CustomerNotFoundError('cus_123')
      expect(error).toBeInstanceOf(BillingError)
      expect(error.name).toBe('CustomerNotFoundError')
      expect(error.customerId).toBe('cus_123')
    })
  })

  describe('SubscriptionNotFoundError', () => {
    it('should export SubscriptionNotFoundError class', async () => {
      const { SubscriptionNotFoundError } = await import('../errors')
      expect(SubscriptionNotFoundError).toBeDefined()
    })

    it('should extend BillingError', async () => {
      const { SubscriptionNotFoundError, BillingError } = await import('../errors')
      const error = new SubscriptionNotFoundError('sub_123')
      expect(error).toBeInstanceOf(BillingError)
      expect(error.subscriptionId).toBe('sub_123')
    })
  })

  describe('InvalidWebhookError', () => {
    it('should export InvalidWebhookError class', async () => {
      const { InvalidWebhookError } = await import('../errors')
      expect(InvalidWebhookError).toBeDefined()
    })

    it('should extend BillingError', async () => {
      const { InvalidWebhookError, BillingError } = await import('../errors')
      const error = new InvalidWebhookError('invalid signature')
      expect(error).toBeInstanceOf(BillingError)
      expect(error.name).toBe('InvalidWebhookError')
    })
  })

  describe('ProviderApiError', () => {
    it('should export ProviderApiError class', async () => {
      const { ProviderApiError } = await import('../errors')
      expect(ProviderApiError).toBeDefined()
    })

    it('should extend BillingError with API details', async () => {
      const { ProviderApiError, BillingError } = await import('../errors')
      const error = new ProviderApiError('API error', 400, { error: 'bad request' }, 'asaas')
      expect(error).toBeInstanceOf(BillingError)
      expect(error.name).toBe('ProviderApiError')
      expect(error.statusCode).toBe(400)
      expect(error.response).toEqual({ error: 'bad request' })
      expect(error.provider).toBe('asaas')
    })
  })
})
