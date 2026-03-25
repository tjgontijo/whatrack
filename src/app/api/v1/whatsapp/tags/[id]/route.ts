import { apiError, apiSuccess } from '@/lib/utils/api-response';
import { validateFullAccess } from '@/server/auth/validate-organization-access';
import { updateLeadTag, deleteLeadTag } from '@/lib/whatsapp/services/whatsapp-lead-tag.service';
import { leadTagSchema } from '@/lib/whatsapp/schemas/audience';

export const dynamic = 'force-dynamic';

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { hasAccess, organizationId } = await validateFullAccess(request);
  if (!hasAccess || !organizationId) return apiError('Unauthorized', 401);

  const { searchParams } = new URL(request.url);
  const projectId = searchParams.get('projectId') || undefined;

  const body = await request.json();
  const result = await updateLeadTag(organizationId, id, { ...body, projectId });
  
  if ('error' in result) {
    return apiError(result.error, result.status);
  }

  return apiSuccess(result);
}

export async function DELETE(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { hasAccess, organizationId } = await validateFullAccess(request);
  if (!hasAccess || !organizationId) return apiError('Unauthorized', 401);

  const { searchParams } = new URL(request.url);
  const projectId = searchParams.get('projectId') || undefined;

  const result = await deleteLeadTag(organizationId, id, projectId);
  if ('error' in result) {
    return apiError(result.error, result.status);
  }

  return apiSuccess({ success: true });
}
