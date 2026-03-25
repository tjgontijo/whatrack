import { NextRequest } from 'next/server'
import { apiSuccess, apiError } from '@/lib/utils/api-response'
import { validateFullAccess } from '@/server/auth/validate-organization-access'
import { addOptOut, listOptOuts, AddOptOutSchema } from '@/lib/whatsapp/services/whatsapp-opt-out.service'

export const dynamic = 'force-dynamic'

export async function GET(request: NextRequest) {
  const access = await validateFullAccess(request)
  if (!access.hasAccess || !access.organizationId) {
    return apiError('Unauthorized', 401)
  }

  const url = new URL(request.url)
  const page = Math.max(1, parseInt(url.searchParams.get('page') ?? '1'))
  const pageSize = Math.max(1, Math.min(100, parseInt(url.searchParams.get('pageSize') ?? '20')))
  const phone = url.searchParams.get('phone') ?? undefined

  const result = await listOptOuts(access.organizationId, page, pageSize, phone)

  if (!result.success) {
    return apiError(result.error, 400)
  }

  return apiSuccess(result.data)
}

export async function POST(request: NextRequest) {
  const access = await validateFullAccess(request)
  if (!access.hasAccess || !access.organizationId) {
    return apiError('Unauthorized', 401)
  }

  const payload = await request.json()
  const parsed = AddOptOutSchema.safeParse(payload)

  if (!parsed.success) {
    return apiError('Invalid input', 400)
  }

  const result = await addOptOut(parsed.data, access.organizationId, access.userId)

  if (!result.success) {
    if (result.error === 'already_opted_out') {
      return apiError('This phone number is already opted out', 409)
    }
    return apiError(result.error, 400)
  }

  return apiSuccess(result.data, 201)
}
