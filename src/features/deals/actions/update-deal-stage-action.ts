'use server'

import { revalidatePath } from 'next/cache'
import { prisma } from '@/lib/db/prisma'
import { getServerSession } from '@/server/auth/server-session'

export async function updateDealStageAction(params: {
  dealId: string
  stageId: string
  organizationId: string
}) {
  const session = await getServerSession()

  if (!session) {
    throw new Error('Não autorizado')
  }

  // Verificar se o usuário pertence à organização
  const membership = await prisma.member.findFirst({
    where: {
      userId: session.user.id,
      organizationId: params.organizationId,
    },
  })

  if (!membership) {
    throw new Error('Permissão negada')
  }

  await prisma.deal.update({
    where: { id: params.dealId },
    data: { stageId: params.stageId },
  })

  revalidatePath('/whatsapp/inbox')
  
  return { success: true }
}
