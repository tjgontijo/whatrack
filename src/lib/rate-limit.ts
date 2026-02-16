import { getRedis } from './redis';

/**
 * Rate Limiting Service
 *
 * Three strategies:
 * 1. IP-based: Limits requests per IP address globally
 * 2. Organization-based: Limits requests per organization (requires orgId parameter)
 * 3. Burst: Prevents abuse by tracking very recent requests (last 1 minute)
 *
 * Example usage:
 * ```typescript
 * const rateLimiter = getRateLimiter();
 *
 * // IP-based: 100 requests per 15 minutes
 * const ipLimit = await rateLimiter.checkLimit('ip', clientIp, 100, 900);
 *
 * // Org-based: 1000 requests per hour
 * const orgLimit = await rateLimiter.checkLimit('org', orgId, 1000, 3600);
 *
 * // Burst: 10 requests per minute (to prevent abuse)
 * const burstLimit = await rateLimiter.checkLimit('burst', clientIp, 10, 60);
 * ```
 */

interface RateLimitResult {
  allowed: boolean;
  current: number;
  limit: number;
  resetAt: Date;
  retryAfter: number; // seconds
}

class RateLimiter {
  private redis = getRedis();

  /**
   * Check if request is allowed under rate limit
   *
   * @param strategy - 'ip' | 'org' | 'burst'
   * @param identifier - IP address, org ID, etc.
   * @param limit - Maximum requests allowed
   * @param windowSeconds - Time window in seconds
   * @returns Result object with allowed status
   */
  async checkLimit(
    strategy: 'ip' | 'org' | 'burst',
    identifier: string,
    limit: number,
    windowSeconds: number
  ): Promise<RateLimitResult> {
    const key = this.getKey(strategy, identifier);
    const now = Date.now();

    try {
      // Get current count with timeout protection
      const current = await Promise.race([
        this.redis.incr(key),
        new Promise<number>((_, reject) =>
          setTimeout(() => reject(new Error('Redis timeout')), 5000)
        )
      ]);

      // Set expiration on first request (when count === 1)
      if (current === 1) {
        await this.redis.expire(key, windowSeconds);
      }

      // Calculate reset time
      const ttl = await this.redis.ttl(key);
      const safeWindowSeconds = ttl > 0 ? ttl : windowSeconds;
      const resetAt = new Date(now + safeWindowSeconds * 1000);

      // Check if exceeded
      const allowed = current <= limit;
      const retryAfter = allowed ? 0 : safeWindowSeconds;

      return {
        allowed,
        current,
        limit,
        resetAt,
        retryAfter,
      };
    } catch (error) {
      // If Redis fails, allow request (graceful degradation)
      console.warn(`[RateLimit] ${strategy}/${identifier} - Redis error:`, error);
      return {
        allowed: true,
        current: 0,
        limit,
        resetAt: new Date(now + windowSeconds * 1000),
        retryAfter: 0,
      };
    }
  }

  /**
   * Reset rate limit for identifier
   */
  async reset(strategy: 'ip' | 'org' | 'burst', identifier: string): Promise<void> {
    const key = this.getKey(strategy, identifier);
    await this.redis.del(key);
  }

  /**
   * Get current count without incrementing
   */
  async getCount(strategy: 'ip' | 'org' | 'burst', identifier: string): Promise<number> {
    const key = this.getKey(strategy, identifier);
    const value = await this.redis.get(key);
    return value ? parseInt(value, 10) : 0;
  }

  /**
   * Generate Redis key
   */
  private getKey(strategy: string, identifier: string): string {
    return `ratelimit:${strategy}:${identifier}`;
  }
}

/**
 * Singleton instance
 */
let instance: RateLimiter | null = null;

export function getRateLimiter(): RateLimiter {
  if (!instance) {
    instance = new RateLimiter();
  }
  return instance;
}
