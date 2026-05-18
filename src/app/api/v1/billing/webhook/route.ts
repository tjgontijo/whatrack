import type { NextRequest } from 'next/server'
import { BillingWebhookHandler } from '@/features/billing/services/webhook.handler'
import { rateLimitMiddleware } from '@/lib/utils/rate-limit.middleware'


export async function POST(request: NextRequest) {
  const rateLimited = await rateLimitMiddleware(request, '/api/v1/billing/webhook')
  if (rateLimited) {
    return rateLimited
  }

  return BillingWebhookHandler.process(request)
}
