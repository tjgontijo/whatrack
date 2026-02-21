import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { validateFullAccess } from '@/server/auth/validate-organization-access';

export async function GET(request: NextRequest) {
    try {
        const access = await validateFullAccess(request);
        if (!access.hasAccess || !access.organizationId) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const profile = await prisma.organizationProfile.findUnique({
            where: { organizationId: access.organizationId },
            select: { aiCopilotActive: true, aiCopilotInstructions: true }
        });

        return NextResponse.json({
            aiCopilotActive: profile?.aiCopilotActive ?? true,
            aiCopilotInstructions: profile?.aiCopilotInstructions || ''
        });
    } catch (error) {
        console.error('[GET ai-settings] Error:', error);
        return NextResponse.json({ error: 'Erro ao buscar configurações de IA' }, { status: 500 });
    }
}

export async function PATCH(request: NextRequest) {
    try {
        const access = await validateFullAccess(request);
        if (!access.hasAccess || !access.organizationId) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const body = await request.json();
        const { aiCopilotActive, aiCopilotInstructions } = body;

        const profile = await prisma.organizationProfile.upsert({
            where: { organizationId: access.organizationId },
            update: {
                aiCopilotActive,
                aiCopilotInstructions
            },
            create: {
                organizationId: access.organizationId,
                aiCopilotActive,
                aiCopilotInstructions,
                onboardingStatus: 'completed'
            }
        });

        return NextResponse.json({
            success: true,
            aiCopilotActive: profile.aiCopilotActive,
            aiCopilotInstructions: profile.aiCopilotInstructions
        });
    } catch (error) {
        console.error('[PATCH ai-settings] Error:', error);
        return NextResponse.json({ error: 'Erro ao salvar configurações de IA' }, { status: 500 });
    }
}
