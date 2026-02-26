import { z } from 'zod'

export const updateMeAccountSchema = z
  .object({
    name: z.string().min(2).max(120).optional(),
    email: z.string().email().optional(),
    phone: z.string().min(8).max(25).optional().nullable(),
  })
  .refine((input) => Object.keys(input).length > 0, {
    message: 'Informe ao menos um campo para atualização.',
  })

export const changeMeAccountPasswordSchema = z.object({
  currentPassword: z.string().min(1, 'Current password is required'),
  newPassword: z.string().min(8, 'New password must have at least 8 characters'),
  revokeOtherSessions: z.boolean().optional(),
})

export type UpdateMeAccountInput = z.infer<typeof updateMeAccountSchema>
export type ChangeMeAccountPasswordInput = z.infer<typeof changeMeAccountPasswordSchema>
