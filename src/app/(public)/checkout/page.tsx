import { redirect } from 'next/navigation'
import { cookies } from 'next/headers'

import { getServerSession } from '@/server/auth/server-session'
import { ORGANIZATION_COOKIE, PROJECT_COOKIE } from '@/lib/constants/http-headers'
import { prisma } from '@/lib/db/prisma'
import { listPublicBillingPlans } from '@/services/billing/billing-plan-catalog.service'
import { CheckoutPageContent } from './checkout-page-content'

export const dynamic = 'force-dynamic'

export default async function CheckoutPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>
}) {
  const session = await getServerSession()

  if (!session) {
    redirect('/sign-in')
  }

  const cookieStore = await cookies()
  const organizationId = cookieStore.get(ORGANIZATION_COOKIE)?.value
  const projectId = cookieStore.get(PROJECT_COOKIE)?.value

  if (!organizationId || !projectId) {
    redirect('/sign-up')
  }

  // If checkout was already completed (asaasId set), redirect to dashboard
  const [subscription, org] = await Promise.all([
    prisma.billingSubscription.findUnique({
      where: { organizationId },
      select: { asaasId: true, isActive: true },
    }),
    prisma.organization.findUnique({
      where: { id: organizationId },
      select: { slug: true },
    }),
  ])

  const orgSlug = org?.slug ?? ''

  if (subscription?.isActive || subscription?.asaasId) {
    redirect(`/${orgSlug}/default`)
  }

  // Resolve cpfCnpj from stored fiscal data
  const [profile, company] = await Promise.all([
    prisma.organizationProfile.findUnique({
      where: { organizationId },
      select: { cpf: true },
    }),
    prisma.organizationCompany.findUnique({
      where: { organizationId },
      select: { cnpj: true },
    }),
  ])
  const cpfCnpj = profile?.cpf ?? company?.cnpj ?? ''

  const plans = await listPublicBillingPlans()
  const params = await searchParams
  const campaignSlug = typeof params.campaign === 'string' ? params.campaign : undefined

  return (
    <CheckoutPageContent
      plans={plans}
      campaignSlug={campaignSlug}
      cpfCnpj={cpfCnpj}
      organizationId={organizationId}
      orgSlug={orgSlug}
    />
  )
}
