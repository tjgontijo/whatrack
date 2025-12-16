import { NextResponse } from 'next/server'
import { z } from 'zod'
import { validateFullAccess } from '@/server/auth/validate-organization-access'
import { sendMetaCloudTemplate } from '@/services/whatsapp/meta-cloud'

const sendTemplateSchema = z.object({
  templateName: z.string().min(1, 'Nome do template é obrigatório'),
  languageCode: z.string().min(1, 'Idioma é obrigatório'),
  phone: z.string().min(1, 'Número de destino é obrigatório'),
  components: z.array(z.object({
    type: z.enum(['header', 'body', 'button']),
    parameters: z.array(z.object({
      type: z.enum(['text', 'currency', 'date_time', 'image', 'document', 'video']),
      text: z.string().optional(),
      image: z.object({ link: z.string() }).optional(),
      document: z.object({ link: z.string(), filename: z.string().optional() }).optional(),
      video: z.object({ link: z.string() }).optional(),
    })),
  })).optional(),
})

/**
 * POST /api/v1/whatsapp/meta-cloud/send-template
 * Sends a template message via Meta Cloud API
 */
export async function POST(request: Request) {
  const access = await validateFullAccess(request)
  if (!access.hasAccess || !access.organizationId) {
    return NextResponse.json({ error: access.error ?? 'Acesso negado' }, { status: 403 })
  }

  try {
    const body = await request.json()
    const parsed = sendTemplateSchema.safeParse(body)

    if (!parsed.success) {
      return NextResponse.json({
        error: 'Dados inválidos',
        details: parsed.error.flatten(),
      }, { status: 400 })
    }

    const { templateName, languageCode, phone, components } = parsed.data

    const result = await sendMetaCloudTemplate({
      organizationId: access.organizationId,
      to: phone,
      templateName,
      languageCode,
      components,
    })

    if (!result.success) {
      return NextResponse.json({
        error: result.error || 'Falha ao enviar template',
      }, { status: 400 })
    }

    return NextResponse.json({
      success: true,
      messageId: result.messageId,
    })
  } catch (error) {
    console.error('[api/v1/whatsapp/meta-cloud/send-template] POST error', error)
    return NextResponse.json({ error: 'Falha ao enviar template' }, { status: 500 })
  }
}
