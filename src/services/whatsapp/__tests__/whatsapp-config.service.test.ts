import { beforeEach, describe, expect, it, vi } from 'vitest'

const metaCloudMock = vi.hoisted(() => ({
  getAllConfigs: vi.fn(),
  listPhoneNumbers: vi.fn(),
}))

vi.mock('@/services/whatsapp/meta-cloud.service', () => ({
  MetaCloudService: metaCloudMock,
}))

vi.mock('@/lib/whatsapp/token-crypto', () => ({
  resolveAccessToken: vi.fn(() => 'resolved-token'),
}))

import { listWhatsAppPhoneNumbers } from '@/services/whatsapp/whatsapp-config.service'

describe('whatsapp-config.service', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('returns a pending placeholder when the WABA exists but Meta has not exposed phone numbers yet', async () => {
    metaCloudMock.getAllConfigs.mockResolvedValue([
      {
        id: 'config-1',
        phoneId: 'pending_waba-1',
        wabaId: 'waba-1',
        verifiedName: 'Acme Support',
        displayPhone: 'Número em configuração',
        projectId: 'project-1',
        project: { name: 'Projeto A' },
        accessToken: 'encrypted-token',
      },
    ])
    metaCloudMock.listPhoneNumbers.mockResolvedValue([])

    const result = await listWhatsAppPhoneNumbers('org-1')

    expect(result.data.phoneNumbers).toEqual([
      expect.objectContaining({
        id: 'pending_waba-1',
        configId: 'config-1',
        projectId: 'project-1',
        projectName: 'Projeto A',
        verified_name: 'Acme Support',
        display_phone_number: 'Número em configuração',
        status: 'PENDING',
      }),
    ])
  })

  it('reuses the pending config metadata when Meta starts returning the real phone number', async () => {
    metaCloudMock.getAllConfigs.mockResolvedValue([
      {
        id: 'config-1',
        phoneId: 'pending_waba-1',
        wabaId: 'waba-1',
        verifiedName: 'Acme Support',
        displayPhone: 'Número em configuração',
        projectId: 'project-1',
        project: { name: 'Projeto A' },
        accessToken: 'encrypted-token',
      },
    ])
    metaCloudMock.listPhoneNumbers.mockResolvedValue([
      {
        id: 'phone-1',
        verified_name: 'Acme Support',
        display_phone_number: '+55 11 99999-0000',
        quality_rating: 'GREEN',
        code_verification_status: 'VERIFIED',
        platform_type: 'CLOUD_API',
        throughput: { level: 'STANDARD' },
        name_status: 'APPROVED',
        new_name_status: 'APPROVED',
        status: 'CONNECTED',
      },
    ])

    const result = await listWhatsAppPhoneNumbers('org-1')

    expect(result.data.phoneNumbers).toEqual([
      expect.objectContaining({
        id: 'phone-1',
        configId: 'config-1',
        projectId: 'project-1',
        projectName: 'Projeto A',
        verified_name: 'Acme Support',
        display_phone_number: '+55 11 99999-0000',
        status: 'CONNECTED',
      }),
    ])
  })
})
