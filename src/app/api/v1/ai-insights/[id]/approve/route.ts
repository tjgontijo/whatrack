import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { prisma } from '@/lib/db/prisma'
import { validatePermissionAccess } from '@/server/auth/validate-organization-access'
import { metaCapiService } from '@/services/meta-ads/capi.service'
import { publishToCentrifugo } from '@/lib/centrifugo/server'

// Body sent when the manager has already reviewed and chosen/created the item
const approveWithItemSchema = z.object({
  // Option A: link to an existing item
  itemId: z.string().uuid().optional(),
  // Option B: create a new item (with optional new category)
  newItem: z
    .object({
      name: z.string().min(1),
      // Option B1: link to an existing category
      categoryId: z.string().uuid().optional(),
      // Option B2: create a new category on the fly
      newCategoryName: z.string().min(1).optional(),
    })
    .optional(),
})

export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const access = await validatePermissionAccess(request, 'manage:ai')
    if (!access.hasAccess || !access.userId || !access.organizationId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const insightId = (await params).id
    const insight = await prisma.aiInsight.findUnique({
      where: { id: insightId },
      include: { ticket: true },
    })

    if (!insight || insight.organizationId !== access.organizationId) {
      return NextResponse.json({ error: 'Insight não encontrado' }, { status: 404 })
    }

    if (insight.status !== 'SUGGESTION') {
      return NextResponse.json({ error: 'Insight já foi processado' }, { status: 400 })
    }

    const payload = insight.payload as any
    const dealValue = payload?.dealValue || null
    const eventName = payload?.intent === 'SALE' ? 'Purchase' : 'LeadSubmitted'
    const extractedItemName: string | null = payload?.itemName || null
    const orgId = access.organizationId as string

    // Parse optional body — the manager may or may not have sent item details yet
    let body: z.infer<typeof approveWithItemSchema> = {}
    try {
      const raw = await request.json()
      body = approveWithItemSchema.parse(raw)
    } catch {
      // Empty body is fine for non-SALE intents or first-pass approval attempt
    }

    // Only SALE intents require item resolution
    if (eventName === 'Purchase' && dealValue) {
      const hasExplicitItem = body.itemId || body.newItem

      if (!hasExplicitItem) {
        // Try to find an existing item by similarity (ILIKE on name)
        const candidates = extractedItemName
          ? await prisma.$queryRaw<{ id: string; name: string; categoryId: string | null; categoryName: string | null }[]>`
              SELECT i.id, i.name, i."categoryId", ic.name AS "categoryName"
              FROM items i
              LEFT JOIN item_categories ic ON ic.id = i."categoryId"
              WHERE i."organizationId" = ${orgId}::uuid
                AND i.active = true
                AND unaccent(lower(i.name)) ILIKE '%' || unaccent(lower(${extractedItemName})) || '%'
              LIMIT 5
            `
          : []

        if (candidates.length === 1) {
          // Exactly one match — use it directly, no need to ask the manager
          body.itemId = candidates[0].id
        } else {
          // Zero or multiple matches — ask the manager to review
          return NextResponse.json(
            {
              needsItemReview: true,
              extractedItemName,
              candidates,
              message:
                candidates.length === 0
                  ? `O item "${extractedItemName}" não foi encontrado no catálogo. Selecione um item existente ou cadastre um novo antes de aprovar.`
                  : `Encontramos ${candidates.length} itens parecidos com "${extractedItemName}". Selecione o correto ou cadastre um novo.`,
            },
            { status: 422 },
          )
        }
      }

      // Resolve the final itemId (create category and/or item if needed)
      let resolvedItemId: string = body.itemId!

      if (body.newItem) {
        let categoryId: string | undefined = body.newItem.categoryId

        if (!categoryId && body.newItem.newCategoryName) {
          const category = await prisma.itemCategory.create({
            data: {
              organizationId: orgId,
              name: body.newItem.newCategoryName,
              active: true,
            },
          })
          categoryId = category.id
        }

        const newItem = await prisma.item.create({
          data: {
            organizationId: orgId,
            name: body.newItem.name,
            categoryId: categoryId ?? null,
            active: true,
          },
        })
        resolvedItemId = newItem.id
      }

      // Everything resolved — commit the sale
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
            dealValue: dealValue,
          },
        })

        const item = await tx.item.findUnique({ where: { id: resolvedItemId } })

        await tx.sale.create({
          data: {
            organizationId: orgId,
            ticketId: insight.ticketId,
            totalAmount: dealValue,
            status: 'completed',
            items: {
              create: {
                organizationId: orgId,
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
      // Non-SALE intents (LeadSubmitted): no item needed, just close the ticket
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
            dealValue: dealValue,
          },
        })
      })
    }

    // Fire CAPI event in background (fire and forget)
    metaCapiService
      .sendEvent(insight.ticketId, eventName, {
        value: dealValue ? Number(dealValue) : undefined,
        eventId: `AI_COPILOT_${insight.id}_${Date.now()}`,
      })
      .catch((err) => {
        console.error(`[CAPI] Error from AI Insight for ticket ${insight.ticketId}:`, err)
      })

    // Notify Centrifugo to refresh ticket lists
    await publishToCentrifugo(`org:${access.organizationId}:tickets`, {
      type: 'ticket_updated',
      ticketId: insight.ticketId,
      updates: { status: 'closed_won', dealValue },
    })

    return NextResponse.json({ success: true, message: 'Venda aprovada e CAPI acionado.' })
  } catch (error) {
    console.error('[Approve AI Conversion] Error:', error)
    return NextResponse.json({ error: 'Erro interno ao aprovar conversão' }, { status: 500 })
  }
}
