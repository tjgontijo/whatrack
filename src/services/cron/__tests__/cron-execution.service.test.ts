import { beforeEach, describe, expect, it, vi } from 'vitest'

const acquireLockMock = vi.hoisted(() => vi.fn())
const releaseLockMock = vi.hoisted(() => vi.fn())
const loggerMock = vi.hoisted(() => ({
  error: vi.fn(),
  info: vi.fn(),
  warn: vi.fn(),
}))

vi.mock('@/lib/db/queue', () => ({
  getJobTracker: () => ({
    acquireLock: acquireLockMock,
    releaseLock: releaseLockMock,
  }),
}))

vi.mock('@/lib/utils/logger', () => ({
  logger: loggerMock,
}))

import { executeLockedCronJob } from '@/services/cron/cron-execution.service'

describe('executeLockedCronJob', () => {
  beforeEach(() => {
    acquireLockMock.mockReset()
    releaseLockMock.mockReset()
    loggerMock.error.mockReset()
    loggerMock.info.mockReset()
    loggerMock.warn.mockReset()
  })

  it('returns already-running when lock acquisition fails', async () => {
    acquireLockMock.mockResolvedValueOnce(null)

    const result = await executeLockedCronJob({
      jobType: 'meta-token-refresh',
      loggerLabel: 'MetaTokenRefreshCron',
      run: vi.fn(),
    })

    expect(result).toEqual({ status: 'already-running' })
    expect(loggerMock.warn).toHaveBeenCalledWith(
      '[MetaTokenRefreshCron] Job already running, skipping',
    )
  })

  it('executes the job and releases the lock on success', async () => {
    acquireLockMock.mockResolvedValueOnce('job-1')
    releaseLockMock.mockResolvedValueOnce(undefined)

    const result = await executeLockedCronJob({
      jobType: 'webhook-retry',
      loggerLabel: 'WebhookRetryCron',
      run: vi.fn().mockResolvedValueOnce({ processed: 3 }),
    })

    expect(result).toEqual({
      status: 'completed',
      jobId: 'job-1',
      data: { processed: 3 },
    })
    expect(releaseLockMock).toHaveBeenCalledWith('webhook-retry', 'job-1')
  })

  it('releases the lock and rethrows when the job fails', async () => {
    acquireLockMock.mockResolvedValueOnce('job-2')
    releaseLockMock.mockResolvedValueOnce(undefined)

    await expect(
      executeLockedCronJob({
        jobType: 'whatsapp-health-check',
        loggerLabel: 'WhatsAppHealthCheckCron',
        run: vi.fn().mockRejectedValueOnce(new Error('boom')),
      }),
    ).rejects.toThrow('boom')

    expect(releaseLockMock).toHaveBeenCalledWith('whatsapp-health-check', 'job-2')
    expect(loggerMock.error).toHaveBeenCalled()
  })
})
