import { Prisma } from '@prisma/client'

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
import type { UpdateOrganizationInput } from '@/schemas/organization-schemas'

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
        },
      },
    },
  })

  if (!organization) {
    return { error: 'Organização não encontrada', status: 404 }
  }

  const effective = await listEffectivePermissions(input.memberId)
  const identity = resolveIdentitySnapshot({
    profileCpf: organization.profile?.cpf,
    companyCnpj: organization.company?.cnpj,
  })

  return {
    id: organization.id,
    name: organization.name,
    slug: organization.slug,
    logo: organization.logo,
    createdAt: organization.createdAt,
    updatedAt: organization.updatedAt,
    organizationType: identity.organizationType,
    documentType: identity.documentType,
    documentNumber: identity.documentNumber,
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

  const before = {
    name: current?.name ?? null,
    organizationType: currentIdentity.organizationType,
    documentType: currentIdentity.documentType,
    documentNumber: currentIdentity.documentNumber,
  }

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
          ...(input.data.name !== undefined ? { name: input.data.name } : {}),
        },
      })

      const normalizedDocument = identityValidation.normalizedDocument

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

        await tx.organizationCompany.upsert({
          where: { organizationId: input.organizationId },
          update: {
            cnpj: normalizedDocument,
            ...(input.data.name !== undefined
              ? { razaoSocial: input.data.name, nomeFantasia: input.data.name }
              : {}),
          },
          create: {
            organizationId: input.organizationId,
            cnpj: normalizedDocument,
            razaoSocial: input.data.name ?? updated.name,
            nomeFantasia: input.data.name ?? updated.name,
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

    console.error('[organization.service] failed to update fiscal identity', error)
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
