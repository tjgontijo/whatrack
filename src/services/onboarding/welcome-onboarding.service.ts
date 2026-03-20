import { prisma } from '@/lib/db/prisma'
import { normalizeSlug } from '@/lib/utils/slug'
import { ensureCoreSkillsForOrganization } from '@/services/ai/ai-skill-provisioning.service'
import { getDefaultTrialBillingPlan } from '@/services/billing/billing-plan-catalog.service'
import { startOrganizationTrial } from '@/services/billing/billing-subscription.service'
import type { WelcomeOnboardingInput } from '@/schemas/onboarding/welcome-onboarding'

type WelcomeUser = {
  id: string
  email: string
  name?: string | null
}

function buildOrganizationSlug(userId: string) {
  return `org-${userId.slice(0, 8)}-${Date.now().toString(36)}`
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
          name: input.data.agencyName,
          slug: buildOrganizationSlug(user.id),
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
          name: input.data.agencyName,
        },
      })
    }

    const projectSlug = normalizeSlug(input.data.projectName)

    const existingProject = await tx.project.findFirst({
      where: {
        organizationId,
        OR: [
          { name: input.data.projectName },
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
          name: input.data.projectName,
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

  return {
    organization: organization.organization,
    project: organization.project,
    trialEndsAt: trial.trialEndsAt?.toISOString() ?? null,
  }
}
