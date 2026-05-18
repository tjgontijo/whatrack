import { WelcomeOnboardingForm } from './welcome-onboarding-form'

type WelcomePageContentProps = {
  state: {
    organization: { id: string; name: string; slug: string } | null
    projects: Array<{ id: string; name: string; slug: string }>
  }
}

export function WelcomePageContent({ state }: WelcomePageContentProps) {
  return (
    <div className='flex min-h-screen items-center justify-center px-4 py-12'>
      <div className='fade-in slide-in-from-bottom-4 w-full max-w-sm animate-in space-y-8 duration-500'>
        <h1 className='text-center font-bold text-3xl text-foreground tracking-tight'>
          Crie sua organização
        </h1>

        <WelcomeOnboardingForm defaultOrganizationName={state.organization?.name ?? ''} />
      </div>
    </div>
  )
}
