import 'server-only'

import { prisma } from '@/lib/db/prisma'
import { logger } from '@/lib/utils/logger'

/**
 * Verifica se uma organização tem o onboarding completo ou foi pulado
 * Retorna true se onboardingStatus é 'completed' ou 'skipped'
 */
export async function isOrganizationComplete(organizationId: string): Promise<boolean> {
  try {
    const organization = await prisma.organization.findUnique({
      where: { id: organizationId },
      select: {
        profile: {
          select: {
            onboardingStatus: true,
          },
        },
      },
    })

    const status = organization?.profile?.onboardingStatus
    return status === 'completed' || status === 'skipped'
  } catch (error) {
    logger.error({ err: error }, '[isOrganizationComplete] Erro ao verificar organização')
    return false
  }
}
