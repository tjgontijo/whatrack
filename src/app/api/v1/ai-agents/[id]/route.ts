import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { validateFullAccess } from '@/server/auth/validate-organization-access';

export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
    try {
        const { id } = await params;
        const access = await validateFullAccess(request);
        if (!access.hasAccess || !access.organizationId) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const agent = await prisma.aiAgent.findUnique({
            where: {
                id,
                organizationId: access.organizationId,
            },
            include: {
                triggers: true,
                schemaFields: true,
            },
        });

        if (!agent) {
            return NextResponse.json({ error: 'Agente não encontrado' }, { status: 404 });
        }

        return NextResponse.json({ agent });
    } catch (error) {
        console.error('[GET ai-agent]', error);
        return NextResponse.json({ error: 'Erro ao buscar agente' }, { status: 500 });
    }
}

export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
    try {
        const { id } = await params;
        const access = await validateFullAccess(request);
        if (!access.hasAccess || !access.organizationId) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const body = await request.json();
        const { name, icon, systemPrompt, model, isActive, triggers, schemaFields } = body;

        // Verify ownership
        const existing = await prisma.aiAgent.findUnique({
            where: { id, organizationId: access.organizationId }
        });

        if (!existing) {
            return NextResponse.json({ error: 'Agente não encontrado' }, { status: 404 });
        }

        const updatedAgent = await prisma.aiAgent.update({
            where: { id },
            data: {
                name,
                icon,
                systemPrompt,
                model,
                isActive,
                // Triggers and SchemaFields will be fully replaced
                triggers: {
                    deleteMany: {},
                    create: triggers?.map((t: any) => ({
                        eventType: t.eventType,
                        conditions: t.conditions || {},
                    })) || [],
                },
                schemaFields: {
                    deleteMany: {},
                    create: schemaFields?.map((f: any) => ({
                        fieldName: f.fieldName,
                        fieldType: f.fieldType,
                        description: f.description,
                        isRequired: f.isRequired ?? true,
                        options: f.options || null,
                    })) || [],
                },
            },
            include: {
                triggers: true,
                schemaFields: true,
            },
        });

        return NextResponse.json({ agent: updatedAgent });
    } catch (error) {
        console.error('[PATCH ai-agent]', error);
        return NextResponse.json({ error: 'Erro ao atualizar agente' }, { status: 500 });
    }
}

export async function DELETE(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
    try {
        const { id } = await params;
        const access = await validateFullAccess(request);
        if (!access.hasAccess || !access.organizationId) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const existing = await prisma.aiAgent.findUnique({
            where: { id, organizationId: access.organizationId }
        });

        if (!existing) {
            return NextResponse.json({ error: 'Agente não encontrado' }, { status: 404 });
        }

        await prisma.aiAgent.delete({
            where: { id },
        });

        return NextResponse.json({ message: 'Agente removido com sucesso' });
    } catch (error) {
        console.error('[DELETE ai-agent]', error);
        return NextResponse.json({ error: 'Erro ao remover agente' }, { status: 500 });
    }
}
