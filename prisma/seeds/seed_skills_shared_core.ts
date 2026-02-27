import type { PrismaClient } from '../generated/prisma/client'

type CoreSkillDefinition = {
  slug: string
  name: string
  description: string
  content: string
  sortOrder: number
}

const CORE_SKILLS: CoreSkillDefinition[] = [
  {
    slug: 'factualidade',
    name: 'Factualidade',
    description: 'Evita inferências sem evidência explícita na conversa.',
    content:
      'Use apenas informações explícitas no histórico. Quando um dado não estiver claro, retorne null ou marque como indefinido. Não invente fatos.',
    sortOrder: 10,
  },
  {
    slug: 'calibracao-confianca',
    name: 'Calibração de Confiança',
    description: 'Padroniza o score de confiança para 0.0-1.0 com evidência direta.',
    content:
      'Calibre confidence entre 0.0 e 1.0 com base em evidências textuais diretas: 0.9+ para confirmação explícita, 0.6-0.8 para sinal forte sem confirmação, <=0.5 para indício fraco.',
    sortOrder: 20,
  },
]

export async function seedSharedCoreSkills(prisma: PrismaClient, organizationId: string) {
  const coreSkills = await Promise.all(
    CORE_SKILLS.map((coreSkill) =>
      prisma.aiSkill.upsert({
        where: {
          organizationId_slug: {
            organizationId,
            slug: coreSkill.slug,
          },
        },
        update: {
          name: coreSkill.name,
          description: coreSkill.description,
          content: coreSkill.content,
          kind: 'SHARED',
          source: 'SYSTEM',
          isActive: true,
        },
        create: {
          organizationId,
          slug: coreSkill.slug,
          name: coreSkill.name,
          description: coreSkill.description,
          content: coreSkill.content,
          kind: 'SHARED',
          source: 'SYSTEM',
          isActive: true,
        },
        select: {
          id: true,
          slug: true,
        },
      })
    )
  )

  const agents = await prisma.aiAgent.findMany({
    where: { organizationId },
    select: { id: true },
  })

  for (const agent of agents) {
    for (const skill of coreSkills) {
      const config = CORE_SKILLS.find((entry) => entry.slug === skill.slug)
      if (!config) continue

      await prisma.aiAgentSkill.upsert({
        where: {
          agentId_skillId: {
            agentId: agent.id,
            skillId: skill.id,
          },
        },
        update: {
          sortOrder: config.sortOrder,
          isActive: true,
        },
        create: {
          agentId: agent.id,
          skillId: skill.id,
          sortOrder: config.sortOrder,
          isActive: true,
        },
      })
    }
  }
}
