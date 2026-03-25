import { apiError, apiSuccess } from '@/lib/utils/api-response';
import { validateFullAccess } from '@/server/auth/validate-organization-access';
import { getAudienceSegmentById, updateAudienceSegment, deleteAudienceSegment } from '@/lib/whatsapp/services/whatsapp-audience-segment.service';
import { queryLeadsByFilters } from '@/lib/whatsapp/queries/lead-segment-query';

export const dynamic = 'force-dynamic';

export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { hasAccess, organizationId } = await validateFullAccess(request);
  if (!hasAccess || !organizationId) return apiError('Unauthorized', 401);

  const { searchParams } = new URL(request.url);
  const preview = searchParams.get('preview') === 'true';

  const segment = await getAudienceSegmentById(organizationId, id);
  if ('error' in segment) return apiError(segment.error, segment.status);

  if (preview) {
    const leads = await queryLeadsByFilters(organizationId, segment.filters as any);
    return apiSuccess({ ...segment, preview: leads });
  }

  return apiSuccess(segment);
}

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { hasAccess, organizationId } = await validateFullAccess(request);
  if (!hasAccess || !organizationId) return apiError('Unauthorized', 401);

  const body = await request.json();
  const result = await updateAudienceSegment(organizationId, id, body);
  if ('error' in result) return apiError(result.error, result.status);

  return apiSuccess(result);
}

export async function DELETE(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { hasAccess, organizationId } = await validateFullAccess(request);
  if (!hasAccess || !organizationId) return apiError('Unauthorized', 401);

  const result = await deleteAudienceSegment(organizationId, id);
  if ('error' in result) return apiError(result.error, result.status);

  return apiSuccess({ success: true });
}
