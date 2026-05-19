import { Redis, type RedisOptions } from 'ioredis'
import { logger } from '@/lib/utils/logger'
import { env } from '@/lib/env/env'

let redis: Redis | null = null
let isConnected = false

function getRedisConnectionOptions(url: URL): RedisOptions {
  const options: RedisOptions = {
    host: url.hostname,
  }

  if (url.port) {
    options.port = Number.parseInt(url.port, 10)
  }

  if (url.username) {
    options.username = decodeURIComponent(url.username)
  }

  if (url.password) {
    options.password = decodeURIComponent(url.password)
  }

  const db = Number.parseInt(url.pathname.replace(/^\/+/, ''), 10)
  if (!Number.isNaN(db)) {
    options.db = db
  }

  const family = url.searchParams.get('family')
  if (family === '4' || family === '6') {
    options.family = Number.parseInt(family, 10)
  }

  if (url.protocol === 'rediss:') {
    options.tls = {}
  }

  return options
}

/**
 * Get Redis client with connection pooling.
 * Returns singleton instance.
 *
 * Requires REDIS_URL environment variable — throws on startup if missing.
 */
export function getRedis(): Redis {
  if (!redis) {
    const redisUrl = env.REDIS_URL

    if (!redisUrl) {
      throw new Error(
        '[Redis] REDIS_URL environment variable is required. ' +
          'Set it to your Redis connection string (e.g. redis://default:password@host:port).'
      )
    }

    try {
      // Parse URL for logging (hide password)
      const urlObj = new URL(redisUrl)
      const safeUrl = `${urlObj.protocol}//${urlObj.hostname}${urlObj.port ? `:${urlObj.port}` : ''}`
      logger.debug({ context: safeUrl }, '[Redis] Connecting to')

      redis = new Redis({
        ...getRedisConnectionOptions(urlObj),
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
        logger.debug('[Redis] ✓ Connected successfully')
      })

      redis.on('ready', () => {
        logger.debug('[Redis] ✓ Ready for commands')
      })

      redis.on('error', (err) => {
        logger.error({ err: err.message }, '[Redis] ✗ Error')
        isConnected = false
      })

      redis.on('close', () => {
        isConnected = false
        logger.debug('[Redis] ✗ Connection closed')
      })

      redis.on('reconnecting', (delay: number) => {
        logger.debug(`[Redis] Reconnecting... (delay ${delay}ms)`)
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
