import { NextRequest, NextResponse } from 'next/server'
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
      return NextResponse.json(
        { error: 'Missing channel or data' },
        { status: 400 }
      )
    }

    console.log(`[Test] Publishing to ${channel}:`, data)

    const success = await publishToCentrifugo(channel, data)

    if (!success) {
      return NextResponse.json(
        { error: 'Failed to publish to Centrifugo' },
        { status: 500 }
      )
    }

    return NextResponse.json({
      success: true,
      message: 'Message published successfully',
      channel,
      data
    })
  } catch (error) {
    console.error('[Test] Publish error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
