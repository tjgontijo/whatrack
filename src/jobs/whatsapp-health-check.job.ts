import { prisma } from '@/lib/prisma';
import { TokenEncryption } from '@/lib/encryption';
import { whatsappCache } from '@/services/whatsapp/cache.service';
import { CACHE_KEYS, CACHE_TTL } from '@/lib/cache-keys';
import { getRedis } from '@/lib/redis';

type WhatsAppHealthStatus = 'unknown' | 'healthy' | 'warning' | 'error';

/**
 * WhatsApp Token Health Check Job
 *
 * Runs daily at 2 AM to validate all active connections
 * 1. Get all active WhatsApp connections
 * 2. For each connection, validate token with Meta API
 * 3. Update health status (healthy/warning/error)
 * 4. Create WhatsAppHealth record for audit trail
 * 5. Alert if token is about to expire or is invalid
 */

const encryption = new TokenEncryption();
const redis = getRedis();

interface HealthStatus {
  status: WhatsAppHealthStatus;
  tokenValid: boolean;
  tokenExpired?: boolean;
  responseTime?: number;
  apiResponse?: string;
}

export async function whatsappHealthCheckJob(job: any): Promise<void> {
  console.log('[HealthCheckJob] Starting WhatsApp token health check');

  try {
    // Get all active connections
    const connections = await prisma.whatsAppConnection.findMany({
      where: { status: 'active' },
      include: {
        organization: true,
      },
    });

    console.log(`[HealthCheckJob] Found ${connections.length} active connections`);

    let healthyCount = 0;
    let warningCount = 0;
    let errorCount = 0;

    for (const connection of connections) {
      try {
        // Get latest health check from cache or DB
        const cacheKey = CACHE_KEYS.whatsapp.health(connection.id);
        let health = null;

        // Check Redis cache
        const cached = await redis.get(cacheKey);
        if (cached) {
          health = JSON.parse(cached);
          console.log(`[HealthCheckJob] Using cached health for ${connection.wabaId}`);
        } else {
          // Get latest from DB
          health = await prisma.whatsAppHealth.findFirst({
            where: { connectionId: connection.id },
            orderBy: { lastCheck: 'desc' },
          });
        }

        // If no recent check or stale, validate token
        const now = new Date();
        const lastCheckTime = health?.lastCheck ? new Date(health.lastCheck).getTime() : 0;
        const isStale = now.getTime() - lastCheckTime > 24 * 60 * 60 * 1000; // 24 hours

        if (!health || isStale) {
          console.log(`[HealthCheckJob] Validating token for ${connection.wabaId}`);

          // Get current token from config
          const config = await prisma.whatsAppConfig.findFirst({
            where: { connectionId: connection.id },
          });

          if (!config || !config.accessToken) {
            console.warn(`[HealthCheckJob] No token found for ${connection.wabaId}`);
            health = {
              status: 'error' as WhatsAppHealthStatus,
              tokenValid: false,
              tokenExpired: true,
              apiResponse: 'No token in database',
            };
          } else {
            try {
              // Decrypt token
              const decryptedToken = encryption.decrypt(config.accessToken);

              // Validate with Meta API
              const startTime = Date.now();
              const response = await fetch(`https://graph.instagram.com/me?access_token=${decryptedToken}`);
              const responseTime = Date.now() - startTime;

              if (response.ok) {
                const data = await response.json();
                console.log(`[HealthCheckJob] Token valid for ${connection.wabaId}`);
                health = {
                  status: 'healthy' as WhatsAppHealthStatus,
                  tokenValid: true,
                  tokenExpired: false,
                  responseTime,
                  apiResponse: 'Token validated successfully',
                };
                healthyCount++;
              } else {
                const error = await response.json();
                const errorMsg = error.error?.message || 'Unknown error';

                console.warn(
                  `[HealthCheckJob] Token invalid for ${connection.wabaId}: ${errorMsg}`
                );

                // Check if token expired or revoked
                const isExpired =
                  response.status === 401 || errorMsg.includes('expire') || errorMsg.includes('invalid');

                health = {
                  status: (isExpired ? 'error' : 'warning') as WhatsAppHealthStatus,
                  tokenValid: false,
                  tokenExpired: isExpired,
                  apiResponse: errorMsg,
                };

                if (isExpired) {
                  errorCount++;
                } else {
                  warningCount++;
                }
              }
            } catch (err) {
              console.error(
                `[HealthCheckJob] Error validating token for ${connection.wabaId}:`,
                err
              );
              health = {
                status: 'error' as WhatsAppHealthStatus,
                tokenValid: false,
                apiResponse: err instanceof Error ? err.message : 'Unknown error',
              };
              errorCount++;
            }
          }

          // Create health record
          const healthRecord = await prisma.whatsAppHealth.create({
            data: {
              connectionId: connection.id,
              organizationId: connection.organizationId,
              status: health.status,
              tokenValid: health.tokenValid,
              tokenExpired: health.tokenExpired,
              responseTime: health.responseTime,
              apiResponse: health.apiResponse,
              lastCheck: new Date(),
            },
          });

          // Update connection status
          await prisma.whatsAppConnection.update({
            where: { id: connection.id },
            data: {
              healthStatus: health.status,
              lastHealthCheckAt: new Date(),
            },
          });

          // Cache the health result
          await redis.setex(cacheKey, CACHE_TTL.HEALTH, JSON.stringify(healthRecord));

          // Alert if error
          if (health.status === 'error') {
            console.warn(
              `[HealthCheckJob] ALERT: Connection ${connection.wabaId} is unhealthy`
            );
            // TODO: Send notification to organization admin
          }
        }
      } catch (error) {
        console.error(
          `[HealthCheckJob] Error processing connection ${connection.wabaId}:`,
          error
        );
        errorCount++;
      }
    }

    console.log(
      `[HealthCheckJob] Completed: ${healthyCount} healthy, ${warningCount} warning, ${errorCount} error`
    );
  } catch (error) {
    console.error('[HealthCheckJob] Fatal error:', error);
    throw error;
  }
}
