import { z } from 'zod'

export const createOrganizationRoleSchema = z.object({
  key: z.string().min(2).max(64).optional(),
  name: z.string().min(2).max(80),
  description: z.string().max(240).nullable().optional(),
  permissions: z.array(z.string()).default([]),
})

export const updateOrganizationRoleSchema = z
  .object({
    name: z.string().min(2).max(80).optional(),
    description: z.string().max(240).nullable().optional(),
    permissions: z.array(z.string()).optional(),
  })
  .refine((value) => Object.keys(value).length > 0, {
    message: 'Informe ao menos um campo para atualização.',
  })

export type CreateOrganizationRoleInput = z.infer<typeof createOrganizationRoleSchema>
export type UpdateOrganizationRoleInput = z.infer<typeof updateOrganizationRoleSchema>
