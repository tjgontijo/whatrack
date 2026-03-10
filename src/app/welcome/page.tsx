import { redirect } from 'next/navigation'

import { getServerSession } from '@/server/auth/server-session'
import { getWelcomeState } from '@/services/onboarding/welcome-query.service'
import { WelcomePageContent } from '@/components/welcome/welcome-page-content'

export const dynamic = 'force-dynamic'

export default async function WelcomePage() {
  const session = await getServerSession()

  if (!session) {
    redirect('/sign-in?intent=start-trial')
  }

  const state = await getWelcomeState({
    userId: session.user.id,
    fallbackOwnerName: session.user.name ?? null,
  })

  const activationMilestoneReached =
    state.checklist.whatsappConnected && state.checklist.metaAdsConnected

  if (
    state.organization &&
    state.projects.length > 0 &&
    activationMilestoneReached &&
    !state.trialExpired
  ) {
    redirect('/dashboard')
  }

  return (
    <div className="min-h-screen bg-background">
      <WelcomePageContent state={state} />
    </div>
  )
}
