import type { PrismaClient } from '@generated/prisma/client'

const industryTemplates = [
  {
    name: 'Vendas Padrão',
    description: 'Funil clássico para processos de vendas B2B e B2C.',
    category: 'Vendas',
    icon: 'Briefcase',
    isPopular: true,
    items: [
      { name: 'Novo Lead', color: '#6366f1', order: 0, statusGroup: 'ACTIVE', probability: 20, suggestedMetaEventName: 'Lead' },
      { name: 'Qualificado', color: '#8b5cf6', order: 1, statusGroup: 'ACTIVE', probability: 40, suggestedMetaEventName: 'Lead' },
      { name: 'Proposta', color: '#f59e0b', order: 2, statusGroup: 'ACTIVE', probability: 80 },
      { name: 'Ganho', color: '#22c55e', order: 3, statusGroup: 'WON', probability: 100, suggestedMetaEventName: 'Purchase' },
      { name: 'Perdido', color: '#ef4444', order: 4, statusGroup: 'LOST', probability: 0 },
    ],
  },
  {
    name: 'Imobiliária',
    description: 'Otimizado para corretores e imobiliárias, do lead à escritura.',
    category: 'Real Estate',
    icon: 'Home',
    isPopular: false,
    items: [
      { name: 'Lead', color: '#6366f1', order: 0, statusGroup: 'ACTIVE', probability: 10 },
      { name: 'Visita Agendada', color: '#0ea5e9', order: 1, statusGroup: 'ACTIVE', probability: 40, suggestedMetaEventName: 'Schedule' },
      { name: 'Proposta', color: '#f59e0b', order: 2, statusGroup: 'ACTIVE', probability: 70 },
      { name: 'Vendido', color: '#22c55e', order: 3, statusGroup: 'WON', probability: 100, suggestedMetaEventName: 'Purchase' },
      { name: 'Desistiu', color: '#ef4444', order: 4, statusGroup: 'LOST', probability: 0 },
    ],
  },
  {
    name: 'SaaS B2B',
    description: 'Focado em demonstrações, períodos de teste e fechamento de contrato.',
    category: 'Software',
    icon: 'Zap',
    isPopular: true,
    items: [
      { name: 'Triagem', color: '#6366f1', order: 0, statusGroup: 'ACTIVE', probability: 20 },
      { name: 'Demo Realizada', color: '#8b5cf6', order: 1, statusGroup: 'ACTIVE', probability: 50, suggestedMetaEventName: 'QualifiedLead' },
      { name: 'Período Trial', color: '#0ea5e9', order: 2, statusGroup: 'ACTIVE', probability: 70, suggestedMetaEventName: 'StartTrial' },
      { name: 'Contrato', color: '#f59e0b', order: 3, statusGroup: 'ACTIVE', probability: 90 },
      { name: 'Ativo', color: '#22c55e', order: 4, statusGroup: 'WON', probability: 100, suggestedMetaEventName: 'Purchase' },
      { name: 'Não Converteu', color: '#ef4444', order: 5, statusGroup: 'LOST', probability: 0 },
    ],
  },
  {
    name: 'E-commerce (High Ticket)',
    description: 'Ideal para vendas consultivas de produtos de alto valor via WhatsApp.',
    category: 'Retail',
    icon: 'ShoppingBag',
    isPopular: false,
    items: [
      { name: 'Checkout Aberto', color: '#6366f1', order: 0, statusGroup: 'ACTIVE', probability: 10, suggestedMetaEventName: 'InitiateCheckout' },
      { name: 'Aguardando Pagamento', color: '#f59e0b', order: 1, statusGroup: 'ACTIVE', probability: 50 },
      { name: 'Pago', color: '#22c55e', order: 2, statusGroup: 'WON', probability: 100, suggestedMetaEventName: 'Purchase' },
      { name: 'Expirado', color: '#ef4444', order: 3, statusGroup: 'LOST', probability: 0 },
    ],
  },
  {
    name: 'Estética & Saúde',
    description: 'Do interesse inicial ao agendamento de avaliações.',
    category: 'Healthcare',
    icon: 'Heart',
    isPopular: false,
    items: [
      { name: 'Interessado', color: '#6366f1', order: 0, statusGroup: 'ACTIVE', probability: 20 },
      { name: 'Avaliação Agendada', color: '#0ea5e9', order: 1, statusGroup: 'ACTIVE', probability: 60, suggestedMetaEventName: 'Schedule' },
      { name: 'Agendado', color: '#8b5cf6', order: 2, statusGroup: 'ACTIVE', probability: 80, suggestedMetaEventName: 'Schedule' },
      { name: 'Realizado', color: '#22c55e', order: 3, statusGroup: 'WON', probability: 100, suggestedMetaEventName: 'Purchase' },
      { name: 'Cancelado', color: '#ef4444', order: 4, statusGroup: 'LOST', probability: 0 },
    ],
  },
]

export async function seedDealTemplates(prisma: PrismaClient) {
  console.log('Seeding deal stage templates...')

  for (const template of industryTemplates) {
    const existing = await prisma.dealStageTemplate.findFirst({
      where: { name: template.name },
    })

    let templateId: string

    if (existing) {
      await prisma.dealStageTemplate.update({
        where: { id: existing.id },
        data: {
          description: template.description,
          category: template.category,
          icon: template.icon,
          isPopular: template.isPopular,
        },
      })
      templateId = existing.id
      // Clear old items for refresh
      await prisma.dealStageTemplateItem.deleteMany({ where: { templateId } })
    } else {
      const created = await prisma.dealStageTemplate.create({
        data: {
          name: template.name,
          description: template.description,
          category: template.category,
          icon: template.icon,
          isPopular: template.isPopular,
        },
      })
      templateId = created.id
    }

    // Create items
    for (const item of template.items) {
      await prisma.dealStageTemplateItem.create({
        data: {
          templateId,
          ...item,
        },
      })
    }
  }

  console.log('Deal stage templates seeded successfully.')
}
