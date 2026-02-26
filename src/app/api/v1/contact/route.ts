import { NextRequest, NextResponse } from 'next/server'

import { apiError } from '@/lib/utils/api-response'
import { contactRequestSchema } from '@/schemas/contact/contact-schemas'
import { dispatchContactWebhook } from '@/services/contact/contact.service'

export async function POST(request: NextRequest) {
  try {
    const validation = contactRequestSchema.safeParse(await request.json())

    if (!validation.success) {
      return apiError('Payload inválido', 400, undefined, { issues: validation.error.flatten() })
    }

    const result = await dispatchContactWebhook(validation.data)
    if ('error' in result) {
      return apiError(result.error, result.status)
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Erro na rota de contato:', error)
    return apiError('Erro ao processar requisição', 500, error)
  }
}
