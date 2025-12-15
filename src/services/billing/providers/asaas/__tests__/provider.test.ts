import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest'

/**
 * AsaasProvider Tests
 *
 * Testa as operações de customer e subscription do provider Asaas.
 */
describe('AsaasProvider', () => {
  const originalEnv = process.env
  const mockFetch = vi.fn()

  beforeEach(() => {
    vi.resetModules()
    process.env = {
      ...originalEnv,
      ASAAS_API_KEY: 'test_api_key',
      ASAAS_ENVIRONMENT: 'sandbox',
    }
    global.fetch = mockFetch
    mockFetch.mockReset()
  })

  afterEach(() => {
    process.env = originalEnv
    vi.restoreAllMocks()
  })

  describe('Provider Implementation', () => {
    it('should export AsaasProvider class', async () => {
      const { AsaasProvider } = await import('../provider')
      expect(AsaasProvider).toBeDefined()
    })

    it('should have provider property set to asaas', async () => {
      const { AsaasProvider } = await import('../provider')
      const provider = new AsaasProvider()
      expect(provider.provider).toBe('asaas')
    })

    it('should implement IBillingProvider interface', async () => {
      const { AsaasProvider } = await import('../provider')
      const { isBillingProvider } = await import('../../../provider')
      const provider = new AsaasProvider()
      expect(isBillingProvider(provider)).toBe(true)
    })
  })

  describe('Customer Operations', () => {
    it('should create customer successfully', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () =>
          Promise.resolve({
            id: 'cus_000005118238',
            name: 'John Doe',
            email: 'john@example.com',
            cpfCnpj: '12345678900',
          }),
      })

      const { AsaasProvider } = await import('../provider')
      const provider = new AsaasProvider()

      const result = await provider.createCustomer({
        email: 'john@example.com',
        name: 'John Doe',
        taxId: '12345678900',
        phone: '11999999999',
      })

      expect(result.externalId).toBe('cus_000005118238')
      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining('/customers'),
        expect.objectContaining({
          method: 'POST',
          body: expect.stringContaining('john@example.com'),
        })
      )
    })

    it('should update customer successfully', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () =>
          Promise.resolve({
            id: 'cus_000005118238',
            name: 'John Updated',
            email: 'john@example.com',
          }),
      })

      const { AsaasProvider } = await import('../provider')
      const provider = new AsaasProvider()

      const result = await provider.updateCustomer('cus_000005118238', {
        name: 'John Updated',
      })

      expect(result.externalId).toBe('cus_000005118238')
      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining('/customers/cus_000005118238'),
        expect.objectContaining({
          method: 'PUT',
        })
      )
    })

    it('should delete customer successfully', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ deleted: true }),
      })

      const { AsaasProvider } = await import('../provider')
      const provider = new AsaasProvider()

      await expect(
        provider.deleteCustomer('cus_000005118238')
      ).resolves.not.toThrow()

      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining('/customers/cus_000005118238'),
        expect.objectContaining({
          method: 'DELETE',
        })
      )
    })
  })

  describe('Subscription Operations', () => {
    it('should create subscription with credit card', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () =>
          Promise.resolve({
            id: 'sub_000005118238',
            status: 'ACTIVE',
            nextDueDate: '2025-01-15',
            customer: 'cus_000005118238',
          }),
      })

      const { AsaasProvider } = await import('../provider')
      const provider = new AsaasProvider()

      const result = await provider.createSubscription({
        customerId: 'cus_000005118238',
        planId: 'plan_starter',
        interval: 'monthly',
        billingType: 'credit_card',
        paymentMethodToken: 'card_token_123',
      })

      expect(result.externalId).toBe('sub_000005118238')
      expect(result.status).toBe('active')
    })

    it('should create subscription with PIX', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () =>
          Promise.resolve({
            id: 'sub_000005118239',
            status: 'PENDING',
            nextDueDate: '2025-01-15',
          }),
      })

      const { AsaasProvider } = await import('../provider')
      const provider = new AsaasProvider()

      const result = await provider.createSubscription({
        customerId: 'cus_000005118238',
        planId: 'plan_pro',
        interval: 'yearly',
        billingType: 'pix',
      })

      expect(result.externalId).toBe('sub_000005118239')
    })

    it('should get subscription details', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () =>
          Promise.resolve({
            id: 'sub_000005118238',
            status: 'ACTIVE',
            nextDueDate: '2025-02-15',
            customer: 'cus_000005118238',
            cycle: 'MONTHLY',
          }),
      })

      const { AsaasProvider } = await import('../provider')
      const provider = new AsaasProvider()

      const result = await provider.getSubscription('sub_000005118238')

      expect(result.externalId).toBe('sub_000005118238')
      expect(result.status).toBe('active')
    })

    it('should cancel subscription', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () =>
          Promise.resolve({
            id: 'sub_000005118238',
            status: 'EXPIRED',
            deleted: true,
          }),
      })

      const { AsaasProvider } = await import('../provider')
      const provider = new AsaasProvider()

      const result = await provider.cancelSubscription({
        externalId: 'sub_000005118238',
        cancelAtPeriodEnd: false,
      })

      expect(result.status).toBe('canceled')
    })
  })

  describe('Card Tokenization', () => {
    it('should tokenize credit card', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () =>
          Promise.resolve({
            creditCardNumber: '4242',
            creditCardBrand: 'VISA',
            creditCardToken: 'token_abc123',
          }),
      })

      const { AsaasProvider } = await import('../provider')
      const provider = new AsaasProvider()

      const result = await provider.tokenizeCard({
        cardNumber: '4242424242424242',
        cardHolder: 'John Doe',
        expiryMonth: '12',
        expiryYear: '2028',
        cvv: '123',
        customerId: 'cus_000005118238',
      })

      expect(result.token).toBe('token_abc123')
      expect(result.brand).toBe('VISA')
      expect(result.last4).toBe('4242')
    })
  })

  describe('Payment Operations', () => {
    it('should get payment details', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () =>
          Promise.resolve({
            id: 'pay_000005118238',
            status: 'RECEIVED',
            value: 97.0,
            netValue: 94.0,
            billingType: 'CREDIT_CARD',
            confirmedDate: '2025-01-15',
          }),
      })

      const { AsaasProvider } = await import('../provider')
      const provider = new AsaasProvider()

      const result = await provider.getPayment('pay_000005118238')

      expect(result.externalId).toBe('pay_000005118238')
      expect(result.status).toBe('succeeded')
      expect(result.amountCents).toBe(9700)
    })

    it('should get payment with PIX data', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () =>
          Promise.resolve({
            id: 'pay_000005118239',
            status: 'PENDING',
            value: 97.0,
            billingType: 'PIX',
            pixQrCodeId: 'qr123',
            pixCopiaECola: 'pix_copy_paste_code',
          }),
      })

      const { AsaasProvider } = await import('../provider')
      const provider = new AsaasProvider()

      const result = await provider.getPayment('pay_000005118239')

      expect(result.externalId).toBe('pay_000005118239')
      expect(result.paymentData?.pixCopyPaste).toBe('pix_copy_paste_code')
    })

    it('should refund payment', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () =>
          Promise.resolve({
            id: 'pay_000005118238',
            status: 'REFUNDED',
            value: 97.0,
            refundedDate: '2025-01-16',
          }),
      })

      const { AsaasProvider } = await import('../provider')
      const provider = new AsaasProvider()

      const result = await provider.refundPayment({
        externalId: 'pay_000005118238',
      })

      expect(result.status).toBe('refunded')
    })
  })

  describe('Webhook Validation', () => {
    it('should validate webhook signature', async () => {
      process.env.ASAAS_WEBHOOK_TOKEN = 'webhook_secret_123'

      const { AsaasProvider } = await import('../provider')
      const provider = new AsaasProvider()

      const payload = JSON.stringify({ event: 'PAYMENT_RECEIVED', id: 'pay_123' })
      const signature = 'webhook_secret_123' // Asaas uses token as signature

      const result = provider.validateWebhookSignature(payload, signature)

      expect(result.isValid).toBe(true)
    })

    it('should reject invalid webhook signature', async () => {
      process.env.ASAAS_WEBHOOK_TOKEN = 'webhook_secret_123'

      const { AsaasProvider } = await import('../provider')
      const provider = new AsaasProvider()

      const payload = JSON.stringify({ event: 'PAYMENT_RECEIVED' })
      const signature = 'wrong_token'

      const result = provider.validateWebhookSignature(payload, signature)

      expect(result.isValid).toBe(false)
    })

    it('should parse webhook event', async () => {
      process.env.ASAAS_WEBHOOK_TOKEN = 'webhook_secret_123'

      const { AsaasProvider } = await import('../provider')
      const provider = new AsaasProvider()

      const payload = JSON.stringify({
        event: 'PAYMENT_RECEIVED',
        payment: { id: 'pay_123', status: 'RECEIVED' },
      })
      const signature = 'webhook_secret_123'

      const result = provider.validateWebhookSignature(payload, signature)

      expect(result.event?.eventType).toBe('PAYMENT_RECEIVED')
    })
  })
})
