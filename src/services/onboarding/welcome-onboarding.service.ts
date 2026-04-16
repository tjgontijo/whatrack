import { Prisma } from '@generated/prisma/client'

import { normalizeDocumentNumber } from '@/lib/document/document-identity'
import { prisma } from '@/lib/db/prisma'
import { normalizeSlug } from '@/lib/utils/slug'
import { getDefaultTrialBillingPlan } from '@/services/billing/billing-plan-catalog.service'
import { startOrganizationTrial } from '@/services/billing/billing-subscription.service'
import { ensureSystemRolesForOrganization } from '@/server/organization/organization-rbac.service'
import type { WelcomeOnboardingInput } from '@/schemas/onboarding/welcome-onboarding'
import type { CompanyLookupData } from '@/schemas/organizations/organization-onboarding'

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

function parseOptionalDate(value?: string | null): Date | null {
  if (!value) return null

  const parsed = new Date(value)
  if (Number.isNaN(parsed.getTime())) return null

  return parsed
}

function buildCompanyPersistenceData(input: {
  companyLookupData: CompanyLookupData
  fallbackName: string
  userId: string
}) {
  const companyName =
    input.companyLookupData.razaoSocial?.trim() ||
    input.companyLookupData.nomeFantasia?.trim() ||
    input.fallbackName

  return {
    cnpj: normalizeDocumentNumber(input.companyLookupData.cnpj) ?? '',
    razaoSocial: companyName,
    nomeFantasia: input.companyLookupData.nomeFantasia?.trim() || companyName,
    cnaeCode: input.companyLookupData.cnaeCode || '',
    cnaeDescription: input.companyLookupData.cnaeDescription || '',
    municipio: input.companyLookupData.municipio || '',
    uf: (input.companyLookupData.uf || '').trim().toUpperCase(),
    tipo: input.companyLookupData.tipo || null,
    porte: input.companyLookupData.porte || null,
    naturezaJuridica: input.companyLookupData.naturezaJuridica || null,
    capitalSocial:
      typeof input.companyLookupData.capitalSocial === 'number'
        ? new Prisma.Decimal(input.companyLookupData.capitalSocial)
        : null,
    situacao: input.companyLookupData.situacao || null,
    dataAbertura: parseOptionalDate(input.companyLookupData.dataAbertura),
    dataSituacao: parseOptionalDate(input.companyLookupData.dataSituacao),
    logradouro: input.companyLookupData.logradouro || null,
    numero: input.companyLookupData.numero || null,
    complemento: input.companyLookupData.complemento || null,
    bairro: input.companyLookupData.bairro || null,
    cep: input.companyLookupData.cep || null,
    email: input.companyLookupData.email || null,
    telefone: input.companyLookupData.telefone || null,
    qsa: input.companyLookupData.qsa
      ? (input.companyLookupData.qsa as unknown as Prisma.InputJsonValue)
      : undefined,
    atividadesSecundarias: input.companyLookupData.atividadesSecundarias
      ? (input.companyLookupData.atividadesSecundarias as unknown as Prisma.InputJsonValue)
      : undefined,
    authorizedByUserId: input.userId,
  }
}

async function persistOrganizationFiscalIdentity(input: {
  tx: Prisma.TransactionClient
  organizationId: string
  organizationName: string
  userId: string
  data: WelcomeOnboardingInput
}) {
  const completedAt = new Date()
  const normalizedDocument = normalizeDocumentNumber(input.data.documentNumber)

  if (!normalizedDocument) {
    throw new Error('Documento inválido para concluir o onboarding.')
  }

  if (input.data.identityType === 'pessoa_fisica') {
    await input.tx.organizationProfile.upsert({
      where: { organizationId: input.organizationId },
      update: {
        cpf: normalizedDocument,
        onboardingStatus: 'completed',
        onboardingCompletedAt: completedAt,
      },
      create: {
        organizationId: input.organizationId,
        cpf: normalizedDocument,
        onboardingStatus: 'completed',
        onboardingCompletedAt: completedAt,
      },
    })

    await input.tx.organizationCompany.deleteMany({
      where: { organizationId: input.organizationId },
    })

    return
  }

  const companyPersistenceData = input.data.companyLookupData
    ? buildCompanyPersistenceData({
        companyLookupData: input.data.companyLookupData,
        fallbackName: input.organizationName,
        userId: input.userId,
      })
    : null

  await input.tx.organizationCompany.upsert({
    where: { organizationId: input.organizationId },
    update:
      companyPersistenceData ?? {
        cnpj: normalizedDocument,
        razaoSocial: input.organizationName,
        nomeFantasia: input.organizationName,
      },
    create:
      companyPersistenceData
        ? {
            organizationId: input.organizationId,
            ...companyPersistenceData,
          }
        : {
            organizationId: input.organizationId,
            cnpj: normalizedDocument,
            razaoSocial: input.organizationName,
            nomeFantasia: input.organizationName,
            cnaeCode: '',
            cnaeDescription: '',
            municipio: '',
            uf: '',
            authorizedByUserId: input.userId,
          },
  })

  await input.tx.organizationProfile.upsert({
    where: { organizationId: input.organizationId },
    update: {
      cpf: null,
      onboardingStatus: 'completed',
      onboardingCompletedAt: completedAt,
    },
    create: {
      organizationId: input.organizationId,
      cpf: null,
      onboardingStatus: 'completed',
      onboardingCompletedAt: completedAt,
    },
  })
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

    await persistOrganizationFiscalIdentity({
      tx,
      organizationId,
      organizationName,
      userId: input.user.id,
      data: input.data,
    })

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
    planType: defaultTrialPlan.code,
    trialDays: 14,
  })

  await ensureSystemRolesForOrganization(organization.organization.id)

  return {
    organization: organization.organization,
    project: organization.project,
    trialEndsAt: trial.trialEndsAt?.toISOString() ?? null,
  }
}
