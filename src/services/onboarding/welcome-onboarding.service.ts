import { Prisma } from '@generated/prisma/client'

import { prisma } from '@/lib/db/prisma'
import { normalizeSlug } from '@/lib/utils/slug'
import { ensureCoreSkillsForOrganization } from '@/services/ai/ai-skill-provisioning.service'
import { getDefaultTrialBillingPlan } from '@/services/billing/billing-plan-catalog.service'
import { startOrganizationTrial } from '@/services/billing/billing-subscription.service'
import { ensureSystemRolesForOrganization } from '@/server/organization/organization-rbac.service'
import type { WelcomeOnboardingInput } from '@/schemas/onboarding/welcome-onboarding'

type WelcomeUser = {
  id: string
  email: string
  name?: string | null
}

function buildOrganizationSlug(name: string) {
  return normalizeSlug(name) || 'organizacao'
}

async function resolveAvailableOrganizationSlug(
  tx: Prisma.TransactionClient,
  input: { name: string; currentOrganizationId?: string | null }
) {
  const baseSlug = buildOrganizationSlug(input.name)

  for (let index = 0; index < 100; index += 1) {
    const candidate = index === 0 ? baseSlug : `${baseSlug}-${index + 2}`
    const existing = await tx.organization.findUnique({
      where: { slug: candidate },
      select: { id: true },
    })

    if (!existing || existing.id === input.currentOrganizationId) {
      return candidate
    }
  }

  return `${baseSlug}-${Date.now().toString(36)}`
}

export async function completeWelcomeOnboarding(input: {
  user: WelcomeUser
  data: WelcomeOnboardingInput
}) {
  const existingMembership = await prisma.member.findFirst({
    where: { userId: input.user.id },
    select: { organizationId: true },
    orderBy: { createdAt: 'asc' },
  })

  const organization = await prisma.$transaction(async (tx) => {
    const organizationName = input.data.organizationName.trim()
    const desiredOrganizationSlug = await resolveAvailableOrganizationSlug(tx, {
      name: organizationName,
      currentOrganizationId: existingMembership?.organizationId,
    })
    const initialProjectName = organizationName

    const user = await tx.user.update({
      where: { id: input.user.id },
      data: {
        name: input.data.ownerName,
      },
      select: { id: true },
    })

    let organizationId = existingMembership?.organizationId ?? null

    if (!organizationId) {
      const createdOrganization = await tx.organization.create({
        data: {
          name: organizationName,
          slug: desiredOrganizationSlug,
        },
        select: {
          id: true,
          name: true,
          slug: true,
        },
      })

      await tx.member.create({
        data: {
          organizationId: createdOrganization.id,
          userId: input.user.id,
          role: 'owner',
          createdAt: new Date(),
        },
      })

      await ensureCoreSkillsForOrganization(tx, createdOrganization.id)

      organizationId = createdOrganization.id
    } else {
      await tx.organization.update({
        where: { id: organizationId },
        data: {
          name: organizationName,
          slug: desiredOrganizationSlug,
        },
      })
    }

    const projectSlug = desiredOrganizationSlug

    const existingProject = await tx.project.findFirst({
      where: {
        organizationId,
        OR: [
          { name: initialProjectName },
          { slug: projectSlug },
        ],
      },
      select: {
        id: true,
        name: true,
        slug: true,
      },
    })

    const project =
      existingProject ??
      (await tx.project.create({
        data: {
          organizationId,
          name: initialProjectName,
          slug: projectSlug,
        },
        select: {
          id: true,
          name: true,
          slug: true,
        },
      }))

    const organizationRecord = await tx.organization.findUniqueOrThrow({
      where: { id: organizationId },
      select: {
        id: true,
        name: true,
        slug: true,
      },
    })

    return {
      organization: organizationRecord,
      project,
    }
  })

  const defaultTrialPlan = await getDefaultTrialBillingPlan()
  const trial = await startOrganizationTrial({
    organizationId: organization.organization.id,
    planType: defaultTrialPlan.slug,
    trialDays: 14,
  })

  await ensureSystemRolesForOrganization(organization.organization.id)

  return {
    organization: organization.organization,
    project: organization.project,
    trialEndsAt: trial.trialEndsAt?.toISOString() ?? null,
  }
}
