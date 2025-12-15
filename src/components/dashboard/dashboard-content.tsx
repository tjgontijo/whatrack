'use client'

import { useState, ReactNode } from 'react'
import { OnboardingBanner } from '@/components/onboarding/onboarding-banner'
import { OnboardingOverlay } from '@/components/onboarding/onboarding-overlay'

interface DashboardContentProps {
  organization: any
  userId: string
  children: ReactNode
}

export function DashboardContent({ organization, userId, children }: DashboardContentProps) {
  const [showOnboarding, setShowOnboarding] = useState(false)

  const handleCompleteOnboarding = () => {
    setShowOnboarding(false)
    // Recarregar a página para atualizar o estado da organização
    window.location.reload()
  }

  const handleSkipOnboarding = () => {
    setShowOnboarding(false)
  }

  const isOnboardingIncomplete = organization && organization.profile && !organization.profile.onboardingCompleted

  return (
    <>
      {isOnboardingIncomplete && (
        <OnboardingBanner onComplete={() => setShowOnboarding(true)} />
      )}
      
      {showOnboarding && (
        <OnboardingOverlay 
          onComplete={handleCompleteOnboarding}
          onSkip={handleSkipOnboarding}
        />
      )}
      
      {children}
    </>
  )
}
