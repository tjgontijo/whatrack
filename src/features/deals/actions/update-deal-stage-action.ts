'use server'

import { revalidatePath } from 'next/cache'
import { prisma } from '@/lib/db/prisma'
import { getServerSession } from '@/server/auth/server-session'
import { updateDealAndTrackCapi } from '../services/deal.service'

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

  const result = await updateDealAndTrackCapi({
    organizationId: params.organizationId,
    dealId: params.dealId,
    stageId: params.stageId,
  })

  if ('error' in result) {
    throw new Error(result.error)
  }

  revalidatePath('/whatsapp/inbox')
  
  return { success: true }
}
