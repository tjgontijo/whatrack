import { describe, expect, it } from 'vitest'

import { welcomeOnboardingSchema } from '@/schemas/onboarding/welcome-onboarding'

describe('welcomeOnboardingSchema', () => {
  it('accepts the lightweight onboarding payload', () => {
    const parsed = welcomeOnboardingSchema.safeParse({
      ownerName: 'Thiago Gontijo',
      organizationName: 'Whatrack',
    })

    expect(parsed.success).toBe(true)
  })

  it('rejects incomplete organization onboarding payloads', () => {
    const parsed = welcomeOnboardingSchema.safeParse({
      ownerName: 'A',
      organizationName: '',
    })

    expect(parsed.success).toBe(false)
  })
})
