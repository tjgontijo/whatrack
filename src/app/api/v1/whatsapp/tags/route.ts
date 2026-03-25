import { apiError, apiSuccess } from '@/lib/utils/api-response';
import { validateFullAccess } from '@/server/auth/validate-organization-access';
import { listLeadTags, createLeadTag } from '@/lib/whatsapp/services/whatsapp-lead-tag.service';
import { leadTagSchema } from '@/lib/whatsapp/schemas/audience';

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  const { hasAccess, organizationId } = await validateFullAccess(request);
  if (!hasAccess || !organizationId) return apiError('Unauthorized', 401);

  const { searchParams } = new URL(request.url);
  const projectId = searchParams.get('projectId') || undefined;

  const tags = await listLeadTags(organizationId, projectId);
  return apiSuccess(tags);
}

export async function POST(request: Request) {
  const { hasAccess, organizationId } = await validateFullAccess(request);
  if (!hasAccess || !organizationId) return apiError('Unauthorized', 401);

  const { searchParams } = new URL(request.url);
  const body = await request.json();
  const parsed = leadTagSchema.safeParse({ ...body, organizationId });
  if (!parsed.success) {
    return apiError('Parâmetros inválidos', 400, { details: parsed.error.flatten() });
  }

  const projectId = searchParams.get('projectId') || undefined;
  const tag = await createLeadTag(organizationId, { ...parsed.data, projectId });
  return apiSuccess(tag, 201);
}
