import "server-only"
import type {
  AccountOrganizationSummary,
  AccountProfileSummary,
  AccountSummary,
} from '@/features/account/types/account-summary'
import type { SubscriptionResponse } from '@/features/billing/schemas/billing-schemas'
import {
  getActiveSubscription,
  SubscriptionNotFoundError,
} from '@/features/billing/services/billing-subscription.service'
import { getMeAccount } from '@/features/me/services/me-account.service'
import { getOrganizationMe } from '@/features/organizations/services/organization.service'
import { prisma } from '@/lib/db/prisma'

function toIsoString(value: Date | string) {
  return value instanceof Date ? value.toISOString() : new Date(value).toISOString()
}

function serializeSubscription(
  subscription: NonNullable<Awaited<ReturnType<typeof getActiveSubscription>>>
): SubscriptionResponse {
  return {
    id: subscription.id,
    organizationId: subscription.organizationId,
    planType: subscription.planType as any,
    planName: subscription.planName,
    status: subscription.status as SubscriptionResponse['status'],
    trialEndsAt: subscription.trialEndsAt?.toISOString() ?? null,
    createdAt: subscription.createdAt.toISOString(),
    canceledAt: subscription.canceledAt?.toISOString() ?? null,
    asaasId: subscription.asaasId ?? undefined,
    asaasCustomerId: subscription.asaasCustomerId ?? undefined,
    offerCode: subscription.offerCode ?? undefined,
    paymentMethod: subscription.paymentMethod as SubscriptionResponse['paymentMethod'],
    isActive: subscription.isActive,
    purchaseDate: subscription.purchaseDate?.toISOString() ?? null,
    expiresAt: subscription.expiresAt?.toISOString() ?? null,
    failureReason: (subscription.failureReason as SubscriptionResponse['failureReason']) ?? null,
    failureCount: subscription.failureCount,
    lastFailureAt: subscription.lastFailureAt?.toISOString() ?? null,
    lastFailureMessage: subscription.lastFailureMessage ?? null,
    nextRetryAt: subscription.nextRetryAt?.toISOString() ?? null,
    lastInvoice: subscription.lastInvoice
      ? {
          id: subscription.lastInvoice.id,
          asaasId: subscription.lastInvoice.asaasId,
          status: subscription.lastInvoice.status,
          paymentMethod: subscription.lastInvoice.paymentMethod as NonNullable<
            SubscriptionResponse['lastInvoice']
          >['paymentMethod'],
          value: subscription.lastInvoice.value,
          dueDate: subscription.lastInvoice.dueDate.toISOString(),
          paidAt: subscription.lastInvoice.paidAt?.toISOString() ?? null,
          invoiceUrl: subscription.lastInvoice.invoiceUrl ?? null,
          pixQrCodePayload: subscription.lastInvoice.pixQrCodePayload ?? null,
          pixQrCodeImage: subscription.lastInvoice.pixQrCodeImage ?? null,
          pixExpirationDate: subscription.lastInvoice.pixExpirationDate?.toISOString() ?? null,
        }
      : null,
  }
}

function serializeAccount(
  account: Awaited<ReturnType<typeof getMeAccount>>
): AccountProfileSummary | null {
  if (!account) return null

  return {
    id: account.id,
    name: account.name,
    email: account.email,
    phone: account.phone,
    updatedAt: toIsoString(account.updatedAt),
  }
}

function serializeOrganization(
  organization: Awaited<ReturnType<typeof getOrganizationMe>>
): AccountOrganizationSummary | null {
  if (!organization || 'error' in organization) return null

  return {
    id: organization.id,
    name: organization.name,
    organizationType: organization.organizationType,
    documentType: organization.documentType,
    documentNumber: organization.documentNumber,
    legalName: organization.legalName,
    tradeName: organization.tradeName,
    taxStatus: organization.taxStatus,
    city: organization.city,
    state: organization.state,
    currentUserRole: organization.currentUserRole,
    updatedAt: toIsoString(organization.updatedAt),
  }
}

export async function getAccountSummary(input: {
  userId: string
  organizationId?: string | null
}): Promise<AccountSummary> {
  const account = serializeAccount(await getMeAccount(input.userId))

  if (!input.organizationId) {
    return {
      account,
      organization: null,
      subscription: null,
    }
  }

  const membership = await prisma.member.findFirst({
    where: {
      userId: input.userId,
      organizationId: input.organizationId,
    },
    select: {
      id: true,
      role: true,
    },
  })

  if (!membership) {
    return {
      account,
      organization: null,
      subscription: null,
    }
  }

  const [organizationResult, subscription] = await Promise.all([
    getOrganizationMe({
      organizationId: input.organizationId,
      memberId: membership.id,
      role: membership.role,
    }),
    getActiveSubscription(input.organizationId).catch((error) => {
      if (error instanceof SubscriptionNotFoundError) {
        return null
      }

      throw error
    }),
  ])

  return {
    account,
    organization: serializeOrganization(organizationResult),
    subscription: subscription ? serializeSubscription(subscription) : null,
  }
}
