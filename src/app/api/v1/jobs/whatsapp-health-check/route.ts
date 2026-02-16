/**
 * POST /api/v1/jobs/whatsapp-health-check
 *
 * Trigger WhatsApp health check job
 *
 * Use cases:
 * - Vercel cron calls this endpoint at 2 AM
 * - External cron service (EasyCron, etc.)
 * - Manual testing
 *
 * Auth: Requires CRON_SECRET header for security
 * Locking: Redis-based distributed lock prevents duplicate runs
 * Rate Limiting:
 * - IP: 60 requests/hour
 * - Organization: 100 requests/hour
 * - Burst: 2 requests/minute
 */

import { NextRequest, NextResponse } from 'next/server';
import { getJobTracker } from '@/lib/queue';
import { whatsappHealthCheckJob } from '@/jobs/whatsapp-health-check.job';
import { rateLimitMiddleware } from '@/lib/middleware/rate-limit.middleware';

const CRON_SECRET = process.env.CRON_SECRET || 'development-secret';

export const maxDuration = 300; // 5 minutes timeout for health check

export async function POST(request: NextRequest) {
  // Check rate limits first
  const rateLimitResponse = await rateLimitMiddleware(request, '/api/v1/jobs/whatsapp-health-check');
  if (rateLimitResponse) return rateLimitResponse;

  const jobTracker = getJobTracker();

  try {
    // Verify secret
    const secret = request.headers.get('x-cron-secret');

    if (!secret || secret !== CRON_SECRET) {
      console.error('[HealthCheckAPI] Invalid CRON_SECRET');
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Acquire distributed lock to prevent concurrent executions
    const jobId = await jobTracker.acquireLock('whatsapp-health-check');

    if (!jobId) {
      console.warn('[HealthCheckAPI] Job already running, skipping');
      return NextResponse.json(
        {
          success: false,
          message: 'Health check already running',
        },
        { status: 429 } // Too Many Requests
      );
    }

    console.log(`[HealthCheckAPI] Starting job ${jobId}`);

    try {
      // Execute health check job
      await whatsappHealthCheckJob({ id: jobId });

      console.log(`[HealthCheckAPI] Job ${jobId} completed successfully`);

      return NextResponse.json({
        success: true,
        jobId,
        message: 'WhatsApp health check completed',
      });
    } finally {
      // Always release lock, even if job fails
      await jobTracker.releaseLock('whatsapp-health-check', jobId);
    }
  } catch (error) {
    console.error('[HealthCheckAPI] Error:', error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}

/**
 * GET /api/v1/jobs/whatsapp-health-check
 *
 * Check if health check is currently running
 *
 * Rate Limiting:
 * - IP: 60 requests/hour
 * - Organization: 100 requests/hour
 * - Burst: 2 requests/minute
 */
export async function GET(request: NextRequest) {
  // Check rate limits first
  const rateLimitResponse = await rateLimitMiddleware(request, '/api/v1/jobs/whatsapp-health-check');
  if (rateLimitResponse) return rateLimitResponse;

  const jobTracker = getJobTracker();

  try {
    // Verify secret
    const url = new URL(request.url);
    const secret = url.searchParams.get('secret');

    if (!secret || secret !== CRON_SECRET) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const isRunning = await jobTracker.isRunning('whatsapp-health-check');

    return NextResponse.json({
      success: true,
      isRunning,
      jobType: 'whatsapp-health-check',
    });
  } catch (error) {
    console.error('[HealthCheckStatus] Error:', error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}
