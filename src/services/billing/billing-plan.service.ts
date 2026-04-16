import { Prisma } from '@generated/prisma/client'

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
    slug: undefined,
    description: undefined,
    kind: undefined,
    addonType: undefined,
    monthlyPrice: undefined,
    subtitle: input.subtitle ?? null,
    cta: input.cta ?? null,
    trialDays: input.trialDays ?? 14,
    features: input.features ?? [],
    additionals: input.additionals ?? [],
  }
}

export async function createBillingPlan(input: BillingPlanCreateInput, userId: string) {
  const existing = await prisma.billingPlan.findFirst({
    where: {
      OR: [{ code: input.slug }, { name: input.name }],
    },
    select: { id: true },
  })

  if (existing) {
    throw new BillingPlanMutationError('Já existe um plano com este nome', 409)
  }

  const plan = await prisma.billingPlan.create({
    data: {
      name: input.name,
      code: input.slug,
      cycle: 'MONTHLY',
      accessDays: 30,
      includedProjects: input.includedProjects,
      includedWhatsAppPerProject: input.includedWhatsAppPerProject,
      includedMetaAdAccountsPerProject: input.includedMetaAdAccountsPerProject,
      includedConversionsPerProject: input.includedConversionsPerProject,
      supportLevel: input.supportLevel,
      displayOrder: input.displayOrder,
      isActive: input.isActive,
      isHighlighted: input.isHighlighted,
      contactSalesOnly: input.contactSalesOnly,
      metadata: buildPlanMetadata(input),
    },
  })

  await auditService.log({
    userId,
    action: 'billing-plan.created',
    resourceType: 'billing-plan',
    resourceId: plan.id,
    after: {
      name: plan.name,
      code: plan.code,
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
      code: true,
      supportLevel: true,
      displayOrder: true,
      isActive: true,
      isHighlighted: true,
      contactSalesOnly: true,
      metadata: true,
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
          ...(input.slug ? [{ code: input.slug }] : []),
          ...(input.name ? [{ name: input.name }] : []),
        ],
      },
      select: { id: true },
    })

    if (conflict) {
      throw new BillingPlanMutationError('Já existe um plano com este nome', 409)
    }
  }

  await prisma.billingPlan.update({
    where: { id: planId },
    data: {
      ...(input.name !== undefined ? { name: input.name } : {}),
      ...(input.slug !== undefined ? { code: input.slug } : {}),
      ...(input.includedProjects !== undefined ? { includedProjects: input.includedProjects } : {}),
      ...(input.includedWhatsAppPerProject !== undefined
        ? { includedWhatsAppPerProject: input.includedWhatsAppPerProject }
        : {}),
      ...(input.includedMetaAdAccountsPerProject !== undefined
        ? { includedMetaAdAccountsPerProject: input.includedMetaAdAccountsPerProject }
        : {}),
      ...(input.includedConversionsPerProject !== undefined
        ? { includedConversionsPerProject: input.includedConversionsPerProject }
        : {}),
      ...(input.supportLevel !== undefined ? { supportLevel: input.supportLevel } : {}),
      ...(input.displayOrder !== undefined ? { displayOrder: input.displayOrder } : {}),
      ...(input.isActive !== undefined ? { isActive: input.isActive } : {}),
      ...(input.isHighlighted !== undefined ? { isHighlighted: input.isHighlighted } : {}),
      ...(input.contactSalesOnly !== undefined
        ? { contactSalesOnly: input.contactSalesOnly }
        : {}),
      ...(Object.keys(input).some((key) =>
        ['subtitle', 'cta', 'trialDays', 'features', 'additionals'].includes(key),
      )
        ? {
            metadata: buildPlanMetadata({
              subtitle: input.subtitle ?? undefined,
              cta: input.cta ?? undefined,
              trialDays: input.trialDays ?? undefined,
              features: input.features ?? undefined,
              additionals: input.additionals ?? undefined,
            }),
          }
        : {}),
    },
  })

  await auditService.log({
    userId,
    action: 'billing-plan.updated',
    resourceType: 'billing-plan',
    resourceId: planId,
    before: existing,
    after: input,
  })

  return getBillingPlanDetail(planId)
}

export async function archiveBillingPlan(planId: string, userId: string) {
  const existing = await prisma.billingPlan.findUnique({
    where: { id: planId },
    select: {
      id: true,
      name: true,
      code: true,
      isActive: true,
    },
  })

  if (!existing) {
    throw new BillingPlanMutationError('Plano não encontrado', 404)
  }

  if (!existing.isActive) {
    throw new BillingPlanMutationError('Plano já está inativo', 409)
  }

  await prisma.billingPlan.update({
    where: { id: planId },
    data: {
      isActive: false,
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
    },
  })

  return { success: true as const }
}
