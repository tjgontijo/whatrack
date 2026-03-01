import type { PrismaClient } from '@db/client'

const AGENT = {
  name: 'Qualificador de Lead',
  icon: 'UserCheck',
  leanPrompt:
    'Você é um qualificador de leads para conversas de WhatsApp. Responda seguindo estritamente o schema.',
  domainSkill: {
    slug: 'qualificador-lead-dominio',
    name: 'Qualificador de Lead - Domínio',
    content: `Você é um qualificador de leads para conversas de WhatsApp.

Classifique o potencial de conversão do lead:
- HOT: necessidade clara, urgência ou sinal de decisão iminente ("quero fechar", "quando posso começar", "tem disponibilidade essa semana").
- WARM: interesse real com perguntas sobre produto/preço/condições, sem urgência.
- COLD: pesquisa inicial, comparando opções ou sem sinal claro de intenção de compra.

Extraia também:
- interestArea: produto/serviço/área de interesse. Null se não identificado.
- nextAction: próxima ação concreta para o atendente (ex: "Enviar tabela de preços", "Propor demonstração").
- reasoning: 1 frase com o comportamento do cliente que justifica a temperatura.
- confidence: 0.0–1.0.`,
  },
  model: 'openai/gpt-4o-mini',
  triggers: [
    {
      eventType: 'CONVERSATION_IDLE_3M',
      conditions: {},
    },
  ],
  schemaFields: [
    {
      fieldName: 'temperature',
      fieldType: 'ENUM',
      description: 'Temperatura do lead com base no interesse e urgência demonstrados.',
      isRequired: true,
      options: ['HOT', 'WARM', 'COLD'],
    },
    {
      fieldName: 'interestArea',
      fieldType: 'STRING',
      description:
        'Produto, serviço ou área de interesse identificada. Retorne null se não for possível identificar.',
      isRequired: false,
    },
    {
      fieldName: 'nextAction',
      fieldType: 'STRING',
      description: 'Próxima ação recomendada para o atendente avançar a negociação.',
      isRequired: true,
    },
    {
      fieldName: 'reasoning',
      fieldType: 'STRING',
      description: 'Justificativa em 1 a 2 sentenças com base na conversa.',
      isRequired: true,
    },
    {
      fieldName: 'confidence',
      fieldType: 'NUMBER',
      description: 'Confiança na classificação. Float de 0.0 a 1.0.',
      isRequired: true,
    },
  ],
}

export async function seedAgentLeadQualifier(prisma: PrismaClient, organizationId: string) {
  const agentRecord = await prisma.aiAgent.upsert({
    where: {
      organizationId_name: {
        organizationId,
        name: AGENT.name,
      },
    },
    update: {
      icon: AGENT.icon,
      leanPrompt: AGENT.leanPrompt,
      model: AGENT.model,
    },
    create: {
      organizationId,
      name: AGENT.name,
      icon: AGENT.icon,
      leanPrompt: AGENT.leanPrompt,
      model: AGENT.model,
      isActive: false,
    },
  })

  await prisma.aiTrigger.deleteMany({ where: { agentId: agentRecord.id } })
  await prisma.aiTrigger.createMany({
    data: AGENT.triggers.map((t) => ({
      agentId: agentRecord.id,
      eventType: t.eventType,
      conditions: t.conditions,
    })),
  })

  for (const field of AGENT.schemaFields) {
    await prisma.aiSchemaField.upsert({
      where: { agentId_fieldName: { agentId: agentRecord.id, fieldName: field.fieldName } },
      update: {
        fieldType: field.fieldType,
        description: field.description,
        isRequired: field.isRequired,
        options: field.options ?? undefined,
      },
      create: {
        agentId: agentRecord.id,
        fieldName: field.fieldName,
        fieldType: field.fieldType,
        description: field.description,
        isRequired: field.isRequired,
        options: field.options ?? undefined,
      },
    })
  }

  const domainSkill = await prisma.aiSkill.upsert({
    where: {
      organizationId_slug: {
        organizationId,
        slug: AGENT.domainSkill.slug,
      },
    },
    update: {
      name: AGENT.domainSkill.name,
      content: AGENT.domainSkill.content,
      kind: 'AGENT',
      source: 'SYSTEM',
      isActive: true,
    },
    create: {
      organizationId,
      slug: AGENT.domainSkill.slug,
      name: AGENT.domainSkill.name,
      content: AGENT.domainSkill.content,
      kind: 'AGENT',
      source: 'SYSTEM',
      isActive: true,
    },
    select: { id: true },
  })

  await prisma.aiAgentSkill.upsert({
    where: {
      agentId_skillId: {
        agentId: agentRecord.id,
        skillId: domainSkill.id,
      },
    },
    update: {
      sortOrder: 200,
      isActive: true,
    },
    create: {
      agentId: agentRecord.id,
      skillId: domainSkill.id,
      sortOrder: 200,
      isActive: true,
    },
  })
}
