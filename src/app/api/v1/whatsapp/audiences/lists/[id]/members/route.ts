import { apiError, apiSuccess } from '@/lib/utils/api-response';
import { validateFullAccess } from '@/server/auth/validate-organization-access';
import { listContactListMembers, addMemberToList, bulkImportMembers } from '@/lib/whatsapp/services/whatsapp-contact-list.service';

export const dynamic = 'force-dynamic';

export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { searchParams } = new URL(request.url);
  const page = Number(searchParams.get('page')) || 1;
  const pageSize = Number(searchParams.get('pageSize')) || 20;
  const projectId = searchParams.get('projectId') || undefined;

  const { hasAccess, organizationId } = await validateFullAccess(request);
  if (!hasAccess || !organizationId) return apiError('Unauthorized', 401);

  const result = await listContactListMembers(organizationId, id, projectId, page, pageSize);
  if ('error' in result) return apiError(result.error, result.status);

  return apiSuccess(result);
}

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { hasAccess, organizationId } = await validateFullAccess(request);
  if (!hasAccess || !organizationId) return apiError('Unauthorized', 401);

  const body = await request.json();
  
  if (Array.isArray(body)) {
    const result = await bulkImportMembers(organizationId, id, body);
    if ('error' in result) return apiError(result.error, result.status);
    return apiSuccess(result, 201);
  } else {
    const result = await addMemberToList(organizationId, id, body);
    if ('error' in result) return apiError(result.error, result.status);
    return apiSuccess(result, 201);
  }
}
