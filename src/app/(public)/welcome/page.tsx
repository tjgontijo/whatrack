import { redirect } from 'next/navigation'
import { WelcomePageContent } from '@/features/onboarding/components/welcome-page-content'
import { getWelcomeState } from '@/features/onboarding/services/welcome-query.service'
import { getServerSession } from '@/server/auth/server-session'
import { resolveDefaultWorkspacePath } from '@/server/navigation/resolve-default-workspace-path'


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
    <div className='min-h-screen bg-background'>
      <WelcomePageContent state={state} />
    </div>
  )
}
