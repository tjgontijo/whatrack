import { prisma } from '@/lib/db/prisma'
import { whatsappCache } from '@/services/whatsapp/cache.service'
import { whatsappAuditService } from '@/services/whatsapp/audit.service'
import { logger } from '@/lib/utils/logger'

/**
 * Onboarding Handler
 * Handles PARTNER_ADDED, PARTNER_REMOVED, PARTNER_REINSTATED events
 *
 * Flow:
 * 1. PARTNER_ADDED: Create WhatsAppConnection + update WhatsAppOnboarding
 * 2. PARTNER_REMOVED: Mark connection as disconnected
 * 3. PARTNER_REINSTATED: Reactivate connection
 *
 * Cache strategy:
 * - Read from Redis/cache first
 * - Fallback to PostgreSQL if miss
 * - Invalidate cache on write
 */

export async function onboardingHandler(payload: any, eventType: string): Promise<void> {
  const change = payload.entry?.[0]?.changes?.[0]
  const value = change?.value

  if (!value) {
    throw new Error('Invalid payload: missing change.value')
  }

  const wabaInfo = value.waba_info
  const wabaId = wabaInfo?.waba_id
  const ownerBusinessId = wabaInfo?.owner_business_id
  const trackingCode = value.sessionInfo?.trackingCode

  if (!wabaId) {
    throw new Error('Invalid payload: missing waba_id')
  }

  logger.info(
    { eventType, wabaId, trackingCode, fullValue: value },
    `[OnboardingHandler] Event: ${eventType}, WABA: ${wabaId}, TrackingCode: ${trackingCode}`
  )

  // ============================================
  // Caso 1: TrackingCode presente (padrão)
  // ============================================
  if (trackingCode) {
    // L1: Try cache, L2: Fall back to DB
    const onboarding = await whatsappCache.getOnboarding(trackingCode)

    if (!onboarding) {
      throw new Error(`Onboarding not found: ${trackingCode}`)
    }

    // Validar expiração
    if (onboarding.expiresAt < new Date()) {
      logger.warn(`[OnboardingHandler] Onboarding expired: ${trackingCode}`)
      await prisma.whatsAppOnboarding.update({
        where: { trackingCode },
        data: { status: 'expired' },
      })
      return
    }

    if (eventType === 'PARTNER_ADDED') {
      // Criar connection
      const connection = await prisma.whatsAppConnection.upsert({
        where: {
          projectId_wabaId: {
            projectId: onboarding.projectId,
            wabaId,
          },
        },
        create: {
          organizationId: onboarding.organizationId,
          projectId: onboarding.projectId,
          wabaId,
          ownerBusinessId,
          phoneNumberId: value.waba_info?.phone_number_id,
          status: 'active',
          connectedAt: new Date(),
        },
        update: {
          status: 'active',
          connectedAt: new Date(),
          ownerBusinessId,
        },
      })

      // Cache connection
      await whatsappCache.cacheConnection(onboarding.organizationId, wabaId, connection)

      // Marcar onboarding como completo
      const updatedOnboarding = await prisma.whatsAppOnboarding.update({
        where: { trackingCode },
        data: {
          status: 'completed',
          completedAt: new Date(),
          wabaId,
          ownerBusinessId,
          phoneNumberId: value.waba_info?.phone_number_id,
        },
      })

      // Cache updated onboarding
      await whatsappCache.cacheOnboarding(trackingCode, updatedOnboarding)

      // Audit log
      await whatsappAuditService.logOnboardingCompleted(
        onboarding.organizationId,
        trackingCode,
        wabaId,
        connection.id,
        {
          phoneNumberId: value.waba_info?.phone_number_id,
          ownerBusinessId,
        }
      )

      logger.info(
        `[OnboardingHandler] PARTNER_ADDED: Connection created for org ${onboarding.organizationId}`
      )
    }

    if (eventType === 'PARTNER_REMOVED') {
      // Desconectar
      const connection = await prisma.whatsAppConnection.findFirst({
        where: {
          organizationId: onboarding.organizationId,
          wabaId,
        },
      })

      if (connection) {
        const connectedDuration = connection.connectedAt
          ? new Date().getTime() - connection.connectedAt.getTime()
          : undefined

        const updatedConnection = await prisma.whatsAppConnection.update({
          where: { id: connection.id },
          data: {
            status: 'inactive',
            disconnectedAt: new Date(),
          },
        })

        // Invalidate cache
        await whatsappCache.invalidateConnection(onboarding.organizationId, wabaId)

        // Audit log
        await whatsappAuditService.logConnectionRemoved(
          onboarding.organizationId,
          connection.id,
          wabaId,
          connectedDuration
        )
      }

      logger.info(`[OnboardingHandler] PARTNER_REMOVED: Connection disconnected`)
    }

    if (eventType === 'PARTNER_REINSTATED') {
      const connection = await prisma.whatsAppConnection.findFirst({
        where: {
          organizationId: onboarding.organizationId,
          wabaId,
        },
      })

      if (connection) {
        const updatedConnection = await prisma.whatsAppConnection.update({
          where: { id: connection.id },
          data: {
            status: 'active',
            disconnectedAt: null,
          },
        })

        // Cache updated connection
        await whatsappCache.cacheConnection(onboarding.organizationId, wabaId, updatedConnection)

        // Audit log
        await whatsappAuditService.logConnectionReinstated(
          onboarding.organizationId,
          connection.id,
          wabaId
        )
      }

      logger.info(`[OnboardingHandler] PARTNER_REINSTATED: Connection reactivated`)
    }

    return
  }

  // ============================================
  // Caso 2: TrackingCode ausente — Hosted ES puro
  // Meta não envia trackingCode no webhook.
  // Correlacionamos com o onboarding pendente mais recente.
  // ============================================
  if (eventType === 'PARTNER_ADDED') {
    const recentOnboarding = await prisma.whatsAppOnboarding.findFirst({
      where: {
        status: 'pending',
        expiresAt: { gt: new Date() },
      },
      orderBy: { createdAt: 'desc' },
    })

    if (recentOnboarding) {
      logger.info(
        `[OnboardingHandler] Hosted ES: correlating WABA ${wabaId} with pending onboarding ${recentOnboarding.trackingCode}`
      )

      const connection = await prisma.whatsAppConnection.upsert({
        where: {
          projectId_wabaId: {
            projectId: recentOnboarding.projectId,
            wabaId,
          },
        },
        create: {
          organizationId: recentOnboarding.organizationId,
          projectId: recentOnboarding.projectId,
          wabaId,
          ownerBusinessId,
          status: 'active',
          connectedAt: new Date(),
        },
        update: {
          status: 'active',
          connectedAt: new Date(),
          ownerBusinessId,
        },
      })

      await whatsappCache.cacheConnection(recentOnboarding.organizationId, wabaId, connection)

      await prisma.whatsAppOnboarding.update({
        where: { id: recentOnboarding.id },
        data: {
          status: 'completed',
          completedAt: new Date(),
          wabaId,
          ownerBusinessId,
        },
      })

      await whatsappAuditService.log({
        organizationId: recentOnboarding.organizationId,
        action: 'ONBOARDING_COMPLETED',
        description: `WhatsApp connected via Hosted ES: WABA ${wabaId}`,
        connectionId: connection.id,
        metadata: { wabaId, ownerBusinessId },
      })

      logger.info(
        `[OnboardingHandler] Hosted ES PARTNER_ADDED: connection created for org ${recentOnboarding.organizationId}`
      )
      return
    }
  }

  // Buscar connection existente por ownerBusinessId (PARTNER_REMOVED/REINSTATED)
  if (ownerBusinessId) {
    const connection = await prisma.whatsAppConnection.findFirst({
      where: { ownerBusinessId },
    })

    if (connection) {
      if (eventType === 'PARTNER_REMOVED') {
        const connectedDuration = connection.connectedAt
          ? new Date().getTime() - connection.connectedAt.getTime()
          : undefined

        await prisma.whatsAppConnection.update({
          where: { id: connection.id },
          data: { status: 'inactive', disconnectedAt: new Date() },
        })

        await whatsappCache.invalidateConnection(connection.organizationId, wabaId)
        await whatsappAuditService.logConnectionRemoved(
          connection.organizationId, connection.id, wabaId, connectedDuration
        )
        logger.info(`[OnboardingHandler] PARTNER_REMOVED via ownerBusinessId`)
      }

      if (eventType === 'PARTNER_REINSTATED') {
        const updatedConnection = await prisma.whatsAppConnection.update({
          where: { id: connection.id },
          data: { status: 'active', disconnectedAt: null },
        })
        await whatsappCache.cacheConnection(connection.organizationId, wabaId, updatedConnection)
        logger.info(`[OnboardingHandler] PARTNER_REINSTATED via ownerBusinessId`)
      }

      return
    }
  }

  logger.warn(
    `[OnboardingHandler] Phantom connection: WABA ${wabaId}, no pending onboarding or existing connection found`
  )
}
