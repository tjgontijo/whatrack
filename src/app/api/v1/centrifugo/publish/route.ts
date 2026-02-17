import { NextRequest, NextResponse } from 'next/server'
import { validateFullAccess } from '@/server/auth/validate-organization-access'

/**
 * POST /api/v1/centrifugo/publish
 *
 * Publishes a message to a Centrifugo channel via the server-side API.
 * This is used internally to send real-time updates to connected clients.
 *
 * Request body:
 * {
 *   "channel": "org:123:messages",
 *   "data": { ... }
 * }
 *
 * Response:
 * {
 *   "success": true
 * }
 */
export async function POST(request: NextRequest) {
  try {
    // Validate user authentication and organization access
    const access = await validateFullAccess(request)

    if (!access.hasAccess || !access.organizationId) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    const { channel, data } = await request.json()

    if (!channel || !data) {
      return NextResponse.json(
        { error: 'Missing required fields: channel, data' },
        { status: 400 }
      )
    }

    // Ensure channel belongs to organization
    if (!channel.includes(access.organizationId)) {
      return NextResponse.json(
        { error: 'Cannot publish to channels outside your organization' },
        { status: 403 }
      )
    }

    const centrifugoUrl = process.env.CENTRIFUGO_URL
    const apiKey = process.env.CENTRIFUGO_API_KEY

    if (!centrifugoUrl || !apiKey) {
      console.error('[Centrifugo] CENTRIFUGO_URL or CENTRIFUGO_API_KEY not configured')
      return NextResponse.json(
        { error: 'Server configuration error' },
        { status: 500 }
      )
    }

    // Call Centrifugo HTTP API
    const response = await fetch(`${centrifugoUrl}/api/publish`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `apikey ${apiKey}`,
      },
      body: JSON.stringify({
        channel,
        data,
      }),
    })

    if (!response.ok) {
      const error = await response.text()
      console.error('[Centrifugo] Publish failed:', response.status, error)
      return NextResponse.json(
        { error: 'Failed to publish message' },
        { status: response.status }
      )
    }

    return NextResponse.json({ success: true }, { status: 200 })
  } catch (error) {
    console.error('[Centrifugo] Publish error:', error)
    return NextResponse.json(
      { error: 'Failed to publish message' },
      { status: 500 }
    )
  }
}
