import { NextResponse } from 'next/server'
import { z } from 'zod'
import { validateFullAccess } from '@/server/auth/validate-organization-access'
import { prisma } from '@/lib/prisma'
import { sendWhatsappMessage } from '@/services/whatsapp/uazapi/send-whatsapp-message'

const testMessageSchema = z.object({
  phone: z.string().min(1, 'Número de destino é obrigatório'),
  message: z.string().min(1, 'Mensagem é obrigatória'),
})

/**
 * POST /api/v1/whatsapp/instances/[id]/test
 * Sends a test message via the WhatsApp instance
 */
export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const access = await validateFullAccess(request)
  if (!access.hasAccess || !access.organizationId) {
    return NextResponse.json({ error: access.error ?? 'Acesso negado' }, { status: 403 })
  }

  const { id: instanceId } = await params

  try {
    const body = await request.json()
    const parsed = testMessageSchema.safeParse(body)

    if (!parsed.success) {
      return NextResponse.json({
        error: 'Dados inválidos',
        details: parsed.error.flatten(),
      }, { status: 400 })
    }

    const { phone, message } = parsed.data

    // Verify instance exists and belongs to organization
    const instance = await prisma.whatsappInstance.findUnique({
      where: {
        organizationId_instanceId: {
          organizationId: access.organizationId,
          instanceId,
        },
      },
    })

    if (!instance) {
      return NextResponse.json({
        error: 'Instância não encontrada',
      }, { status: 404 })
    }

    // Note: Instance status is fetched from external API, not stored in DB.
    // The frontend already verifies the instance is connected before showing
    // the test button, so we trust the caller here.
    // If needed, we could call getWhatsappInstance to verify status.

    // Format phone number (remove non-digits)
    const formattedPhone = phone.replace(/\D/g, '')

    // Send test message
    const result = await sendWhatsappMessage({
      instanceId,
      organizationId: access.organizationId,
      to: formattedPhone,
      type: 'text',
      text: message,
    })

    return NextResponse.json({
      success: true,
      messageId: result.messageId,
    })
  } catch (error) {
    console.error('[api/v1/whatsapp/instances/[id]/test] POST error', error)
    const errorMessage = error instanceof Error ? error.message : 'Falha ao enviar mensagem'
    return NextResponse.json({ error: errorMessage }, { status: 500 })
  }
}
