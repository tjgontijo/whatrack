import { Prisma } from '@db/client'

import { prisma } from '@/lib/db/prisma'
import { auditService } from '@/services/audit/audit.service'
import { getOrganizationIdentityStatus } from '@/server/organization/is-identity-complete'
import { listEffectivePermissions } from '@/server/organization/organization-rbac.service'
import {
  type DocumentType,
  type IdentityType,
  normalizeDocumentNumber,
  validateIdentityDocument,
} from '@/lib/document/document-identity'
import type { UpdateOrganizationInput } from '@/schemas/organizations/organization-schemas'
import type { CompanyLookupData } from '@/schemas/organizations/organization-onboarding'
import { logger } from '@/lib/utils/logger'

type ServiceError = {
  error: string
  status: 400 | 404 | 409 | 500
  details?: unknown
}

type OrganizationIdentitySnapshot = {
  organizationType: IdentityType | null
  documentType: DocumentType | null
  documentNumber: string | null
}

type OrganizationFiscalSnapshot = OrganizationIdentitySnapshot & {
  legalName: string | null
  tradeName: string | null
  taxStatus: string | null
  city: string | null
  state: string | null
}

type CompanyLookupInput = NonNullable<UpdateOrganizationInput['companyLookupData']>

function resolveIdentitySnapshot(input: {
  profileCpf?: string | null
  companyCnpj?: string | null
}): OrganizationIdentitySnapshot {
  const cnpj = normalizeDocumentNumber(input.companyCnpj)
  const cpf = normalizeDocumentNumber(input.profileCpf)
  const organizationType: IdentityType | null = cnpj
    ? 'pessoa_juridica'
    : cpf
      ? 'pessoa_fisica'
      : null
  const documentType: DocumentType | null = cnpj ? 'cnpj' : cpf ? 'cpf' : null
  const documentNumber = cnpj ?? cpf ?? null

  return {
    organizationType,
    documentType,
    documentNumber,
  }
}

function resolveFiscalSnapshot(input: {
  profileCpf?: string | null
  companyCnpj?: string | null
  companyLegalName?: string | null
  companyTradeName?: string | null
  companyTaxStatus?: string | null
  companyCity?: string | null
  companyState?: string | null
}): OrganizationFiscalSnapshot {
  const identity = resolveIdentitySnapshot({
    profileCpf: input.profileCpf,
    companyCnpj: input.companyCnpj,
  })

  return {
    ...identity,
    legalName: input.companyLegalName?.trim() || null,
    tradeName: input.companyTradeName?.trim() || null,
    taxStatus: input.companyTaxStatus?.trim() || null,
    city: input.companyCity?.trim() || null,
    state: input.companyState?.trim().toUpperCase() || null,
  }
}

function parseOptionalDate(value?: string | null): Date | null {
  if (!value) return null

  const parsed = new Date(value)
  if (Number.isNaN(parsed.getTime())) return null

  return parsed
}

function resolveCompanyName(input: {
  companyLookupData?: CompanyLookupData | null
  explicitName?: string
  fallbackName: string
}) {
  const fromLookup =
    input.companyLookupData?.razaoSocial?.trim() || input.companyLookupData?.nomeFantasia?.trim()

  if (fromLookup) return fromLookup
  if (input.explicitName?.trim()) return input.explicitName.trim()

  return input.fallbackName
}

function buildCompanyPersistenceData(input: {
  companyLookupData: CompanyLookupInput
  fallbackName: string
  userId: string
}) {
  const companyName = resolveCompanyName({
    companyLookupData: input.companyLookupData,
    fallbackName: input.fallbackName,
  })

  return {
    cnpj: normalizeDocumentNumber(input.companyLookupData.cnpj) ?? '',
    razaoSocial: companyName,
    nomeFantasia: input.companyLookupData.nomeFantasia?.trim() || null,
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

export async function getOrganizationMe(input: {
  organizationId: string
  memberId: string
  role?: string
}): Promise<
  | {
      id: string
      name: string
      slug: string
      logo: string | null
      createdAt: Date
      updatedAt: Date
      organizationType: IdentityType | null
      documentType: DocumentType | null
      documentNumber: string | null
      legalName: string | null
      tradeName: string | null
      taxStatus: string | null
      city: string | null
      state: string | null
      organizationId: string
      currentUserRole: string
      currentUserPermissions: string[]
      currentUserPermissionOverrides: {
        allow: string[]
        deny: string[]
      }
    }
  | ServiceError
> {
  const organization = await prisma.organization.findUnique({
    where: { id: input.organizationId },
    select: {
      id: true,
      name: true,
      slug: true,
      logo: true,
      createdAt: true,
      updatedAt: true,
      profile: {
        select: {
          cpf: true,
        },
      },
      company: {
        select: {
          cnpj: true,
          razaoSocial: true,
          nomeFantasia: true,
          situacao: true,
          municipio: true,
          uf: true,
        },
      },
    },
  })

  if (!organization) {
    return { error: 'Organização não encontrada', status: 404 }
  }

  const effective = await listEffectivePermissions(input.memberId)
  const fiscal = resolveFiscalSnapshot({
    profileCpf: organization.profile?.cpf,
    companyCnpj: organization.company?.cnpj,
    companyLegalName: organization.company?.razaoSocial,
    companyTradeName: organization.company?.nomeFantasia,
    companyTaxStatus: organization.company?.situacao,
    companyCity: organization.company?.municipio,
    companyState: organization.company?.uf,
  })

  return {
    id: organization.id,
    name: organization.name,
    slug: organization.slug,
    logo: organization.logo,
    createdAt: organization.createdAt,
    updatedAt: organization.updatedAt,
    organizationType: fiscal.organizationType,
    documentType: fiscal.documentType,
    documentNumber: fiscal.documentNumber,
    legalName: fiscal.legalName,
    tradeName: fiscal.tradeName,
    taxStatus: fiscal.taxStatus,
    city: fiscal.city,
    state: fiscal.state,
    organizationId: organization.id,
    currentUserRole: input.role ?? 'user',
    currentUserPermissions: effective.effectivePermissions,
    currentUserPermissionOverrides: {
      allow: effective.allowOverrides,
      deny: effective.denyOverrides,
    },
  }
}

export async function updateOrganizationMe(input: {
  organizationId: string
  userId: string
  role?: string
  data: UpdateOrganizationInput
}): Promise<
  | {
      id: string
      name: string
      slug: string
      logo: string | null
      createdAt: Date
      updatedAt: Date
      organizationType: IdentityType | null
      documentType: DocumentType | null
      documentNumber: string | null
      organizationId: string
      currentUserRole: string
    }
  | ServiceError
> {
  const current = await prisma.organization.findUnique({
    where: { id: input.organizationId },
    select: {
      name: true,
      profile: { select: { cpf: true } },
      company: { select: { cnpj: true } },
    },
  })

  const currentIdentity = resolveIdentitySnapshot({
    profileCpf: current?.profile?.cpf,
    companyCnpj: current?.company?.cnpj,
  })

  const nextOrganizationType = (input.data.organizationType ?? currentIdentity.organizationType) as
    | IdentityType
    | null
    | undefined
  const nextDocumentType = (
    input.data.documentType === undefined ? currentIdentity.documentType : input.data.documentType
  ) as DocumentType | null | undefined
  const nextDocumentNumber =
    input.data.documentNumber === undefined ? currentIdentity.documentNumber : input.data.documentNumber

  const identityValidation = validateIdentityDocument({
    identityType: nextOrganizationType,
    documentType: nextDocumentType,
    documentNumber: nextDocumentNumber,
  })

  if (!identityValidation.valid) {
    return { error: identityValidation.error, status: 400 }
  }

  const normalizedDocument = identityValidation.normalizedDocument
  const isUpdatingToNewCompanyIdentity =
    nextOrganizationType === 'pessoa_juridica' &&
    (!!normalizedDocument &&
      (currentIdentity.organizationType !== 'pessoa_juridica' ||
        currentIdentity.documentNumber !== normalizedDocument))

  if (isUpdatingToNewCompanyIdentity && !input.data.companyLookupData) {
    return {
      error: 'Dados da Receita Federal são obrigatórios para atualizar pessoa jurídica.',
      status: 400,
    }
  }

  if (nextOrganizationType === 'pessoa_juridica' && input.data.companyLookupData && normalizedDocument) {
    const lookupCnpj = normalizeDocumentNumber(input.data.companyLookupData.cnpj)
    if (lookupCnpj !== normalizedDocument) {
      return { error: 'CNPJ consultado difere do documento informado.', status: 400 }
    }
  }

  const before = {
    name: current?.name ?? null,
    organizationType: currentIdentity.organizationType,
    documentType: currentIdentity.documentType,
    documentNumber: currentIdentity.documentNumber,
  }

  const resolvedOrganizationName =
    nextOrganizationType === 'pessoa_juridica'
      ? resolveCompanyName({
          companyLookupData: input.data.companyLookupData,
          explicitName: input.data.name,
          fallbackName: current?.name ?? 'Minha Organização',
        })
      : input.data.name

  let updatedOrganization: {
    id: string
    name: string
    slug: string
    logo: string | null
    createdAt: Date
    updatedAt: Date
    profile: { cpf: string | null } | null
    company: { cnpj: string } | null
  } | null

  try {
    updatedOrganization = await prisma.$transaction(async (tx) => {
      const updated = await tx.organization.update({
        where: { id: input.organizationId },
        data: {
          ...(resolvedOrganizationName !== undefined ? { name: resolvedOrganizationName } : {}),
        },
      })

      if (nextOrganizationType === 'pessoa_fisica') {
        await tx.organizationProfile.upsert({
          where: { organizationId: input.organizationId },
          update: { cpf: normalizedDocument },
          create: {
            organizationId: input.organizationId,
            cpf: normalizedDocument,
            onboardingStatus: 'skipped',
          },
        })

        await tx.organizationCompany.deleteMany({
          where: { organizationId: input.organizationId },
        })
      } else if (nextOrganizationType === 'pessoa_juridica') {
        if (!normalizedDocument) {
          throw new Error('documentNumber é obrigatório para pessoa jurídica.')
        }

        const companyPersistenceData = input.data.companyLookupData
          ? buildCompanyPersistenceData({
              companyLookupData: input.data.companyLookupData,
              fallbackName: resolvedOrganizationName ?? updated.name,
              userId: input.userId,
            })
          : null

        await tx.organizationCompany.upsert({
          where: { organizationId: input.organizationId },
          update:
            companyPersistenceData ??
            {
              cnpj: normalizedDocument,
              ...(resolvedOrganizationName !== undefined
                ? { razaoSocial: resolvedOrganizationName, nomeFantasia: resolvedOrganizationName }
                : {}),
            },
          create: companyPersistenceData
            ? {
                organizationId: input.organizationId,
                ...companyPersistenceData,
              }
            : {
                organizationId: input.organizationId,
                cnpj: normalizedDocument,
                razaoSocial: resolvedOrganizationName ?? updated.name,
                nomeFantasia: resolvedOrganizationName ?? updated.name,
                cnaeCode: '',
                cnaeDescription: '',
                municipio: '',
                uf: '',
                authorizedByUserId: input.userId,
              },
        })

        await tx.organizationProfile.upsert({
          where: { organizationId: input.organizationId },
          update: { cpf: null },
          create: {
            organizationId: input.organizationId,
            cpf: null,
            onboardingStatus: 'skipped',
          },
        })
      } else {
        await tx.organizationProfile.upsert({
          where: { organizationId: input.organizationId },
          update: { cpf: null },
          create: {
            organizationId: input.organizationId,
            cpf: null,
            onboardingStatus: 'skipped',
          },
        })

        await tx.organizationCompany.deleteMany({
          where: { organizationId: input.organizationId },
        })
      }

      return tx.organization.findUnique({
        where: { id: input.organizationId },
        select: {
          id: true,
          name: true,
          slug: true,
          logo: true,
          createdAt: true,
          updatedAt: true,
          profile: {
            select: {
              cpf: true,
            },
          },
          company: {
            select: {
              cnpj: true,
            },
          },
        },
      })
    })
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
      return { error: 'Documento já vinculado a outra organização.', status: 409 }
    }

    logger.error({ err: error }, '[organization.service] failed to update fiscal identity')
    return { error: 'Erro ao atualizar organização.', status: 500 }
  }

  if (!updatedOrganization) {
    return { error: 'Organização não encontrada', status: 404 }
  }

  const updatedIdentity = resolveIdentitySnapshot({
    profileCpf: updatedOrganization.profile?.cpf,
    companyCnpj: updatedOrganization.company?.cnpj,
  })

  void auditService.log({
    organizationId: input.organizationId,
    userId: input.userId,
    action: 'organization.updated',
    resourceType: 'organization',
    resourceId: input.organizationId,
    before,
    after: {
      name: updatedOrganization.name,
      organizationType: updatedIdentity.organizationType,
      documentType: updatedIdentity.documentType,
      documentNumber: updatedIdentity.documentNumber,
    },
  })

  return {
    id: updatedOrganization.id,
    name: updatedOrganization.name,
    slug: updatedOrganization.slug,
    logo: updatedOrganization.logo,
    createdAt: updatedOrganization.createdAt,
    updatedAt: updatedOrganization.updatedAt,
    organizationType: updatedIdentity.organizationType,
    documentType: updatedIdentity.documentType,
    documentNumber: updatedIdentity.documentNumber,
    organizationId: updatedOrganization.id,
    currentUserRole: input.role ?? 'user',
  }
}

export async function getOrganizationCompletion(input: {
  userId: string
  activeOrganizationId?: string | null
}) {
  const memberships = await prisma.member.findMany({
    where: { userId: input.userId },
    select: { organizationId: true },
    orderBy: { createdAt: 'asc' },
    take: 1,
  })

  const firstOrganizationId = memberships[0]?.organizationId ?? null

  const hasActiveMembership = input.activeOrganizationId
    ? await prisma.member.findFirst({
        where: {
          userId: input.userId,
          organizationId: input.activeOrganizationId,
        },
        select: { id: true },
      })
    : null

  const organizationId =
    (hasActiveMembership ? input.activeOrganizationId : null) ?? firstOrganizationId ?? null

  if (!organizationId) {
    return {
      hasOrganization: false,
      identityComplete: false,
      blockedModules: ['whatsapp', 'metaAds'],
    }
  }

  const identity = await getOrganizationIdentityStatus(organizationId)

  return {
    hasOrganization: true,
    organizationId,
    identityComplete: identity.identityComplete,
    entityType: identity.entityType,
    blockedModules: identity.identityComplete ? [] : ['whatsapp', 'metaAds'],
  }
}
