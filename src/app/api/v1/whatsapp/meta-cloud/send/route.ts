import { cookies } from 'next/headers'
import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth/auth'

interface TemplateParameter {
  type: 'text'
  text: string
  parameter_name?: string
}

interface SendTemplateRequest {
  phoneNumber: string
  templateName: string
  languageCode?: string
  parameters?: TemplateParameter[]
}

interface SendMessageResponse {
  success: boolean
  messageId?: string
  error?: string
}

async function getSessionFromRequest(req: NextRequest) {
  const headers = new Headers(req.headers)
  if (!headers.get('cookie')) {
    const cookieStore = await cookies()
    const cookieHeader = cookieStore
      .getAll()
      .map((cookie) => `${cookie.name}=${cookie.value}`)
      .join('; ')
    if (cookieHeader) headers.set('cookie', cookieHeader)
  }
  return auth.api.getSession({ headers })
}

export async function POST(request: NextRequest): Promise<NextResponse<SendMessageResponse>> {
  try {
    const session = await getSessionFromRequest(request)

    if (!session) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      )
    }

    const { phoneNumber, templateName, languageCode = 'en_US', parameters = [] } = (await request.json()) as SendTemplateRequest

    if (!phoneNumber || !templateName) {
      return NextResponse.json(
        { success: false, error: 'phoneNumber and templateName are required' },
        { status: 400 }
      )
    }

    const accessToken = process.env.META_ACCESS_TOKEN
    const phoneNumberId = process.env.META_PHONE_NUMBER_ID

    if (!accessToken || !phoneNumberId) {
      return NextResponse.json(
        { success: false, error: 'Meta Cloud credentials not configured' },
        { status: 500 }
      )
    }

    const url = `https://graph.facebook.com/v24.0/${phoneNumberId}/messages`

    const payload: Record<string, unknown> = {
      messaging_product: 'whatsapp',
      to: phoneNumber,
      type: 'template',
      template: {
        name: templateName,
        language: {
          code: languageCode,
        },
      },
    }

    if (parameters && parameters.length > 0) {
      (payload.template as Record<string, unknown>).components = [
        {
          type: 'body',
          parameters,
        },
      ]
    }

    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${accessToken}`,
      },
      body: JSON.stringify(payload),
    })

    const data = (await response.json()) as Record<string, unknown>

    if (!response.ok) {
      console.error('[meta-cloud/send] Error:', data)
      const errorMessage = (data.error as Record<string, string> | undefined)?.message || 'Failed to send message'
      return NextResponse.json(
        {
          success: false,
          error: errorMessage,
        },
        { status: response.status }
      )
    }

    const messages = (data.messages as unknown[]) || []
    const messageId = messages[0] as string

    console.log('[meta-cloud/send] Template sent:', {
      messageId,
      to: phoneNumber,
      template: templateName,
      parametersCount: parameters.length,
    })

    return NextResponse.json({
      success: true,
      messageId,
    })
  } catch (error) {
    console.error('[meta-cloud/send] Error:', error)
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Internal server error',
      },
      { status: 500 }
    )
  }
}
