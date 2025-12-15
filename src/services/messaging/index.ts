/**
 * Messaging Adapter
 * Provides abstraction for sending messages via WuzAPI (self-hosted WhatsApp gateway)
 */

import {
  sendWuzapiMessage,
  sendWuzapiImage,
  sendWuzapiAudio,
  sendWuzapiVideo,
  sendWuzapiDocument,
} from '@/services/whatsapp/wuzapi'

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

class WuzapiMessagingAdapter implements MessagingAdapter {
  async sendText(
    organizationId: string,
    instanceId: string,
    phone: string,
    content: string
  ): Promise<SendResult> {
    return sendWuzapiMessage({
      organizationId,
      instanceId,
      phone,
      message: content,
    })
  }

  async sendImage(
    organizationId: string,
    instanceId: string,
    phone: string,
    imageBase64: string,
    caption?: string
  ): Promise<SendResult> {
    return sendWuzapiImage({
      organizationId,
      instanceId,
      phone,
      image: imageBase64,
      caption,
    })
  }

  async sendAudio(
    organizationId: string,
    instanceId: string,
    phone: string,
    audioBase64: string
  ): Promise<SendResult> {
    return sendWuzapiAudio({
      organizationId,
      instanceId,
      phone,
      audio: audioBase64,
    })
  }

  async sendVideo(
    organizationId: string,
    instanceId: string,
    phone: string,
    videoBase64: string,
    caption?: string
  ): Promise<SendResult> {
    return sendWuzapiVideo({
      organizationId,
      instanceId,
      phone,
      video: videoBase64,
      caption,
    })
  }

  async sendDocument(
    organizationId: string,
    instanceId: string,
    phone: string,
    docBase64: string,
    filename: string,
    caption?: string
  ): Promise<SendResult> {
    return sendWuzapiDocument({
      organizationId,
      instanceId,
      phone,
      document: docBase64,
      filename,
      caption,
    })
  }
}

// Singleton instance
let adapter: MessagingAdapter | null = null

export function getMessagingAdapter(): MessagingAdapter {
  if (!adapter) {
    adapter = new WuzapiMessagingAdapter()
  }
  return adapter
}

// Export for direct usage
export const messagingAdapter = new WuzapiMessagingAdapter()
