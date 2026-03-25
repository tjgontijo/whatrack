import { prisma } from '@/lib/db/prisma';
import { whatsappAudienceSegmentSchema, WhatsAppAudienceSegment } from '../schemas/audience';

export async function listAudienceSegments(organizationId: string) {
  return prisma.whatsAppAudienceSegment.findMany({
    where: { organizationId },
    orderBy: { createdAt: 'desc' },
  });
}

export async function getAudienceSegmentById(organizationId: string, segmentId: string) {
  const segment = await prisma.whatsAppAudienceSegment.findFirst({
    where: { id: segmentId, organizationId },
  });

  if (!segment) {
    return { error: 'Segmento não encontrado', status: 404 as const };
  }

  return segment;
}

export async function createAudienceSegment(organizationId: string, data: Partial<WhatsAppAudienceSegment>) {
  const validated = whatsappAudienceSegmentSchema.parse({ ...data, organizationId });
  
  return prisma.whatsAppAudienceSegment.create({
    data: {
      organizationId,
      projectId: validated.projectId,
      name: validated.name,
      filters: validated.filters as any,
    },
  });
}

export async function updateAudienceSegment(organizationId: string, segmentId: string, data: Partial<WhatsAppAudienceSegment>) {
  const existing = await prisma.whatsAppAudienceSegment.findFirst({
    where: { id: segmentId, organizationId },
  });

  if (!existing) {
    return { error: 'Segmento não encontrado', status: 404 as const };
  }

  return prisma.whatsAppAudienceSegment.update({
    where: { id: segmentId },
    data: {
      name: data.name ?? undefined,
      projectId: data.projectId ?? undefined,
      filters: data.filters ? (data.filters as any) : undefined,
    },
  });
}

export async function deleteAudienceSegment(organizationId: string, segmentId: string) {
  const existing = await prisma.whatsAppAudienceSegment.findFirst({
    where: { id: segmentId, organizationId },
  });

  if (!existing) {
    return { error: 'Segmento não encontrado', status: 404 as const };
  }

  await prisma.whatsAppAudienceSegment.delete({
    where: { id: segmentId },
  });

  return { success: true };
}
