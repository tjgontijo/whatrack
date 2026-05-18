import { type NextRequest, NextResponse } from 'next/server'
import { findWhatsAppDebugData } from '@/features/whatsapp/repositories/find-whatsapp-debug-data.repository'
import { apiError } from '@/lib/utils/api-response'
import { validateFullAccess } from '@/server/auth/validate-organization-access'

export const dynamic = 'force-dynamic'

export async function GET(request: NextRequest) {
  try {
    const access = await validateFullAccess(request)
    if (!access.hasAccess || !access.organizationId) {
      return apiError('Unauthorized', 401)
    }

    const projectId = request.nextUrl.searchParams.get('projectId')
    if (!projectId) return apiError('Project ID is required', 400)

    const data = await findWhatsAppDebugData(access.organizationId, projectId)
    return NextResponse.json(data)
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Unknown error'
    return apiError(message, 500)
  }
}
