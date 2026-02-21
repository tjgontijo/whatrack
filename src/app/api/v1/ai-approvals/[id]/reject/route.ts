import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { validateFullAccess } from '@/server/auth/validate-organization-access';

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
        });

        if (!approval || approval.organizationId !== access.organizationId) {
            return NextResponse.json({ error: 'Aprovação não encontrada' }, { status: 404 });
        }

        if (approval.status !== 'PENDING') {
            return NextResponse.json({ error: 'Esta aprovação já foi resolvida' }, { status: 400 });
        }

        // Process the rejection
        await prisma.aiConversionApproval.update({
            where: { id: approval.id },
            data: {
                status: 'REJECTED',
                reviewedBy: access.userId,
                reviewedAt: new Date(),
            }
        });

        return NextResponse.json({ success: true, message: 'Aprovação descartada (falso positivo).' });

    } catch (error) {
        console.error('[Reject AI Conversion] Error:', error);
        return NextResponse.json({ error: 'Erro interno ao descartar conversão' }, { status: 500 });
    }
}
