import { z } from 'zod';

export const leadTagSchema = z.object({
  id: z.string().uuid().optional(),
  organizationId: z.string().uuid(),
  name: z.string().min(1).max(50),
  color: z.string().regex(/^#[0-9A-Fa-f]{6}$/, 'Cor inválida').optional().nullable(),
});

export const leadTagAssignmentSchema = z.object({
  leadId: z.string().uuid(),
  tagId: z.string().uuid(),
});

export const whatsappContactListSchema = z.object({
  id: z.string().uuid().optional(),
  organizationId: z.string().uuid(),
  name: z.string().min(1).max(255),
  description: z.string().max(1000).optional().nullable(),
});

export const whatsappContactListMemberSchema = z.object({
  listId: z.string().uuid(),
  phone: z.string().min(10),
  data: z.record(z.string(), z.any()).optional().nullable(),
});

export const audienceSegmentFiltersSchema = z.object({
  tagIds: z.array(z.string().uuid()).optional(),
  stageId: z.string().uuid().optional(),
  stageTimeMinDays: z.number().int().min(0).optional(),
  stageTimeMaxDays: z.number().int().min(0).optional(),
  sourceType: z.string().optional(),
  hasActiveTicket: z.boolean().optional(),
  createdAtGte: z.string().datetime().optional().nullable(),
  createdAtLte: z.string().datetime().optional().nullable(),
  lastMessageGte: z.string().datetime().optional().nullable(),
});

export const whatsappAudienceSegmentSchema = z.object({
  id: z.string().uuid().optional(),
  organizationId: z.string().uuid(),
  projectId: z.string().uuid().optional().nullable(),
  name: z.string().min(1).max(255),
  filters: audienceSegmentFiltersSchema,
});

export type LeadTag = z.infer<typeof leadTagSchema>;
export type WhatsAppContactList = z.infer<typeof whatsappContactListSchema>;
export type AudienceSegmentFilters = z.infer<typeof audienceSegmentFiltersSchema>;
export type WhatsAppAudienceSegment = z.infer<typeof whatsappAudienceSegmentSchema>;
