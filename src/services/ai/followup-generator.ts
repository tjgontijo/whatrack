/**
 * AI Follow-up Message Generator
 * Uses Gemini 2.0 Flash to generate contextual follow-up messages
 */

import { generateText } from 'ai'
import { google } from '@ai-sdk/google'

const FOLLOWUP_PROMPT = `Você é um assistente de vendas profissional.
Gere uma mensagem de follow-up para um lead que não respondeu.

CONTEXTO:
- Empresa: {businessType}
- Produto/Serviço: {productDescription}
- Tom de comunicação: {aiTone}
- Esta é a tentativa {step} de {maxSteps}

CONVERSA ANTERIOR:
{recentMessages}

INSTRUÇÕES:
- Seja breve (máximo 2-3 frases)
- Não seja invasivo ou insistente
- Referencie algo relevante da conversa anterior
- Use linguagem natural e amigável
- Não use formatação (negrito, itálico, etc.)
{finalStepInstruction}

Retorne APENAS a mensagem, sem aspas ou formatação adicional.`

interface MessageContext {
  content: string | null
  senderType: string
}

interface GenerateFollowupParams {
  organizationId: string
  ticketId: string
  step: number
  maxSteps: number
  recentMessages: MessageContext[]
  aiTone: string
  businessType?: string | null
  productDescription?: string | null
}

export async function generateFollowupMessage(
  params: GenerateFollowupParams
): Promise<string> {
  const {
    step,
    maxSteps,
    recentMessages,
    aiTone,
    businessType,
    productDescription,
  } = params

  const messagesContext = recentMessages
    .reverse()
    .map((m) => `${m.senderType === 'LEAD' ? 'Lead' : 'Agente'}: ${m.content ?? '[mídia]'}`)
    .join('\n')

  const isFinalStep = step >= maxSteps
  const finalStepInstruction = isFinalStep
    ? '- Como é a última tentativa, indique gentilmente que você permanece à disposição caso o lead queira retomar o contato'
    : ''

  const toneDescriptions: Record<string, string> = {
    professional: 'profissional e cordial',
    friendly: 'amigável e descontraído',
    urgent: 'objetivo e com senso de urgência moderado',
  }

  const prompt = FOLLOWUP_PROMPT
    .replace('{businessType}', businessType ?? 'Não especificado')
    .replace('{productDescription}', productDescription ?? 'Não especificado')
    .replace('{aiTone}', toneDescriptions[aiTone] ?? aiTone)
    .replace('{step}', String(step))
    .replace('{maxSteps}', String(maxSteps))
    .replace('{recentMessages}', messagesContext || 'Nenhuma mensagem anterior')
    .replace('{finalStepInstruction}', finalStepInstruction)

  const { text } = await generateText({
    model: google('gemini-2.0-flash'),
    prompt,
  })

  return text.trim()
}

/**
 * Generate a test follow-up message (for development/testing)
 */
export async function generateTestFollowupMessage(
  step: number,
  maxSteps: number
): Promise<string> {
  return generateFollowupMessage({
    organizationId: 'test',
    ticketId: 'test',
    step,
    maxSteps,
    recentMessages: [
      { content: 'Olá, gostaria de saber mais sobre o produto', senderType: 'LEAD' },
      { content: 'Claro! Posso te ajudar. Qual é o seu interesse principal?', senderType: 'USER' },
    ],
    aiTone: 'professional',
    businessType: 'Empresa de tecnologia',
    productDescription: 'CRM para WhatsApp',
  })
}
