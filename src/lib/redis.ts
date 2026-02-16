import { Redis } from 'ioredis';

let redis: Redis | null = null;
let isConnected = false;

/**
 * Get Redis client with connection pooling
 * Returns singleton instance
 */
export function getRedis(): Redis {
  if (!redis) {
    const redisUrl = process.env.REDIS_URL;

    if (!redisUrl) {
      console.warn('[Redis] REDIS_URL not configured, cache operations will be skipped');
      // Return a dummy Redis instance that acts as no-op
      return createNoOpRedis();
    }

    try {
      redis = new Redis(redisUrl, {
        retryStrategy: (times) => Math.min(times * 50, 2000),
        maxRetriesPerRequest: null,
        enableReadyCheck: false,
        enableOfflineQueue: true,
      });

      redis.on('connect', () => {
        isConnected = true;
        console.log('[Redis] Connected');
      });

      redis.on('error', (err) => {
        console.error('[Redis] Connection error:', err.message);
        isConnected = false;
      });

      redis.on('close', () => {
        isConnected = false;
        console.log('[Redis] Connection closed');
      });
    } catch (error) {
      console.error('[Redis] Failed to initialize:', error);
      return createNoOpRedis();
    }
  }

  return redis;
}

/**
 * Check if Redis is connected
 */
export function isRedisConnected(): boolean {
  return isConnected;
}

/**
 * Create a no-op Redis instance for fallback
 * All operations will silently fail (allowing graceful degradation)
 */
function createNoOpRedis(): Redis {
  return {
    get: async () => null,
    set: async () => 'OK',
    setex: async () => 'OK',
    del: async () => 0,
    exists: async () => 0,
    keys: async () => [],
    flushall: async () => 'OK',
    quit: async () => 'OK',
    disconnect: async () => 'OK',
    incr: async () => 1,
    expire: async () => 1,
    ttl: async () => 3600,
  } as any;
}
