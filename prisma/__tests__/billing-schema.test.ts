import { describe, expect, it, beforeAll, afterAll } from 'vitest'
import { PrismaClient, Prisma } from '@prisma/client'

let prisma: PrismaClient

beforeAll(async () => {
  prisma = new PrismaClient()
})

afterAll(async () => {
  await prisma.$disconnect()
})

/**
 * RED Phase: Este teste deve FALHAR porque os models ainda não existem no schema.
 *
 * Models a serem criados:
 * - Plan: Planos disponíveis (Free, Starter, Pro, Business)
 * - PlanPrice: Preços por provider/currency/interval
 * - BillingCustomer: Cliente de billing vinculado à Organization
 * - BillingCustomerExternal: IDs externos por provider
 * - PaymentMethodStored: Métodos de pagamento tokenizados
 */
describe('Billing Core Models - Schema Validation', () => {
  it('should have Plan model with required fields', async () => {
    expect(prisma.plan).toBeDefined()
  })

  it('should have PlanPrice model', async () => {
    expect(prisma.planPrice).toBeDefined()
  })

  it('should have BillingCustomer model', async () => {
    expect(prisma.billingCustomer).toBeDefined()
  })

  it('should have BillingCustomerExternal model', async () => {
    expect(prisma.billingCustomerExternal).toBeDefined()
  })

  it('should have PaymentMethodStored model', async () => {
    expect(prisma.paymentMethodStored).toBeDefined()
  })
})

/**
 * RED Phase: Este teste deve FALHAR porque os models ainda não existem no schema.
 *
 * Models:
 * - Subscription: Assinatura ativa do cliente
 * - Invoice: Fatura gerada
 * - InvoiceItem: Itens da fatura
 * - Payment: Pagamento realizado
 * - WebhookEvent: Eventos de webhook processados
 */
describe('Billing Subscription/Payment Models - Schema Validation', () => {
  it('should have Subscription model', async () => {
    expect(prisma.subscription).toBeDefined()
  })

  it('should have Invoice model', async () => {
    expect(prisma.invoice).toBeDefined()
  })

  it('should have InvoiceItem model', async () => {
    expect(prisma.invoiceItem).toBeDefined()
  })

  it('should have Payment model', async () => {
    expect(prisma.payment).toBeDefined()
  })

  it('should have WebhookEvent model', async () => {
    expect(prisma.webhookEvent).toBeDefined()
  })
})

/**
 * RED Phase: Organization Billing Fields
 *
 * Verifica que Organization tem o campo currentPlanId
 * para vincular o plano atual da organização.
 */
describe('Organization Billing Fields - Schema Validation', () => {
  it('should have currentPlanId field in Organization', async () => {
    const organizationFields = Prisma.OrganizationScalarFieldEnum

    expect(organizationFields).toHaveProperty('currentPlanId')
  })

  it('should allow including currentPlan relation', async () => {
    const query = prisma.organization.findFirst({
      include: {
        currentPlan: true,
        billingCustomer: true,
      },
    })

    expect(query).toBeDefined()
  })
})

/**
 * RED Phase: Billing Seed Data Test
 *
 * Verifica que o seed de billing cria os planos corretamente:
 * - Free, Starter, Pro, Business
 * - Preços em BRL para Asaas (monthly e yearly)
 */
describe('Billing Seed Data', () => {
  it('should have seedBillingPlans function exported', async () => {
    const { seedBillingPlans } = await import(
      '../seeds/seed-billing'
    )
    expect(seedBillingPlans).toBeDefined()
    expect(typeof seedBillingPlans).toBe('function')
  })

  it('should have BILLING_PLANS constant with 4 plans', async () => {
    const { BILLING_PLANS } = await import(
      '../seeds/seed-billing'
    )

    expect(BILLING_PLANS).toBeDefined()
    expect(Array.isArray(BILLING_PLANS)).toBe(true)
    expect(BILLING_PLANS).toHaveLength(4)

    const slugs = BILLING_PLANS.map((p: { slug: string }) => p.slug)
    expect(slugs).toContain('free')
    expect(slugs).toContain('starter')
    expect(slugs).toContain('pro')
    expect(slugs).toContain('business')
  })

  it('should have correct price structure for each plan', async () => {
    const { BILLING_PLANS } = await import(
      '../seeds/seed-billing'
    )

    for (const plan of BILLING_PLANS) {
      if (plan.slug === 'free') {
        expect(plan.prices || []).toHaveLength(0)
        continue
      }

      expect(plan.prices).toBeDefined()
      expect(plan.prices).toHaveLength(2)

      const monthly = plan.prices.find(
        (p: { interval: string }) => p.interval === 'monthly'
      )
      const yearly = plan.prices.find(
        (p: { interval: string }) => p.interval === 'yearly'
      )

      expect(monthly).toBeDefined()
      expect(yearly).toBeDefined()
      expect(monthly?.provider).toBe('asaas')
      expect(yearly?.provider).toBe('asaas')
      expect(monthly?.currency).toBe('BRL')
      expect(yearly?.currency).toBe('BRL')
      expect(monthly?.amountCents).toBeGreaterThan(0)
      expect(yearly?.amountCents).toBeGreaterThan(monthly?.amountCents ?? 0)
    }
  })
})

/**
 * RED Phase: Este teste deve FALHAR porque os enums ainda não existem no schema.
 *
 * Enums a serem criados:
 * - PlanInterval: monthly, yearly
 * - SubscriptionStatus: incomplete, trialing, active, past_due, unpaid, canceled, paused
 * - PaymentStatus: pending, processing, succeeded, failed, refunded, canceled
 * - PaymentMethod: credit_card, debit_card, pix, boleto, bank_transfer, wallet
 * - BillingProvider: asaas, stripe, mercadopago, manual
 */
describe('Billing Enums - Schema Validation', () => {
  it('should export PlanInterval enum with correct values', async () => {
    const { PlanInterval } = await import('@prisma/client')

    expect(PlanInterval).toBeDefined()
    expect(PlanInterval.monthly).toBe('monthly')
    expect(PlanInterval.yearly).toBe('yearly')
  })

  it('should export SubscriptionStatus enum with correct values', async () => {
    const { SubscriptionStatus } = await import('@prisma/client')

    expect(SubscriptionStatus).toBeDefined()
    expect(SubscriptionStatus.incomplete).toBe('incomplete')
    expect(SubscriptionStatus.trialing).toBe('trialing')
    expect(SubscriptionStatus.active).toBe('active')
    expect(SubscriptionStatus.past_due).toBe('past_due')
    expect(SubscriptionStatus.unpaid).toBe('unpaid')
    expect(SubscriptionStatus.canceled).toBe('canceled')
    expect(SubscriptionStatus.paused).toBe('paused')
  })

  it('should export PaymentStatus enum with correct values', async () => {
    const { PaymentStatus } = await import('@prisma/client')

    expect(PaymentStatus).toBeDefined()
    expect(PaymentStatus.pending).toBe('pending')
    expect(PaymentStatus.processing).toBe('processing')
    expect(PaymentStatus.succeeded).toBe('succeeded')
    expect(PaymentStatus.failed).toBe('failed')
    expect(PaymentStatus.refunded).toBe('refunded')
    expect(PaymentStatus.canceled).toBe('canceled')
  })

  it('should export PaymentMethod enum with correct values', async () => {
    const { PaymentMethod } = await import('@prisma/client')

    expect(PaymentMethod).toBeDefined()
    expect(PaymentMethod.credit_card).toBe('credit_card')
    expect(PaymentMethod.debit_card).toBe('debit_card')
    expect(PaymentMethod.pix).toBe('pix')
    expect(PaymentMethod.boleto).toBe('boleto')
    expect(PaymentMethod.bank_transfer).toBe('bank_transfer')
    expect(PaymentMethod.wallet).toBe('wallet')
  })

  it('should export BillingProvider enum with correct values', async () => {
    const { BillingProvider } = await import('@prisma/client')

    expect(BillingProvider).toBeDefined()
    expect(BillingProvider.asaas).toBe('asaas')
    expect(BillingProvider.stripe).toBe('stripe')
    expect(BillingProvider.mercadopago).toBe('mercadopago')
    expect(BillingProvider.manual).toBe('manual')
  })
})
