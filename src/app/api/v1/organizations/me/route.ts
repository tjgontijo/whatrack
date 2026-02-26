import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { Prisma } from '@prisma/client'

import { prisma } from '@/lib/db/prisma'
import { auditService } from '@/services/audit/audit.service'
import { validateFullAccess, validateOwnerAccess } from '@/server/auth/validate-organization-access'
import { legacyOrganizationJson } from '@/server/http/legacy-organization'
import { listEffectivePermissions } from '@/server/organization/organization-rbac.service'
import {
  type DocumentType,
  type IdentityType,
  normalizeDocumentNumber,
  validateIdentityDocument,
} from '@/lib/document/document-identity'

const legacyUpdateSchema = z
  .object({
    name: z.string().min(2).max(140).optional(),
    organizationType: z.enum(['pessoa_fisica', 'pessoa_juridica']).nullable().optional(),
    teamType: z.enum(['pessoa_fisica', 'pessoa_juridica']).nullable().optional(),
    documentType: z.enum(['cpf', 'cnpj']).nullable().optional(),
    documentNumber: z.string().max(32).nullable().optional(),
  })
  .refine((input) => Object.keys(input).length > 0, {
    message: 'Informe ao menos um campo para atualização.',
  })

export async function GET(req: NextRequest) {
  const access = await validateFullAccess(req)
  const organizationId = access.organizationId ?? access.teamId
  if (!access.hasAccess || !organizationId || !access.memberId) {
    return legacyOrganizationJson(
      { error: access.error ?? 'Acesso negado' },
      { status: 403 },
      '/api/v1/organizations/me'
    )
  }

  const org = await prisma.organization.findUnique({
    where: { id: organizationId },
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

  if (!org) {
    return legacyOrganizationJson(
      { error: 'Organização não encontrada' },
      { status: 404 },
      '/api/v1/organizations/me'
    )
  }

  const effective = await listEffectivePermissions(access.memberId)
  const cnpj = normalizeDocumentNumber(org.company?.cnpj)
  const cpf = normalizeDocumentNumber(org.profile?.cpf)
  const organizationType: IdentityType | null = cnpj
    ? 'pessoa_juridica'
    : cpf
      ? 'pessoa_fisica'
      : null
  const documentType: DocumentType | null = cnpj ? 'cnpj' : cpf ? 'cpf' : null
  const documentNumber = cnpj ?? cpf ?? null

  return legacyOrganizationJson(
    {
      id: org.id,
      name: org.name,
      slug: org.slug,
      logo: org.logo,
      createdAt: org.createdAt,
      updatedAt: org.updatedAt,
      organizationType,
      teamType: organizationType,
      documentType,
      documentNumber,
      organizationId: org.id,
      currentUserRole: access.role ?? 'user',
      currentUserPermissions: effective.effectivePermissions,
      currentUserPermissionOverrides: {
        allow: effective.allowOverrides,
        deny: effective.denyOverrides,
      },
    },
    { status: 200 },
    '/api/v1/organizations/me'
  )
}

export async function PUT(req: NextRequest) {
  const access = await validateOwnerAccess(req)
  const organizationId = access.organizationId ?? access.teamId
  const userId = access.userId
  if (!access.hasAccess || !organizationId || !userId) {
    return legacyOrganizationJson(
      { error: access.error ?? 'Acesso negado' },
      { status: 403 },
      '/api/v1/organizations/me'
    )
  }

  const body = await req.json().catch(() => null)
  const parsed = legacyUpdateSchema.safeParse(body)
  if (!parsed.success) {
    return legacyOrganizationJson(
      { error: 'Dados inválidos', details: parsed.error.flatten() },
      { status: 400 },
      '/api/v1/organizations/me'
    )
  }

  const current = await prisma.organization.findUnique({
    where: { id: organizationId },
    select: {
      name: true,
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

  const currentCnpj = normalizeDocumentNumber(current?.company?.cnpj)
  const currentCpf = normalizeDocumentNumber(current?.profile?.cpf)
  const currentOrganizationType: IdentityType | null = currentCnpj
    ? 'pessoa_juridica'
    : currentCpf
      ? 'pessoa_fisica'
      : null
  const currentDocumentType: DocumentType | null = currentCnpj ? 'cnpj' : currentCpf ? 'cpf' : null
  const currentDocumentNumber = currentCnpj ?? currentCpf ?? null

  const nextOrganizationType = (
    parsed.data.organizationType ?? parsed.data.teamType ?? currentOrganizationType
  ) as IdentityType | null | undefined
  const nextDocumentType = (
    parsed.data.documentType === undefined ? currentDocumentType : parsed.data.documentType
  ) as DocumentType | null | undefined
  const nextDocumentNumber =
    parsed.data.documentNumber === undefined ? currentDocumentNumber : parsed.data.documentNumber

  const identityValidation = validateIdentityDocument({
    identityType: nextOrganizationType,
    documentType: nextDocumentType,
    documentNumber: nextDocumentNumber,
  })

  if (!identityValidation.valid) {
    return legacyOrganizationJson(
      { error: identityValidation.error },
      { status: 400 },
      '/api/v1/organizations/me'
    )
  }

  const before = {
    name: current?.name ?? null,
    organizationType: currentOrganizationType,
    documentType: currentDocumentType,
    documentNumber: currentDocumentNumber,
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
  } | null = null

  try {
    updatedOrganization = await prisma.$transaction(async (tx) => {
      const updated = await tx.organization.update({
        where: { id: organizationId },
        data: {
          ...(parsed.data.name !== undefined ? { name: parsed.data.name } : {}),
        },
      })

      const normalizedDocument = identityValidation.normalizedDocument

      if (nextOrganizationType === 'pessoa_fisica') {
        await tx.organizationProfile.upsert({
          where: { organizationId },
          update: {
            cpf: normalizedDocument,
          },
          create: {
            organizationId,
            cpf: normalizedDocument,
            onboardingStatus: 'skipped',
          },
        })

        await tx.organizationCompany.deleteMany({
          where: { organizationId },
        })
      } else if (nextOrganizationType === 'pessoa_juridica') {
        if (!normalizedDocument) {
          throw new Error('documentNumber é obrigatório para pessoa jurídica.')
        }

        await tx.organizationCompany.upsert({
          where: { organizationId },
          update: {
            cnpj: normalizedDocument,
            ...(parsed.data.name !== undefined
              ? { razaoSocial: parsed.data.name, nomeFantasia: parsed.data.name }
              : {}),
          },
          create: {
            organizationId,
            cnpj: normalizedDocument,
            razaoSocial: parsed.data.name ?? updated.name,
            nomeFantasia: parsed.data.name ?? updated.name,
            cnaeCode: '',
            cnaeDescription: '',
            municipio: '',
            uf: '',
            authorizedByUserId: userId,
          },
        })

        await tx.organizationProfile.upsert({
          where: { organizationId },
          update: {
            cpf: null,
          },
          create: {
            organizationId,
            cpf: null,
            onboardingStatus: 'skipped',
          },
        })
      } else {
        await tx.organizationProfile.upsert({
          where: { organizationId },
          update: {
            cpf: null,
          },
          create: {
            organizationId,
            cpf: null,
            onboardingStatus: 'skipped',
          },
        })

        await tx.organizationCompany.deleteMany({
          where: { organizationId },
        })
      }

      return tx.organization.findUnique({
        where: { id: organizationId },
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
      return legacyOrganizationJson(
        { error: 'Documento já vinculado a outra organização.' },
        { status: 409 },
        '/api/v1/organizations/me'
      )
    }

    console.error('[organizations/me] failed to update fiscal identity', error)
    return legacyOrganizationJson(
      { error: 'Erro ao atualizar organização.' },
      { status: 500 },
      '/api/v1/organizations/me'
    )
  }

  if (!updatedOrganization) {
    return legacyOrganizationJson(
      { error: 'Organização não encontrada' },
      { status: 404 },
      '/api/v1/organizations/me'
    )
  }

  const updatedCnpj = normalizeDocumentNumber(updatedOrganization.company?.cnpj)
  const updatedCpf = normalizeDocumentNumber(updatedOrganization.profile?.cpf)
  const updatedOrganizationType: IdentityType | null = updatedCnpj
    ? 'pessoa_juridica'
    : updatedCpf
      ? 'pessoa_fisica'
      : null
  const updatedDocumentType: DocumentType | null = updatedCnpj ? 'cnpj' : updatedCpf ? 'cpf' : null
  const updatedDocumentNumber = updatedCnpj ?? updatedCpf ?? null

  void auditService.log({
    organizationId,
    userId: access.userId,
    action: 'organization.updated',
    resourceType: 'organization',
    resourceId: organizationId,
    before,
    after: {
      name: updatedOrganization.name,
      organizationType: updatedOrganizationType,
      documentType: updatedDocumentType,
      documentNumber: updatedDocumentNumber,
    },
  })

  return legacyOrganizationJson(
    {
      id: updatedOrganization.id,
      name: updatedOrganization.name,
      slug: updatedOrganization.slug,
      logo: updatedOrganization.logo,
      createdAt: updatedOrganization.createdAt,
      updatedAt: updatedOrganization.updatedAt,
      organizationType: updatedOrganizationType,
      teamType: updatedOrganizationType,
      documentType: updatedDocumentType,
      documentNumber: updatedDocumentNumber,
      organizationId: updatedOrganization.id,
      currentUserRole: access.role ?? 'user',
    },
    { status: 200 },
    '/api/v1/organizations/me'
  )
}

export async function PATCH(req: NextRequest) {
  return PUT(req)
}
