import "server-only"
import { MetaCloudService } from './meta-cloud.service'
import { TranscriptionService } from './transcription.service'
import { r2Service } from '@/lib/storage/r2.service'
import { prisma } from '@/lib/db/prisma'
import { logger } from '@/lib/utils/logger'
import { publishToCentrifugo } from '@/lib/centrifugo/server'
import { buildOrgMessagesChannel } from '@/lib/centrifugo/channels'

export class WhatsAppMediaService {
  /**
   * Process an audio message: Download from Meta, Upload to R2, and Transcribe using AI.
   * Updates the message in the database with the transcription and R2 URL.
   */
  static async processAudioMessage(
    messageId: string,
    mediaId: string,
    accessToken: string,
    organizationId: string
  ) {
    try {
      logger.info(
        { context: { messageId, mediaId } },
        '[WhatsAppMediaService] Processing audio message'
      )

      // 1. Get Media URL from Meta
      const mediaInfo = await MetaCloudService.getMediaUrl(mediaId, accessToken)

      // 2. Download Media Content
      const audioBuffer = await MetaCloudService.downloadMedia(mediaInfo.url, accessToken)

      // 3. Upload to R2 (Persistence)
      const now = new Date()
      const r2Key = r2Service.generateWhatsAppMediaPath({
        organizationId,
        year: now.getFullYear(),
        month: now.getMonth() + 1,
        day: now.getDate(),
        messageId,
        extension: mediaInfo.mime_type.includes('ogg') ? 'ogg' : 'mp3',
      })

      const uploadedKey = await r2Service.upload(r2Key, audioBuffer, mediaInfo.mime_type)

      // 4. Transcribe using AI
      const transcription = await TranscriptionService.transcribeAudio(
        audioBuffer,
        mediaInfo.mime_type
      )

      if (transcription || uploadedKey) {
        // 5. Update Message in DB
        const updatedMessage = await prisma.message.update({
          where: { id: messageId },
          data: {
            ...(transcription ? { body: transcription } : {}),
            ...(uploadedKey ? { mediaUrl: `r2:${uploadedKey}` } : {}),
          },
        })

        logger.info(
          { context: { messageId, hasTranscription: !!transcription, hasR2: !!uploadedKey } },
          '[WhatsAppMediaService] Message updated'
        )

        // 6. Notify frontend via Centrifugo
        await publishToCentrifugo(buildOrgMessagesChannel(organizationId), {
          type: 'message_updated',
          messageId: updatedMessage.id,
          body: transcription || updatedMessage.body,
          mediaUrl: updatedMessage.mediaUrl,
          conversationId: updatedMessage.appConversationId,
        }).catch((err) => logger.error({ err }, '[WhatsAppMediaService] Centrifugo notify failed'))
      }

      return transcription
    } catch (error) {
      logger.error(
        { err: error, context: { messageId, mediaId } },
        '[WhatsAppMediaService] Error processing audio message'
      )
      return null
    }
  }
}
