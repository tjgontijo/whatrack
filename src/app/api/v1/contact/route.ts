import { NextRequest, NextResponse } from 'next/server'

import { contactRequestSchema } from '@/schemas/contact/contact-schemas'
import { dispatchContactWebhook } from '@/services/contact/contact.service'

export async function POST(request: NextRequest) {
  try {
    const validation = contactRequestSchema.safeParse(await request.json())

    if (!validation.success) {
      return NextResponse.json(
        {
          error: 'Payload inválido',
          issues: validation.error.flatten(),
        },
        { status: 400 }
      )
    }

    const result = await dispatchContactWebhook(validation.data)
    if ('error' in result) {
      return NextResponse.json({ error: result.error }, { status: result.status })
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Erro na rota de contato:', error)
    return NextResponse.json({ error: 'Erro ao processar requisição' }, { status: 500 })
  }
}
