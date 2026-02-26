import { z } from 'zod'

export const createOrganizationInvitationSchema = z.object({
  email: z.string().email(),
  role: z
    .string()
    .trim()
    .min(2)
    .max(64)
    .default('user')
    .transform((value) => value.toLowerCase()),
})

export type CreateOrganizationInvitationInput = z.infer<typeof createOrganizationInvitationSchema>
