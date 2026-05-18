import "server-only"
import { prisma } from '@/lib/db/prisma'

export async function findOnboardingByTrackingCode(trackingCode: string) {
  return prisma.whatsAppOnboarding.findUnique({
    where: { trackingCode },
  })
}

export async function updateOnboardingPhoneData(
  trackingCode: string,
  data: { phoneNumberId: string; wabaId?: string }
) {
  return prisma.whatsAppOnboarding.update({
    where: { trackingCode },
    data: {
      phoneNumberId: data.phoneNumberId,
      ...(data.wabaId ? { wabaId: data.wabaId } : {}),
    },
  })
}
