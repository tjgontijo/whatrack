'use client'

import { useRouter } from 'next/navigation'
import { OnboardingOverlay } from '@/components/onboarding/onboarding-overlay'

export default function OnboardingPage() {
  const router = useRouter()

  const handleComplete = () => {    
    router.push('/dashboard')
  }

  const handleSkip = () => {    
    router.push('/dashboard')
  }

  return (
    <OnboardingOverlay 
      onComplete={handleComplete}
      onSkip={handleSkip}
    />
  )
}