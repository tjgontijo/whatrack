import { prisma } from '@/lib/db/prisma'
import { AsaasClient } from './asaas-client'

interface AsaasCustomer {
  id: string
}

export interface BillingCustomerContext {
  organizationId: string
  userId: string
  email: string
  name: string
  phone?: string
  cpfCnpj?: string
  asaasCustomerId?: string | null
}

export class BillingCustomerService {
  static async resolveOrganizationCustomerContext(input: {
    organizationId: string
    userId: string
    cpfCnpj?: string
  }) {
    const [organization, company, profile, user] = await Promise.all([
      prisma.organization.findUnique({
        where: { id: input.organizationId },
        select: { id: true, name: true, asaasCustomerId: true },
      }),
      prisma.organizationCompany.findUnique({
        where: { organizationId: input.organizationId },
        select: { cnpj: true, email: true, telefone: true, nomeFantasia: true, razaoSocial: true },
      }),
      prisma.organizationProfile.findUnique({
        where: { organizationId: input.organizationId },
        select: { cpf: true },
      }),
      prisma.user.findUnique({
        where: { id: input.userId },
        select: { id: true, email: true, name: true, phone: true },
      }),
    ])

    if (!organization || !user) {
      throw new Error('Organization or user not found for billing')
    }

    return {
      organizationId: organization.id,
      userId: user.id,
      email: company?.email || user.email,
      name: company?.nomeFantasia || company?.razaoSocial || organization.name || user.name,
      phone: company?.telefone || user.phone || undefined,
      cpfCnpj: input.cpfCnpj || company?.cnpj || profile?.cpf || undefined,
      asaasCustomerId: organization.asaasCustomerId,
    } satisfies BillingCustomerContext
  }

  static async ensureCustomer(input: { organizationId: string; userId: string; cpfCnpj?: string }) {
    const context = await this.resolveOrganizationCustomerContext(input)

    if (context.asaasCustomerId) {
      return context
    }

    const customer = await AsaasClient.post<AsaasCustomer>('/customers', {
      name: context.name,
      email: context.email,
      phone: context.phone,
      cpfCnpj: context.cpfCnpj,
      externalReference: context.organizationId,
    })

    await prisma.organization.update({
      where: { id: context.organizationId },
      data: { asaasCustomerId: customer.id },
    })

    return {
      ...context,
      asaasCustomerId: customer.id,
    }
  }
}
