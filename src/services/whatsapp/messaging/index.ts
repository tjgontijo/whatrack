/**
 * Messaging Adapter
 * Provides abstraction for sending messages via UAZAPI
 */

import { sendWhatsappMessage } from '@/services/whatsapp/uazapi/send-whatsapp-message'

export interface SendResult {
  success: boolean
  messageId?: string
  error?: string
}

export interface MessagingAdapter {
  sendText(
    organizationId: string,
    instanceId: string,
    phone: string,
    content: string
  ): Promise<SendResult>

  sendImage(
    organizationId: string,
    instanceId: string,
    phone: string,
    imageBase64: string,
    caption?: string
  ): Promise<SendResult>

  sendAudio(
    organizationId: string,
    instanceId: string,
    phone: string,
    audioBase64: string
  ): Promise<SendResult>

  sendVideo(
    organizationId: string,
    instanceId: string,
    phone: string,
    videoBase64: string,
    caption?: string
  ): Promise<SendResult>

  sendDocument(
    organizationId: string,
    instanceId: string,
    phone: string,
    docBase64: string,
    filename: string,
    caption?: string
  ): Promise<SendResult>
}

class UazapiMessagingAdapter implements MessagingAdapter {
  async sendText(
    organizationId: string,
    instanceId: string,
    phone: string,
    content: string
  ): Promise<SendResult> {
    try {
      const result = await sendWhatsappMessage({
        organizationId,
        instanceId,
        to: phone,
        type: 'text',
        text: content,
      })

      return { success: true, messageId: result.messageId }
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Falha ao enviar mensagem'
      return { success: false, error: message }
    }
  }

  async sendImage(
    organizationId: string,
    instanceId: string,
    phone: string,
    imageBase64: string,
    caption?: string
  ): Promise<SendResult> {
    try {
      const result = await sendWhatsappMessage({
        organizationId,
        instanceId,
        to: phone,
        type: 'image',
        mediaUrl: imageBase64,
        caption,
      })

      return { success: true, messageId: result.messageId }
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Falha ao enviar imagem'
      return { success: false, error: message }
    }
  }

  async sendAudio(
    organizationId: string,
    instanceId: string,
    phone: string,
    audioBase64: string
  ): Promise<SendResult> {
    try {
      const result = await sendWhatsappMessage({
        organizationId,
        instanceId,
        to: phone,
        type: 'audio',
        mediaUrl: audioBase64,
      })

      return { success: true, messageId: result.messageId }
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Falha ao enviar áudio'
      return { success: false, error: message }
    }
  }

  async sendVideo(
    organizationId: string,
    instanceId: string,
    phone: string,
    videoBase64: string,
    caption?: string
  ): Promise<SendResult> {
    try {
      const result = await sendWhatsappMessage({
        organizationId,
        instanceId,
        to: phone,
        type: 'video',
        mediaUrl: videoBase64,
        caption,
      })

      return { success: true, messageId: result.messageId }
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Falha ao enviar vídeo'
      return { success: false, error: message }
    }
  }

  async sendDocument(
    organizationId: string,
    instanceId: string,
    phone: string,
    docBase64: string,
    filename: string,
    caption?: string
  ): Promise<SendResult> {
    try {
      const result = await sendWhatsappMessage({
        organizationId,
        instanceId,
        to: phone,
        type: 'document',
        mediaUrl: docBase64,
        caption: caption ?? filename,
      })

      return { success: true, messageId: result.messageId }
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Falha ao enviar documento'
      return { success: false, error: message }
    }
  }
}

// Singleton instance
let adapter: MessagingAdapter | null = null

export function getMessagingAdapter(): MessagingAdapter {
  if (!adapter) {
    adapter = new UazapiMessagingAdapter()
  }
  return adapter
}

// Export for direct usage
export const messagingAdapter = new UazapiMessagingAdapter()
