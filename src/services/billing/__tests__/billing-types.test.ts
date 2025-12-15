import { describe, expect, it } from 'vitest'

/**
 * RED Phase: Billing Types Test
 *
 * Verifica que os tipos de billing estão definidos corretamente
 * e podem ser importados do módulo.
 */
describe('Billing Types', () => {
  describe('Parameter Types', () => {
    it('should export CreateCustomerParams type', async () => {
      const { CreateCustomerParamsSchema } = await import('../types')
      expect(CreateCustomerParamsSchema).toBeDefined()
    })

    it('should export CreateSubscriptionParams type', async () => {
      const { CreateSubscriptionParamsSchema } = await import('../types')
      expect(CreateSubscriptionParamsSchema).toBeDefined()
    })

    it('should export TokenizeCardParams type', async () => {
      const { TokenizeCardParamsSchema } = await import('../types')
      expect(TokenizeCardParamsSchema).toBeDefined()
    })

    it('should export CancelSubscriptionParams type', async () => {
      const { CancelSubscriptionParamsSchema } = await import('../types')
      expect(CancelSubscriptionParamsSchema).toBeDefined()
    })
  })

  describe('Result Types', () => {
    it('should export CreateCustomerResult type', async () => {
      const { CreateCustomerResultSchema } = await import('../types')
      expect(CreateCustomerResultSchema).toBeDefined()
    })

    it('should export CreateSubscriptionResult type', async () => {
      const { CreateSubscriptionResultSchema } = await import('../types')
      expect(CreateSubscriptionResultSchema).toBeDefined()
    })

    it('should export TokenizeCardResult type', async () => {
      const { TokenizeCardResultSchema } = await import('../types')
      expect(TokenizeCardResultSchema).toBeDefined()
    })

    it('should export PaymentResult type', async () => {
      const { PaymentResultSchema } = await import('../types')
      expect(PaymentResultSchema).toBeDefined()
    })
  })

  describe('Zod Schema Validation', () => {
    it('should validate CreateCustomerParams correctly', async () => {
      const { CreateCustomerParamsSchema } = await import('../types')

      const validData = {
        email: 'test@example.com',
        name: 'Test User',
        taxId: '12345678900',
        phone: '11999999999',
      }

      const result = CreateCustomerParamsSchema.safeParse(validData)
      expect(result.success).toBe(true)
    })

    it('should reject invalid CreateCustomerParams', async () => {
      const { CreateCustomerParamsSchema } = await import('../types')

      const invalidData = {
        email: 'invalid-email',
        name: 'Test User',
      }

      const result = CreateCustomerParamsSchema.safeParse(invalidData)
      expect(result.success).toBe(false)
    })

    it('should validate CreateSubscriptionParams correctly', async () => {
      const { CreateSubscriptionParamsSchema } = await import('../types')

      const validData = {
        customerId: 'cus_123',
        planId: 'plan_123',
        interval: 'monthly',
        billingType: 'credit_card',
      }

      const result = CreateSubscriptionParamsSchema.safeParse(validData)
      expect(result.success).toBe(true)
    })

    it('should validate TokenizeCardParams correctly', async () => {
      const { TokenizeCardParamsSchema } = await import('../types')

      const validData = {
        cardNumber: '4111111111111111',
        cardHolder: 'Test User',
        expiryMonth: '12',
        expiryYear: '2025',
        cvv: '123',
        customerId: 'cus_123',
      }

      const result = TokenizeCardParamsSchema.safeParse(validData)
      expect(result.success).toBe(true)
    })
  })
})
