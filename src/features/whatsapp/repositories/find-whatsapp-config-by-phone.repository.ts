import "server-only"
import { prisma } from '@/lib/db/prisma'

export async function findWhatsAppConfigByPhoneId(phoneId: string, organizationId: string) {
  return prisma.whatsAppConfig.findFirst({
    where: { phoneId, organizationId },
    select: { phoneId: true },
  })
}
