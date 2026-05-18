import "server-only"
import { Prisma } from '@generated/prisma/client'
import { z } from 'zod'
import { getDefaultTrialBillingPlan } from '@/features/billing/services/billing-plan-catalog.service'
import { startOrganizationTrial } from '@/features/billing/services/billing-subscription.service'
import { fetchCnpjData, ReceitaWsError } from '@/features/company/services/receitaws'
import { prisma } from '@/lib/db/prisma'
import { logger } from '@/lib/utils/logger'
import { normalizeSlug } from '@/lib/utils/slug'
import { ensureSystemRolesForOrganization } from '@/server/organization/organization-rbac.service'

export const setupOnboardingSchema = z.object({
  documentType: z.enum(['CPF', 'CNPJ']),
  documentNumber: z.string().min(1),
  intent: z.string().trim().optional(),
})

function deriveFirstLastName(fullName: string): string {
  const parts = fullName.trim().split(/\s+/).filter(Boolean)
  if (parts.length <= 1) return fullName.trim()
  return `${parts[0]} ${parts[parts.length - 1]}`
}

function buildOrgSlug(name: string) {
  return normalizeSlug(name) || 'organizacao'
}

async function resolveAvailableOrgSlug(
  tx: Prisma.TransactionClient,
  baseName: string
): Promise<string> {
  const baseSlug = buildOrgSlug(baseName)

  for (let i = 0; i < 100; i++) {
    const candidate = i === 0 ? baseSlug : `${baseSlug}-${i + 2}`
    const existing = await tx.organization.findUnique({
      where: { slug: candidate },
      select: { id: true },
    })
    if (!existing) return candidate
  }

  return `${baseSlug}-${Date.now().toString(36)}`
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
  const { documentType, documentNumber, intent } = setupOnboardingSchema.parse(input)

  let orgName: string
  let companyData: Awaited<ReturnType<typeof fetchCnpjData>> | null = null

  if (documentType === 'CNPJ') {
    try {
      companyData = await fetchCnpjData(documentNumber)
      orgName = companyData.razaoSocial || companyData.nomeFantasia || documentNumber
    } catch (err) {
      if (err instanceof ReceitaWsError) {
        logger.warn(
          { err, documentNumber },
          '[onboarding/setup] ReceitaWS lookup failed, using fallback'
        )
      }
      orgName = documentNumber
    }
  } else {
    const displayName = user.name ?? user.email
    orgName = deriveFirstLastName(displayName)
  }

  const result = await prisma.$transaction(async (tx) => {
    const existingMember = await tx.member.findFirst({
      where: { userId: user.id },
      select: { organizationId: true },
      orderBy: { createdAt: 'asc' },
    })

    let organizationId: string

    if (existingMember) {
      const slug = await resolveAvailableOrgSlug(tx, orgName)
      await tx.organization.update({
        where: { id: existingMember.organizationId },
        data: { name: orgName, slug },
      })
      organizationId = existingMember.organizationId
    } else {
      const slug = await resolveAvailableOrgSlug(tx, orgName)
      const org = await tx.organization.create({
        data: { name: orgName, slug },
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

    if (documentType === 'CPF') {
      await tx.organizationProfile.upsert({
        where: { organizationId },
        update: { cpf: documentNumber, onboardingStatus: 'completed', onboardingCompletedAt: completedAt },
        create: { organizationId, cpf: documentNumber, onboardingStatus: 'completed', onboardingCompletedAt: completedAt },
      })
    } else {
      const cnpjClean = documentNumber
      const razaoSocial = companyData?.razaoSocial || orgName
      const nomeFantasia = companyData?.nomeFantasia || razaoSocial

      await tx.organizationCompany.upsert({
        where: { organizationId },
        update: {
          cnpj: cnpjClean,
          razaoSocial,
          nomeFantasia,
          cnaeCode: companyData?.cnaeCode ?? '',
          cnaeDescription: companyData?.cnaeDescription ?? '',
          municipio: companyData?.municipio ?? '',
          uf: (companyData?.uf ?? '').trim().toUpperCase().slice(0, 2),
          tipo: companyData?.tipo ?? null,
          porte: companyData?.porte ?? null,
          naturezaJuridica: companyData?.naturezaJuridica ?? null,
          capitalSocial: companyData?.capitalSocial != null ? new Prisma.Decimal(companyData.capitalSocial) : null,
          situacao: companyData?.situacao ?? null,
          authorizedByUserId: user.id,
        },
        create: {
          organizationId,
          cnpj: cnpjClean,
          razaoSocial,
          nomeFantasia,
          cnaeCode: companyData?.cnaeCode ?? '',
          cnaeDescription: companyData?.cnaeDescription ?? '',
          municipio: companyData?.municipio ?? '',
          uf: (companyData?.uf ?? '').trim().toUpperCase().slice(0, 2),
          tipo: companyData?.tipo ?? null,
          porte: companyData?.porte ?? null,
          naturezaJuridica: companyData?.naturezaJuridica ?? null,
          capitalSocial: companyData?.capitalSocial != null ? new Prisma.Decimal(companyData.capitalSocial) : null,
          situacao: companyData?.situacao ?? null,
          authorizedByUserId: user.id,
        },
      })
      await tx.organizationProfile.upsert({
        where: { organizationId },
        update: { cpf: null, onboardingStatus: 'completed', onboardingCompletedAt: completedAt },
        create: { organizationId, cpf: null, onboardingStatus: 'completed', onboardingCompletedAt: completedAt },
      })
    }

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
