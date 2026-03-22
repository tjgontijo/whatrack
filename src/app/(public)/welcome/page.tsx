import { redirect } from 'next/navigation'

import { getServerSession } from '@/server/auth/server-session'
import { resolveDefaultWorkspacePath } from '@/server/navigation/resolve-default-workspace-path'
import { getWelcomeState } from '@/services/onboarding/welcome-query.service'
import { WelcomePageContent } from '@/components/welcome/welcome-page-content'

export const dynamic = 'force-dynamic'

export default async function WelcomePage() {
  const session = await getServerSession()

  if (!session) {
    redirect('/sign-in?intent=start-trial')
  }

  const state = await getWelcomeState({ userId: session.user.id })

  if (state.organization && state.projects.length > 0) {
    const defaultWorkspacePath = await resolveDefaultWorkspacePath(session.user.id)
    redirect(defaultWorkspacePath ?? '/welcome')
  }

  return (
    <div className="min-h-screen bg-background">
      <WelcomePageContent state={state} />
    </div>
  )
}
