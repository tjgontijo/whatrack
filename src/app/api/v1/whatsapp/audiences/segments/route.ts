import { apiError, apiSuccess } from '@/lib/utils/api-response';
import { validateFullAccess } from '@/server/auth/validate-organization-access';
import { listAudienceSegments, createAudienceSegment } from '@/lib/whatsapp/services/whatsapp-audience-segment.service';
import { whatsappAudienceSegmentSchema } from '@/lib/whatsapp/schemas/audience';

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  const { hasAccess, organizationId } = await validateFullAccess(request);
  if (!hasAccess || !organizationId) return apiError('Unauthorized', 401);

  const { searchParams } = new URL(request.url);
  const projectId = searchParams.get('projectId') || undefined;

  const segments = await listAudienceSegments(organizationId, projectId);
  return apiSuccess(segments);
}

export async function POST(request: Request) {
  const { hasAccess, organizationId } = await validateFullAccess(request);
  if (!hasAccess || !organizationId) return apiError('Unauthorized', 401);

  const body = await request.json();
  const parsed = whatsappAudienceSegmentSchema.safeParse({ ...body, organizationId });
  if (!parsed.success) {
    return apiError('Parâmetros inválidos', 400, { details: parsed.error.flatten() });
  }

  const segment = await createAudienceSegment(organizationId, parsed.data);
  return apiSuccess(segment, 201);
}
