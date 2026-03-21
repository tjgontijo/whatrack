import { beforeEach, describe, expect, it, vi } from 'vitest'

const prismaMock = vi.hoisted(() => ({
  whatsAppConfig: {
    findUnique: vi.fn(),
  },
}))

const sendTemplateMock = vi.hoisted(() => vi.fn())
const getAccessTokenForConfigMock = vi.hoisted(() => vi.fn(() => 'resolved-token'))

vi.mock('@/lib/db/prisma', () => ({ prisma: prismaMock }))
vi.mock('@/services/whatsapp/meta-cloud.service', () => ({
  MetaCloudService: {
    sendTemplate: sendTemplateMock,
    getAccessTokenForConfig: getAccessTokenForConfigMock,
  },
}))

import { sendManualTemplate } from '@/services/whatsapp/whatsapp-manual-send.service'

describe('whatsapp-manual-send.service', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('returns 404 when config is not found', async () => {
    prismaMock.whatsAppConfig.findUnique.mockResolvedValue(null)

    const result = await sendManualTemplate({
      configId: 'config-1',
      to: '5561999999999',
      templateName: 'hello_world',
      language: 'pt_BR',
    })

    expect(result).toEqual({
      success: false,
      error: 'Instância não encontrada',
      status: 404,
    })
  })

  it('sends template using the selected config', async () => {
    prismaMock.whatsAppConfig.findUnique.mockResolvedValue({
      id: 'config-1',
      phoneId: 'phone-1',
      accessToken: 'encrypted-token',
      displayPhone: '551148635262',
    })
    sendTemplateMock.mockResolvedValue({ messages: [{ id: 'wamid-1' }] })

    const result = await sendManualTemplate({
      configId: 'config-1',
      to: '5561999999999',
      templateName: 'hello_world',
      language: 'pt_BR',
      variables: [{ name: 'nome', value: 'Thiago' }],
    })

    expect(sendTemplateMock).toHaveBeenCalledWith({
      phoneId: 'phone-1',
      to: '5561999999999',
      templateName: 'hello_world',
      language: 'pt_BR',
      variables: [{ name: 'nome', value: 'Thiago' }],
      accessToken: 'resolved-token',
    })
    expect(result).toEqual({
      success: true,
      data: {
        configId: 'config-1',
        phoneId: 'phone-1',
        displayPhone: '551148635262',
        result: { messages: [{ id: 'wamid-1' }] },
      },
    })
  })
})
