import "server-only"
import { Prisma } from '@generated/prisma/client'
import { z } from 'zod'
import { getDefaultTrialBillingPlan } from '@/features/billing/services/billing-plan-catalog.service'
import { startOrganizationTrial } from '@/features/billing/services/billing-subscription.service'
import { auditService } from '@/lib/audit/audit.service'
import { prisma } from '@/lib/db/prisma'
import { ensureSystemRolesForOrganization } from '@/server/organization/organization-rbac.service'

export const setupOnboardingSchema = z.object({
  intent: z.string().trim().optional(),
})

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

  const result = await prisma.$transaction(async (tx) => {
    const existingMember = await tx.member.findFirst({
      where: { userId: user.id },
      select: { organizationId: true },
      orderBy: { createdAt: 'asc' },
    })

    let organizationId: string
    let createdOrganizationId: string | null = null
    let createdMemberId: string | null = null

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
      createdOrganizationId = org.id
      const member = await tx.member.create({
        data: {
          organizationId: org.id,
          userId: user.id,
          role: 'owner',
          createdAt: new Date(),
        },
        select: { id: true },
      })
      createdMemberId = member.id
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

    return { organization: org, project, createdOrganizationId, createdMemberId }
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

  // Explicit post-commit audit for organization/member creation.
  // This avoids FK races from out-of-tx audit persistence.
  if (result.createdOrganizationId) {
    void auditService.log({
      organizationId: result.createdOrganizationId,
      userId: user.id,
      action: 'organization.create',
      resourceType: 'Organization',
      resourceId: result.createdOrganizationId,
      after: {
        id: result.createdOrganizationId,
        name: 'Minha Organização',
      },
    })
  }

  if (result.createdMemberId && result.createdOrganizationId) {
    void auditService.log({
      organizationId: result.createdOrganizationId,
      userId: user.id,
      action: 'member.create',
      resourceType: 'Member',
      resourceId: result.createdMemberId,
      after: {
        id: result.createdMemberId,
        organizationId: result.createdOrganizationId,
        userId: user.id,
        role: 'owner',
      },
    })
  }

  return result
}
