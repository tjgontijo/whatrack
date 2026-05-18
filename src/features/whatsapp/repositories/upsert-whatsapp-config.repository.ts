import "server-only"
import { prisma } from '@/lib/db/prisma'

export interface UpsertWhatsAppConfigInput {
  organizationId: string
  projectId: string
  wabaId: string
  phoneId: string | undefined
  accessToken: string | null
  accessTokenEncrypted: boolean
  tokenExpiresAt: Date | null
  authorizationCode: string | undefined
  verifiedName: string | undefined
  displayPhone: string | undefined
}

export async function upsertWhatsAppConfig(input: UpsertWhatsAppConfigInput) {
  const phoneKey = input.phoneId || `pending_${input.wabaId}`

  return prisma.whatsAppConfig.upsert({
    where: { phoneId: phoneKey },
    update: {
      projectId: input.projectId,
      wabaId: input.wabaId,
      accessToken: input.accessToken || undefined,
      accessTokenEncrypted: input.accessTokenEncrypted,
      tokenExpiresAt: input.tokenExpiresAt,
      authorizationCode: input.authorizationCode,
      status: 'connected',
      verifiedName: input.verifiedName,
      displayPhone: input.displayPhone,
      connectedAt: new Date(),
      disconnectedAt: null,
      disconnectedBy: null,
      tokenStatus: 'valid',
      updatedAt: new Date(),
    },
    create: {
      organizationId: input.organizationId,
      projectId: input.projectId,
      wabaId: input.wabaId,
      phoneId: input.phoneId,
      accessToken: input.accessToken,
      accessTokenEncrypted: input.accessTokenEncrypted,
      tokenExpiresAt: input.tokenExpiresAt,
      authorizationCode: input.authorizationCode,
      status: 'connected',
      verifiedName: input.verifiedName,
      displayPhone: input.displayPhone,
      connectedAt: new Date(),
      tokenStatus: 'valid',
    },
    select: { id: true, wabaId: true, phoneId: true, status: true },
  })
}
