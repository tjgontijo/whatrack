import { prisma } from '@/lib/db/prisma'
import { BillingCatalogService, type BillingCatalogOffer, type BillingCatalogPlanCode } from './catalog.service'
import { BillingCustomerService } from './customer.service'
import { AsaasClient } from './asaas-client'
import { BillingAuditService } from './audit.service'
import { billingLog } from './logger'

type CreditCardInput = {
  holderName: string
  number: string
  expiryMonth: string
  expiryYear: string
  ccv: string
}

type AsaasPayment = {
  id: string
  customer?: string
  status: string
  billingType: string
  value: number
  netValue?: number
  dueDate: string
  description?: string
  paymentDate?: string | null
  confirmedDate?: string | null
  invoiceUrl?: string | null
}

type AsaasSubscription = {
  id: string
}

type AsaasPixQrCode = {
  payload: string
  encodedImage?: string | null
  expirationDate?: string | null
}

function todayDateString() {
  return new Date().toISOString().split('T')[0]
}

function mapAsaasPaymentStatus(status: string) {
  switch (status) {
    case 'RECEIVED':
    case 'CONFIRMED':
    case 'RECEIVED_IN_CASH':
      return 'ACTIVE'
    case 'OVERDUE':
      return 'OVERDUE'
    case 'CANCELED':
    case 'REFUNDED':
      return 'CANCELED'
    default:
      return 'PENDING'
  }
}

function buildDescription(planCode: BillingCatalogPlanCode, paymentMethod: string) {
  if (planCode === 'annual') {
    return paymentMethod === 'PIX' ? 'WhaTrack Anual via PIX' : 'WhaTrack Anual no Cartao'
  }

  return paymentMethod === 'PIX_AUTOMATIC'
    ? 'WhaTrack Mensal com PIX Automatico'
    : 'WhaTrack Mensal no Cartao'
}

function normalizeCard(card: CreditCardInput): CreditCardInput {
  return {
    holderName: card.holderName.trim(),
    number: card.number.replace(/\D/g, ''),
    expiryMonth: card.expiryMonth.replace(/\D/g, ''),
    expiryYear: card.expiryYear.replace(/\D/g, ''),
    ccv: card.ccv.replace(/\D/g, ''),
  }
}

async function getOffer(planCode: BillingCatalogPlanCode, paymentMethod: string) {
  const plan = await BillingCatalogService.getPlan(planCode)
  const offer = plan.offers.find((item) => item.paymentMethod === paymentMethod)

  if (!offer) {
    throw new Error(`Offer not found for ${planCode}/${paymentMethod}`)
  }

  return { plan, offer }
}

async function upsertSubscription(input: {
  organizationId: string
  offer: BillingCatalogOffer
  asaasCustomerId: string
  asaasId: string
  paymentMethod: string
  status: string
  purchaseDate?: Date | null
  expiresAt?: Date | null
  isActive: boolean
  pixAutomaticAuthId?: string | null
  trialEndsAt?: Date | null
}) {
  return prisma.billingSubscription.upsert({
    where: { organizationId: input.organizationId },
    update: {
      offerId: input.offer.id,
      asaasCustomerId: input.asaasCustomerId,
      asaasId: input.asaasId,
      paymentMethod: input.paymentMethod,
      status: input.status,
      isActive: input.isActive,
      purchaseDate: input.purchaseDate ?? null,
      expiresAt: input.expiresAt ?? null,
      trialEndsAt: input.trialEndsAt ?? null,
      failureReason: null,
      failureCount: 0,
      lastFailureAt: null,
      nextRetryAt: null,
      pixAutomaticAuthId: input.pixAutomaticAuthId ?? null,
    },
    create: {
      organizationId: input.organizationId,
      offerId: input.offer.id,
      asaasCustomerId: input.asaasCustomerId,
      asaasId: input.asaasId,
      paymentMethod: input.paymentMethod,
      status: input.status,
      isActive: input.isActive,
      purchaseDate: input.purchaseDate ?? null,
      expiresAt: input.expiresAt ?? null,
      trialEndsAt: input.trialEndsAt ?? null,
      pixAutomaticAuthId: input.pixAutomaticAuthId ?? null,
    },
  })
}

async function upsertInvoice(input: {
  organizationId: string
  subscriptionId: string
  offerId: string
  paymentMethod: string
  payment: AsaasPayment
  pixQrCode?: AsaasPixQrCode | null
}) {
  return prisma.billingInvoice.upsert({
    where: { asaasId: input.payment.id },
    update: {
      subscriptionId: input.subscriptionId,
      offerId: input.offerId,
      status: input.payment.status,
      paymentMethod: input.paymentMethod,
      value: input.payment.value,
      netValue: input.payment.netValue ?? null,
      description: input.payment.description ?? null,
      billingType: input.payment.billingType,
      dueDate: new Date(input.payment.dueDate),
      paidAt: input.payment.paymentDate
        ? new Date(input.payment.paymentDate)
        : input.payment.confirmedDate
          ? new Date(input.payment.confirmedDate)
          : null,
      invoiceUrl: input.payment.invoiceUrl ?? null,
      pixQrCodePayload: input.pixQrCode?.payload ?? null,
      pixQrCodeImage: input.pixQrCode?.encodedImage ?? null,
      pixExpirationDate: input.pixQrCode?.expirationDate ? new Date(input.pixQrCode.expirationDate) : null,
    },
    create: {
      organizationId: input.organizationId,
      subscriptionId: input.subscriptionId,
      offerId: input.offerId,
      asaasId: input.payment.id,
      status: input.payment.status,
      paymentMethod: input.paymentMethod,
      value: input.payment.value,
      netValue: input.payment.netValue ?? null,
      description: input.payment.description ?? null,
      billingType: input.payment.billingType,
      dueDate: new Date(input.payment.dueDate),
      paidAt: input.payment.paymentDate
        ? new Date(input.payment.paymentDate)
        : input.payment.confirmedDate
          ? new Date(input.payment.confirmedDate)
          : null,
      invoiceUrl: input.payment.invoiceUrl ?? null,
      pixQrCodePayload: input.pixQrCode?.payload ?? null,
      pixQrCodeImage: input.pixQrCode?.encodedImage ?? null,
      pixExpirationDate: input.pixQrCode?.expirationDate ? new Date(input.pixQrCode.expirationDate) : null,
    },
  })
}

function buildExpiration(planCode: BillingCatalogPlanCode, baseDate = new Date()) {
  const expiresAt = new Date(baseDate)

  if (planCode === 'annual') {
    expiresAt.setFullYear(expiresAt.getFullYear() + 1)
  } else {
    expiresAt.setMonth(expiresAt.getMonth() + 1)
  }

  return expiresAt
}

function buildTrialEndDate(baseDate = new Date()) {
  const trialEnds = new Date(baseDate)
  trialEnds.setDate(trialEnds.getDate() + 14) // 14 days trial
  return trialEnds
}

function buildNextDueDateWithTrial(baseDate = new Date()) {
  const nextDueDate = new Date(baseDate)
  nextDueDate.setDate(nextDueDate.getDate() + 14) // Start billing after trial
  return nextDueDate.toISOString().split('T')[0]
}

export class BillingPaymentService {
  static async createCreditCardCheckout(input: {
    organizationId: string
    userId: string
    cpfCnpj: string
    planCode: BillingCatalogPlanCode
    installments: number
    creditCard: CreditCardInput
    remoteIp?: string
  }) {
    const { plan, offer } = await getOffer(input.planCode, 'CREDIT_CARD')
    const customer = await BillingCustomerService.ensureCustomer({
      organizationId: input.organizationId,
      userId: input.userId,
      cpfCnpj: input.cpfCnpj,
    })
    const card = normalizeCard(input.creditCard)
    const description = buildDescription(plan.code, 'CREDIT_CARD')

    if (plan.code === 'monthly') {
      const now = new Date()
      const trialEndsAt = buildTrialEndDate(now)
      const nextDueDate = buildNextDueDateWithTrial(now)

      const asaasSubscription = await AsaasClient.post<AsaasSubscription>('/subscriptions', {
        customer: customer.asaasCustomerId,
        billingType: 'CREDIT_CARD',
        cycle: 'MONTHLY',
        value: offer.amount,
        nextDueDate,
        description,
        externalReference: input.organizationId,
        remoteIp: input.remoteIp,
        creditCard: card,
        creditCardHolderInfo: {
          name: customer.name,
          email: customer.email,
          cpfCnpj: input.cpfCnpj,
          phone: customer.phone,
        },
      })

      const paymentList = await AsaasClient.get<{ data: AsaasPayment[] }>(
        `/subscriptions/${asaasSubscription.id}/payments`,
      )
      const firstPayment = paymentList.data[0]

      if (!firstPayment) {
        throw new Error('Asaas did not return the first subscription payment')
      }

      const expiresAt = buildExpiration(plan.code, now)
      const status = mapAsaasPaymentStatus(firstPayment.status)
      const subscription = await upsertSubscription({
        organizationId: input.organizationId,
        offer,
        asaasCustomerId: customer.asaasCustomerId!,
        asaasId: asaasSubscription.id,
        paymentMethod: 'CREDIT_CARD',
        status,
        purchaseDate: status === 'ACTIVE' ? now : null,
        expiresAt: status === 'ACTIVE' ? expiresAt : null,
        isActive: status === 'ACTIVE',
        trialEndsAt: trialEndsAt,
      })
      const invoice = await upsertInvoice({
        organizationId: input.organizationId,
        subscriptionId: subscription.id,
        offerId: offer.id,
        paymentMethod: 'CREDIT_CARD',
        payment: firstPayment,
      })

      await BillingAuditService.log({
        organizationId: input.organizationId,
        userId: input.userId,
        action: 'CHECKOUT_CREDIT_CARD_CREATED',
        entity: 'BillingSubscription',
        entityId: subscription.id,
        asaasPaymentId: firstPayment.id,
        metadata: { planCode: plan.code, offerCode: offer.code },
      })

      return {
        provider: 'asaas' as const,
        subscriptionId: subscription.id,
        invoiceId: invoice.id,
        status,
        paymentMethod: 'CREDIT_CARD' as const,
        requiresAction: status !== 'ACTIVE',
      }
    }

    const payment = await AsaasClient.post<AsaasPayment>('/payments', {
      customer: customer.asaasCustomerId,
      billingType: 'CREDIT_CARD',
      value: offer.amount,
      dueDate: todayDateString(),
      description,
      externalReference: input.organizationId,
      installmentCount: input.installments,
      totalValue: offer.amount,
      remoteIp: input.remoteIp,
      creditCard: card,
      creditCardHolderInfo: {
        name: customer.name,
        email: customer.email,
        cpfCnpj: input.cpfCnpj,
        phone: customer.phone,
      },
    })

    const now = new Date()
    const expiresAt = buildExpiration(plan.code, now)
    const status = mapAsaasPaymentStatus(payment.status)
    const subscription = await upsertSubscription({
      organizationId: input.organizationId,
      offer,
      asaasCustomerId: customer.asaasCustomerId!,
      asaasId: payment.id,
      paymentMethod: 'CREDIT_CARD',
      status,
      purchaseDate: status === 'active' ? now : null,
      expiresAt: status === 'active' ? expiresAt : null,
      isActive: status === 'active',
    })
    const invoice = await upsertInvoice({
      organizationId: input.organizationId,
      subscriptionId: subscription.id,
      offerId: offer.id,
      paymentMethod: 'CREDIT_CARD',
      payment,
    })

    await BillingAuditService.log({
      organizationId: input.organizationId,
      userId: input.userId,
      action: 'CHECKOUT_CREDIT_CARD_CREATED',
      entity: 'BillingInvoice',
      entityId: invoice.id,
      asaasPaymentId: payment.id,
      metadata: { planCode: plan.code, offerCode: offer.code, installments: input.installments },
    })

    return {
      provider: 'asaas' as const,
      subscriptionId: subscription.id,
      invoiceId: invoice.id,
      status,
      paymentMethod: 'CREDIT_CARD' as const,
      requiresAction: status !== 'active',
    }
  }

  static async createPixCheckout(input: {
    organizationId: string
    userId: string
    cpfCnpj: string
    planCode: 'annual'
  }) {
    const { plan, offer } = await getOffer(input.planCode, 'PIX')
    const customer = await BillingCustomerService.ensureCustomer({
      organizationId: input.organizationId,
      userId: input.userId,
      cpfCnpj: input.cpfCnpj,
    })
    const payment = await AsaasClient.post<AsaasPayment>('/payments', {
      customer: customer.asaasCustomerId,
      billingType: 'PIX',
      value: offer.amount,
      dueDate: todayDateString(),
      description: buildDescription(plan.code, 'PIX'),
      externalReference: input.organizationId,
    })
    const qrCode = await AsaasClient.get<AsaasPixQrCode>(`/payments/${payment.id}/pixQrCode`)

    const now = new Date()
    const expiresAt = buildExpiration(plan.code, now)
    const status = mapAsaasPaymentStatus(payment.status)
    const subscription = await upsertSubscription({
      organizationId: input.organizationId,
      offer,
      asaasCustomerId: customer.asaasCustomerId!,
      asaasId: payment.id,
      paymentMethod: 'PIX',
      status,
      purchaseDate: status === 'active' ? now : null,
      expiresAt: status === 'active' ? expiresAt : null,
      isActive: status === 'active',
    })
    const invoice = await upsertInvoice({
      organizationId: input.organizationId,
      subscriptionId: subscription.id,
      offerId: offer.id,
      paymentMethod: 'PIX',
      payment,
      pixQrCode: qrCode,
    })

    await BillingAuditService.log({
      organizationId: input.organizationId,
      userId: input.userId,
      action: 'CHECKOUT_PIX_CREATED',
      entity: 'BillingInvoice',
      entityId: invoice.id,
      asaasPaymentId: payment.id,
      metadata: { planCode: plan.code, offerCode: offer.code },
    })

    return {
      provider: 'asaas' as const,
      subscriptionId: subscription.id,
      invoiceId: invoice.id,
      status,
      paymentMethod: 'PIX' as const,
      requiresAction: true,
      pix: {
        qrCodePayload: qrCode.payload,
        qrCodeImage: qrCode.encodedImage ?? null,
        expirationDate: qrCode.expirationDate ?? null,
      },
    }
  }

  static async createPixAutomaticCheckout(input: {
    organizationId: string
    userId: string
    cpfCnpj: string
    planCode: 'monthly'
  }) {
    const { plan, offer } = await getOffer(input.planCode, 'PIX_AUTOMATIC')
    const customer = await BillingCustomerService.ensureCustomer({
      organizationId: input.organizationId,
      userId: input.userId,
      cpfCnpj: input.cpfCnpj,
    })

    const nextMonth = new Date()
    nextMonth.setMonth(nextMonth.getMonth() + 1)

    const authorization = await AsaasClient.post<{
      id: string
      payload: string
      encodedImage?: string | null
      immediateQrCode?: { expirationDate?: string | null }
    }>('/pix/automatic/authorizations', {
      customerId: customer.asaasCustomerId,
      frequency: 'MONTHLY',
      contractId: `WHATRACK-${input.organizationId.slice(0, 8)}-${Date.now()}`,
      startDate: nextMonth.toISOString().split('T')[0],
      value: offer.amount,
      description: buildDescription(plan.code, 'PIX_AUTOMATIC'),
      immediateQrCode: {
        expirationSeconds: 3600,
        originalValue: offer.amount,
        description: 'Primeira autorizacao do PIX Automatico',
      },
    })

    const now = new Date()
    const subscription = await upsertSubscription({
      organizationId: input.organizationId,
      offer,
      asaasCustomerId: customer.asaasCustomerId!,
      asaasId: authorization.id,
      paymentMethod: 'PIX_AUTOMATIC',
      status: 'PENDING',
      purchaseDate: null,
      expiresAt: null,
      isActive: false,
      pixAutomaticAuthId: authorization.id,
    })

    await BillingAuditService.log({
      organizationId: input.organizationId,
      userId: input.userId,
      action: 'CHECKOUT_PIX_AUTOMATIC_CREATED',
      entity: 'BillingSubscription',
      entityId: subscription.id,
      metadata: { planCode: plan.code, offerCode: offer.code, authorizationId: authorization.id },
    })

    return {
      provider: 'asaas' as const,
      subscriptionId: subscription.id,
      invoiceId: null,
      status: 'pending' as const,
      paymentMethod: 'PIX_AUTOMATIC' as const,
      requiresAction: true,
      pixAutomatic: {
        authorizationId: authorization.id,
        qrCodePayload: authorization.payload,
        qrCodeImage: authorization.encodedImage ?? null,
        expirationDate: authorization.immediateQrCode?.expirationDate ?? null,
      },
    }
  }

  static async syncPaymentFromWebhook(payment: AsaasPayment) {
    const invoice = await prisma.billingInvoice.findUnique({
      where: { asaasId: payment.id },
      select: {
        id: true,
        subscriptionId: true,
        offerId: true,
        organizationId: true,
      },
    })

    if (!invoice) {
      billingLog('warn', 'Webhook payment could not be matched to an invoice', { paymentId: payment.id })
      return
    }

    const nextStatus = mapAsaasPaymentStatus(payment.status)
    const paidAt = payment.paymentDate
      ? new Date(payment.paymentDate)
      : payment.confirmedDate
        ? new Date(payment.confirmedDate)
        : null

    await prisma.billingInvoice.update({
      where: { id: invoice.id },
      data: {
        status: payment.status,
        paidAt,
        netValue: payment.netValue ?? null,
        invoiceUrl: payment.invoiceUrl ?? null,
      },
    })

    if (invoice.subscriptionId) {
      const subscription = await prisma.billingSubscription.findUnique({
        where: { id: invoice.subscriptionId },
        select: {
          id: true,
          offer: { select: { plan: { select: { code: true } } } },
        },
      })

      if (subscription) {
        const now = paidAt ?? new Date()
        const planCode = subscription.offer?.plan.code === 'YEARLY' ? 'annual' : 'monthly'
        const expiresAt = buildExpiration(planCode, now)

        await prisma.billingSubscription.update({
          where: { id: subscription.id },
          data: {
            status: nextStatus,
            isActive: nextStatus === 'ACTIVE',
            purchaseDate: nextStatus === 'ACTIVE' ? now : undefined,
            expiresAt: nextStatus === 'ACTIVE' ? expiresAt : undefined,
            failureReason: nextStatus === 'OVERDUE' ? 'FAILED_DEBIT' : null,
            failureCount: nextStatus === 'OVERDUE' ? { increment: 1 } : undefined,
            lastFailureAt: nextStatus === 'OVERDUE' ? new Date() : null,
          },
        })
      }
    }
  }
}
