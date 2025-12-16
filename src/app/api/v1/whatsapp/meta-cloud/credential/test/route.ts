import { NextResponse } from 'next/server'
import { z } from 'zod'
import { validateFullAccess } from '@/server/auth/validate-organization-access'
import { getMetaCloudConfig } from '@/services/whatsapp/meta-cloud'

const testCredentialSchema = z.object({
  phoneNumberId: z.string().min(1, 'Phone Number ID é obrigatório'),
  accessToken: z.string().min(1, 'Access Token é obrigatório'),
})

/**
 * POST /api/v1/whatsapp/meta-cloud/credential/test
 * Tests Meta Cloud credential by calling the Meta API
 */
export async function POST(request: Request) {
  const access = await validateFullAccess(request)
  if (!access.hasAccess || !access.organizationId) {
    return NextResponse.json({ error: access.error ?? 'Acesso negado' }, { status: 403 })
  }

  try {
    const body = await request.json()
    const parsed = testCredentialSchema.safeParse(body)

    if (!parsed.success) {
      return NextResponse.json({
        error: 'Dados inválidos',
        details: parsed.error.flatten(),
      }, { status: 400 })
    }

    const { phoneNumberId, accessToken } = parsed.data

    const { graphApiUrl } = getMetaCloudConfig()

    // Test by fetching phone number details
    const response = await fetch(`${graphApiUrl}/${phoneNumberId}`, {
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    })

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}))
      const errorMessage = errorData.error?.message || `Erro da API Meta: ${response.status}`
      return NextResponse.json({
        success: false,
        error: errorMessage,
      }, { status: 400 })
    }

    const data = await response.json()

    // Extract phone number from response
    // Meta API returns display_phone_number in format like "+55 11 99999-9999"
    const phoneNumber = data.display_phone_number || data.verified_name || ''

    return NextResponse.json({
      success: true,
      phoneNumber: phoneNumber.replace(/\D/g, ''), // Strip non-digits
      displayName: data.verified_name,
    })
  } catch (error) {
    console.error('[api/v1/whatsapp/meta-cloud/credential/test] POST error', error)
    return NextResponse.json({
      success: false,
      error: 'Falha ao testar conexão',
    }, { status: 500 })
  }
}
