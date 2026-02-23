/**
 * GET /api/v1/jobs/webhook-retry
 *
 * Trigger webhook retry job (DLQ)
 *
 * Use cases:
 * - Vercel/external cron calls this endpoint every 5 minutes
 * - Manual testing of retry logic
 *
 * Auth: Requires CRON_SECRET header (Vercel cron) for security
 * Locking: Redis-based distributed lock prevents concurrent executions
 * Rate Limiting:
 * - IP: 60 requests/hour
 * - Organization: 100 requests/hour
 * - Burst: 2 requests/minute
 */

import { NextRequest, NextResponse } from 'next/server';
import { getJobTracker } from '@/lib/queue';
import { webhookRetryJob } from '@/jobs/webhook-retry.job';
import { rateLimitMiddleware } from '@/lib/middleware/rate-limit.middleware';

const CRON_SECRET = process.env.CRON_SECRET;
if (!CRON_SECRET) {
  throw new Error('[WebhookRetry] CRON_SECRET environment variable is required');
}

export const maxDuration = 60; // 60 seconds timeout for retry job

export async function GET(request: NextRequest) {
  // Check rate limits first
  const rateLimitResponse = await rateLimitMiddleware(request, '/api/v1/jobs/webhook-retry');
  if (rateLimitResponse) return rateLimitResponse;

  const jobTracker = getJobTracker();

  try {
    // Verify secret (from Vercel Cron authorization header)
    const authHeader = request.headers.get('authorization');

    if (!CRON_SECRET || authHeader !== `Bearer ${CRON_SECRET}`) {
      console.error('[WebhookRetryAPI] Invalid or missing CRON_SECRET');
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Acquire distributed lock to prevent concurrent executions
    const jobId = await jobTracker.acquireLock('webhook-retry');

    if (!jobId) {
      console.warn('[WebhookRetryAPI] Job already running, skipping');
      return NextResponse.json(
        {
          success: false,
          message: 'Webhook retry already running',
        },
        { status: 429 } // Too Many Requests
      );
    }

    console.log(`[WebhookRetryAPI] Starting job ${jobId}`);

    try {
      // Execute webhook retry job
      await webhookRetryJob({ id: jobId });

      console.log(`[WebhookRetryAPI] Job ${jobId} completed successfully`);

      return NextResponse.json({
        success: true,
        jobId,
        message: 'Webhook retry completed',
      });
    } finally {
      // Always release lock, even if job fails
      await jobTracker.releaseLock('webhook-retry', jobId);
    }
  } catch (error) {
    console.error('[WebhookRetryAPI] Error:', error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}


