import { cookies } from 'next/headers'
import { z } from 'zod'

import { apiError, apiSuccess } from '@/lib/utils/api-response'
import { ORGANIZATION_COOKIE, PROJECT_COOKIE } from '@/lib/constants/http-headers'
import { getOrSyncUser } from '@/server/auth/server'
import { logger } from '@/lib/utils/logger'
import { prisma } from '@/lib/db/prisma'
import { normalizeSlug } from '@/lib/utils/slug'
import { fetchCnpjData, ReceitaWsError } from '@/services/company/receitaws'
import { getDefaultTrialBillingPlan } from '@/services/billing/billing-plan-catalog.service'
import { startOrganizationTrial } from '@/services/billing/billing-subscription.service'
import { ensureSystemRolesForOrganization } from '@/server/organization/organization-rbac.service'
import { Prisma } from '@generated/prisma/client'

const setupSchema = z.object({
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
  baseName: string,
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

export async function POST(request: Request) {
  try {
    const user = await getOrSyncUser(request)
    if (!user) return apiError('Unauthorized', 401)

    const parsed = setupSchema.safeParse(await request.json().catch(() => null))
    if (!parsed.success) {
      return apiError('Dados inválidos', 400, undefined, { details: parsed.error.flatten() })
    }

    const { documentType, documentNumber, intent } = parsed.data

    // Derive org name from document
    let orgName: string
    let companyData: Awaited<ReturnType<typeof fetchCnpjData>> | null = null

    if (documentType === 'CNPJ') {
      try {
        companyData = await fetchCnpjData(documentNumber)
        orgName = companyData.razaoSocial || companyData.nomeFantasia || documentNumber
      } catch (err) {
        if (err instanceof ReceitaWsError) {
          logger.warn({ err, documentNumber }, '[onboarding/setup] ReceitaWS lookup failed, using fallback')
        }
        orgName = documentNumber
      }
    } else {
      const displayName = user.name ?? user.email
      orgName = deriveFirstLastName(displayName)
    }

    const result = await prisma.$transaction(async (tx) => {
      // Idempotent: check if user already has an org
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

      // Persist fiscal identity
      const completedAt = new Date()
      if (documentType === 'CPF') {
        await tx.organizationProfile.upsert({
          where: { organizationId },
          update: { cpf: documentNumber, onboardingStatus: 'completed', onboardingCompletedAt: completedAt },
          create: { organizationId, cpf: documentNumber, onboardingStatus: 'completed', onboardingCompletedAt: completedAt },
        })
      } else {
        // PJ — persist company data (from ReceitaWS if available)
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

      // Create default project (idempotent)
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

    // Ensure RBAC roles
    await ensureSystemRolesForOrganization(result.organization.id)

    // Set cookies
    const cookieStore = await cookies()
    cookieStore.set(ORGANIZATION_COOKIE, result.organization.id, {
      path: '/',
      maxAge: 60 * 60 * 24 * 365,
      sameSite: 'lax',
    })
    cookieStore.set(PROJECT_COOKIE, result.project.id, {
      path: '/',
      maxAge: 60 * 60 * 24 * 365,
      sameSite: 'lax',
    })

    return apiSuccess({ organization: result.organization, project: result.project }, 201)
  } catch (error) {
    logger.error({ err: error }, '[api/onboarding/setup] error')
    return apiError('Falha ao configurar conta', 500, error)
  }
}
