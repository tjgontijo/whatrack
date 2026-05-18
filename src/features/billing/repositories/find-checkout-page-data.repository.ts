import "server-only"
import { prisma } from '@/lib/db/prisma'

export async function findCheckoutPageData(organizationId: string) {
  const [subscription, org, profile, company] = await Promise.all([
    prisma.billingSubscription.findUnique({
      where: { organizationId },
      select: { asaasId: true, isActive: true },
    }),
    prisma.organization.findUnique({
      where: { id: organizationId },
      select: { slug: true },
    }),
    prisma.organizationProfile.findUnique({
      where: { organizationId },
      select: { cpf: true },
    }),
    prisma.organizationCompany.findUnique({
      where: { organizationId },
      select: { cnpj: true },
    }),
  ])

  return { subscription, orgSlug: org?.slug ?? '', cpfCnpj: profile?.cpf ?? company?.cnpj ?? '' }
}
