import { prisma } from '@/lib/db/prisma';
import { logger } from '@/lib/utils/logger';
import { getOptOutSet } from '@/lib/whatsapp/services/whatsapp-opt-out.service';
import type {
  WhatsAppCampaignCreateInput,
  WhatsAppCampaignUpdateInput,
} from '@/schemas/whatsapp/whatsapp-campaign-schemas';
import { Prisma } from '@generated/prisma';
import { queryLeadsByFilters } from '@/lib/whatsapp/queries/lead-segment-query';
import { WhatsAppCampaignEventType } from '@/lib/whatsapp/types/campaign-events';

type CreateCampaignResult =
  | { success: true; data: { id: string } }
  | { success: false; error: string; status: number };

type UpdateCampaignResult =
  | { success: true; data: unknown }
  | { success: false; error: string; status: number };

type DispatchCampaignResult = { success: true } | { success: false; error: string; status: number };

type CancelCampaignResult = { success: true } | { success: false; error: string; status: number };

export async function createCampaign(
  organizationId: string,
  userId: string,
  input: WhatsAppCampaignCreateInput
): Promise<CreateCampaignResult> {
  const project = await prisma.project.findFirst({
    where: { id: input.projectId, organizationId },
    select: { id: true },
  });
  if (!project) {
    return { success: false, error: 'Projeto não encontrado', status: 404 };
  }

  if (input.dispatchGroups && input.dispatchGroups.length > 0) {
    const configIds = input.dispatchGroups.map((g) => g.configId);
    const configs = await prisma.whatsAppConfig.findMany({
      where: { id: { in: configIds }, organizationId, projectId: input.projectId },
      select: { id: true },
    });
    if (configs.length !== configIds.length) {
      return { success: false, error: 'Uma ou mais instâncias não foram encontradas', status: 400 };
    }
  }

  const scheduledAt = input.scheduledAt ? new Date(input.scheduledAt) : null;

  const data: Prisma.WhatsAppCampaignUncheckedCreateInput = {
    organizationId,
    projectId: input.projectId,
    name: input.name,
    type: input.type,
    status: scheduledAt ? 'SCHEDULED' : 'DRAFT',
    templateName: input.templateName,
    templateLang: input.templateLang,
    scheduledAt,
    shouldCreateLeads: input.shouldCreateLeads,
    createdById: userId,
    audienceSourceType: input.audienceSourceType,
    audienceSourceId: input.audienceSourceId,
    dispatchGroups: input.dispatchGroups
      ? {
          create: input.dispatchGroups.map((g, idx) => ({
            configId: g.configId,
            templateName: g.templateName,
            templateLang: g.templateLang,
            variables: (g.variables as Prisma.InputJsonValue) ?? null,
            order: g.order ?? idx,
          })),
        }
      : undefined,
  };

  const campaign = await prisma.whatsAppCampaign.create({ data });

  // If source is provided, snapshot and pre-calculate recipients
  if (input.audienceSourceType && input.audienceSourceId) {
    await refreshCampaignRecipients(organizationId, campaign.id);
  }

  await prisma.whatsAppCampaignEvent.create({
    data: {
      campaignId: campaign.id,
      type: WhatsAppCampaignEventType.CREATED,
      metadata: { userId },
    },
  });

  logger.info(
    { campaignId: campaign.id, organizationId, projectId: input.projectId, userId },
    '[WhatsAppCampaign] Campaign created'
  );

  return { success: true, data: { id: campaign.id } };
}

export async function refreshCampaignRecipients(organizationId: string, campaignId: string) {
  const campaign = await prisma.whatsAppCampaign.findFirst({
    where: { id: campaignId, organizationId },
    include: {
      dispatchGroups: { orderBy: { order: 'asc' } },
    },
  });

  if (!campaign || !campaign.audienceSourceType || !campaign.audienceSourceId) return;

  const dispatchGroupIds = campaign.dispatchGroups.map((dg) => dg.id);
  if (dispatchGroupIds.length === 0) return;

  let leads: Array<{ phone: string; id: string | null; data?: any }> = [];

  if (campaign.audienceSourceType === 'LIST') {
    const listMembers = await prisma.whatsAppContactListMember.findMany({
      where: { listId: campaign.audienceSourceId },
    });
    leads = listMembers.map((m) => ({ phone: m.phone, id: null, data: m.data }));
  } else if (campaign.audienceSourceType === 'SEGMENT') {
    const segment = await prisma.whatsAppAudienceSegment.findUnique({
      where: { id: campaign.audienceSourceId },
    });
    if (segment) {
      const result = await queryLeadsByFilters(organizationId, segment.filters as any);
      leads = result.map((l) => ({ phone: l.phone || '', id: l.id }));
    }
  }

  if (leads.length === 0) return;

  // Clear existing recipients
  await prisma.whatsAppCampaignRecipient.deleteMany({ where: { campaignId } });

  // Load opted-out contacts to exclude them
  const optOutSet = await getOptOutSet(organizationId);

  let excludedByOptOut = 0;
  const recipients = leads.map((lead, idx) => {
    const isOptedOut = optOutSet.has(lead.phone);
    if (isOptedOut) {
      excludedByOptOut++;
    }

    return {
      campaignId,
      dispatchGroupId: dispatchGroupIds[idx % dispatchGroupIds.length],
      phone: lead.phone,
      normalizedPhone: lead.phone.replace(/\D/g, ''),
      leadId: lead.id,
      variables: lead.data ? { body: lead.data } : undefined,
      status: isOptedOut ? 'EXCLUDED' : 'PENDING',
      exclusionReason: isOptedOut ? 'OPT_OUT' : null,
    };
  });

  // Chunk createMany for safety (Prisma limit is 32767 parameters on some DBs)
  const chunkSize = 1000;
  for (let i = 0; i < recipients.length; i += chunkSize) {
    const chunk = recipients.slice(i, i + chunkSize);
    await prisma.whatsAppCampaignRecipient.createMany({ data: chunk });
  }

  logger.info(
    { campaignId, total: leads.length, excluded: excludedByOptOut },
    '[Snapshot] Opt-out exclusions applied'
  );

  await prisma.whatsAppCampaignEvent.create({
    data: {
      campaignId,
      type: WhatsAppCampaignEventType.RECIPIENTS_GENERATED,
      metadata: { count: leads.length, excludedByOptOut },
    },
  });
}

export async function updateCampaign(
  organizationId: string,
  campaignId: string,
  input: WhatsAppCampaignUpdateInput
): Promise<UpdateCampaignResult> {
  const campaign = await prisma.whatsAppCampaign.findFirst({
    where: { id: campaignId, organizationId },
    select: { id: true, status: true },
  });

  if (!campaign) {
    return { success: false, error: 'Campanha não encontrada', status: 404 };
  }

  if (campaign.status !== 'DRAFT' && campaign.status !== 'SCHEDULED') {
    return { success: false, error: 'Campanha não pode ser editada no estado atual', status: 400 };
  }

  const data: Prisma.WhatsAppCampaignUpdateInput = {
    ...(input.name !== undefined ? { name: input.name } : {}),
    ...(input.type !== undefined ? { type: input.type } : {}),
    ...(input.templateName !== undefined ? { templateName: input.templateName } : {}),
    ...(input.templateLang !== undefined ? { templateLang: input.templateLang } : {}),
    ...(input.scheduledAt !== undefined
      ? { scheduledAt: input.scheduledAt ? new Date(input.scheduledAt) : null }
      : {}),
    ...(input.shouldCreateLeads !== undefined ? { shouldCreateLeads: input.shouldCreateLeads } : {}),
    ...(input.audienceSourceType !== undefined ? { audienceSourceType: input.audienceSourceType } : {}),
    ...(input.audienceSourceId !== undefined ? { audienceSourceId: input.audienceSourceId } : {}),
  };

  const updated = await prisma.whatsAppCampaign.update({
    where: { id: campaignId },
    data,
  });

  if (input.dispatchGroups !== undefined) {
    await prisma.whatsAppCampaignDispatchGroup.deleteMany({ where: { campaignId } });
    if (input.dispatchGroups.length > 0) {
      await prisma.whatsAppCampaignDispatchGroup.createMany({
        data: input.dispatchGroups.map((g, idx) => ({
          campaignId,
          configId: g.configId,
          templateName: g.templateName,
          templateLang: g.templateLang,
          variables: (g.variables as Prisma.InputJsonValue) ?? null,
          order: g.order ?? idx,
        })),
      });
    }
  }

  // If audience changed, refresh it
  if (input.audienceSourceId || input.audienceSourceType || input.dispatchGroups) {
    await refreshCampaignRecipients(organizationId, campaignId);
  }

  logger.info({ campaignId, organizationId }, '[WhatsAppCampaign] Campaign updated');

  return { success: true, data: updated };
}

export async function dispatchCampaign(
  organizationId: string,
  campaignId: string,
  userId: string,
  immediate: boolean,
  scheduledAt?: Date
): Promise<DispatchCampaignResult> {
  const campaign = await prisma.whatsAppCampaign.findFirst({
    where: { id: campaignId, organizationId },
    select: { id: true, status: true },
  });

  if (!campaign) {
    return { success: false, error: 'Campanha não encontrada', status: 404 };
  }

  if (immediate) {
    await prisma.whatsAppCampaign.update({
      where: { id: campaignId },
      data: {
        status: 'PROCESSING',
        startedAt: new Date(),
      },
    });
  } else {
    if (!scheduledAt) {
      return { success: false, error: 'Data de agendamento obrigatória', status: 400 };
    }
    await prisma.whatsAppCampaign.update({
      where: { id: campaignId },
      data: {
        status: 'SCHEDULED',
        scheduledAt,
      },
    });
  }

  await prisma.whatsAppCampaignEvent.create({
    data: {
      campaignId,
      type: immediate ? WhatsAppCampaignEventType.DISPATCHED : WhatsAppCampaignEventType.SCHEDULED,
      metadata: { userId, immediate, scheduledAt },
    },
  });

  logger.info({ campaignId, userId, immediate }, '[WhatsAppCampaign] Dispatched');

  return { success: true };
}

export async function cancelCampaign(
  organizationId: string,
  campaignId: string,
  userId: string,
  comment?: string
): Promise<CancelCampaignResult> {
  const campaign = await prisma.whatsAppCampaign.findFirst({
    where: { id: campaignId, organizationId },
    select: { id: true, status: true },
  });

  if (!campaign) {
    return { success: false, error: 'Campanha não encontrada', status: 404 };
  }

  if (['COMPLETED', 'CANCELLED'].includes(campaign.status)) {
    return { success: false, error: 'Campanha já finalizada', status: 400 };
  }

  await prisma.whatsAppCampaign.update({
    where: { id: campaignId },
    data: {
      status: 'CANCELLED',
      cancelledAt: new Date(),
      cancelledById: userId,
    },
  });

  await prisma.whatsAppCampaignDispatchGroup.updateMany({
    where: { campaignId, status: { in: ['PENDING', 'PROCESSING'] } },
    data: { status: 'CANCELLED' },
  });

  await prisma.whatsAppCampaignEvent.create({
    data: {
      campaignId,
      type: WhatsAppCampaignEventType.CANCELLED,
      metadata: { userId, comment },
    },
  });

  logger.info({ campaignId, userId }, '[WhatsAppCampaign] Cancelled');

  return { success: true };
}

export async function getCampaign(organizationId: string, campaignId: string) {
  const campaign = await prisma.whatsAppCampaign.findFirst({
    where: { id: campaignId, organizationId },
    include: {
      dispatchGroups: {
        include: { config: { select: { id: true, displayPhone: true, verifiedName: true } } },
        orderBy: { order: 'asc' },
      },
      events: {
        orderBy: { createdAt: 'desc' },
      },
      _count: { select: { whatsAppCampaignRecipients: true } },
    },
  });

  if (!campaign) return null;
  return campaign;
}
