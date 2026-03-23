import { beforeEach, describe, expect, it, vi } from 'vitest'

const {
  configFindFirstMock,
  recordEventMock,
  getAccessTokenForConfigMock,
  sendTextMock,
  sendTemplateMock,
  logSendMock,
  errorMock,
} = vi.hoisted(() => ({
  configFindFirstMock: vi.fn(),
  recordEventMock: vi.fn(),
  getAccessTokenForConfigMock: vi.fn(),
  sendTextMock: vi.fn(),
  sendTemplateMock: vi.fn(),
  logSendMock: vi.fn(),
  errorMock: vi.fn(),
}))

vi.mock('@/lib/db/prisma', () => ({
  prisma: {
    whatsAppConfig: {
      findFirst: configFindFirstMock,
    },
  },
}))

vi.mock('@/lib/ai/services/ai-event.service', () => ({
  aiEventService: {
    record: recordEventMock,
  },
}))

vi.mock('@/services/whatsapp/meta-cloud.service', () => ({
  MetaCloudService: {
    getAccessTokenForConfig: getAccessTokenForConfigMock,
    sendText: sendTextMock,
    sendTemplate: sendTemplateMock,
  },
}))

vi.mock('@/services/whatsapp/whatsapp-template-analytics.service', () => ({
  WhatsAppTemplateAnalyticsService: {
    logSend: logSendMock,
  },
}))

vi.mock('@/lib/utils/logger', () => ({
  logger: {
    error: errorMock,
  },
}))

import { sendWhatsAppAiReply } from '@/lib/ai/services/whatsapp-ai-send.service'

describe('sendWhatsAppAiReply', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    configFindFirstMock.mockResolvedValue({
      id: 'cfg-1',
      phoneId: '123456',
      accessToken: 'encrypted-token',
    })
    getAccessTokenForConfigMock.mockReturnValue('plain-token')
    recordEventMock.mockResolvedValue({
      success: true,
      data: { id: 'event-1' },
    })
  })

  it('sends free-form text when the 24h window is open', async () => {
    sendTextMock.mockResolvedValue({
      messages: [{ id: 'wamid-text-1' }],
    })

    const result = await sendWhatsAppAiReply({
      organizationId: 'org-1',
      projectId: 'proj-1',
      leadId: 'lead-1',
      ticketId: 'ticket-1',
      conversationId: 'conv-1',
      to: '5511999999999',
      text: 'Olá! Como posso ajudar?',
      windowOpen: true,
    })

    expect(result.success).toBe(true)
    if (result.success) {
      expect(result.data.channel).toBe('message')
      expect(result.data.wamid).toBe('wamid-text-1')
    }
    expect(sendTextMock).toHaveBeenCalledTimes(1)
    expect(sendTemplateMock).not.toHaveBeenCalled()
  })

  it('falls back to template when the 24h window is closed', async () => {
    sendTemplateMock.mockResolvedValue({
      messages: [{ id: 'wamid-template-1' }],
    })

    const result = await sendWhatsAppAiReply({
      organizationId: 'org-1',
      projectId: 'proj-1',
      leadId: 'lead-1',
      ticketId: 'ticket-1',
      conversationId: 'conv-1',
      to: '5511999999999',
      text: 'Mensagem fora da janela',
      windowOpen: false,
      templateName: 'hello_world',
    })

    expect(result.success).toBe(true)
    if (result.success) {
      expect(result.data.channel).toBe('template')
      expect(result.data.wamid).toBe('wamid-template-1')
    }
    expect(sendTemplateMock).toHaveBeenCalledTimes(1)
    expect(logSendMock).toHaveBeenCalledWith('wamid-template-1', 'hello_world', 'org-1')
  })

  it('fails when no whatsapp config is available for the project', async () => {
    configFindFirstMock.mockResolvedValueOnce(null)

    const result = await sendWhatsAppAiReply({
      organizationId: 'org-1',
      projectId: 'proj-1',
      leadId: 'lead-1',
      conversationId: 'conv-1',
      to: '5511999999999',
      text: 'Olá',
      windowOpen: true,
    })

    expect(result).toEqual({
      success: false,
      error: 'WhatsApp config with phoneId not found for project',
    })
  })
})
