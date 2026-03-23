import { Prisma, PrismaClient } from '@generated/prisma/client'

const SYSTEM_AI_SKILLS: Array<{
  slug: string
  name: string
  description: string
  mode: string
  prompt: string
}> = [
  {
    slug: 'send-welcome',
    name: 'Send Welcome',
    description: 'Greets the lead and opens the conversation.',
    mode: 'deterministic',
    prompt:
      'Cumprimente o lead de forma curta, cordial e profissional. Apresente o negócio e convide a pessoa a explicar o que precisa.',
  },
  {
    slug: 'collect-lead-qualification',
    name: 'Collect Lead Qualification',
    description: 'Collects qualification data from the lead.',
    mode: 'llm',
    prompt:
      'Colete nome, necessidade principal, urgência e orçamento aproximado. Faça perguntas curtas e uma por vez.',
  },
  {
    slug: 'explain-product-service',
    name: 'Explain Product Service',
    description: 'Explains the product or service from project context.',
    mode: 'llm',
    prompt:
      'Explique o produto ou serviço com base na configuração do projeto, usando linguagem simples e objetiva.',
  },
  {
    slug: 'send-pricing',
    name: 'Send Pricing',
    description: 'Shares pricing guidance from project configuration.',
    mode: 'deterministic',
    prompt:
      'Envie a informação de preço disponível na configuração do projeto e proponha o próximo passo comercial.',
  },
  {
    slug: 'human-handoff',
    name: 'Human Handoff',
    description: 'Transfers the conversation to a human operator.',
    mode: 'deterministic',
    prompt:
      'Informe que um atendente humano vai assumir o atendimento e compartilhe o próximo passo sem prometer prazo irreal.',
  },
  {
    slug: 'out-of-hours-reply',
    name: 'Out Of Hours Reply',
    description: 'Replies when the business is outside operating hours.',
    mode: 'deterministic',
    prompt:
      'Explique que a empresa está fora do horário de atendimento e que a mensagem foi registrada para retorno no próximo período útil.',
  },
]

const INITIAL_SKILL_VERSION = '1.0.0'

export async function seedAiSkills(prisma: PrismaClient) {
  for (const skill of SYSTEM_AI_SKILLS) {
    const persistedSkill = await prisma.aiSkill.upsert({
      where: { slug: skill.slug },
      update: {
        name: skill.name,
        description: skill.description,
        isSystem: true,
        isActive: true,
        organizationId: null,
        projectId: null,
      },
      create: {
        slug: skill.slug,
        name: skill.name,
        description: skill.description,
        isSystem: true,
        isActive: true,
        organizationId: null,
        projectId: null,
      },
    })

    await prisma.aiSkillVersion.upsert({
      where: {
        skillId_version: {
          skillId: persistedSkill.id,
          version: INITIAL_SKILL_VERSION,
        },
      },
      update: {
        prompt: skill.prompt,
        mode: skill.mode,
        isPublished: true,
        publishedAt: new Date(),
      },
      create: {
        skillId: persistedSkill.id,
        version: INITIAL_SKILL_VERSION,
        prompt: skill.prompt,
        mode: skill.mode,
        isPublished: true,
        publishedAt: new Date(),
      },
    })
  }
}
