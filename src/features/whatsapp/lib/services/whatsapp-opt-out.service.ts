import { prisma } from '@/lib/db/prisma'
import { logger } from '@/lib/utils/logger'
import { ok, fail } from '@/lib/shared/result'
import type { Result } from '@/lib/shared/result'
import { z } from 'zod'

export const AddOptOutSchema = z.object({
  phone: z.string().min(5, 'Phone must be at least 5 characters'),
  source: z.enum(['MANUAL', 'CAMPAIGN_REPLY', 'API']),
  campaignId: z.string().uuid().optional(),
  note: z.string().min(5, 'Note must be at least 5 characters').optional(),
})

export type AddOptOutInput = z.infer<typeof AddOptOutSchema>

export interface OptOutListItem {
  id: string
  phone: string
  source: string
  campaignId: string | null
  campaignName: string | null
  note: string | null
  createdAt: string
  createdBy: string | null
}

export interface OptOutListResponse {
  items: OptOutListItem[]
  total: number
  page: number
  pageSize: number
  totalPages: number
}

export async function addOptOut(
  input: AddOptOutInput,
  organizationId: string,
  userId?: string
): Promise<Result<{ id: string; phone: string }>> {
  try {
    // Check if already opted out
    const existing = await prisma.whatsAppOptOut.findUnique({
      where: { organizationId_phone: { organizationId, phone: input.phone } },
    })

    if (existing) {
      return fail('already_opted_out')
    }

    const optOut = await prisma.whatsAppOptOut.create({
      data: {
        organizationId,
        phone: input.phone,
        source: input.source,
        campaignId: input.campaignId || null,
        note: input.note || null,
        createdBy: userId,
      },
    })

    logger.info(
      { phone: input.phone, source: input.source, organizationId },
      '[OptOut] Added'
    )

    return ok({ id: optOut.id, phone: optOut.phone })
  } catch (err) {
    logger.error({ err, organizationId, phone: input.phone }, '[OptOut] Failed to add')
    return fail('failed_to_add_opt_out')
  }
}

export async function removeOptOut(
  optOutId: string,
  organizationId: string
): Promise<Result<void>> {
  try {
    const optOut = await prisma.whatsAppOptOut.findUnique({
      where: { id: optOutId },
    })

    if (!optOut || optOut.organizationId !== organizationId) {
      return fail('not_found')
    }

    await prisma.whatsAppOptOut.delete({
      where: { id: optOutId },
    })

    logger.info({ optOutId, organizationId }, '[OptOut] Removed')

    return ok(undefined)
  } catch (err) {
    logger.error({ err, optOutId, organizationId }, '[OptOut] Failed to remove')
    return fail('failed_to_remove_opt_out')
  }
}

export async function listOptOuts(
  organizationId: string,
  page: number = 1,
  pageSize: number = 20,
  phoneSearch?: string
): Promise<Result<OptOutListResponse>> {
  try {
    const where = {
      organizationId,
      ...(phoneSearch ? { phone: { contains: phoneSearch, mode: 'insensitive' as const } } : {}),
    }

    const [optOuts, total] = await Promise.all([
      prisma.whatsAppOptOut.findMany({
        where,
        include: {
          campaign: { select: { name: true } },
        },
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * pageSize,
        take: pageSize,
      }),
      prisma.whatsAppOptOut.count({ where }),
    ])

    const items: OptOutListItem[] = optOuts.map((opt) => ({
      id: opt.id,
      phone: opt.phone,
      source: opt.source,
      campaignId: opt.campaignId,
      campaignName: opt.campaign?.name || null,
      note: opt.note,
      createdAt: opt.createdAt.toISOString(),
      createdBy: opt.createdBy,
    }))

    return ok({
      items,
      total,
      page,
      pageSize,
      totalPages: Math.ceil(total / pageSize),
    })
  } catch (err) {
    logger.error({ err, organizationId }, '[OptOut] Failed to list')
    return fail('failed_to_list_opt_outs')
  }
}

export async function getOptOutSet(organizationId: string): Promise<Set<string>> {
  try {
    const optOuts = await prisma.whatsAppOptOut.findMany({
      where: { organizationId },
      select: { phone: true },
    })

    return new Set(optOuts.map((opt) => opt.phone))
  } catch (err) {
    logger.error({ err, organizationId }, '[OptOut] Failed to get opt-out set')
    return new Set()
  }
}
