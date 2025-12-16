import 'server-only'

import { prisma } from '@/lib/prisma'

/**
 * Verifica se uma organização tem o onboarding completo
 * Retorna true se a organização existe e tem onboardingCompleted = true
 */
export async function isOrganizationComplete(organizationId: string): Promise<boolean> {
  try {
    const organization = await prisma.organization.findUnique({
      where: { id: organizationId },
      select: { profile: { select: { onboardingCompleted: true } } },
    })

    return organization?.profile?.onboardingCompleted ?? false
  } catch (error) {
    console.error('[isOrganizationComplete] Erro ao verificar organização:', error)
    return false
  }
}
