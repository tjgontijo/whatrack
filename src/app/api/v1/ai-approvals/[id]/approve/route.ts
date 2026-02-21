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

        const approvalId = (await params).id;
        const approval = await prisma.aiConversionApproval.findUnique({
            where: { id: approvalId },
            include: { ticket: true }
        });

        if (!approval || approval.organizationId !== access.organizationId) {
            return NextResponse.json({ error: 'Aprovação não encontrada' }, { status: 404 });
        }

        if (approval.status !== 'PENDING') {
            return NextResponse.json({ error: 'Esta aprovação já foi resolvida' }, { status: 400 });
        }

        // Process the approval (Mark as won, create sale, trigger CAPI)
        const dealValue = approval.dealValue;

        await prisma.$transaction(async (tx) => {
            // 1. Update approval status
            await tx.aiConversionApproval.update({
                where: { id: approval.id },
                data: {
                    status: 'APPROVED',
                    reviewedBy: access.userId,
                    reviewedAt: new Date(),
                }
            });

            // 2. Update Ticket to closed_won
            await tx.ticket.update({
                where: { id: approval.ticketId },
                data: {
                    status: 'closed_won',
                    closedAt: new Date(),
                    closedReason: 'ai_copilot_approval',
                    dealValue: dealValue,
                }
            });

            // 3. Create Sale Record if it was a purchase
            if (approval.eventName === 'Purchase' && dealValue) {
                await tx.sale.create({
                    data: {
                        organizationId: access.organizationId as string,
                        ticketId: approval.ticketId,
                        totalAmount: dealValue,
                        status: 'completed',
                        items: {
                            create: {
                                organizationId: access.organizationId as string,
                                name: approval.productName || 'Procedimento IA',
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
        metaCapiService.sendEvent(approval.ticketId, approval.eventName as any, {
            value: dealValue ? Number(dealValue) : undefined,
            eventId: `AI_COPILOT_${approval.id}_${Date.now()}`
        }).catch(err => {
            console.error(`[CAPI] Error from AI Approval for ticket ${approval.ticketId}:`, err);
        });

        // Notify Centrifugo to refresh ticket lists
        await publishToCentrifugo(`org:${access.organizationId}:tickets`, {
            type: 'ticket_updated',
            ticketId: approval.ticketId,
            updates: { status: 'closed_won', dealValue }
        });

        return NextResponse.json({ success: true, message: 'Venda aprovada e CAPI acionado.' });

    } catch (error) {
        console.error('[Approve AI Conversion] Error:', error);
        return NextResponse.json({ error: 'Erro interno ao aprovar conversão' }, { status: 500 });
    }
}
