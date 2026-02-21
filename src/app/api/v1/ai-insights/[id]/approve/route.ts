import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { validateFullAccess } from '@/server/auth/validate-organization-access';
import { metaCapiService } from '@/services/meta-ads/capi.service';
import { randomUUID } from 'crypto';
import { publishToCentrifugo } from '@/lib/centrifugo/server';

export async function PATCH(
    request: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const access = await validateFullAccess(request);
        if (!access.hasAccess || !access.userId || !access.organizationId) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const insightId = (await params).id;
        const insight = await prisma.aiInsight.findUnique({
            where: { id: insightId },
            include: { ticket: true }
        });

        if (!insight || insight.organizationId !== access.organizationId) {
            return NextResponse.json({ error: 'Insight não encontrado' }, { status: 404 });
        }

        if (insight.status !== 'SUGGESTION') {
            return NextResponse.json({ error: 'Insight já foi processado' }, { status: 400 });
        }

        // Process the insight
        const payload = insight.payload as any;
        const dealValue = payload?.dealValue || null;
        const eventName = payload?.intent === 'SALE' ? 'Purchase' : 'LeadSubmitted';
        const productName = payload?.productName || 'Procedimento IA';

        await prisma.$transaction(async (tx) => {
            // 1. Update status
            await tx.aiInsight.update({
                where: { id: insight.id },
                data: { status: 'APPLIED' }
            });

            // 2. Update Ticket to closed_won
            await tx.ticket.update({
                where: { id: insight.ticketId },
                data: {
                    status: 'closed_won',
                    closedAt: new Date(),
                    closedReason: 'ai_copilot_approval',
                    dealValue: dealValue,
                }
            });

            // 3. Create Sale Record if it was a purchase
            if (eventName === 'Purchase' && dealValue) {
                await tx.sale.create({
                    data: {
                        organizationId: access.organizationId as string,
                        ticketId: insight.ticketId,
                        totalAmount: dealValue,
                        status: 'completed',
                        items: {
                            create: {
                                organizationId: access.organizationId as string,
                                name: productName,
                                unitPrice: dealValue,
                                quantity: 1,
                                total: dealValue,
                            }
                        }
                    }
                });
            }
        });

        // Fire CAPI event in background (fire and forget)
        metaCapiService.sendEvent(insight.ticketId, eventName, {
            value: dealValue ? Number(dealValue) : undefined,
            eventId: `AI_COPILOT_${insight.id}_${Date.now()}`
        }).catch(err => {
            console.error(`[CAPI] Error from AI Insight for ticket ${insight.ticketId}:`, err);
        });

        // Notify Centrifugo to refresh ticket lists
        await publishToCentrifugo(`org:${access.organizationId}:tickets`, {
            type: 'ticket_updated',
            ticketId: insight.ticketId,
            updates: { status: 'closed_won', dealValue }
        });

        return NextResponse.json({ success: true, message: 'Venda aprovada e CAPI acionado.' });

    } catch (error) {
        console.error('[Approve AI Conversion] Error:', error);
        return NextResponse.json({ error: 'Erro interno ao aprovar conversão' }, { status: 500 });
    }
}
