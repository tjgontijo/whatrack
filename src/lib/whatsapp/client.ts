import type {
  WhatsAppTemplate,
  SendTemplateResponse,
  WhatsAppPhoneNumber,
  WhatsAppBusinessProfile,
  WhatsAppAccountInfo,
  WhatsAppMessage,
} from '@/types/whatsapp/whatsapp'

const API_VERSION = process.env.META_API_VERSION
const GRAPH_API_URL = `https://graph.facebook.com/${API_VERSION}`

import { ORGANIZATION_HEADER } from '@/lib/constants/http-headers'

export const whatsappApi = {
  /**
   * Lista todos os templates de mensagem aprovados
   */
  async getTemplates(orgId: string): Promise<WhatsAppTemplate[]> {
    const res = await fetch('/api/v1/whatsapp/templates', {
      headers: { [ORGANIZATION_HEADER]: orgId },
    })
    if (!res.ok) {
      const error = await res.json()
      throw new Error(error.error || 'Failed to fetch templates')
    }
    const data = await res.json()
    return data.templates || []
  },

  /**
   * Obtém detalhes de um template específico
   */
  async getTemplate(templateId: string, orgId: string): Promise<WhatsAppTemplate> {
    const res = await fetch(`/api/v1/whatsapp/templates/${templateId}`, {
      headers: { [ORGANIZATION_HEADER]: orgId },
    })
    if (!res.ok) {
      const error = await res.json()
      throw new Error(error.error || 'Failed to fetch template')
    }
    return res.json()
  },

  /**
   * Cria um novo template de mensagem
   */
  async createTemplate(template: any, orgId: string): Promise<any> {
    const res = await fetch('/api/v1/whatsapp/templates', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        [ORGANIZATION_HEADER]: orgId,
      },
      body: JSON.stringify(template),
    })
    if (!res.ok) {
      const error = await res.json()
      throw new Error(error.error || 'Failed to create template')
    }
    return res.json()
  },

  /**
   * Exclui um template de mensagem pelo nome
   */
  async deleteTemplate(name: string, orgId: string): Promise<any> {
    const res = await fetch(`/api/v1/whatsapp/templates?name=${name}`, {
      method: 'DELETE',
      headers: { [ORGANIZATION_HEADER]: orgId },
    })
    if (!res.ok) {
      const error = await res.json()
      throw new Error(error.error || 'Failed to delete template')
    }
    return res.json()
  },

  /**
   * Atualiza um template existente (edita componentes)
   */
  async updateTemplate(templateId: string, components: any[], orgId: string): Promise<any> {
    const res = await fetch('/api/v1/whatsapp/templates', {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        [ORGANIZATION_HEADER]: orgId,
      },
      body: JSON.stringify({ templateId, components }),
    })
    if (!res.ok) {
      const error = await res.json()
      throw new Error(error.error || 'Failed to update template')
    }
    return res.json()
  },

  /**
   * Envia uma mensagem usando um template
   */
  async sendTemplate(
    to: string,
    templateName: string,
    orgId: string,
    language?: string,
    variables?: Array<{ name: string; value: string }>,
  ): Promise<SendTemplateResponse> {
    const res = await fetch('/api/v1/whatsapp/send-template', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        [ORGANIZATION_HEADER]: orgId,
      },
      body: JSON.stringify({ to, templateName, language, variables }),
    })
    if (!res.ok) {
      const error = await res.json()
      throw new Error(error.error || 'Failed to send message')
    }
    return res.json()
  },

  /**
   * Obtém detalhes de uma mensagem específica
   */
  async getMessage(messageId: string, orgId: string): Promise<WhatsAppMessage> {
    const res = await fetch(`/api/v1/whatsapp/messages/${messageId}`, {
      headers: { [ORGANIZATION_HEADER]: orgId },
    })
    if (!res.ok) {
      const error = await res.json()
      throw new Error(error.error || 'Failed to fetch message')
    }
    return res.json()
  },

  /**
   * Lista todos os números de telefone cadastrados na conta WABA
   */
  async listPhoneNumbers(orgId: string): Promise<WhatsAppPhoneNumber[]> {
    const res = await fetch('/api/v1/whatsapp/phone-numbers', {
      headers: { [ORGANIZATION_HEADER]: orgId },
    })
    if (!res.ok) {
      const error = await res.json()
      throw new Error(error.error || 'Failed to fetch phone numbers')
    }
    const data = await res.json()
    return data.phoneNumbers || []
  },

  async getPhoneNumberById(id: string, orgId: string): Promise<WhatsAppPhoneNumber | null> {
    const phones = await this.listPhoneNumbers(orgId)
    return phones.find((p) => p.id === id) || null
  },

  async assignProject(configId: string, projectId: string | null, orgId: string) {
    const res = await fetch('/api/v1/whatsapp/instances', {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        [ORGANIZATION_HEADER]: orgId,
      },
      body: JSON.stringify({ configId, projectId }),
    })
    if (!res.ok) {
      const error = await res.json()
      throw new Error(error.error || 'Failed to assign project')
    }
    return res.json()
  },

  /**
   * Obtém informações detalhadas de um número de telefone específico
   */
  async getPhoneNumber(phoneNumberId: string, orgId: string): Promise<WhatsAppPhoneNumber> {
    const res = await fetch(`/api/v1/whatsapp/phone-numbers/${phoneNumberId}`, {
      headers: { [ORGANIZATION_HEADER]: orgId },
    })
    if (!res.ok) {
      const error = await res.json()
      throw new Error(error.error || 'Failed to fetch phone number')
    }
    return res.json()
  },

  /**
   * Obtém o perfil comercial do WhatsApp Business
   */
  async getBusinessProfile(orgId: string): Promise<WhatsAppBusinessProfile> {
    const res = await fetch('/api/v1/whatsapp/business-profile', {
      headers: { [ORGANIZATION_HEADER]: orgId },
    })
    if (!res.ok) {
      const error = await res.json()
      throw new Error(error.error || 'Failed to fetch business profile')
    }
    return res.json()
  },

  /**
   * Atualiza o perfil comercial do WhatsApp Business
   */
  async updateBusinessProfile(
    data: Partial<WhatsAppBusinessProfile>,
    orgId: string
  ): Promise<WhatsAppBusinessProfile> {
    const res = await fetch('/api/v1/whatsapp/business-profile', {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        [ORGANIZATION_HEADER]: orgId,
      },
      body: JSON.stringify(data),
    })
    if (!res.ok) {
      const error = await res.json()
      throw new Error(error.error || 'Failed to update business profile')
    }
    return res.json()
  },

  /**
   * Obtém as configurações da conta WhatsApp Business
   */
  async getConfig(orgId: string): Promise<WhatsAppAccountInfo> {
    const res = await fetch('/api/v1/whatsapp/config', {
      headers: { [ORGANIZATION_HEADER]: orgId },
    })
    if (!res.ok) {
      const error = await res.json()
      throw new Error(error.error || 'Failed to fetch config')
    }
    return res.json()
  },

  /**
   * Obtém informações da conta WABA (WhatsApp Business Account)
   */
  async getAccountInfo(orgId: string): Promise<WhatsAppAccountInfo> {
    const res = await fetch('/api/v1/whatsapp/account', {
      headers: { [ORGANIZATION_HEADER]: orgId },
    })
    if (!res.ok) {
      const error = await res.json()
      throw new Error(error.error || 'Failed to fetch account info')
    }
    return res.json()
  },

  /**
   * Registra um webhook para receber notificações
   */
  async subscribeWebhook(callbackUrl: string, orgId: string): Promise<{ success: boolean }> {
    const res = await fetch('/api/v1/whatsapp/webhooks/subscribe', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        [ORGANIZATION_HEADER]: orgId,
      },
      body: JSON.stringify({ callbackUrl }),
    })
    if (!res.ok) {
      const error = await res.json()
      throw new Error(error.error || 'Failed to subscribe webhook')
    }
    return res.json()
  },

  /**
   * Ativa um número de telefone (register + subscribe)
   */
  async activateNumber(orgId: string): Promise<{ success: boolean; message: string; results: any }> {
    const res = await fetch('/api/v1/whatsapp/activate', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        [ORGANIZATION_HEADER]: orgId,
      },
    })
    if (!res.ok) {
      const error = await res.json()
      throw new Error(error.error || 'Failed to activate number')
    }
    return res.json()
  },

  /**
   * Obtém os logs de webhook recebidos
   */
  async getWebhookLogs(orgId?: string): Promise<any[]> {
    const res = await fetch('/api/v1/system/webhook-logs', {
      headers: orgId ? { [ORGANIZATION_HEADER]: orgId } : {},
    })
    if (!res.ok) {
      const error = await res.json()
      throw new Error(error.error || 'Failed to fetch webhook logs')
    }
    const data = await res.json()
    return data.logs || []
  },
}
