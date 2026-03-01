import { getRedis, isRedisConnected } from '@/lib/db/redis'
import { CACHE_KEYS, CACHE_TTL } from '@/lib/db/cache-keys'
import { prisma } from '@/lib/db/prisma'
import { logger } from '@/lib/utils/logger'

/**
 * WhatsApp Cache Service
 *
 * Two-tier caching strategy:
 * 1. Redis (L1 cache) - fast, in-memory
 * 2. PostgreSQL (L2 cache) - slow, but reliable fallback
 *
 * Read pattern:
 * 1. Try Redis
 * 2. If miss, try PostgreSQL
 * 3. If found, write back to Redis
 * 4. If not found, return null
 *
 * Write pattern:
 * 1. Write to PostgreSQL (source of truth)
 * 2. Write to Redis (for speed)
 * 3. Both operations must succeed for data consistency
 */
class WhatsAppCacheService {
  private redis = getRedis()

  /**
   * Get onboarding session from cache or DB
   * Falls back to DB if Redis unavailable
   */
  async getOnboarding(trackingCode: string) {
    const cacheKey = CACHE_KEYS.whatsapp.onboarding(trackingCode)

    try {
      // L1: Try Redis
      if (isRedisConnected()) {
        const cached = await this.redis.get(cacheKey)
        if (cached) {
          logger.info({ context: trackingCode }, '[Cache] Onboarding hit (Redis)')
          return JSON.parse(cached)
        }
      }

      // L2: Fallback to PostgreSQL
      const onboarding = await prisma.whatsAppOnboarding.findUnique({
        where: { trackingCode },
      })

      if (onboarding && isRedisConnected()) {
        // Write back to Redis for future hits
        await this.redis.setex(cacheKey, CACHE_TTL.ONBOARDING, JSON.stringify(onboarding))
      }

      if (onboarding) {
        logger.info({ context: trackingCode }, '[Cache] Onboarding hit (DB)')
      }

      return onboarding
    } catch (error) {
      logger.error({ err: error }, '[Cache] Error getting onboarding')
      // Graceful degradation: fall back to DB without Redis
      return await prisma.whatsAppOnboarding.findUnique({
        where: { trackingCode },
      })
    }
  }

  /**
   * Get connection from cache or DB
   */
  async getConnection(organizationId: string, wabaId: string) {
    const cacheKey = CACHE_KEYS.whatsapp.connection(organizationId, wabaId)

    try {
      // L1: Try Redis
      if (isRedisConnected()) {
        const cached = await this.redis.get(cacheKey)
        if (cached) {
          logger.info({ context: organizationId, wabaId }, '[Cache] Connection hit (Redis)')
          return JSON.parse(cached)
        }
      }

      // L2: Fallback to PostgreSQL
      const connection = await prisma.whatsAppConnection.findUnique({
        where: {
          organizationId_wabaId: { organizationId, wabaId },
        },
      })

      if (connection && isRedisConnected()) {
        // Write back to Redis
        await this.redis.setex(cacheKey, CACHE_TTL.CONNECTION, JSON.stringify(connection))
      }

      if (connection) {
        logger.info({ context: organizationId, wabaId }, '[Cache] Connection hit (DB)')
      }

      return connection
    } catch (error) {
      logger.error({ err: error }, '[Cache] Error getting connection')
      return await prisma.whatsAppConnection.findUnique({
        where: {
          organizationId_wabaId: { organizationId, wabaId },
        },
      })
    }
  }

  /**
   * Cache onboarding after update
   */
  async cacheOnboarding(trackingCode: string, data: any) {
    const cacheKey = CACHE_KEYS.whatsapp.onboarding(trackingCode)

    try {
      if (isRedisConnected()) {
        await this.redis.setex(cacheKey, CACHE_TTL.ONBOARDING, JSON.stringify(data))
        logger.info({ context: trackingCode }, '[Cache] Onboarding cached')
      }
    } catch (error) {
      logger.error({ err: error }, '[Cache] Error caching onboarding')
      // Non-fatal: continue without Redis
    }
  }

  /**
   * Cache connection after creation/update
   */
  async cacheConnection(organizationId: string, wabaId: string, data: any) {
    const cacheKey = CACHE_KEYS.whatsapp.connection(organizationId, wabaId)

    try {
      if (isRedisConnected()) {
        await this.redis.setex(cacheKey, CACHE_TTL.CONNECTION, JSON.stringify(data))
        logger.info({ context: organizationId, wabaId }, '[Cache] Connection cached')
      }
    } catch (error) {
      logger.error({ err: error }, '[Cache] Error caching connection')
    }
  }

  /**
   * Invalidate onboarding cache
   */
  async invalidateOnboarding(trackingCode: string) {
    const cacheKey = CACHE_KEYS.whatsapp.onboarding(trackingCode)

    try {
      if (isRedisConnected()) {
        await this.redis.del(cacheKey)
        logger.info({ context: trackingCode }, '[Cache] Onboarding invalidated')
      }
    } catch (error) {
      logger.error({ err: error }, '[Cache] Error invalidating onboarding')
    }
  }

  /**
   * Invalidate connection cache
   */
  async invalidateConnection(organizationId: string, wabaId: string) {
    const cacheKey = CACHE_KEYS.whatsapp.connection(organizationId, wabaId)

    try {
      if (isRedisConnected()) {
        await this.redis.del(cacheKey)
        logger.info({ context: organizationId, wabaId }, '[Cache] Connection invalidated')
      }
    } catch (error) {
      logger.error({ err: error }, '[Cache] Error invalidating connection')
    }
  }

  /**
   * Get all connections for organization from cache/DB
   */
  async getOrganizationConnections(organizationId: string) {
    try {
      // Always fetch from DB for list queries (Redis would need scan)
      const connections = await prisma.whatsAppConnection.findMany({
        where: { organizationId },
      })

      // Cache each individually
      for (const conn of connections) {
        if (isRedisConnected()) {
          await this.cacheConnection(conn.organizationId, conn.wabaId, conn)
        }
      }

      return connections
    } catch (error) {
      logger.error({ err: error }, '[Cache] Error getting organization connections')
      return []
    }
  }

  /**
   * Health check: is cache layer working?
   */
  async healthCheck(): Promise<{
    redis: boolean
    database: boolean
  }> {
    const health = {
      redis: false,
      database: false,
    }

    // Check Redis
    try {
      if (isRedisConnected()) {
        await this.redis.ping()
        health.redis = true
      }
    } catch {
      health.redis = false
    }

    // Check Database
    try {
      await prisma.$queryRaw`SELECT 1`
      health.database = true
    } catch {
      health.database = false
    }

    return health
  }
}

export const whatsappCache = new WhatsAppCacheService()
