import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'

import { validateFullAccess } from '@/server/auth/validate-organization-access'
import { sendWhatsappMessage } from '@/services/whatsapp/uazapi/send-whatsapp-message'

const sendTestMessageSchema = z.object({
  to: z.string().min(1, 'Destino é obrigatório'),
  text: z.string().min(1, 'Texto é obrigatório'),
  linkPreview: z.boolean().optional(),
  linkPreviewTitle: z.string().optional(),
  linkPreviewDescription: z.string().optional(),
  linkPreviewImage: z.string().optional(),
  linkPreviewLarge: z.boolean().optional(),
})

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const access = await validateFullAccess(request)
  if (!access.hasAccess || !access.organizationId) {
    return NextResponse.json({ error: access.error ?? 'Acesso negado' }, { status: 403 })
  }

  const { id: instanceId } = await params

  try {
    const body = await request.json()
    const parsed = sendTestMessageSchema.safeParse(body)

    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Payload inválido', details: parsed.error.flatten() },
        { status: 400 }
      )
    }

    const result = await sendWhatsappMessage({
      organizationId: access.organizationId,
      instanceId,
      to: parsed.data.to,
      type: 'text',
      text: parsed.data.text,
      linkPreview: parsed.data.linkPreview,
      linkPreviewTitle: parsed.data.linkPreviewTitle,
      linkPreviewDescription: parsed.data.linkPreviewDescription,
      linkPreviewImage: parsed.data.linkPreviewImage,
      linkPreviewLarge: parsed.data.linkPreviewLarge,
    })

    return NextResponse.json({ success: true, messageId: result.messageId })
  } catch (error) {
    console.error('[api/v1/whatsapp/instances/[id]/test] POST error', error)
    const message = error instanceof Error ? error.message : 'Falha ao enviar mensagem de teste'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
