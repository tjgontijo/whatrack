import { prisma } from '@/lib/db/prisma'
import { publishToCentrifugo } from '@/lib/centrifugo/server'
import { metaCapiService } from '@/services/meta-ads/capi.service'
import type { ApproveAiInsightInput } from '@/schemas/ai/ai-schemas'

interface ApproveAiInsightParams {
  organizationId: string
  insightId: string
  input: ApproveAiInsightInput
}

type CandidateItem = {
  id: string
  name: string
  categoryId: string | null
  categoryName: string | null
}

type AiInsightPayload = {
  dealValue?: number | null
  intent?: string | null
  itemName?: string | null
}

export async function approveAiInsight(params: ApproveAiInsightParams) {
  const insight = await prisma.aiInsight.findUnique({
    where: { id: params.insightId },
    select: {
      id: true,
      organizationId: true,
      ticketId: true,
      payload: true,
      status: true,
    },
  })

  if (!insight || insight.organizationId !== params.organizationId) {
    return { error: 'Insight não encontrado' as const, status: 404 as const }
  }

  if (insight.status !== 'SUGGESTION') {
    return { error: 'Insight já foi processado' as const, status: 400 as const }
  }

  const payload = (insight.payload || {}) as AiInsightPayload
  const dealValue = payload.dealValue || null
  const eventName = payload.intent === 'SALE' ? 'Purchase' : 'LeadSubmitted'
  const extractedItemName = payload.itemName || null
  const mutableInput: ApproveAiInsightInput = { ...params.input }

  if (eventName === 'Purchase' && dealValue) {
    const hasExplicitItem = mutableInput.itemId || mutableInput.newItem

    if (!hasExplicitItem) {
      const candidates = extractedItemName
        ? await prisma.$queryRaw<CandidateItem[]>`
            SELECT i.id, i.name, i."categoryId", ic.name AS "categoryName"
            FROM items i
            LEFT JOIN item_categories ic ON ic.id = i."categoryId"
            WHERE i."organizationId" = ${params.organizationId}::uuid
              AND i.active = true
              AND unaccent(lower(i.name)) ILIKE '%' || unaccent(lower(${extractedItemName})) || '%'
            LIMIT 5
          `
        : []

      if (candidates.length === 1) {
        mutableInput.itemId = candidates[0].id
      } else {
        return {
          error: 'Item review required' as const,
          status: 422 as const,
          data: {
            needsItemReview: true,
            extractedItemName,
            candidates,
            message:
              candidates.length === 0
                ? `O item "${extractedItemName}" não foi encontrado no catálogo. Selecione um item existente ou cadastre um novo antes de aprovar.`
                : `Encontramos ${candidates.length} itens parecidos com "${extractedItemName}". Selecione o correto ou cadastre um novo.`,
          },
        }
      }
    }

    let resolvedItemId = mutableInput.itemId as string

    if (mutableInput.newItem) {
      let categoryId: string | undefined = mutableInput.newItem.categoryId

      if (!categoryId && mutableInput.newItem.newCategoryName) {
        const category = await prisma.itemCategory.create({
          data: {
            organizationId: params.organizationId,
            name: mutableInput.newItem.newCategoryName,
            active: true,
          },
        })
        categoryId = category.id
      }

      const createdItem = await prisma.item.create({
        data: {
          organizationId: params.organizationId,
          name: mutableInput.newItem.name,
          categoryId: categoryId ?? null,
          active: true,
        },
      })

      resolvedItemId = createdItem.id
    }

    await prisma.$transaction(async (tx) => {
      await tx.aiInsight.update({
        where: { id: insight.id },
        data: { status: 'APPLIED' },
      })

      await tx.ticket.update({
        where: { id: insight.ticketId },
        data: {
          status: 'closed_won',
          closedAt: new Date(),
          closedReason: 'ai_copilot_approval',
          dealValue,
        },
      })

      const item = await tx.item.findUnique({ where: { id: resolvedItemId } })

      await tx.sale.create({
        data: {
          organizationId: params.organizationId,
          ticketId: insight.ticketId,
          totalAmount: dealValue,
          status: 'completed',
          items: {
            create: {
              organizationId: params.organizationId,
              itemId: resolvedItemId,
              name: item?.name ?? extractedItemName ?? 'Item',
              unitPrice: dealValue,
              quantity: 1,
              total: dealValue,
            },
          },
        },
      })
    })
  } else {
    await prisma.$transaction(async (tx) => {
      await tx.aiInsight.update({
        where: { id: insight.id },
        data: { status: 'APPLIED' },
      })

      await tx.ticket.update({
        where: { id: insight.ticketId },
        data: {
          status: 'closed_won',
          closedAt: new Date(),
          closedReason: 'ai_copilot_approval',
          dealValue,
        },
      })
    })
  }

  void metaCapiService.sendEvent(insight.ticketId, eventName, {
    value: dealValue ? Number(dealValue) : undefined,
    eventId: `AI_COPILOT_${insight.id}_${Date.now()}`,
  })

  await publishToCentrifugo(`org:${params.organizationId}:tickets`, {
    type: 'ticket_updated',
    ticketId: insight.ticketId,
    updates: { status: 'closed_won', dealValue },
  })

  return {
    data: {
      success: true,
      message: 'Venda aprovada e CAPI acionado.',
    },
  }
}
