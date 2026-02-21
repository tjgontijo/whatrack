import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { validateFullAccess } from '@/server/auth/validate-organization-access';

// GET /api/v1/ai-agents
// List all AI Agents for the active organization
export async function GET(request: NextRequest) {
    try {
        const access = await validateFullAccess(request);
        if (!access.hasAccess || !access.organizationId) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const agents = await prisma.aiAgent.findMany({
            where: { organizationId: access.organizationId },
            include: {
                triggers: true,
                schemaFields: true,
            },
            orderBy: { createdAt: 'desc' },
        });

        return NextResponse.json({ agents });
    } catch (error) {
        console.error('[GET ai-agents]', error);
        return NextResponse.json({ error: 'Erro ao buscar agentes' }, { status: 500 });
    }
}

// POST /api/v1/ai-agents
// Create a new AI Agent with its triggers and schema fields
export async function POST(request: NextRequest) {
    try {
        const access = await validateFullAccess(request);
        if (!access.hasAccess || !access.organizationId) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const body = await request.json();
        const { name, icon, systemPrompt, model, isActive, triggers, schemaFields } = body;

        const agent = await prisma.aiAgent.create({
            data: {
                organizationId: access.organizationId,
                name,
                icon,
                systemPrompt,
                model: model || 'llama-3.3-70b-versatile',
                isActive: isActive ?? true,
                triggers: {
                    create: triggers?.map((t: any) => ({
                        eventType: t.eventType,
                        conditions: t.conditions || {},
                    })) || [],
                },
                schemaFields: {
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

        return NextResponse.json({ agent }, { status: 201 });
    } catch (error) {
        console.error('[POST ai-agents]', error);
        return NextResponse.json({ error: 'Erro ao criar agente' }, { status: 500 });
    }
}
