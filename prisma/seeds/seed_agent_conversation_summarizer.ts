import type { PrismaClient } from '@generated/prisma/client'

const AGENT = {
  name: 'Resumidor de Conversa',
  icon: 'FileText',
  leanPrompt:
    'Você é um assistente de CRM que resume conversas de WhatsApp para a equipe comercial. Responda seguindo estritamente o schema.',
  domainSkill: {
    slug: 'resumidor-conversa-dominio',
    name: 'Resumidor de Conversa - Domínio',
    content: `Você é um assistente de CRM que gera resumos de conversas de WhatsApp para a equipe de vendas.

Produza:
- summary: 2–3 frases objetivas cobrindo o que foi discutido, decidido e o estado final.
- keyPoints: até 5 itens concretos — valores mencionados, produtos, decisões, próximos passos.
- outcome:
  - SALE_CLOSED: venda ou contratação confirmada.
  - FOLLOW_UP_NEEDED: conversa requer acompanhamento.
  - NOT_INTERESTED: cliente sem interesse ou encerrou sem avanço.
  - SUPPORT: suporte pós-venda, sem intenção comercial nova.

Seja factual. Não infira o que não está explícito na conversa.`,
  },
  model: 'openai/gpt-4o-mini',
  triggers: [
    {
      eventType: 'TICKET_CLOSED',
      conditions: {},
    },
  ],
  schemaFields: [
    {
      fieldName: 'summary',
      fieldType: 'STRING',
      description: 'Resumo executivo da conversa em 2 a 4 sentenças.',
      isRequired: true,
    },
    {
      fieldName: 'keyPoints',
      fieldType: 'ARRAY',
      description: 'Lista de até 5 pontos-chave: decisões, valores, produtos, próximos passos.',
      isRequired: true,
    },
    {
      fieldName: 'outcome',
      fieldType: 'ENUM',
      description: 'Resultado geral da conversa.',
      isRequired: true,
      options: ['SALE_CLOSED', 'FOLLOW_UP_NEEDED', 'NOT_INTERESTED', 'SUPPORT'],
    },
  ],
}

export async function seedAgentConversationSummarizer(prisma: PrismaClient, organizationId: string) {
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
