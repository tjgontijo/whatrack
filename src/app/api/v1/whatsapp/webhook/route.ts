import { NextRequest, NextResponse } from 'next/server'

import { rateLimitMiddleware } from '@/lib/utils/rate-limit.middleware'
import {
  processWhatsAppWebhookPayload,
  verifyWhatsAppWebhookQuery,
} from '@/services/whatsapp/whatsapp-webhook.service'

export const dynamic = 'force-dynamic'

const VERIFY_TOKEN = process.env.META_WEBHOOK_VERIFY_TOKEN

export async function GET(request: Request) {
  const searchParams = new URL(request.url).searchParams
  const parsed = verifyWhatsAppWebhookQuery({
    'hub.mode': searchParams.get('hub.mode'),
    'hub.verify_token': searchParams.get('hub.verify_token'),
    'hub.challenge': searchParams.get('hub.challenge'),
  })

  if (!parsed.success) {
    return NextResponse.json({ error: 'Verification failed' }, { status: 403 })
  }

  if (parsed.data['hub.verify_token'] === VERIFY_TOKEN) {
    return new Response(parsed.data['hub.challenge'], {
      status: 200,
      headers: { 'Content-Type': 'text/plain' },
    })
  }

  return NextResponse.json({ error: 'Verification failed' }, { status: 403 })
}

export async function POST(request: NextRequest) {
  const rateLimitResponse = await rateLimitMiddleware(request, '/api/v1/whatsapp/webhook')
  if (rateLimitResponse) return rateLimitResponse

  const rawBody = await request.text()
  const signatureHeader = request.headers.get('x-hub-signature-256')

  const result = await processWhatsAppWebhookPayload(rawBody, signatureHeader)
  return NextResponse.json(result)
}
