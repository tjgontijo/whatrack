import { Agent } from '@mastra/core/agent';
import { z } from 'zod';
import { prisma } from '@/lib/prisma';
import { publishToCentrifugo } from '@/lib/centrifugo/server';
import { groq } from '@ai-sdk/groq';

const schema = z.object({
    intent: z.enum(['SALE', 'QUALIFIED', 'NEUTRAL']),
    productName: z.string().nullable().describe("Nome do produto ou procedimento detectado, ex: Botox, Preenchimento"),
    dealValue: z.number().nullable().describe("Valor monetário negociado (ex: 1500.00). Retorne null se não tiver certeza."),
    confidence: z.number().describe("Percentual de confiança de 0.0 a 1.0"),
    reasoning: z.string().describe("Motivo ou trecho da conversa resumido que baseou essa decisão"),
});

export const ticketAnalyst = new Agent({
    name: 'ticket-analyst',
    id: 'ticket-analyst',
    instructions: `Você é um Supervisor de Vendas de CRM operando como uma IA Copilot.
Sua missão é ler o final de um histórico de chat de WhatsApp e classificar com exatidão a intenção final.
Você deve SEMPRE retornar o JSON conforme o schema.

REGRAS:
- intent = 'SALE' -> Apenas se o cliente pagou, enviou PIX, ou aceitou os termos finais de compra ("ok, agendado e pago").
- intent = 'QUALIFIED' -> O lead é quente, agendou ou quer muito comprar, mas o financeiro não rolou ainda.
- intent = 'NEUTRAL' -> Dúvidas gerais, cliente parou de responder, preço alto.
- productName -> O que o cliente quer comprar?
- dealValue -> Use a inteligência para pegar o PREÇO mencionado pelo vendedor sendo aprovado/pago pelo cliente. Apenas números inteiros ou decimais em formato Float.`,
    model: groq('llama-3.3-70b-versatile'),
});

export async function analyzeTicket(ticketId: string): Promise<boolean> {
    try {
        const ticket = await prisma.ticket.findUnique({
            where: { id: ticketId },
            include: {
                organization: {
                    include: {
                        profile: true
                    }
                },
                conversation: {
                    include: {
                        messages: {
                            orderBy: { timestamp: 'desc' },
                            take: 30
                        }
                    }
                }
            }
        });

        if (!ticket || ticket.status !== 'open') return false;

        // Verifica se a automação de IA está ativa (Ativa por padrão se for nulo)
        const isAiActive = ticket.organization?.profile?.aiCopilotActive !== false;
        if (!isAiActive) return false;

        // Check if we already have an APPROVED or PENDING approval recently.
        // To prevent infinite AI loops. Let's just create it if we haven't created one in the last 2 hours.
        const twoHoursAgo = new Date(Date.now() - 2 * 60 * 60 * 1000);
        const existingApproval = await prisma.aiConversionApproval.findFirst({
            where: {
                ticketId,
                createdAt: { gte: twoHoursAgo }
            }
        });

        if (existingApproval) {
            console.log(`[AI Copilot] Ticket ${ticketId} already has a recent approval analysis. Skipping.`);
            return false;
        }

        if (ticket.conversation.messages.length === 0) return false;

        // Build chat history string
        const history = ticket.conversation.messages
            .reverse() // from oldest to newest in the 30 context window
            .map(m => `[${m.direction === 'INBOUND' ? 'Cliente' : 'Atendente'}]: ${m.body || '[Mídia]'}`)
            .join('\n');

        console.log(`[AI Copilot] Analyzing Ticket: ${ticketId} with Groq/Mastra...`);

        const customInstructions = ticket.organization?.profile?.aiCopilotInstructions || '';
        const fullPrompt = `Aqui está o histórico das últimas mensagens do ticket ID: ${ticket.id}
        
[INSTRUÇÕES ESPECÍFICAS DA EMPRESA (Prioridade)]
${customInstructions || 'Nenhuma instrução adicional foi fornecida.'}

[HISTÓRICO DO CHAT DE WHATSAPP]
${history}`;

        const result = (await ticketAnalyst.generate(
            fullPrompt,
            { structuredOutput: { schema } }
        )) as any;

        const data = result.object;
        if (!data || !data.intent) {
            console.warn(`[AI Copilot] Failed to extract intent for ${ticketId}`);
            return false;
        }

        console.log(`[AI Copilot] Result for ${ticketId}: ${data.intent} (${(data.confidence * 100).toFixed(0)}%) - ${data.dealValue}`);

        // Materialize in Database if Confident enough
        if ((data.intent === 'SALE' || data.intent === 'QUALIFIED') && data.confidence > 0.7) {
            const approval = await prisma.aiConversionApproval.create({
                data: {
                    organizationId: ticket.organizationId,
                    ticketId: ticket.id,
                    eventName: data.intent === 'SALE' ? 'Purchase' : 'Lead',
                    productName: data.productName,
                    dealValue: data.dealValue,
                    confidence: data.confidence,
                    reasoning: data.reasoning,
                    status: 'PENDING'
                }
            });

            // Notify Frontend
            await publishToCentrifugo(`org:${ticket.organizationId}:ai_approvals`, {
                type: 'approval_created',
                approvalId: approval.id,
                ticketId: ticket.id,
                data: approval
            });

            return true;
        }

        return false;
    } catch (error) {
        console.error(`[AI Copilot] Error analyzing ticket ${ticketId}:`, error);
        return false;
    }
}
