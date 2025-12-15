/**
 * AI Ticket Analyzer
 * Uses Groq/Llama 3.3 70B for conversation analysis
 */

import { generateObject } from 'ai'
import { createGroq } from '@ai-sdk/groq'
import { z } from 'zod'

const groq = createGroq({
  apiKey: process.env.GROQ_API_KEY,
})

const ANALYSIS_PROMPT = `Você é um analista de vendas experiente. Analise a conversa de WhatsApp abaixo e forneça insights detalhados.

CONTEXTO:
- Este é um ticket de atendimento via WhatsApp
- O objetivo é qualificar o lead e identificar oportunidades de venda

CONVERSA:
{messages}

INSTRUÇÕES:
Analise a conversa e retorne um objeto JSON com os seguintes campos:
- sentiment: "positive", "neutral", "negative" ou "frustrated" baseado no tom do lead
- sentimentScore: número de -1.0 (muito negativo) a 1.0 (muito positivo)
- buyingSignals: array de sinais de compra identificados (ex: ["pediu preço", "demonstrou urgência"])
- objectionSignals: array de objeções identificadas (ex: ["mencionou concorrente", "disse que está caro"])
- aiLeadScore: score de 0-100 indicando probabilidade de conversão
- scoreFactors: objeto com fatores do score (engagement, intent, timing, fit)
- summary: resumo de 1-2 frases da conversa
- tags: array de tags relevantes (max 5)
- outcome: resultado sugerido ("won", "lost", "abandoned", "follow_up", "negotiating", null se inconclusivo)
- outcomeReason: razão do outcome sugerido (1 frase)`

const analysisSchema = z.object({
  sentiment: z.enum(['positive', 'neutral', 'negative', 'frustrated']),
  sentimentScore: z.number().min(-1).max(1),
  buyingSignals: z.array(z.string()),
  objectionSignals: z.array(z.string()),
  aiLeadScore: z.number().min(0).max(100),
  scoreFactors: z.object({
    engagement: z.number().min(0).max(100),
    intent: z.number().min(0).max(100),
    timing: z.number().min(0).max(100),
    fit: z.number().min(0).max(100),
  }),
  summary: z.string(),
  tags: z.array(z.string()).max(5),
  outcome: z.enum(['won', 'lost', 'abandoned', 'follow_up', 'negotiating']).nullable(),
  outcomeReason: z.string().nullable(),
})

export type TicketAnalysisResult = z.infer<typeof analysisSchema>

interface MessageContext {
  content: string | null
  senderType: string
  createdAt: Date
}

interface AnalyzeTicketParams {
  ticketId: string
  messages: MessageContext[]
}

function formatMessages(messages: MessageContext[]): string {
  return messages
    .map((m) => {
      const sender = m.senderType === 'LEAD' ? 'Lead' : m.senderType === 'USER' ? 'Agente' : 'Sistema'
      const time = m.createdAt.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })
      return `[${time}] ${sender}: ${m.content ?? '[mídia]'}`
    })
    .join('\n')
}

export async function analyzeTicket(params: AnalyzeTicketParams): Promise<TicketAnalysisResult> {
  const { messages } = params

  if (messages.length === 0) {
    return {
      sentiment: 'neutral',
      sentimentScore: 0,
      buyingSignals: [],
      objectionSignals: [],
      aiLeadScore: 50,
      scoreFactors: { engagement: 50, intent: 50, timing: 50, fit: 50 },
      summary: 'Conversa sem mensagens para analisar.',
      tags: [],
      outcome: null,
      outcomeReason: null,
    }
  }

  const messagesContext = formatMessages(messages)
  const prompt = ANALYSIS_PROMPT.replace('{messages}', messagesContext)

  const { object } = await generateObject({
    model: groq('llama-3.3-70b-versatile'),
    schema: analysisSchema,
    prompt,
  })

  return object
}

export async function analyzeTicketWithCredits(
  params: AnalyzeTicketParams & { organizationId: string }
): Promise<TicketAnalysisResult | null> {
  const { aiCreditsService } = await import('@/services/credits/ai-credits-service')
  const { AI_CREDIT_COSTS } = await import('@/services/credits/types')

  const hasCredits = await aiCreditsService.hasCredits(params.organizationId, 'ticket_analysis')
  if (!hasCredits) {
    console.log(`[ticket-analyzer] No AI credits for org ${params.organizationId}`)
    return null
  }

  const result = await analyzeTicket(params)

  await aiCreditsService.consumeCredits({
    organizationId: params.organizationId,
    amount: AI_CREDIT_COSTS.ticket_analysis,
    action: 'ticket_analysis',
    ticketId: params.ticketId,
    triggeredBy: 'system',
  })

  return result
}
