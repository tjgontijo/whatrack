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

vi.mock('@/lib/db/prisma', () => ({
  prisma: prismaMock,
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

    const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {})
    const logSpy = vi.spyOn(console, 'log').mockImplementation(() => {})

    await historySyncAlertsService.checkSyncTimeouts(30)

    expect(prismaMock.whatsAppConfig.findMany).toHaveBeenCalledWith({
      where: {
        historySyncStatus: 'pending_history',
        historySyncStartedAt: {
          lt: expect.any(Date),
        },
      },
    })

    expect(warnSpy).toHaveBeenCalledWith('[HistorySyncAlerts] Sync timeout for config cfg-1')

    warnSpy.mockRestore()
    logSpy.mockRestore()
  })
})
