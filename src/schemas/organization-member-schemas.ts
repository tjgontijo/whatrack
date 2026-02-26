import { z } from 'zod'

export const updateOrganizationMemberRoleSchema = z.object({
  role: z
    .string()
    .trim()
    .min(2)
    .max(64)
    .transform((value) => value.toLowerCase()),
})

export const updateOrganizationMemberOverridesSchema = z.object({
  allow: z.array(z.string()).default([]),
  deny: z.array(z.string()).default([]),
})

export type UpdateOrganizationMemberRoleInput = z.infer<typeof updateOrganizationMemberRoleSchema>
export type UpdateOrganizationMemberOverridesInput = z.infer<
  typeof updateOrganizationMemberOverridesSchema
>
