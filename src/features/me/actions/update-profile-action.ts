'use server'

import { revalidatePath } from 'next/cache'
import {
  type UpdateMeAccountInput,
  updateMeAccountSchema,
} from '@/features/me/schemas/me-account.schemas'
import { prisma } from '@/lib/db/prisma'
import { getServerSession } from '@/server/auth/server-session'

export async function updateProfileAction(formData: UpdateMeAccountInput) {
  const session = await getServerSession()

  if (!session) {
    throw new Error('Não autorizado')
  }

  const validated = updateMeAccountSchema.parse(formData)

  await prisma.user.update({
    where: { id: session.user.id },
    data: {
      name: validated.name,
      email: validated.email,
      phone: validated.phone,
    },
  })

  revalidatePath('/settings/profile')
  
  return { success: true }
}
