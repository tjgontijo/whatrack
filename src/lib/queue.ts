/**
 * Job Management - Simple, Serverless-friendly approach
 *
 * Instead of using Bull Queue (which requires child processes),
 * we use a simple approach:
 * 1. Jobs are defined as standalone functions
 * 2. External cron service calls our endpoints
 * 3. We track execution in Redis + Database
 * 4. Retry logic is simple (external service handles retries)
 *
 * This works on:
 * - Vercel (serverless)
 * - Self-hosted (any runtime)
 * - No dependencies on child processes or workers
 */

import { getRedis } from '@/lib/redis';

export type JobType = 'whatsapp-health-check' | 'webhook-retry';

interface JobExecution {
  jobId: string;
  jobType: JobType;
  status: 'pending' | 'running' | 'completed' | 'failed';
  startedAt: number;
  completedAt?: number;
  error?: string;
}

/**
 * Simple job tracking service
 * Tracks execution in Redis for distributed locking
 */
class JobTracker {
  private redis = getRedis();
  private readonly LOCK_PREFIX = 'job-lock:';
  private readonly LOCK_TTL = 3600; // 1 hour

  /**
   * Acquire lock for job execution
   * Prevents duplicate executions in distributed system
   */
  async acquireLock(jobType: JobType): Promise<string | null> {
    const lockKey = `${this.LOCK_PREFIX}${jobType}`;
    const jobId = `${jobType}-${Date.now()}`;

    try {
      // Try to acquire lock (atomic operation)
      const result = await this.redis.set(lockKey, jobId, 'EX', this.LOCK_TTL, 'NX');

      if (result === 'OK') {
        console.log(`[JobTracker] Acquired lock for ${jobType}`);
        return jobId;
      }

      console.log(`[JobTracker] Could not acquire lock for ${jobType}`);
      return null;
    } catch (error) {
      console.error(`[JobTracker] Error acquiring lock:`, error);
      return null;
    }
  }

  /**
   * Release lock after job completion
   */
  async releaseLock(jobType: JobType, jobId: string): Promise<void> {
    const lockKey = `${this.LOCK_PREFIX}${jobType}`;

    try {
      // Only delete if we still own the lock
      const currentJobId = await this.redis.get(lockKey);
      if (currentJobId === jobId) {
        await this.redis.del(lockKey);
        console.log(`[JobTracker] Released lock for ${jobType}`);
      }
    } catch (error) {
      console.error(`[JobTracker] Error releasing lock:`, error);
    }
  }

  /**
   * Check if job is already running
   */
  async isRunning(jobType: JobType): Promise<boolean> {
    const lockKey = `${this.LOCK_PREFIX}${jobType}`;

    try {
      const locked = await this.redis.exists(lockKey);
      return locked === 1;
    } catch (error) {
      console.error(`[JobTracker] Error checking lock:`, error);
      return false;
    }
  }
}

// Singleton instance
let instance: JobTracker | null = null;

export function getJobTracker(): JobTracker {
  if (!instance) {
    instance = new JobTracker();
  }
  return instance;
}
