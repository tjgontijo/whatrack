import { cookies } from 'next/headers'
import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth/auth'

interface TemplateComponent {
  type: 'header' | 'body' | 'footer' | 'buttons'
  text?: string
  format?: string
  parameters?: Array<{
    type: string
    text?: string
  }>
}

interface Template {
  id: string
  name: string
  status: string
  category: string
  language: string
  components?: TemplateComponent[]
}

interface TemplatesResponse {
  success: boolean
  templates?: Template[]
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

export async function GET(request: NextRequest): Promise<NextResponse<TemplatesResponse>> {
  try {
    const session = await getSessionFromRequest(request)

    if (!session) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      )
    }

    const accessToken = process.env.META_ACCESS_TOKEN
    const businessAccountId = process.env.META_BUSINESS_ACCOUNT_ID

    if (!accessToken || !businessAccountId) {
      return NextResponse.json(
        { success: false, error: 'Meta Cloud credentials not configured' },
        { status: 500 }
      )
    }

    const url = `https://graph.facebook.com/v24.0/${businessAccountId}/message_templates?fields=id,name,status,category,language,components`

    const response = await fetch(url, {
      method: 'GET',
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    })

    const data = (await response.json()) as Record<string, unknown>

    if (!response.ok) {
      console.error('[meta-cloud/templates] Error:', data)
      return NextResponse.json(
        {
          success: false,
          error: (data.error as Record<string, string> | undefined)?.message || 'Failed to fetch templates',
        },
        { status: response.status }
      )
    }

    const allTemplates = (data.data as Template[]) || []
    const approvedTemplates = allTemplates.filter((t) => t.status === 'APPROVED')

    console.log('[meta-cloud/templates] Fetched:', {
      total: allTemplates.length,
      approved: approvedTemplates.length,
    })

    return NextResponse.json({
      success: true,
      templates: approvedTemplates,
    })
  } catch (error) {
    console.error('[meta-cloud/templates] Error:', error)
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Internal server error',
      },
      { status: 500 }
    )
  }
}

