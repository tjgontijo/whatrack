import { whatsappContactListSchema } from '@/features/whatsapp/lib/schemas/audience'
import {
  createContactList,
  listContactLists,
} from '@/features/whatsapp/lib/services/whatsapp-contact-list.service'
import { apiError, apiSuccess } from '@/lib/utils/api-response'
import { validateFullAccess } from '@/server/auth/validate-organization-access'


export async function GET(request: Request) {
  const { hasAccess, organizationId } = await validateFullAccess(request)
  if (!hasAccess || !organizationId) return apiError('Unauthorized', 401)

  const { searchParams } = new URL(request.url)
  const projectId = searchParams.get('projectId') || undefined

  const lists = await listContactLists(organizationId, projectId)
  return apiSuccess(lists)
}

export async function POST(request: Request) {
  const { hasAccess, organizationId } = await validateFullAccess(request)
  if (!hasAccess || !organizationId) return apiError('Unauthorized', 401)

  const { searchParams } = new URL(request.url)
  const body = await request.json()
  const parsed = whatsappContactListSchema.safeParse({ ...body, organizationId })
  if (!parsed.success) {
    return apiError('Parâmetros inválidos', 400, { details: parsed.error.flatten() })
  }

  const projectId = searchParams.get('projectId') || undefined
  const list = await createContactList(organizationId, { ...parsed.data, projectId })
  return apiSuccess(list, 201)
}
