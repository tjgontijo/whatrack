import { beforeEach, describe, expect, it, vi } from 'vitest'

const prismaMock = vi.hoisted(() => ({
  whatsAppConfig: {
    findMany: vi.fn(),
    findUnique: vi.fn(),
  },
  whatsAppHistorySync: {
    findMany: vi.fn(),
  },
  lead: {
    findMany: vi.fn(),
  },
}))

const loggerMock = vi.hoisted(() => ({
  warn: vi.fn(),
  info: vi.fn(),
  error: vi.fn(),
}))

vi.mock('@/lib/db/prisma', () => ({
  prisma: prismaMock,
}))

vi.mock('@/lib/utils/logger', () => ({
  logger: loggerMock,
}))

import { historySyncAlertsService } from '@/services/whatsapp/history-sync-alerts.service'

describe('history-sync-alerts.service', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('checks stale syncs without eager loading organization relation', async () => {
    prismaMock.whatsAppConfig.findMany.mockResolvedValueOnce([
      {
        id: 'cfg-1',
        organizationId: 'org-1',
        historySyncStartedAt: new Date('2026-02-01T10:00:00.000Z'),
      },
    ])

    await historySyncAlertsService.checkSyncTimeouts(30)

    expect(prismaMock.whatsAppConfig.findMany).toHaveBeenCalledWith({
      where: {
        historySyncStatus: 'pending_history',
        historySyncStartedAt: {
          lt: expect.any(Date),
        },
      },
    })

    expect(loggerMock.warn).toHaveBeenCalledWith('[HistorySyncAlerts] Sync timeout for config cfg-1')
  })
})
