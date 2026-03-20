import { WelcomeActivationChecklist } from './welcome-activation-checklist'
import { WelcomeOnboardingForm } from './welcome-onboarding-form'

type WelcomePageContentProps = {
  state: {
    ownerName: string | null
    organization: { id: string; name: string } | null
    projects: Array<{ id: string; name: string }>
    activeProjectId: string | null
    activeProjectName: string | null
    trialEndsAt: string | null
    trialExpired: boolean
    trialDaysRemaining: number | null
    checklist: {
      whatsappConnected: boolean
      metaAdsConnected: boolean
      trackedConversationDetected: boolean
    }
  }
}

export function WelcomePageContent({ state }: WelcomePageContentProps) {
  const needsLightweightOnboarding = !state.organization || state.projects.length === 0

  return (
    <div className="mx-auto grid w-full max-w-4xl gap-8 px-4 py-12 sm:px-6 lg:px-8">
      <div className="space-y-3">
        <p className="text-sm font-semibold uppercase tracking-[0.18em] text-emerald-600">
          Ativação inicial
        </p>
        <h1 className="text-4xl font-bold tracking-tight text-foreground">
          {needsLightweightOnboarding
            ? 'Vamos preparar sua empresa'
            : 'Seu trial já está ativo'}
        </h1>
        <p className="max-w-2xl text-base text-muted-foreground sm:text-lg">
          {needsLightweightOnboarding
            ? 'Crie sua organização e comece a validar o WhaTrack em uma operação real.'
            : 'Seu próximo passo é conectar WhatsApp e Meta Ads da sua operação para chegar ao activation milestone.'}
        </p>
      </div>

      {needsLightweightOnboarding ? (
        <WelcomeOnboardingForm
          defaultOwnerName={state.ownerName ?? ''}
          defaultOrganizationName={state.organization?.name ?? ''}
        />
      ) : (
        <WelcomeActivationChecklist
          projectName={state.activeProjectName ?? state.projects[0]?.name ?? 'Operação principal'}
          trialEndsAt={state.trialEndsAt}
          trialExpired={state.trialExpired}
          trialDaysRemaining={state.trialDaysRemaining}
          checklist={state.checklist}
        />
      )}
    </div>
  )
}
