import { redirect } from 'next/navigation'

import { MyAccountContent } from '@/components/dashboard/account/my-account-content'
import { getAccountSummary } from '@/services/account/account-summary.service'
import { getServerSession } from '@/server/auth/server-session'
import { getCurrentOrganizationId } from '@/server/organization/get-current-organization-id'

export default async function AccountPage() {
  const session = await getServerSession()

  if (!session) {
    redirect('/sign-in')
  }

  const organizationId = await getCurrentOrganizationId(session.user.id)
  const summary = await getAccountSummary({
    userId: session.user.id,
    organizationId,
  })

  return (
    <div className="mx-auto w-full max-w-5xl space-y-6 pt-8 first:pt-0">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Minha Conta</h1>
        <p className="text-muted-foreground text-sm">
          Gerencie seus dados pessoais, segurança, plano e detalhes da conta.
        </p>
      </div>

      <MyAccountContent
        key={`${summary.account?.updatedAt ?? 'account'}:${summary.organization?.updatedAt ?? 'organization'}:${summary.subscription?.id ?? 'subscription'}`}
        initialAccount={summary.account}
        initialOrganization={summary.organization}
        initialSubscription={summary.subscription}
      />
    </div>
  )
}
