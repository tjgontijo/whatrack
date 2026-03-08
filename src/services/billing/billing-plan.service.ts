import { Prisma } from '@db/client'

import { prisma } from '@/lib/db/prisma'
import { auditService } from '@/services/audit/audit.service'
import type {
  BillingPlanCreateInput,
  BillingPlanUpdateInput,
} from '@/schemas/billing/billing-plan-schemas'
import { getBillingPlanDetail } from './billing-plan-query.service'

export class BillingPlanMutationError extends Error {
  constructor(
    message: string,
    public readonly status: number,
  ) {
    super(message)
    this.name = 'BillingPlanMutationError'
  }
}

function buildPlanMetadata(input: {
  subtitle?: string | null
  cta?: string | null
  trialDays?: number
  features?: string[]
  additionals?: string[]
}) {
  return {
    subtitle: input.subtitle ?? null,
    cta: input.cta ?? null,
    trialDays: input.trialDays ?? 7,
    features: input.features ?? [],
    additionals: input.additionals ?? [],
  }
}

function isStripeRelevantChange(
  existing: {
    name: string
    slug: string
    description: string | null
    monthlyPrice: Prisma.Decimal
    currency: string
    isActive: boolean
    contactSalesOnly: boolean
  },
  incoming: BillingPlanUpdateInput,
) {
  return (
    (incoming.name !== undefined && incoming.name !== existing.name) ||
    (incoming.slug !== undefined && incoming.slug !== existing.slug) ||
    (incoming.description !== undefined && incoming.description !== existing.description) ||
    (incoming.monthlyPrice !== undefined &&
      Number(incoming.monthlyPrice) !== Number(existing.monthlyPrice)) ||
    (incoming.currency !== undefined &&
      incoming.currency.toUpperCase() !== existing.currency.toUpperCase()) ||
    (incoming.isActive !== undefined && incoming.isActive !== existing.isActive) ||
    (incoming.contactSalesOnly !== undefined &&
      incoming.contactSalesOnly !== existing.contactSalesOnly)
  )
}

export async function createBillingPlan(input: BillingPlanCreateInput, userId: string) {
  const existing = await prisma.billingPlan.findFirst({
    where: {
      OR: [{ slug: input.slug }, { name: input.name }],
    },
    select: { id: true },
  })

  if (existing) {
    throw new BillingPlanMutationError('Já existe um plano com este nome ou slug', 409)
  }

  const plan = await prisma.billingPlan.create({
    data: {
      name: input.name,
      slug: input.slug,
      description: input.description ?? null,
      monthlyPrice: new Prisma.Decimal(input.monthlyPrice),
      currency: input.currency.toUpperCase(),
      eventLimitPerMonth: input.eventLimitPerMonth,
      overagePricePerEvent: new Prisma.Decimal(input.overagePricePerEvent),
      maxWhatsAppNumbers: input.maxWhatsAppNumbers,
      maxAdAccounts: input.maxAdAccounts,
      maxTeamMembers: input.maxTeamMembers,
      supportLevel: input.supportLevel,
      displayOrder: input.displayOrder,
      isActive: input.isActive,
      isHighlighted: input.isHighlighted,
      contactSalesOnly: input.contactSalesOnly,
      syncStatus: input.contactSalesOnly ? 'pending' : 'pending',
      metadata: buildPlanMetadata(input),
      createdBy: userId,
    },
  })

  await auditService.log({
    userId,
    action: 'billing-plan.created',
    resourceType: 'billing-plan',
    resourceId: plan.id,
    after: {
      name: plan.name,
      slug: plan.slug,
      monthlyPrice: plan.monthlyPrice.toString(),
      currency: plan.currency,
      eventLimitPerMonth: plan.eventLimitPerMonth,
      overagePricePerEvent: plan.overagePricePerEvent.toString(),
      metadata: plan.metadata,
    },
  })

  return getBillingPlanDetail(plan.id)
}

export async function updateBillingPlan(
  planId: string,
  input: BillingPlanUpdateInput,
  userId: string,
) {
  const existing = await prisma.billingPlan.findUnique({
    where: { id: planId },
    select: {
      id: true,
      name: true,
      slug: true,
      description: true,
      monthlyPrice: true,
      currency: true,
      eventLimitPerMonth: true,
      overagePricePerEvent: true,
      maxWhatsAppNumbers: true,
      maxAdAccounts: true,
      maxTeamMembers: true,
      supportLevel: true,
      displayOrder: true,
      isActive: true,
      isHighlighted: true,
      contactSalesOnly: true,
      stripeProductId: true,
      stripePriceId: true,
      syncStatus: true,
      metadata: true,
      deletedAt: true,
    },
  })

  if (!existing) {
    throw new BillingPlanMutationError('Plano não encontrado', 404)
  }

  if (input.slug || input.name) {
    const conflict = await prisma.billingPlan.findFirst({
      where: {
        id: { not: planId },
        OR: [
          ...(input.slug ? [{ slug: input.slug }] : []),
          ...(input.name ? [{ name: input.name }] : []),
        ],
      },
      select: { id: true },
    })

    if (conflict) {
      throw new BillingPlanMutationError('Já existe um plano com este nome ou slug', 409)
    }
  }

  const nextMetadata = buildPlanMetadata({
    subtitle: input.subtitle ?? undefined,
    cta: input.cta ?? undefined,
    trialDays: input.trialDays ?? undefined,
    features: input.features ?? undefined,
    additionals: input.additionals ?? undefined,
  })

  const shouldResetSync = isStripeRelevantChange(existing, input)

  await prisma.billingPlan.update({
    where: { id: planId },
    data: {
      ...(input.name !== undefined ? { name: input.name } : {}),
      ...(input.slug !== undefined ? { slug: input.slug } : {}),
      ...(input.description !== undefined ? { description: input.description ?? null } : {}),
      ...(input.monthlyPrice !== undefined
        ? { monthlyPrice: new Prisma.Decimal(input.monthlyPrice) }
        : {}),
      ...(input.currency !== undefined ? { currency: input.currency.toUpperCase() } : {}),
      ...(input.eventLimitPerMonth !== undefined
        ? { eventLimitPerMonth: input.eventLimitPerMonth }
        : {}),
      ...(input.overagePricePerEvent !== undefined
        ? { overagePricePerEvent: new Prisma.Decimal(input.overagePricePerEvent) }
        : {}),
      ...(input.maxWhatsAppNumbers !== undefined
        ? { maxWhatsAppNumbers: input.maxWhatsAppNumbers }
        : {}),
      ...(input.maxAdAccounts !== undefined ? { maxAdAccounts: input.maxAdAccounts } : {}),
      ...(input.maxTeamMembers !== undefined ? { maxTeamMembers: input.maxTeamMembers } : {}),
      ...(input.supportLevel !== undefined ? { supportLevel: input.supportLevel } : {}),
      ...(input.displayOrder !== undefined ? { displayOrder: input.displayOrder } : {}),
      ...(input.isActive !== undefined ? { isActive: input.isActive } : {}),
      ...(input.isHighlighted !== undefined ? { isHighlighted: input.isHighlighted } : {}),
      ...(input.contactSalesOnly !== undefined
        ? { contactSalesOnly: input.contactSalesOnly }
        : {}),
      metadata: nextMetadata,
      ...(shouldResetSync
        ? {
            syncStatus: 'pending',
            syncError: null,
            syncedAt: null,
          }
        : {}),
    },
  })

  await auditService.log({
    userId,
    action: 'billing-plan.updated',
    resourceType: 'billing-plan',
    resourceId: planId,
    before: {
      ...existing,
      monthlyPrice: existing.monthlyPrice.toString(),
      overagePricePerEvent: existing.overagePricePerEvent.toString(),
    },
    after: input,
    metadata: {
      syncReset: shouldResetSync,
    },
  })

  return getBillingPlanDetail(planId)
}

export async function archiveBillingPlan(planId: string, userId: string) {
  const existing = await prisma.billingPlan.findUnique({
    where: { id: planId },
    select: {
      id: true,
      name: true,
      slug: true,
      deletedAt: true,
      isActive: true,
    },
  })

  if (!existing) {
    throw new BillingPlanMutationError('Plano não encontrado', 404)
  }

  if (existing.deletedAt) {
    throw new BillingPlanMutationError('Plano já arquivado', 409)
  }

  await prisma.billingPlan.update({
    where: { id: planId },
    data: {
      isActive: false,
      deletedAt: new Date(),
    },
  })

  await auditService.log({
    userId,
    action: 'billing-plan.archived',
    resourceType: 'billing-plan',
    resourceId: planId,
    before: existing,
    after: {
      isActive: false,
      deletedAt: true,
    },
  })

  return getBillingPlanDetail(planId)
}
