import { NextRequest, NextResponse } from 'next/server'
import { apiError } from '@/lib/utils/api-response'
import { publishToCentrifugo } from '@/lib/centrifugo/server'

/**
 * POST /api/v1/test/publish-message
 *
 * Test endpoint to publish a message to Centrifugo
 * Simulates what happens when a WhatsApp webhook arrives
 *
 * Used for testing real-time functionality
 */
export async function POST(request: NextRequest) {
  try {
    const { channel, data } = await request.json()

    if (!channel || !data) {
      return apiError('Missing channel or data', 400)
    }

    console.log(`[Test] Publishing to ${channel}:`, data)

    const success = await publishToCentrifugo(channel, data)

    if (!success) {
      return apiError('Failed to publish to Centrifugo', 500)
    }

    return NextResponse.json({
      success: true,
      message: 'Message published successfully',
      channel,
      data,
    })
  } catch (error) {
    console.error('[Test] Publish error:', error)
    return apiError('Internal server error', 500, error)
  }
}
