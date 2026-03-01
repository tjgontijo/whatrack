import { Redis } from 'ioredis'
import { logger } from '@/lib/utils/logger'

let redis: Redis | null = null
let isConnected = false

/**
 * Get Redis client with connection pooling.
 * Returns singleton instance.
 *
 * Requires REDIS_URL environment variable — throws on startup if missing.
 */
export function getRedis(): Redis {
  if (!redis) {
    const redisUrl = process.env.REDIS_URL

    if (!redisUrl) {
      throw new Error(
        '[Redis] REDIS_URL environment variable is required. ' +
          'Set it to your Redis connection string (e.g. redis://default:password@host:port).'
      )
    }

    try {
      // Parse URL for logging (hide password)
      const urlObj = new URL(redisUrl)
      const safeUrl = `${urlObj.protocol}//${urlObj.hostname}:${urlObj.port}`
      logger.info({ context: safeUrl }, '[Redis] Connecting to')

      redis = new Redis(redisUrl, {
        retryStrategy: (times) => {
          const delay = Math.min(times * 50, 2000)
          if (times > 10) {
            logger.error('[Redis] Max retries exceeded')
            return null
          }
          return delay
        },
        maxRetriesPerRequest: null,
        enableReadyCheck: false,
        enableOfflineQueue: true,
        connectTimeout: 10000,
      })

      redis.on('connect', () => {
        isConnected = true
        logger.info('[Redis] ✓ Connected successfully')
      })

      redis.on('ready', () => {
        logger.info('[Redis] ✓ Ready for commands')
      })

      redis.on('error', (err) => {
        logger.error({ err: err.message }, '[Redis] ✗ Error')
        isConnected = false
      })

      redis.on('close', () => {
        isConnected = false
        logger.info('[Redis] ✗ Connection closed')
      })

      redis.on('reconnecting', (info: any) => {
        logger.info(`[Redis] Reconnecting... (attempt ${info?.attempt || '?'})`)
      })
    } catch (error) {
      logger.error({ err: error }, '[Redis] ✗ Failed to initialize')
      throw error
    }
  }

  return redis
}

/**
 * Check if Redis is connected
 */
export function isRedisConnected(): boolean {
  return isConnected
}
