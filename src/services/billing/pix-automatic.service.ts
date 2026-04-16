import { prisma } from '@/lib/db/prisma'
import { BillingPaymentMethod } from '@prisma/client'
import { BillingCatalogService } from './catalog.service'
import { BillingCustomerService } from './customer.service'
import { AsaasClient } from './asaas-client'
import { BillingAuditService } from './audit.service'
import { billingLog } from './logger'

function todayDateString() {
  return new Date().toISOString().split('T')[0]
}

function formatCurrency(value: number): string {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  }).format(value)
}

export class PixAutomaticService {
  static async createAuthorization(params: {
    organizationId: string
    cpfCnpj: string
    planCode: 'monthly' | 'annual'
  }) {
    const plan = await BillingCatalogService.getPlan(params.planCode)
    if (plan.code !== 'monthly') {
      throw new Error('PIX automático disponível apenas no plano mensal')
    }

    const pixOffer = plan.offers.find((o) => o.paymentMethod === BillingPaymentMethod.PIX_AUTOMATIC)
    if (!pixOffer) {
      throw new Error('Oferta PIX Automático não disponível para este plano')
    }

    billingLog('info', 'Starting PIX Automático Authorization', {
      organizationId: params.organizationId,
      planCode: params.planCode,
    })

    const organization = await prisma.organization.findUnique({
      where: { id: params.organizationId },
      select: { id: true, companyName: true, asaasCustomerId: true },
    })

    if (!organization) throw new Error('Organization not found')

    let customerId = organization.asaasCustomerId
    if (!customerId) {
      const newCustomer = await BillingCustomerService.createOrGetAsaasCustomer({
        organizationId: params.organizationId,
        cpfCnpj: params.cpfCnpj,
      })
      customerId = newCustomer
    } else {
      await BillingCustomerService.updateAsaasCustomer(customerId, {
        cpfCnpj: params.cpfCnpj,
      })
    }

    const nextMonth = new Date()
    nextMonth.setMonth(nextMonth.getMonth() + 1)

    const contractId = `WHATRACK-SUB-${params.organizationId.substring(0, 8).toUpperCase()}-${Date.now().toString().slice(-6)}`

    const amount = Number(pixOffer.amount)
    const authResponse = await AsaasClient.post<any>('/pix/automatic/authorizations', {
      customerId,
      frequency: 'MONTHLY',
      contractId,
      startDate: nextMonth.toISOString().split('T')[0],
      value: amount,
      description: `WhaTrack ${plan.name} - PIX Automático`,
      immediateQrCode: {
        expirationSeconds: 3600,
        originalValue: amount,
        description: `Primeira parcela ${plan.name}`,
      },
    })

    const subscription = await prisma.billingSubscription.upsert({
      where: { organizationId: params.organizationId },
      create: {
        organizationId: params.organizationId,
        offerId: pixOffer.id,
        asaasId: authResponse.id,
        asaasCustomerId: customerId,
        paymentMethod: BillingPaymentMethod.PIX_AUTOMATIC,
        status: 'PENDING',
        isActive: false,
      },
      update: {
        offerId: pixOffer.id,
        asaasId: authResponse.id,
        asaasCustomerId: customerId,
        paymentMethod: BillingPaymentMethod.PIX_AUTOMATIC,
        status: 'PENDING',
        isActive: false,
      },
    })

    await BillingAuditService.log({
      organizationId: params.organizationId,
      actor: 'SYSTEM',
      action: 'PIX_AUTOMATIC_INITIATED',
      entity: 'BillingSubscription',
      entityId: subscription.id,
      metadata: {
        asaasAuthId: authResponse.id,
        planCode: plan.code,
        amount,
      },
    })

    return {
      subscriptionId: subscription.id,
      authorizationId: authResponse.id,
      qrCodePayload: authResponse.payload,
      qrCodeImage: authResponse.encodedImage,
      expirationDate: authResponse.immediateQrCode?.expirationDate ?? todayDateString(),
      amountLabel: formatCurrency(amount),
    }
  }

  static async getAuthorizationStatus(authorizationId: string, organizationId: string) {
    const subscription = await prisma.billingSubscription.findFirst({
      where: { asaasId: authorizationId, organizationId },
      select: { status: true, asaasId: true, pixAutomaticAuthId: true },
    })

    if (!subscription) throw new Error('Authorization not found')
    return subscription
  }

  static async getAuthorizationStatusById(authorizationId: string) {
    const subscription = await prisma.billingSubscription.findFirst({
      where: { asaasId: authorizationId },
      select: { status: true, asaasId: true, organizationId: true },
    })

    if (!subscription) throw new Error('Authorization not found')
    return subscription
  }
}
