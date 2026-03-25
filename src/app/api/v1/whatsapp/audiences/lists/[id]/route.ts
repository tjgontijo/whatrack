import { apiError, apiSuccess } from '@/lib/utils/api-response';
import { validateFullAccess } from '@/server/auth/validate-organization-access';
import { getContactListById, updateContactList, deleteContactList } from '@/lib/whatsapp/services/whatsapp-contact-list.service';
import { whatsappContactListSchema } from '@/lib/whatsapp/schemas/audience';

export const dynamic = 'force-dynamic';

export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { hasAccess, organizationId } = await validateFullAccess(request);
  if (!hasAccess || !organizationId) return apiError('Unauthorized', 401);

  const result = await getContactListById(organizationId, id);
  if ('error' in result) return apiError(result.error, result.status);

  return apiSuccess(result);
}

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { hasAccess, organizationId } = await validateFullAccess(request);
  if (!hasAccess || !organizationId) return apiError('Unauthorized', 401);

  const body = await request.json();
  const result = await updateContactList(organizationId, id, body);
  if ('error' in result) return apiError(result.error, result.status);

  return apiSuccess(result);
}

export async function DELETE(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { hasAccess, organizationId } = await validateFullAccess(request);
  if (!hasAccess || !organizationId) return apiError('Unauthorized', 401);

  const result = await deleteContactList(organizationId, id);
  if ('error' in result) return apiError(result.error, result.status);

  return apiSuccess({ success: true });
}
