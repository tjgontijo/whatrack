import "server-only"
import { z } from 'zod'
import { getDefaultTrialBillingPlan } from '@/features/billing/services/billing-plan-catalog.service'
import { startOrganizationTrial } from '@/features/billing/services/billing-subscription.service'
import { prisma } from '@/lib/db/prisma'
import { normalizeSlug } from '@/lib/utils/slug'
import { ensureSystemRolesForOrganization } from '@/server/organization/organization-rbac.service'

export const setupOnboardingSchema = z.object({
  intent: z.string().trim().optional(),
})

function deriveFirstLastName(fullName: string): string {
  const parts = fullName.trim().split(/\s+/).filter(Boolean)
  if (parts.length <= 1) return fullName.trim()
  return `${parts[0]} ${parts[parts.length - 1]}`
}

function buildOrgSlug() {
  return `org-${Date.now().toString(36)}`
}

async function resolveAvailableOrgSlug(
  tx: Prisma.TransactionClient
): Promise<string> {
  const baseSlug = buildOrgSlug()

  const existing = await tx.organization.findUnique({
    where: { slug: baseSlug },
    select: { id: true },
  })

  if (existing) {
    return `${baseSlug}-${Math.random().toString(36).slice(2, 8)}`
  }

  return baseSlug
}

export interface SetupOnboardingUser {
  id: string
  name?: string | null
  email: string
}

export async function setupOnboardingService(
  user: SetupOnboardingUser,
  input: unknown
) {
  const { intent } = setupOnboardingSchema.parse(input)

  const displayName = user.name ?? user.email
  const orgName = deriveFirstLastName(displayName)

  const result = await prisma.$transaction(async (tx) => {
    const existingMember = await tx.member.findFirst({
      where: { userId: user.id },
      select: { organizationId: true },
      orderBy: { createdAt: 'asc' },
    })

    let organizationId: string

    if (existingMember) {
      const slug = await resolveAvailableOrgSlug(tx)
      await tx.organization.update({
        where: { id: existingMember.organizationId },
        data: { slug },
      })
      organizationId = existingMember.organizationId
    } else {
      const slug = await resolveAvailableOrgSlug(tx)
      const org = await tx.organization.create({
        data: { name: 'Minha Organização', slug },
        select: { id: true },
      })
      await tx.member.create({
        data: {
          organizationId: org.id,
          userId: user.id,
          role: 'owner',
          createdAt: new Date(),
        },
      })
      organizationId = org.id
    }

    const completedAt = new Date()

    await tx.organizationProfile.upsert({
      where: { organizationId },
      update: { onboardingStatus: 'completed', onboardingCompletedAt: completedAt },
      create: { organizationId, onboardingStatus: 'completed', onboardingCompletedAt: completedAt },
    })

    const existingProject = await tx.project.findFirst({
      where: { organizationId, slug: 'default' },
      select: { id: true, slug: true },
    })

    const project =
      existingProject ??
      (await tx.project.create({
        data: { organizationId, name: 'default', slug: 'default' },
        select: { id: true, slug: true },
      }))

    const org = await tx.organization.findUniqueOrThrow({
      where: { id: organizationId },
      select: { id: true, slug: true },
    })

    return { organization: org, project }
  })

  if (intent === 'start-trial') {
    const defaultTrialPlan = await getDefaultTrialBillingPlan()
    await startOrganizationTrial({
      organizationId: result.organization.id,
      planType: defaultTrialPlan.code,
      trialDays: 14,
    })
  }

  await ensureSystemRolesForOrganization(result.organization.id)

  return result
}
