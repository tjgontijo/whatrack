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

        const insightId = (await params).id;
        const insight = await prisma.aiInsight.findUnique({
            where: { id: insightId },
        });

        if (!insight || insight.organizationId !== access.organizationId) {
            return NextResponse.json({ error: 'Insight não encontrado' }, { status: 404 });
        }

        if (insight.status !== 'SUGGESTION') {
            return NextResponse.json({ error: 'Este insight já foi resolvido' }, { status: 400 });
        }

        // Process the rejection
        await prisma.aiInsight.update({
            where: { id: insight.id },
            data: {
                status: 'DISMISSED'
            }
        });

        return NextResponse.json({ success: true, message: 'Insight descartado (falso positivo).' });

    } catch (error) {
        console.error('[Reject AI Insight] Error:', error);
        return NextResponse.json({ error: 'Erro interno ao descartar insight' }, { status: 500 });
    }
}
