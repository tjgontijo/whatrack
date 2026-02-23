import { Redis } from 'ioredis';

let redis: Redis | null = null;
let isConnected = false;

/**
 * Get Redis client with connection pooling.
 * Returns singleton instance.
 *
 * Requires REDIS_URL environment variable — throws on startup if missing.
 */
export function getRedis(): Redis {
  if (!redis) {
    const redisUrl = process.env.REDIS_URL;

    if (!redisUrl) {
      throw new Error(
        '[Redis] REDIS_URL environment variable is required. ' +
        'Set it to your Redis connection string (e.g. redis://default:password@host:port).'
      );
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
            console.error('[Redis] Max retries exceeded');
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
      throw error;
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
