import { Prisma } from '@prisma/client'

import { prisma } from '@/lib/db/prisma'
import { calculateMetrics } from '@/services/onboarding-metrics/metrics-calculator'
import {
  normalizeOnboardingDocument,
  type OrganizationOnboardingInput,
} from '@/schemas/organizations/organization-onboarding'
import type {
  UpdateOrganizationAiSettingsInput,
  UpdateOrganizationByIdInput,
} from '@/schemas/organizations/organization-schemas'

const onboardingStatuses = [
  { name: 'pending', description: 'Onboarding iniciado e aguardando conclusão.' },
  { name: 'completed', description: 'Onboarding concluído com sucesso.' },
  { name: 'skipped', description: 'Onboarding pulado pelo usuário.' },
] as const

async function ensureOnboardingStatuses() {
  await Promise.all(
    onboardingStatuses.map((status) =>
      prisma.onboardingStatus.upsert({
        where: { name: status.name },
        create: status,
        update: {},
      })
    )
  )
}

async function generateUniqueSlug(name: string, options?: { excludeOrgId?: string }): Promise<string> {
  const baseSlug = name
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')

  const normalizedBase = baseSlug || 'organization'
  const existing = await prisma.organization.findFirst({
    where: {
      slug: normalizedBase,
      ...(options?.excludeOrgId ? { id: { not: options.excludeOrgId } } : {}),
    },
    select: { id: true },
  })

  if (!existing) return normalizedBase
  return `${normalizedBase}-${Math.random().toString(36).slice(2, 8)}`
}

function parseOptionalDate(value?: string | null): Date | null {
  if (!value) return null
  const parsed = new Date(value)
  if (Number.isNaN(parsed.getTime())) return null
  return parsed
}

function resolveOrganizationName(input: {
  entityType: 'individual' | 'company'
  userName: string | null | undefined
  userEmail: string
  companyName?: string
  legalName?: string
}) {
  if (input.entityType === 'company') {
    const fromCompany = input.legalName?.trim() || input.companyName?.trim()
    if (fromCompany) return fromCompany
  }

  const fromUser = input.userName?.trim()
  if (fromUser) return fromUser

  const fromEmail = input.userEmail.split('@')[0]?.trim()
  if (fromEmail) return fromEmail

  return 'Minha Organização'
}

export async function createOrganizationFromOnboarding(input: {
  user: { id: string; name?: string | null; email: string }
  data: OrganizationOnboardingInput
}): Promise<{ id: string; name: string; slug: string; entityType: 'individual' | 'company' } | {
  error: string
  status: 400 | 409
  organizationId?: string
}> {
  const existingMembership = await prisma.member.findFirst({
    where: { userId: input.user.id },
    select: { id: true, organizationId: true },
  })

  if (existingMembership) {
    return {
      error: 'Usuário já pertence a uma organização.',
      status: 409,
      organizationId: existingMembership.organizationId,
    }
  }

  const normalizedDocument = normalizeOnboardingDocument(input.data.documentNumber)
  const companyData = input.data.entityType === 'company' ? input.data.companyLookupData : undefined

  await ensureOnboardingStatuses()

  const organizationName = resolveOrganizationName({
    entityType: input.data.entityType,
    userName: input.user.name,
    userEmail: input.user.email,
    companyName: companyData?.nomeFantasia,
    legalName: companyData?.razaoSocial,
  })
  const slug = await generateUniqueSlug(organizationName)

  if (input.data.entityType === 'company') {
    const uf = companyData?.uf?.trim().toUpperCase() ?? ''
    if (uf.length !== 2) {
      return { error: 'UF inválida nos dados da Receita Federal.', status: 400 }
    }
  }

  const organization = await prisma.$transaction(async (tx) => {
    const createdOrganization = await tx.organization.create({
      data: {
        name: organizationName,
        slug,
        createdAt: new Date(),
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

    if (input.data.entityType === 'individual') {
      await tx.organizationProfile.create({
        data: {
          organizationId: createdOrganization.id,
          cpf: normalizedDocument,
          onboardingStatus: 'completed',
          onboardingCompletedAt: new Date(),
        },
      })
    } else {
      const company = companyData!
      await tx.organizationProfile.create({
        data: {
          organizationId: createdOrganization.id,
          onboardingStatus: 'completed',
          onboardingCompletedAt: new Date(),
        },
      })

      await tx.organizationCompany.create({
        data: {
          organizationId: createdOrganization.id,
          cnpj: normalizedDocument,
          razaoSocial: company.razaoSocial,
          nomeFantasia: company.nomeFantasia || null,
          cnaeCode: company.cnaeCode || '',
          cnaeDescription: company.cnaeDescription || '',
          municipio: company.municipio || '',
          uf: (company.uf || '').toUpperCase(),
          tipo: company.tipo || null,
          porte: company.porte || null,
          naturezaJuridica: company.naturezaJuridica || null,
          capitalSocial:
            typeof company.capitalSocial === 'number' ? new Prisma.Decimal(company.capitalSocial) : null,
          situacao: company.situacao || null,
          dataAbertura: parseOptionalDate(company.dataAbertura),
          dataSituacao: parseOptionalDate(company.dataSituacao),
          logradouro: company.logradouro || null,
          numero: company.numero || null,
          complemento: company.complemento || null,
          bairro: company.bairro || null,
          cep: company.cep || null,
          email: company.email || null,
          telefone: company.telefone || null,
          qsa: company.qsa ? (company.qsa as unknown as Prisma.InputJsonValue) : undefined,
          atividadesSecundarias: company.atividadesSecundarias
            ? (company.atividadesSecundarias as unknown as Prisma.InputJsonValue)
            : undefined,
          authorizedByUserId: input.user.id,
        },
      })
    }

    return createdOrganization
  })

  return {
    id: organization.id,
    name: organization.name,
    slug: organization.slug,
    entityType: input.data.entityType,
  }
}

export async function getOrCreateCurrentOrganization(input: {
  user: { id: string; name?: string | null; email: string }
}) {
  const member = await prisma.member.findFirst({
    where: { userId: input.user.id },
    include: { organization: true },
  })

  if (!member) {
    const fallbackName =
      input.user.name?.trim() || (input.user.email?.split('@')[0] ?? '').trim() || 'Minha organizacao'
    const slug = await generateUniqueSlug(fallbackName)

    const organization = await prisma.organization.create({
      data: {
        name: fallbackName,
        slug,
        createdAt: new Date(),
      },
    })

    await prisma.member.create({
      data: {
        organizationId: organization.id,
        userId: input.user.id,
        role: 'owner',
        createdAt: new Date(),
      },
    })

    return {
      id: organization.id,
      name: organization.name,
      slug: organization.slug,
    }
  }

  return {
    id: member.organization.id,
    name: member.organization.name,
    slug: member.organization.slug,
  }
}

export async function updateOrganizationById(input: {
  organizationId: string
  userId: string
  data: UpdateOrganizationByIdInput
}): Promise<{ id: string; name: string; slug: string } | { error: string; status: 403 }> {
  const body = input.data
  const isSkipOnlyUpdate =
    body &&
    typeof body === 'object' &&
    !Array.isArray(body) &&
    Object.keys(body).length === 1 &&
    body.onboardingStatus === 'skipped'

  const member = await prisma.member.findFirst({
    where: {
      organizationId: input.organizationId,
      userId: input.userId,
      ...(isSkipOnlyUpdate ? {} : { role: 'owner' }),
    },
    select: { id: true },
  })

  if (!member) {
    return {
      error: isSkipOnlyUpdate
        ? 'Você não pertence a esta organização'
        : 'Você não tem permissão para atualizar esta organização',
      status: 403,
    }
  }

  let metrics = {}
  if (body.leadsPerDay && body.avgTicket && body.monthlyRevenue && body.attendantsCount) {
    metrics = calculateMetrics({
      leadsPerDay: body.leadsPerDay,
      avgTicket: body.avgTicket,
      monthlyRevenue: body.monthlyRevenue,
      attendantsCount: body.attendantsCount,
      monthlyAdSpend: body.monthlyAdSpend ?? undefined,
    })
  }

  let newSlug: string | undefined
  if (body.companyName) {
    newSlug = await generateUniqueSlug(body.companyName, { excludeOrgId: input.organizationId })
  }

  const organization = await prisma.organization.update({
    where: { id: input.organizationId },
    data: {
      ...(body.name && { name: body.name }),
      ...(body.companyName && { name: body.companyName }),
      ...(newSlug && { slug: newSlug }),
    },
  })

  const existingProfile = await prisma.organizationProfile.findFirst({
    where: { organizationId: input.organizationId },
    select: { id: true },
  })

  if (body.onboardingStatus) {
    await ensureOnboardingStatuses()
  }

  if (existingProfile) {
    await prisma.organizationProfile.update({
      where: { id: existingProfile.id },
      data: {
        cpf: body.cpf || null,
        avgTicket: body.avgTicket || null,
        attendantsCount: body.attendantsCount || null,
        mainChannel: body.mainAcquisitionChannel || null,
        leadsPerDay: body.leadsPerDay || null,
        monthlyRevenue: body.monthlyRevenue || null,
        monthlyAdSpend: body.monthlyAdSpend || null,
        ...(body.onboardingStatus && { onboardingStatus: body.onboardingStatus }),
        ...(body.onboardingStatus === 'completed' && { onboardingCompletedAt: new Date() }),
        ...metrics,
      },
    })
  } else {
    await prisma.organizationProfile.create({
      data: {
        organizationId: input.organizationId,
        cpf: body.cpf || null,
        avgTicket: body.avgTicket || null,
        attendantsCount: body.attendantsCount || null,
        mainChannel: body.mainAcquisitionChannel || null,
        leadsPerDay: body.leadsPerDay || null,
        monthlyRevenue: body.monthlyRevenue || null,
        monthlyAdSpend: body.monthlyAdSpend || null,
        ...(body.onboardingStatus && { onboardingStatus: body.onboardingStatus }),
        ...(body.onboardingStatus === 'completed' && { onboardingCompletedAt: new Date() }),
        ...metrics,
      },
    })
  }

  if (body.cnpj && body.razaoSocial) {
    const parsedCapitalSocial =
      typeof body.capitalSocial === 'number'
        ? new Prisma.Decimal(body.capitalSocial)
        : typeof body.capitalSocial === 'string' && body.capitalSocial.trim().length > 0
          ? new Prisma.Decimal(body.capitalSocial)
          : null

    const companyData: Prisma.OrganizationCompanyUncheckedUpdateInput = {
      cnpj: body.cnpj,
      razaoSocial: body.razaoSocial,
      nomeFantasia: body.nomeFantasia || null,
      cnaeCode: body.cnaeCode || '',
      cnaeDescription: body.cnaeDescription || '',
      municipio: body.municipio || '',
      uf: body.uf || '',
      tipo: body.tipo || null,
      porte: body.porte || null,
      naturezaJuridica: body.naturezaJuridica || null,
      capitalSocial: parsedCapitalSocial,
      situacao: body.situacao || null,
      dataAbertura: body.dataAbertura ? new Date(body.dataAbertura) : null,
      dataSituacao: body.dataSituacao ? new Date(body.dataSituacao) : null,
      logradouro: body.logradouro || null,
      numero: body.numero || null,
      complemento: body.complemento || null,
      bairro: body.bairro || null,
      cep: body.cep || null,
      email: body.email || null,
      telefone: body.telefone || null,
      qsa: body.qsa ? (body.qsa as Prisma.InputJsonValue) : Prisma.JsonNull,
      atividadesSecundarias: body.atividadesSecundarias
        ? (body.atividadesSecundarias as Prisma.InputJsonValue)
        : Prisma.JsonNull,
    }

    const existingCompany = await prisma.organizationCompany.findFirst({
      where: { organizationId: input.organizationId },
      select: { id: true },
    })

    if (existingCompany) {
      await prisma.organizationCompany.update({
        where: { id: existingCompany.id },
        data: companyData,
      })
    } else {
      await prisma.organizationCompany.create({
        data: {
          organizationId: input.organizationId,
          ...companyData,
          authorizedByUserId: input.userId,
        } as Prisma.OrganizationCompanyUncheckedCreateInput,
      })
    }
  }

  return {
    id: organization.id,
    name: organization.name,
    slug: organization.slug,
  }
}

export async function getOrganizationAiSettings(organizationId: string) {
  const profile = await prisma.organizationProfile.findUnique({
    where: { organizationId },
    select: { aiCopilotActive: true, aiCopilotInstructions: true },
  })

  return {
    aiCopilotActive: profile?.aiCopilotActive ?? true,
    aiCopilotInstructions: profile?.aiCopilotInstructions || '',
  }
}

export async function updateOrganizationAiSettings(input: {
  organizationId: string
  data: UpdateOrganizationAiSettingsInput
}) {
  const profile = await prisma.organizationProfile.upsert({
    where: { organizationId: input.organizationId },
    update: {
      ...(input.data.aiCopilotActive !== undefined
        ? { aiCopilotActive: input.data.aiCopilotActive }
        : {}),
      ...(input.data.aiCopilotInstructions !== undefined
        ? { aiCopilotInstructions: input.data.aiCopilotInstructions }
        : {}),
    },
    create: {
      organizationId: input.organizationId,
      aiCopilotActive: input.data.aiCopilotActive ?? true,
      aiCopilotInstructions: input.data.aiCopilotInstructions ?? '',
      onboardingStatus: 'completed',
    },
  })

  return {
    success: true,
    aiCopilotActive: profile.aiCopilotActive,
    aiCopilotInstructions: profile.aiCopilotInstructions,
  }
}
