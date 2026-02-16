import { prisma } from '@/lib/prisma';
import { whatsappCache } from '@/services/whatsapp/cache.service';
import { whatsappAuditService } from '@/services/whatsapp/audit.service';

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
  const change = payload.entry?.[0]?.changes?.[0];
  const value = change?.value;

  if (!value) {
    throw new Error('Invalid payload: missing change.value');
  }

  const wabaInfo = value.waba_info;
  const wabaId = wabaInfo?.waba_id;
  const ownerBusinessId = wabaInfo?.owner_business_id;
  const trackingCode = value.sessionInfo?.trackingCode;

  if (!wabaId) {
    throw new Error('Invalid payload: missing waba_id');
  }

  console.log(`[OnboardingHandler] Event: ${eventType}, WABA: ${wabaId}, TrackingCode: ${trackingCode}`);

  // ============================================
  // Caso 1: TrackingCode presente (padrão)
  // ============================================
  if (trackingCode) {
    // L1: Try cache, L2: Fall back to DB
    const onboarding = await whatsappCache.getOnboarding(trackingCode);

    if (!onboarding) {
      throw new Error(`Onboarding not found: ${trackingCode}`);
    }

    // Validar expiração
    if (onboarding.expiresAt < new Date()) {
      console.warn(`[OnboardingHandler] Onboarding expired: ${trackingCode}`);
      await prisma.whatsAppOnboarding.update({
        where: { trackingCode },
        data: { status: 'expired' },
      });
      return;
    }

    if (eventType === 'PARTNER_ADDED') {
      // Criar connection
      const connection = await prisma.whatsAppConnection.upsert({
        where: {
          organizationId_wabaId: {
            organizationId: onboarding.organizationId,
            wabaId,
          },
        },
        create: {
          organizationId: onboarding.organizationId,
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
      });

      // Cache connection
      await whatsappCache.cacheConnection(
        onboarding.organizationId,
        wabaId,
        connection
      );

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
      });

      // Cache updated onboarding
      await whatsappCache.cacheOnboarding(trackingCode, updatedOnboarding);

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
      );

      console.log(`[OnboardingHandler] PARTNER_ADDED: Connection created for org ${onboarding.organizationId}`);
    }

    if (eventType === 'PARTNER_REMOVED') {
      // Desconectar
      const connection = await prisma.whatsAppConnection.findFirst({
        where: {
          organizationId: onboarding.organizationId,
          wabaId,
        },
      });

      if (connection) {
        const connectedDuration = connection.connectedAt
          ? new Date().getTime() - connection.connectedAt.getTime()
          : undefined;

        const updatedConnection = await prisma.whatsAppConnection.update({
          where: { id: connection.id },
          data: {
            status: 'inactive',
            disconnectedAt: new Date(),
          },
        });

        // Invalidate cache
        await whatsappCache.invalidateConnection(
          onboarding.organizationId,
          wabaId
        );

        // Audit log
        await whatsappAuditService.logConnectionRemoved(
          onboarding.organizationId,
          connection.id,
          wabaId,
          connectedDuration
        );
      }

      console.log(`[OnboardingHandler] PARTNER_REMOVED: Connection disconnected`);
    }

    if (eventType === 'PARTNER_REINSTATED') {
      const connection = await prisma.whatsAppConnection.findFirst({
        where: {
          organizationId: onboarding.organizationId,
          wabaId,
        },
      });

      if (connection) {
        const updatedConnection = await prisma.whatsAppConnection.update({
          where: { id: connection.id },
          data: {
            status: 'active',
            disconnectedAt: null,
          },
        });

        // Cache updated connection
        await whatsappCache.cacheConnection(
          onboarding.organizationId,
          wabaId,
          updatedConnection
        );

        // Audit log
        await whatsappAuditService.logConnectionReinstated(
          onboarding.organizationId,
          connection.id,
          wabaId
        );
      }

      console.log(`[OnboardingHandler] PARTNER_REINSTATED: Connection reactivated`);
    }

    return;
  }

  // ============================================
  // Caso 2: TrackingCode ausente (Coexistence Mode)
  // ============================================
  if (ownerBusinessId) {
    // Procurar connection por ownerBusinessId + org
    // Isso só funciona se já há uma connection anterior
    const connections = await prisma.whatsAppConnection.findMany({
      where: {
        ownerBusinessId,
      },
      take: 1,
    });

    if (connections.length > 0) {
      const connection = connections[0];

      if (eventType === 'PARTNER_ADDED') {
        const updatedConnection = await prisma.whatsAppConnection.update({
          where: { id: connection.id },
          data: {
            status: 'active',
            connectedAt: new Date(),
            wabaId,
          },
        });

        // Cache updated connection
        await whatsappCache.cacheConnection(
          connection.organizationId,
          wabaId,
          updatedConnection
        );

        // Audit log
        await whatsappAuditService.log({
          organizationId: connection.organizationId,
          action: 'CONNECTION_ADDED',
          description: `WhatsApp connection added in coexistence mode for WABA ${wabaId}`,
          connectionId: connection.id,
          metadata: { wabaId, ownerBusinessId },
        });

        console.log(`[OnboardingHandler] Coexistence PARTNER_ADDED: Updated existing connection`);
      }

      if (eventType === 'PARTNER_REMOVED') {
        const connectedDuration = connection.connectedAt
          ? new Date().getTime() - connection.connectedAt.getTime()
          : undefined;

        await prisma.whatsAppConnection.update({
          where: { id: connection.id },
          data: {
            status: 'inactive',
            disconnectedAt: new Date(),
          },
        });

        // Invalidate cache
        await whatsappCache.invalidateConnection(
          connection.organizationId,
          wabaId
        );

        // Audit log
        await whatsappAuditService.logConnectionRemoved(
          connection.organizationId,
          connection.id,
          wabaId,
          connectedDuration
        );

        console.log(`[OnboardingHandler] Coexistence PARTNER_REMOVED`);
      }

      return;
    }
  }

  // ============================================
  // Caso 3: Nenhum - Phantom Connection
  // ============================================
  console.warn(`[OnboardingHandler] Phantom connection detected: WABA ${wabaId}, no trackingCode or ownerBusinessId match`);
  // TODO: Criar WABA órfã para admin reivindicar
}
