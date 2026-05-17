import { prisma } from '@/lib/db/prisma';
import { leadTagSchema, LeadTag } from '../schemas/audience';

export async function listLeadTags(organizationId: string, projectId?: string) {
  return prisma.leadTag.findMany({
    where: { organizationId, projectId: projectId ?? null },
    orderBy: { name: 'asc' },
  });
}

export async function createLeadTag(organizationId: string, data: Partial<LeadTag>) {
  const validated = leadTagSchema.parse({ ...data, organizationId });
  
  return prisma.leadTag.create({
    data: {
      organizationId,
      projectId: validated.projectId ?? null,
      name: validated.name,
      color: validated.color || null,
    },
  });
}

export async function updateLeadTag(organizationId: string, tagId: string, data: Partial<LeadTag>) {
  const existing = await prisma.leadTag.findFirst({
    where: {
      id: tagId,
      organizationId,
      projectId: data.projectId ?? undefined,
    },
  });

  if (!existing) {
    return { error: 'Tag não encontrada', status: 404 as const };
  }

  return prisma.leadTag.update({
    where: { id: tagId },
    data: {
      name: data.name ?? undefined,
      color: data.color ?? undefined,
    },
  });
}

export async function deleteLeadTag(organizationId: string, tagId: string, projectId?: string) {
  const existing = await prisma.leadTag.findFirst({
    where: {
      id: tagId,
      organizationId,
      projectId: projectId ?? undefined,
    },
  });

  if (!existing) {
    return { error: 'Tag não encontrada', status: 404 as const };
  }

  await prisma.leadTag.delete({
    where: { id: tagId },
  });

  return { success: true };
}

export async function assignTagToLead(organizationId: string, leadId: string, tagId: string) {
  const [lead, tag] = await Promise.all([
    prisma.lead.findFirst({ where: { id: leadId, organizationId } }),
    prisma.leadTag.findFirst({ where: { id: tagId, organizationId } }),
  ]);

  if (!lead || !tag) {
    return { error: 'Lead ou Tag não encontrados', status: 404 as const };
  }

  return prisma.leadTagAssignment.upsert({
    where: { leadId_tagId: { leadId, tagId } },
    update: {},
    create: { leadId, tagId },
  });
}

export async function removeTagFromLead(organizationId: string, leadId: string, tagId: string) {
  try {
    await prisma.leadTagAssignment.delete({
      where: { leadId_tagId: { leadId, tagId } },
    });
  } catch (err) {
    // Ignore if assignment does not exist
  }

  return { success: true };
}
