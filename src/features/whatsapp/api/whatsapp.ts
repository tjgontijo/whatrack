import type {
    WhatsAppTemplate,
    SendTemplateResponse,
    WhatsAppPhoneNumber,
    WhatsAppBusinessProfile,
    WhatsAppAccountInfo,
    WhatsAppMessage
} from '../types';

const API_VERSION = process.env.META_API_VERSION || 'v24.0';
const GRAPH_API_URL = `https://graph.facebook.com/${API_VERSION}`;

export const whatsappApi = {
    // ============================================================================
    // TEMPLATES - Gerenciamento de Templates de Mensagem
    // ============================================================================

    /**
     * Lista todos os templates de mensagem aprovados
     */
    async getTemplates(): Promise<WhatsAppTemplate[]> {
        const res = await fetch('/api/v1/whatsapp/templates');
        if (!res.ok) {
            const error = await res.json();
            throw new Error(error.error || 'Failed to fetch templates');
        }
        const data = await res.json();
        return data.templates || [];
    },

    /**
     * Obtém detalhes de um template específico
     */
    async getTemplate(templateId: string): Promise<WhatsAppTemplate> {
        const res = await fetch(`/api/v1/whatsapp/templates/${templateId}`);
        if (!res.ok) {
            const error = await res.json();
            throw new Error(error.error || 'Failed to fetch template');
        }
        return res.json();
    },

    /**
     * Cria um novo template de mensagem
     */
    async createTemplate(template: any): Promise<any> {
        const res = await fetch('/api/v1/whatsapp/templates', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(template),
        });
        if (!res.ok) {
            const error = await res.json();
            throw new Error(error.error || 'Failed to create template');
        }
        return res.json();
    },

    /**
     * Exclui um template de mensagem pelo nome
     */
    async deleteTemplate(name: string): Promise<any> {
        const res = await fetch(`/api/v1/whatsapp/templates?name=${name}`, {
            method: 'DELETE',
        });
        if (!res.ok) {
            const error = await res.json();
            throw new Error(error.error || 'Failed to delete template');
        }
        return res.json();
    },

    // ============================================================================
    // MENSAGENS - Envio e Gerenciamento de Mensagens
    // ============================================================================

    /**
     * Envia uma mensagem usando um template
     */
    async sendTemplate(to: string, templateName: string): Promise<SendTemplateResponse> {
        const res = await fetch('/api/v1/whatsapp/send-template', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ to, templateName }),
        });
        if (!res.ok) {
            const error = await res.json();
            throw new Error(error.error || 'Failed to send message');
        }
        return res.json();
    },

    /**
     * Obtém detalhes de uma mensagem específica
     */
    async getMessage(messageId: string): Promise<WhatsAppMessage> {
        const res = await fetch(`/api/v1/whatsapp/messages/${messageId}`);
        if (!res.ok) {
            const error = await res.json();
            throw new Error(error.error || 'Failed to fetch message');
        }
        return res.json();
    },

    // ============================================================================
    // NÚMEROS DE TELEFONE - Gerenciamento de Números WhatsApp Business
    // ============================================================================

    /**
     * Lista todos os números de telefone cadastrados na conta WABA
     */
    async listPhoneNumbers(): Promise<WhatsAppPhoneNumber[]> {
        const res = await fetch('/api/v1/whatsapp/phone-numbers');
        if (!res.ok) {
            const error = await res.json();
            throw new Error(error.error || 'Failed to fetch phone numbers');
        }
        const data = await res.json();
        return data.phoneNumbers || [];
    },

    async getPhoneNumberById(id: string): Promise<WhatsAppPhoneNumber | null> {
        const phones = await this.listPhoneNumbers();
        return phones.find(p => p.id === id) || null;
    },

    /**
     * Obtém informações detalhadas de um número de telefone específico
     */
    async getPhoneNumber(phoneNumberId: string): Promise<WhatsAppPhoneNumber> {
        const res = await fetch(`/api/v1/whatsapp/phone-numbers/${phoneNumberId}`);
        if (!res.ok) {
            const error = await res.json();
            throw new Error(error.error || 'Failed to fetch phone number');
        }
        return res.json();
    },

    // ============================================================================
    // PERFIL COMERCIAL - Informações do Negócio no WhatsApp
    // ============================================================================

    /**
     * Obtém o perfil comercial do WhatsApp Business
     */
    async getBusinessProfile(): Promise<WhatsAppBusinessProfile> {
        const res = await fetch('/api/v1/whatsapp/business-profile');
        if (!res.ok) {
            const error = await res.json();
            throw new Error(error.error || 'Failed to fetch business profile');
        }
        return res.json();
    },

    /**
     * Atualiza o perfil comercial do WhatsApp Business
     */
    async updateBusinessProfile(data: Partial<WhatsAppBusinessProfile>): Promise<WhatsAppBusinessProfile> {
        const res = await fetch('/api/v1/whatsapp/business-profile', {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(data),
        });
        if (!res.ok) {
            const error = await res.json();
            throw new Error(error.error || 'Failed to update business profile');
        }
        return res.json();
    },

    // ============================================================================
    // CONFIGURAÇÃO - Informações da Conta WABA
    // ============================================================================

    /**
     * Obtém as configurações da conta WhatsApp Business
     */
    async getConfig(): Promise<WhatsAppAccountInfo> {
        const res = await fetch('/api/v1/whatsapp/config');
        if (!res.ok) {
            const error = await res.json();
            throw new Error(error.error || 'Failed to fetch config');
        }
        return res.json();
    },

    /**
     * Obtém informações da conta WABA (WhatsApp Business Account)
     */
    async getAccountInfo(): Promise<WhatsAppAccountInfo> {
        const res = await fetch('/api/v1/whatsapp/account');
        if (!res.ok) {
            const error = await res.json();
            throw new Error(error.error || 'Failed to fetch account info');
        }
        return res.json();
    },

    // ============================================================================
    // WEBHOOKS - Mensagens Recebidas e Notificações
    // ============================================================================

    /**
     * Registra um webhook para receber notificações
     * Nota: Normalmente configurado via Meta App Dashboard
     */
    async subscribeWebhook(callbackUrl: string): Promise<{ success: boolean }> {
        const res = await fetch('/api/v1/whatsapp/webhooks/subscribe', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ callbackUrl }),
        });
        if (!res.ok) {
            const error = await res.json();
            throw new Error(error.error || 'Failed to subscribe webhook');
        }
        return res.json();
    },

    /**
     * Ativa um número de telefone (register + subscribe)
     */
    async activateNumber(): Promise<{ success: boolean; message: string; results: any }> {
        const res = await fetch('/api/v1/whatsapp/activate', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
        });
        if (!res.ok) {
            const error = await res.json();
            throw new Error(error.error || 'Failed to activate number');
        }
        return res.json();
    },

    /**
     * Obtém os logs de webhook recebidos
     */
    async getWebhookLogs(): Promise<any[]> {
        const res = await fetch('/api/v1/system/webhook-logs');
        if (!res.ok) {
            const error = await res.json();
            throw new Error(error.error || 'Failed to fetch webhook logs');
        }
        const data = await res.json();
        return data.logs || [];
    },
};
