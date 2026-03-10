import { describe, expect, it } from 'vitest'

import { welcomeOnboardingSchema } from '@/schemas/onboarding/welcome-onboarding'

describe('welcomeOnboardingSchema', () => {
  it('accepts the lightweight onboarding payload', () => {
    const parsed = welcomeOnboardingSchema.safeParse({
      ownerName: 'Thiago Gontijo',
      agencyName: 'Escala Ads',
      projectName: 'Cliente Alpha',
    })

    expect(parsed.success).toBe(true)
  })

  it('rejects incomplete agency onboarding payloads', () => {
    const parsed = welcomeOnboardingSchema.safeParse({
      ownerName: 'A',
      agencyName: '',
      projectName: 'X',
    })

    expect(parsed.success).toBe(false)
  })
})
