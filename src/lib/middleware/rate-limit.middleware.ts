import { NextRequest, NextResponse } from 'next/server';
import { getRateLimiter } from '@/lib/rate-limit';
import { prisma } from '@/lib/prisma';

/**
 * Rate Limit Configuration per endpoint
 *
 * Defines allowed limits for IP, organization, and burst strategies
 */
export interface RateLimitConfig {
  enabled: boolean;
  ip?: {
    limit: number; // requests
    windowSeconds: number;
  };
  org?: {
    limit: number; // requests
    windowSeconds: number;
  };
  burst?: {
    limit: number; // requests
    windowSeconds: number;
  };
}

/**
 * Default rate limit configurations
 */
export const DEFAULT_RATE_LIMITS: Record<string, RateLimitConfig> = {
  // Webhook endpoints: Very permissive (high-volume from Meta)
  '/api/v1/whatsapp/webhook': {
    enabled: true,
    ip: { limit: 1000, windowSeconds: 3600 }, // 1000 per hour
    org: { limit: 5000, windowSeconds: 3600 }, // 5000 per hour
    burst: { limit: 50, windowSeconds: 60 }, // 50 per minute
  },

  // Onboarding: Moderate (user-facing, not abused often)
  '/api/v1/whatsapp/onboarding': {
    enabled: true,
    ip: { limit: 100, windowSeconds: 3600 }, // 100 per hour
    org: { limit: 500, windowSeconds: 3600 }, // 500 per hour
    burst: { limit: 10, windowSeconds: 60 }, // 10 per minute
  },

  // Health check: Very restrictive (cron job, single call every 5 min)
  '/api/v1/jobs/whatsapp-health-check': {
    enabled: true,
    ip: { limit: 60, windowSeconds: 3600 }, // 60 per hour
    org: { limit: 100, windowSeconds: 3600 }, // 100 per hour
    burst: { limit: 2, windowSeconds: 60 }, // 2 per minute
  },

  // Webhook retry: Very restrictive (cron job)
  '/api/v1/jobs/webhook-retry': {
    enabled: true,
    ip: { limit: 60, windowSeconds: 3600 }, // 60 per hour
    org: { limit: 100, windowSeconds: 3600 }, // 100 per hour
    burst: { limit: 2, windowSeconds: 60 }, // 2 per minute
  },

  // Default for unmapped endpoints
  default: {
    enabled: true,
    ip: { limit: 200, windowSeconds: 3600 }, // 200 per hour
    org: { limit: 1000, windowSeconds: 3600 }, // 1000 per hour
    burst: { limit: 20, windowSeconds: 60 }, // 20 per minute
  },
};

/**
 * Extract client IP from request
 * Handles proxy headers (X-Forwarded-For, CF-Connecting-IP, etc.)
 */
export function getClientIp(request: NextRequest): string {
  const forwarded = request.headers.get('x-forwarded-for');
  const cfConnectingIp = request.headers.get('cf-connecting-ip');
  const xRealIp = request.headers.get('x-real-ip');

  if (forwarded) {
    return forwarded.split(',')[0].trim();
  }

  if (cfConnectingIp) {
    return cfConnectingIp;
  }

  if (xRealIp) {
    return xRealIp;
  }

  // Fallback: Use socket connection info or default
  // In production (Vercel/serverless), headers should always be present
  return 'unknown-ip';
}

/**
 * Extract organization ID from request (if available)
 * Can be from:
 * - Query parameter: ?orgId=...
 * - Header: X-Org-Id: ...
 * - Session (if authenticated)
 */
export async function getOrganizationId(request: NextRequest): Promise<string | null> {
  // Try query parameter first
  const url = new URL(request.url);
  const orgIdParam = url.searchParams.get('orgId');
  if (orgIdParam) return orgIdParam;

  // Try header
  const orgIdHeader = request.headers.get('x-org-id');
  if (orgIdHeader) return orgIdHeader;

  // TODO: Extract from session if available
  // This would require parsing the session cookie and getting org from database

  return null;
}

/**
 * Rate limit middleware
 *
 * Usage in API route:
 * ```typescript
 * export async function POST(request: NextRequest) {
 *   const response = await rateLimitMiddleware(request, '/api/v1/whatsapp/webhook');
 *   if (response) return response; // Rate limited
 *
 *   // ... rest of endpoint logic
 * }
 * ```
 */
export async function rateLimitMiddleware(
  request: NextRequest,
  endpoint: string,
  config?: RateLimitConfig
): Promise<NextResponse | null> {
  // Get configuration for this endpoint
  const finalConfig = config || DEFAULT_RATE_LIMITS[endpoint] || DEFAULT_RATE_LIMITS.default;

  // If rate limiting disabled for this endpoint, allow request
  if (!finalConfig.enabled) {
    return null;
  }

  const rateLimiter = getRateLimiter();
  const clientIp = getClientIp(request);
  const orgId = await getOrganizationId(request);

  // Check all strategies
  const checks: { name: string; result: Awaited<ReturnType<typeof rateLimiter.checkLimit>> }[] = [];

  // IP-based limit
  if (finalConfig.ip) {
    const result = await rateLimiter.checkLimit('ip', clientIp, finalConfig.ip.limit, finalConfig.ip.windowSeconds);
    checks.push({ name: 'ip', result });
  }

  // Organization-based limit
  if (finalConfig.org && orgId) {
    const result = await rateLimiter.checkLimit('org', orgId, finalConfig.org.limit, finalConfig.org.windowSeconds);
    checks.push({ name: 'org', result });
  }

  // Burst limit (always checked if configured)
  if (finalConfig.burst) {
    const burstKey = orgId ? `${clientIp}:${orgId}` : clientIp;
    const result = await rateLimiter.checkLimit('burst', burstKey, finalConfig.burst.limit, finalConfig.burst.windowSeconds);
    checks.push({ name: 'burst', result });
  }

  // Check if any limit was exceeded
  const exceeded = checks.find((check) => !check.result.allowed);
  if (exceeded) {
    const { current, limit, retryAfter, resetAt } = exceeded.result;

    console.warn(
      `[RateLimit] ${exceeded.name.toUpperCase()} exceeded - IP: ${clientIp}, Org: ${orgId || 'N/A'}, Current: ${current}/${limit}`
    );

    // Return 429 Too Many Requests
    return NextResponse.json(
      {
        error: 'Too many requests',
        message: `Rate limit exceeded: ${exceeded.name} strategy`,
        limit,
        current,
        resetAt: resetAt.toISOString(),
        retryAfter,
      },
      {
        status: 429,
        headers: {
          'Retry-After': retryAfter.toString(),
          'X-RateLimit-Limit': limit.toString(),
          'X-RateLimit-Current': current.toString(),
          'X-RateLimit-Reset': resetAt.toISOString(),
        },
      }
    );
  }

  // All checks passed, allow request
  return null;
}

/**
 * Helper to update rate limit config per organization
 * Allows per-org customization of rate limits
 *
 * Future enhancement: Add tier/plan field to Organization model
 * Then implement tier-based scaling like:
 *
 * ```typescript
 * // Premium plan gets 10x limits
 * if (org.tier === 'premium') {
 *   return {
 *     ip: { limit: config.ip.limit * 10, windowSeconds: config.ip.windowSeconds },
 *     org: { limit: config.org.limit * 10, windowSeconds: config.org.windowSeconds },
 *     burst: config.burst, // Same burst limit regardless of tier
 *   };
 * }
 * ```
 */
export async function getOrganizationRateLimitConfig(
  orgId: string,
  baseConfig: RateLimitConfig
): Promise<RateLimitConfig> {
  try {
    // Verify organization exists
    const org = await prisma.organization.findUnique({
      where: { id: orgId },
      select: { id: true },
    });

    if (!org) return baseConfig;

    // For now, return base config
    // TODO: Add tier field to Organization and implement tier-based scaling
    return baseConfig;
  } catch (error) {
    console.error('[RateLimit] Error fetching org config:', error);
    return baseConfig;
  }
}
