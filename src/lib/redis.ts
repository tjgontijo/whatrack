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
      console.warn('[Redis] REDIS_URL not configured, using no-op fallback');
      console.warn('[Redis] Set REDIS_URL env variable to enable caching and rate limiting');
      // Return a dummy Redis instance that acts as no-op
      return createNoOpRedis();
    }

    try {
      // Parse URL for logging (hide password)
      const urlObj = new URL(redisUrl);
      const safeUrl = `${urlObj.protocol}//${urlObj.hostname}:${urlObj.port}`;
      console.log('[Redis] Connecting to:', safeUrl);

      redis = new Redis(redisUrl, {
        retryStrategy: (times) => {
          const delay = Math.min(times * 50, 2000);
          if (times > 10) {
            console.error('[Redis] Max retries exceeded, using no-op fallback');
            return null;
          }
          return delay;
        },
        maxRetriesPerRequest: null,
        enableReadyCheck: false,
        enableOfflineQueue: true,
        connectTimeout: 10000,
      });

      redis.on('connect', () => {
        isConnected = true;
        console.log('[Redis] ✓ Connected successfully');
      });

      redis.on('ready', () => {
        console.log('[Redis] ✓ Ready for commands');
      });

      redis.on('error', (err) => {
        console.error('[Redis] ✗ Error:', err.message);
        isConnected = false;
      });

      redis.on('close', () => {
        isConnected = false;
        console.log('[Redis] ✗ Connection closed');
      });

      redis.on('reconnecting', (info: any) => {
        console.log(`[Redis] Reconnecting... (attempt ${info?.attempt || '?'})`);
      });
    } catch (error) {
      console.error('[Redis] ✗ Failed to initialize:', error);
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
