import { logger } from '@/lib/utils/logger'

export async function publishToCentrifugo(channel: string, data: any) {
  const url = `${process.env.CENTRIFUGO_URL}/api/publish`

  try {
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `apikey ${process.env.CENTRIFUGO_API_KEY}`,
      },
      body: JSON.stringify({
        channel,
        data,
      }),
    })

    if (!response.ok) {
      const responseText = await response.text()
      logger.error(
        `[Centrifugo] Publish failed: ${response.status} ${response.statusText} - ${responseText}`
      )
      return false
    }
    logger.info(`[Centrifugo] Published to channel: ${channel}`)
    return true
  } catch (error) {
    logger.error({ err: error }, '[Centrifugo] Publish error')
    return false
  }
}
