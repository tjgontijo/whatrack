import "server-only"
import OpenAI from 'openai'
import { toFile } from 'openai/uploads'
import { env } from '@/lib/env/env'
import { logger } from '@/lib/utils/logger'

export class TranscriptionService {
  private static openai = new OpenAI({
    apiKey: env.OPENAI_API_KEY,
  })

  /**
   * Transcribe audio using gpt-4o-mini with audio capabilities.
   * This is more flexible than Whisper as it can also summarize or translate in the same step.
   * Note: The audio must be in a supported format (wav, mp3, ogg, etc.)
   */
  static async transcribeAudio(audioBuffer: ArrayBuffer, mimeType: string): Promise<string> {
    if (!env.OPENAI_API_KEY) {
      logger.warn('[TranscriptionService] OPENAI_API_KEY not found, skipping transcription')
      return ''
    }

    try {
      logger.info({ context: { mimeType, size: audioBuffer.byteLength } }, '[TranscriptionService] Starting transcription with gpt-4o-mini')

      const extension = this.mapMimeTypeToExtension(mimeType)
      const file = await toFile(Buffer.from(audioBuffer), `audio.${extension}`, {
        type: mimeType,
      })

      const response = await this.openai.audio.transcriptions.create({
        file,
        model: 'gpt-4o-mini-transcribe',
      })

      const transcription = response.text || ''
      logger.info('[TranscriptionService] Transcription completed')

      return transcription.trim()
    } catch (error) {
      logger.error({ err: error }, '[TranscriptionService] Error transcribing audio')
      return ''
    }
  }

  private static mapMimeTypeToExtension(mimeType: string): 'ogg' | 'mp3' | 'wav' | 'flac' {
    if (mimeType.includes('audio/ogg') || mimeType.includes('codecs=opus')) return 'ogg'
    if (mimeType.includes('audio/mpeg')) return 'mp3'
    if (mimeType.includes('audio/wav')) return 'wav'
    if (mimeType.includes('audio/flac')) return 'flac'
    return 'ogg'
  }
}
