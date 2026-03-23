import 'server-only'

import type { Prisma } from '@/lib/db/client'
import { prisma } from '@/lib/db/prisma'
import { executePrompt } from '@/lib/ai/services/execute-prompt'
import { fail, ok, type Result } from '@/lib/shared/result'

const DEFAULT_FALLBACK_SKILL = 'human-handoff'

export interface SkillRunnerContext {
  organizationId: string
  projectId: string
  leadId?: string
  ticketId?: string | null
  pendingMessages: Array<{ body: string | null }>
  lead: {
    name: string | null
    pushName?: string | null
    phone: string | null
    waId: string | null
  }
  projectConfig: {
    businessName: string | null
    productDescription: string | null
    pricingInfo: string | null
    nextStepType: string | null
    assistantName: string | null
    escalationContact: string | null
    businessHours: Prisma.JsonValue | null
  }
}

export interface SkillRunnerInput {
  skillSlug: string
  context: SkillRunnerContext
}

export interface SkillOutput {
  text: string
  messageParts: string[]
  stateUpdates?: {
    profileSummary?: string
    suggestedNextAction?: string
  }
  nextSkillSlug?: string
  resolvedSkillSlug: string
  skillId: string
  skillVersion: string
}

function renderBusinessHoursText(businessHours: Prisma.JsonValue | null | undefined) {
  if (!businessHours || typeof businessHours !== 'object' || Array.isArray(businessHours)) {
    return 'no próximo horário útil'
  }

  const schedules = Array.isArray((businessHours as Record<string, unknown>).schedules)
    ? ((businessHours as Record<string, unknown>).schedules as Array<Record<string, unknown>>)
    : []
  const firstSchedule = schedules[0]
  const open = typeof firstSchedule?.open === 'string' ? firstSchedule.open : null
  const close = typeof firstSchedule?.close === 'string' ? firstSchedule.close : null

  return open && close
    ? `no próximo horário útil (${open} às ${close})`
    : 'no próximo horário útil'
}

function buildPrompt(input: {
  skillPrompt: string
  aggregatedText: string
  lead: {
    name: string | null
    phone: string | null
    waId: string | null
  }
  projectConfig: {
    businessName: string | null
    productDescription: string | null
    pricingInfo: string | null
    nextStepType: string | null
    assistantName: string | null
  }
}) {
  return [
    'Você é o agente inbound de WhatsApp da WhaTrack.',
    input.skillPrompt,
    '',
    'Contexto do projeto:',
    `- Negócio: ${input.projectConfig.businessName ?? 'não informado'}`,
    `- Assistente: ${input.projectConfig.assistantName ?? 'não informado'}`,
    `- Produto/serviço: ${input.projectConfig.productDescription ?? 'não informado'}`,
    `- Preço: ${input.projectConfig.pricingInfo ?? 'não informado'}`,
    `- Próximo passo comercial: ${input.projectConfig.nextStepType ?? 'não informado'}`,
    '',
    'Contexto do lead:',
    `- Nome: ${input.lead.name ?? 'não informado'}`,
    `- Telefone: ${input.lead.phone ?? input.lead.waId ?? 'não informado'}`,
    '',
    'Mensagens pendentes do lead:',
    input.aggregatedText,
    '',
    'Responda em português do Brasil, em tom comercial-profissional, com no máximo 3 frases curtas.',
  ].join('\n')
}

function renderDeterministicResponse(input: {
  skillSlug: string
  leadName: string | null
  projectConfig: SkillRunnerContext['projectConfig']
}) {
  const contactName = input.leadName?.trim() || 'por aqui'
  const assistantName = input.projectConfig.assistantName?.trim() || 'assistente virtual'
  const businessName = input.projectConfig.businessName?.trim() || 'nossa equipe'

  switch (input.skillSlug) {
    case 'send-welcome':
      return `Olá, ${contactName}! Eu sou ${assistantName} da ${businessName}. Recebi sua mensagem e posso te ajudar por aqui. Me conta, por favor, o que você precisa neste momento?`
    case 'send-pricing':
      return input.projectConfig.pricingInfo?.trim()
        ? `${input.projectConfig.pricingInfo.trim()} Se fizer sentido para você, posso seguir com o próximo passo do atendimento agora.`
        : `Posso te ajudar com valores, mas preciso de um pouco mais de contexto para passar a opção certa. Você consegue me dizer o que está buscando?`
    case 'human-handoff':
      return input.projectConfig.escalationContact?.trim()
        ? `Vou direcionar seu atendimento para um humano agora. Nosso próximo passo é seguir por ${input.projectConfig.escalationContact.trim()}.`
        : 'Vou encaminhar sua conversa para um atendente humano agora para te apoiar com prioridade.'
    case 'out-of-hours-reply':
      return `Recebemos sua mensagem e ela ficou registrada. Estamos fora do horário de atendimento e vamos continuar ${renderBusinessHoursText(input.projectConfig.businessHours)}.`
    case 'explain-product-service':
      return input.projectConfig.productDescription?.trim()
        ? `${input.projectConfig.productDescription.trim()} Se você quiser, eu também posso te explicar o próximo passo para avançar.`
        : 'Posso te explicar como funciona, mas preciso entender melhor sua necessidade principal. O que você quer resolver?'
    case 'collect-lead-qualification':
    default:
      return 'Para eu te orientar melhor, me diz em uma frase qual é sua necessidade principal e qual a urgência desse atendimento.'
  }
}

export async function resolvePublishedSkill(input: {
  skillSlug: string
  organizationId: string
  projectId: string
}) {
  const skill = await prisma.aiSkill.findFirst({
    where: {
      slug: input.skillSlug,
      isActive: true,
      OR: [{ isSystem: true }, { organizationId: input.organizationId, projectId: input.projectId }],
    },
    include: {
      versions: {
        where: {
          isPublished: true,
        },
        orderBy: {
          publishedAt: 'desc',
        },
        take: 1,
      },
    },
  })

  if (!skill || !skill.versions[0]) {
    return fail(`Published skill version not found for ${input.skillSlug}`)
  }

  return ok({
    skill,
    version: skill.versions[0],
  })
}

export async function runSkill(input: SkillRunnerInput): Promise<Result<SkillOutput>> {
  const resolved = await resolvePublishedSkill({
    skillSlug: input.skillSlug,
    organizationId: input.context.organizationId,
    projectId: input.context.projectId,
  })

  if (!resolved.success) {
    if (input.skillSlug === DEFAULT_FALLBACK_SKILL) {
      return fail(resolved.error)
    }

    return runSkill({
      skillSlug: DEFAULT_FALLBACK_SKILL,
      context: input.context,
    })
  }

  const aggregatedText = input.context.pendingMessages
    .map((message) => message.body?.trim())
    .filter((message): message is string => Boolean(message))
    .join('\n')
    .trim()

  const leadName = input.context.lead.name ?? input.context.lead.pushName ?? null
  const { skill, version } = resolved.data

  if (version.mode === 'deterministic') {
    const text = renderDeterministicResponse({
      skillSlug: skill.slug,
      leadName,
      projectConfig: input.context.projectConfig,
    })

    return ok({
      text,
      messageParts: [text],
      resolvedSkillSlug: skill.slug,
      skillId: skill.id,
      skillVersion: version.version,
      stateUpdates: {
        profileSummary: `Última intenção detectada: ${aggregatedText.slice(0, 400)}`,
        suggestedNextAction: skill.slug,
      },
    })
  }

  const promptResult = await executePrompt({
    organizationId: input.context.organizationId,
    projectId: input.context.projectId,
    agentSlug: 'whatsapp-inbound',
    leadId: input.context.leadId,
    ticketId: input.context.ticketId ?? undefined,
    prompt: buildPrompt({
      skillPrompt: version.prompt,
      aggregatedText,
      lead: {
        name: input.context.lead.name,
        phone: input.context.lead.phone,
        waId: input.context.lead.waId,
      },
      projectConfig: {
        businessName: input.context.projectConfig.businessName,
        productDescription: input.context.projectConfig.productDescription,
        pricingInfo: input.context.projectConfig.pricingInfo,
        nextStepType: input.context.projectConfig.nextStepType,
        assistantName: input.context.projectConfig.assistantName,
      },
    }),
    modelSettings: {
      temperature: 0.2,
      maxOutputTokens: 250,
    },
  })

  if (!promptResult.success || !promptResult.data.text.trim()) {
    if (input.skillSlug === DEFAULT_FALLBACK_SKILL) {
      return fail(promptResult.success ? 'Empty skill output' : promptResult.error)
    }

    return runSkill({
      skillSlug: DEFAULT_FALLBACK_SKILL,
      context: input.context,
    })
  }

  const text = promptResult.data.text.trim()

  return ok({
    text,
    messageParts: [text],
    resolvedSkillSlug: skill.slug,
    skillId: skill.id,
    skillVersion: version.version,
    stateUpdates: {
      profileSummary: `Última intenção detectada: ${aggregatedText.slice(0, 400)}`,
      suggestedNextAction: skill.slug,
    },
  })
}

export const skillRunner = {
  resolvePublishedSkill,
  runSkill,
}
