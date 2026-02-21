import { Agent } from '@mastra/core/agent';
import { z } from 'zod';
import { prisma } from '@/lib/prisma';
import { publishToCentrifugo } from '@/lib/centrifugo/server';
import { groq } from '@ai-sdk/groq';

type AgentSchemaRow = {
    fieldName: string;
    fieldType: string;
    description: string;
    isRequired: boolean;
    options: any;
};

// Helper to build a dynamic Zod Object
function buildDynamicZodSchema(fields: AgentSchemaRow[]) {
    const shape: Record<string, any> = {};

    for (const field of fields) {
        let zodType: any;

        switch (field.fieldType) {
            case 'STRING':
                zodType = z.string();
                break;
            case 'NUMBER':
                zodType = z.number();
                break;
            case 'BOOLEAN':
                zodType = z.boolean();
                break;
            case 'ARRAY':
                zodType = z.array(z.string());
                break;
            case 'ENUM':
                if (Array.isArray(field.options) && field.options.length > 0) {
                    // Zod enum requires at least one string, typed as [string, ...string[]]
                    zodType = z.enum(field.options as [string, ...string[]]);
                } else {
                    zodType = z.string(); // Fallback if options are malformed
                }
                break;
            default:
                zodType = z.string();
        }

        if (field.description) {
            zodType = zodType.describe(field.description);
        }

        if (!field.isRequired) {
            zodType = zodType.nullable().optional();
        }

        shape[field.fieldName] = zodType;
    }

    return z.object(shape);
}

/**
 * Main function to dispatch an AI event.
 * It will find all active agents in the organization subscribed to this event,
 * and execute them against the given ticket's conversation history.
 */
export async function dispatchAiEvent(
    eventType: string,
    ticketId: string,
    organizationId: string
): Promise<number> {
    try {
        // 1. Fetch matching active agents with triggers and schema fields
        const agents = await prisma.aiAgent.findMany({
            where: {
                organizationId,
                isActive: true,
                triggers: {
                    some: { eventType }
                }
            },
            include: {
                schemaFields: true
            }
        });

        if (agents.length === 0) return 0;

        // 2. Fetch the Ticket + Conversation History
        const ticket = await prisma.ticket.findUnique({
            where: { id: ticketId },
            include: {
                conversation: {
                    include: {
                        messages: {
                            orderBy: { timestamp: 'desc' },
                            take: 30 // Last 30 messages context window
                        }
                    }
                }
            }
        });

        if (!ticket || ticket.conversation.messages.length === 0) return 0;

        const history = ticket.conversation.messages
            .reverse()
            .map(m => `[${m.direction === 'INBOUND' ? 'Cliente' : 'Atendente'}]: ${m.body || '[Mídia]'}`)
            .join('\n');

        let executedCount = 0;

        // 3. Execute each Agent
        for (const agentDef of agents) {
            // Check throttle/cooldown (Optional: prevent same agent from running on same ticket repeatedly in a short window)
            // For MVP: Check if this exact agent already generated an insight for this ticket in the last 2 hours
            const twoHoursAgo = new Date(Date.now() - 2 * 60 * 60 * 1000);
            const recentInsight = await prisma.aiInsight.findFirst({
                where: {
                    ticketId,
                    agentId: agentDef.id,
                    createdAt: { gte: twoHoursAgo }
                }
            });

            if (recentInsight) {
                console.log(`[AI Copilot] Agent ${agentDef.name} already executed recently on Ticket ${ticketId}. Skipping.`);
                continue;
            }

            console.log(`[AI Copilot] Executing Agent '${agentDef.name}' on Ticket ${ticketId}...`);

            // Build schema
            const dynamicSchema = buildDynamicZodSchema(agentDef.schemaFields);

            // Instant Mastra Agent
            const mastraAgent = new Agent({
                name: agentDef.name,
                id: agentDef.id,
                instructions: agentDef.systemPrompt,
                model: groq(agentDef.model),
            });

            const fullPrompt = `Aqui está o histórico de chat de atendimento de um CRM para sua análise:
            
Ticket ID: ${ticket.id}

[HISTÓRICO DO CHAT DE WHATSAPP]
${history}`;

            try {
                const result = (await mastraAgent.generate(
                    fullPrompt,
                    { structuredOutput: { schema: dynamicSchema } }
                )) as any;

                const data = result.object;

                if (data && Object.keys(data).length > 0) {

                    // If this is the original CAPI Agent, it might have "intent: 'NEUTRAL'".
                    // We shouldn't create suggestions for NEUTRAL intents as they pollute the inbox.
                    // Heuristic: If there is an 'intent' field and it's 'NEUTRAL', skip saving to keep DB clean.
                    if (data.intent === 'NEUTRAL') {
                        continue;
                    }

                    // Save Insight to DB
                    const insight = await prisma.aiInsight.create({
                        data: {
                            organizationId: ticket.organizationId,
                            ticketId: ticket.id,
                            agentId: agentDef.id,
                            payload: data,
                            status: 'SUGGESTION'
                        }
                    });

                    // Real-time Push to UI
                    await publishToCentrifugo(`org:${ticket.organizationId}:ai_insights`, {
                        type: 'insight_created',
                        insightId: insight.id,
                        ticketId: ticket.id,
                        agentName: agentDef.name,
                        data: insight
                    });

                    executedCount++;
                }

            } catch (err) {
                console.error(`[AI Copilot] Agent ${agentDef.name} failed on Ticket ${ticketId}:`, err);
            }
        }

        return executedCount;
    } catch (error) {
        console.error(`[AI Copilot] Error dispatching event ${eventType} for ticket ${ticketId}:`, error);
        return 0;
    }
}
