import 'server-only'

import { prisma } from '@/lib/db/prisma'
import { INTEGRATION_IDENTITY_REQUIRED_MESSAGE } from '@/lib/constants/http-headers'
import {
  normalizeDocumentNumber,
  validateDocumentByType,
} from '@/server/organization/organization-document'

export { INTEGRATION_IDENTITY_REQUIRED_MESSAGE }

export type OrganizationIdentityStatus = {
  organizationId: string
  identityComplete: boolean
  entityType: 'individual' | 'company' | null
  cpf: string | null
  cnpj: string | null
}

export function requiresIdentityForIntegrationPath(pathname: string): boolean {
  return pathname.startsWith('/api/v1/whatsapp') || pathname.startsWith('/api/v1/meta-ads')
}

export async function getOrganizationIdentityStatus(
  organizationId: string
): Promise<OrganizationIdentityStatus> {
  const organization = await prisma.organization.findUnique({
    where: { id: organizationId },
    select: {
      id: true,
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
    return {
      organizationId,
      identityComplete: false,
      entityType: null,
      cpf: null,
      cnpj: null,
    }
  }

  const cpf = normalizeDocumentNumber(organization.profile?.cpf)
  const cnpj = normalizeDocumentNumber(organization.company?.cnpj)

  if (cnpj && validateDocumentByType('cnpj', cnpj)) {
    return {
      organizationId: organization.id,
      identityComplete: true,
      entityType: 'company',
      cpf: null,
      cnpj,
    }
  }

  if (cpf && validateDocumentByType('cpf', cpf)) {
    return {
      organizationId: organization.id,
      identityComplete: true,
      entityType: 'individual',
      cpf,
      cnpj: null,
    }
  }

  return {
    organizationId: organization.id,
    identityComplete: false,
    entityType: null,
    cpf: cpf ?? null,
    cnpj: cnpj ?? null,
  }
}

export async function isOrganizationIdentityComplete(organizationId: string): Promise<boolean> {
  const status = await getOrganizationIdentityStatus(organizationId)
  return status.identityComplete
}
