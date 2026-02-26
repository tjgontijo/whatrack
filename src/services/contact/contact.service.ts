import type { ContactRequestInput } from '@/schemas/contact/contact-schemas'

interface WebhookTracking {
  trafficSource: string
  utmSource: string | null
  utmMedium: string | null
  utmCampaign: string | null
  fbclid: string | null
  gclid: string | null
}

interface WebhookPayload {
  name: string
  phone: string
  tracking: WebhookTracking
  createdAt: string
}

function normalizeOptionalField(value: string | null | undefined): string | null {
  if (value == null) {
    return null
  }

  const trimmed = value.trim()
  return trimmed.length > 0 ? trimmed : null
}

function buildWebhookPayload(input: ContactRequestInput): WebhookPayload {
  const tracking: WebhookTracking = {
    trafficSource: input.body.tracking.trafficSource,
    utmSource: normalizeOptionalField(input.body.tracking.utmSource),
    utmMedium: normalizeOptionalField(input.body.tracking.utmMedium),
    utmCampaign: normalizeOptionalField(input.body.tracking.utmCampaign),
    fbclid: normalizeOptionalField(input.body.tracking.fbclid),
    gclid: normalizeOptionalField(input.body.tracking.gclid),
  }

  return {
    name: input.body.name,
    phone: input.body.phone,
    tracking,
    createdAt: input.body.createdAt,
  }
}

export async function dispatchContactWebhook(input: ContactRequestInput) {
  const webhookPayload = buildWebhookPayload(input)

  const response = await fetch(
    'https://webhook.elev8.com.br/webhook/e400a55e-a59d-4130-9add-db88cd65bfd1',
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(webhookPayload),
    }
  )

  if (!response.ok) {
    return { error: `Erro ao enviar (${response.status})` as const, status: response.status }
  }

  return { success: true as const }
}
