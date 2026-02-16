import { prisma } from '@/lib/prisma';

export type WhatsAppAuditAction =
  | 'ONBOARDING_STARTED'
  | 'ONBOARDING_COMPLETED'
  | 'ONBOARDING_FAILED'
  | 'ONBOARDING_EXPIRED'
  | 'CONNECTION_ADDED'
  | 'CONNECTION_REMOVED'
  | 'CONNECTION_REINSTATED'
  | 'CONNECTION_DISCONNECTED'
  | 'HEALTH_CHECK'
  | 'TOKEN_EXPIRED'
  | 'TOKEN_RENEWED';

export interface AuditLogInput {
  organizationId: string;
  action: WhatsAppAuditAction;
  description?: string;
  metadata?: Record<string, any>;
  trackingCode?: string;
  connectionId?: string;
  ipAddress?: string;
  userAgent?: string;
}

/**
 * WhatsApp Audit Logging Service
 * Tracks all important events for compliance and debugging
 */
export class WhatsAppAuditService {
  /**
   * Log an audit event
   */
  async log(input: AuditLogInput): Promise<void> {
    try {
      await prisma.whatsAppAuditLog.create({
        data: {
          organizationId: input.organizationId,
          action: input.action,
          description: input.description,
          metadata: input.metadata,
          trackingCode: input.trackingCode,
          connectionId: input.connectionId,
          ipAddress: input.ipAddress,
          userAgent: input.userAgent,
        },
      });

      console.log(`[AuditLog] ${input.action}: ${input.description || ''}`);
    } catch (error) {
      console.error('[AuditLog] Error logging audit event:', error);
      // Don't throw - audit logging failure shouldn't break the main flow
    }
  }

  /**
   * Log onboarding started event
   */
  async logOnboardingStarted(
    organizationId: string,
    trackingCode: string,
    metadata?: Record<string, any>
  ): Promise<void> {
    await this.log({
      organizationId,
      action: 'ONBOARDING_STARTED',
      description: `WhatsApp onboarding started with tracking code ${trackingCode}`,
      trackingCode,
      metadata,
    });
  }

  /**
   * Log onboarding completed event
   */
  async logOnboardingCompleted(
    organizationId: string,
    trackingCode: string,
    wabaId: string,
    connectionId?: string,
    metadata?: Record<string, any>
  ): Promise<void> {
    await this.log({
      organizationId,
      action: 'ONBOARDING_COMPLETED',
      description: `WhatsApp onboarding completed for WABA ${wabaId}`,
      trackingCode,
      connectionId,
      metadata: {
        wabaId,
        ...metadata,
      },
    });
  }

  /**
   * Log onboarding failed event
   */
  async logOnboardingFailed(
    organizationId: string,
    trackingCode: string,
    error: string,
    metadata?: Record<string, any>
  ): Promise<void> {
    await this.log({
      organizationId,
      action: 'ONBOARDING_FAILED',
      description: `WhatsApp onboarding failed: ${error}`,
      trackingCode,
      metadata: {
        error,
        ...metadata,
      },
    });
  }

  /**
   * Log connection removed event
   */
  async logConnectionRemoved(
    organizationId: string,
    connectionId: string,
    wabaId: string,
    connectedDuration?: number, // in milliseconds
    metadata?: Record<string, any>
  ): Promise<void> {
    const durationMinutes = connectedDuration
      ? Math.floor(connectedDuration / 1000 / 60)
      : undefined;

    await this.log({
      organizationId,
      action: 'CONNECTION_REMOVED',
      description: `WhatsApp connection removed for WABA ${wabaId}${durationMinutes ? ` (connected for ${durationMinutes} minutes)` : ''}`,
      connectionId,
      metadata: {
        wabaId,
        connectedDurationMinutes: durationMinutes,
        ...metadata,
      },
    });
  }

  /**
   * Log connection reinstated event
   */
  async logConnectionReinstated(
    organizationId: string,
    connectionId: string,
    wabaId: string,
    metadata?: Record<string, any>
  ): Promise<void> {
    await this.log({
      organizationId,
      action: 'CONNECTION_REINSTATED',
      description: `WhatsApp connection reinstated for WABA ${wabaId}`,
      connectionId,
      metadata: {
        wabaId,
        ...metadata,
      },
    });
  }

  /**
   * Log token expiration event
   */
  async logTokenExpired(
    organizationId: string,
    connectionId: string,
    wabaId: string,
    metadata?: Record<string, any>
  ): Promise<void> {
    await this.log({
      organizationId,
      action: 'TOKEN_EXPIRED',
      description: `Access token expired for WABA ${wabaId}`,
      connectionId,
      metadata: {
        wabaId,
        ...metadata,
      },
    });
  }

  /**
   * Log health check event
   */
  async logHealthCheck(
    organizationId: string,
    connectionId: string,
    wabaId: string,
    status: string,
    metadata?: Record<string, any>
  ): Promise<void> {
    // Only log health checks if there's a notable event
    if (status === 'warning' || status === 'error') {
      await this.log({
        organizationId,
        action: 'HEALTH_CHECK',
        description: `Health check ${status} for WABA ${wabaId}`,
        connectionId,
        metadata: {
          wabaId,
          status,
          ...metadata,
        },
      });
    }
  }

  /**
   * Get audit logs for an organization
   */
  async getAuditLogs(
    organizationId: string,
    options?: {
      action?: WhatsAppAuditAction;
      connectionId?: string;
      trackingCode?: string;
      limit?: number;
      offset?: number;
    }
  ) {
    const limit = options?.limit ?? 100;
    const offset = options?.offset ?? 0;

    const [logs, total] = await Promise.all([
      prisma.whatsAppAuditLog.findMany({
        where: {
          organizationId,
          ...(options?.action && { action: options.action }),
          ...(options?.connectionId && { connectionId: options.connectionId }),
          ...(options?.trackingCode && { trackingCode: options.trackingCode }),
        },
        orderBy: { createdAt: 'desc' },
        take: limit,
        skip: offset,
      }),
      prisma.whatsAppAuditLog.count({
        where: {
          organizationId,
          ...(options?.action && { action: options.action }),
          ...(options?.connectionId && { connectionId: options.connectionId }),
          ...(options?.trackingCode && { trackingCode: options.trackingCode }),
        },
      }),
    ]);

    return { logs, total, limit, offset };
  }
}

export const whatsappAuditService = new WhatsAppAuditService();
