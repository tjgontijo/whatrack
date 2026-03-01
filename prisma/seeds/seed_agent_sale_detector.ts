import type { PrismaClient } from '@db/client'

const AGENT = {
  name: 'Detector de Vendas',
  icon: 'ShoppingCart',
  leanPrompt:
    'Você é um classificador de intenção comercial para conversas de WhatsApp. Responda seguindo estritamente o schema.',
  domainSkill: {
    slug: 'detector-vendas-dominio',
    name: 'Detector de Vendas - Domínio',
    content: `Você é um classificador de intenção comercial para conversas de WhatsApp.

Classifique a conversa em uma das três intenções:
- SALE: cliente confirmou compra/contratação explicitamente ("fechado", "pode mandar o boleto", "combinado", pagamento confirmado). Use apenas quando não há dúvida.
- QUALIFIED: cliente demonstrou interesse real — pediu preço, orçamento, marcou visita/reunião — mas não confirmou.
- NEUTRAL: qualquer outra situação (dúvida, suporte, saudação, reagendamento).

Extraia também:
- itemName: produto/serviço/procedimento mencionado. Null se não houver.
- dealValue: valor numérico acordado (sem moeda). Null se não houver.
- reasoning: 1 frase citando o trecho decisivo da conversa.
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
      fieldName: 'intent',
      fieldType: 'ENUM',
      description: 'Classifica a intenção comercial atual da conversa.',
      isRequired: true,
      options: ['SALE', 'QUALIFIED', 'NEUTRAL'],
    },
    {
      fieldName: 'itemName',
      fieldType: 'STRING',
      description:
        'Nome do produto, serviço ou procedimento negociado. Retorne null se não houver menção clara.',
      isRequired: false,
    },
    {
      fieldName: 'dealValue',
      fieldType: 'NUMBER',
      description:
        'Valor total negociado em decimal (ex: 1500.00). Apenas números, sem símbolo de moeda. Retorne null se não houver.',
      isRequired: false,
    },
    {
      fieldName: 'reasoning',
      fieldType: 'STRING',
      description:
        'Justificativa em 1 a 2 sentenças citando o trecho ou contexto da conversa que motivou a classificação.',
      isRequired: true,
    },
    {
      fieldName: 'confidence',
      fieldType: 'NUMBER',
      description: 'Confiança na classificação. Float de 0.0 a 1.0 (1.0 = certeza absoluta).',
      isRequired: true,
    },
  ],
}

export async function seedAgentSaleDetector(prisma: PrismaClient, organizationId: string) {
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
