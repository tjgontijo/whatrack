import { cookies } from 'next/headers'
import { redirect } from 'next/navigation'
import { findCheckoutPageData } from '@/features/billing/repositories/find-checkout-page-data.repository'
import { listPublicBillingPlans } from '@/features/billing/services/billing-plan-catalog.service'
import { ORGANIZATION_COOKIE, PROJECT_COOKIE } from '@/lib/constants/http-headers'
import { getServerSession } from '@/server/auth/server-session'
import { CheckoutPageContent } from './checkout-page-content'


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

  const { subscription, orgSlug, cpfCnpj } = await findCheckoutPageData(organizationId)

  if (subscription?.isActive || subscription?.asaasId) {
    redirect(`/${orgSlug}/default`)
  }

  const plans = await listPublicBillingPlans()
  const params = await searchParams
  const campaignSlug = typeof params.campaign === 'string' ? params.campaign : undefined
  const isTrialCheckout = params.intent === 'start-trial'

  return (
    <CheckoutPageContent
      plans={plans}
      campaignSlug={campaignSlug}
      isTrialCheckout={isTrialCheckout}
      cpfCnpj={cpfCnpj}
      organizationId={organizationId}
      orgSlug={orgSlug}
    />
  )
}
