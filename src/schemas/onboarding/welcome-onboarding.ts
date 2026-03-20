import { z } from 'zod'

export const welcomeOnboardingSchema = z.object({
  ownerName: z.string().trim().min(2).max(120),
  organizationName: z.string().trim().min(2).max(120),
})

export type WelcomeOnboardingInput = z.infer<typeof welcomeOnboardingSchema>
