import type { PrismaClient } from '@generated/prisma/client'

const conversationTemplates = [
  {
    name: 'Vendas Diretas',
    description: 'Ideal para produtos e serviços de conversão rápida via WhatsApp.',
    category: 'Vendas',
    icon: 'Zap',
    isPopular: true,
    isDefault: true,
    items: [
      { name: 'Novo Lead', color: '#6366f1', order: 0, statusGroup: 'ACTIVE', probability: 20, suggestedMetaEventName: 'Lead' },
      { name: 'Em Atendimento', color: '#8b5cf6', order: 1, statusGroup: 'ACTIVE', probability: 40, suggestedMetaEventName: 'Contact' },
      { name: 'Proposta Enviada', color: '#f59e0b', order: 2, statusGroup: 'ACTIVE', probability: 70 },
      { name: 'Venda Ganha', color: '#22c55e', order: 3, statusGroup: 'WON', probability: 100, suggestedMetaEventName: 'Purchase' },
      { name: 'Venda Perdida', color: '#ef4444', order: 4, statusGroup: 'LOST', probability: 0 },
    ],
  },
  {
    name: 'Vendas Consultivas / Reunião',
    description: 'Focado em processos que exigem qualificação e agendamento de reuniões ou visitas.',
    category: 'Vendas',
    icon: 'Users',
    isPopular: true,
    isDefault: false,
    items: [
      { name: 'Lead Recebido', color: '#6366f1', order: 0, statusGroup: 'ACTIVE', probability: 10, suggestedMetaEventName: 'Lead' },
      { name: 'Qualificado', color: '#8b5cf6', order: 1, statusGroup: 'ACTIVE', probability: 30, suggestedMetaEventName: 'QualifiedLead' },
      { name: 'Reunião Agendada', color: '#0ea5e9', order: 2, statusGroup: 'ACTIVE', probability: 60, suggestedMetaEventName: 'Schedule' },
      { name: 'Negociação', color: '#f59e0b', order: 3, statusGroup: 'ACTIVE', probability: 80 },
      { name: 'Contrato Fechado', color: '#22c55e', order: 4, statusGroup: 'WON', probability: 100, suggestedMetaEventName: 'Purchase' },
      { name: 'Desistência', color: '#ef4444', order: 5, statusGroup: 'LOST', probability: 0 },
    ],
  },
  {
    name: 'Agendamento de Serviços',
    description: 'Perfeito para clínicas, estética e prestadores de serviço com foco em reserva de horários.',
    category: 'Serviços',
    icon: 'Calendar',
    isPopular: false,
    isDefault: false,
    items: [
      { name: 'Interessado', color: '#6366f1', order: 0, statusGroup: 'ACTIVE', probability: 20, suggestedMetaEventName: 'Lead' },
      { name: 'Avaliação/Triagem', color: '#8b5cf6', order: 1, statusGroup: 'ACTIVE', probability: 40 },
      { name: 'Horário Agendado', color: '#0ea5e9', order: 2, statusGroup: 'ACTIVE', probability: 80, suggestedMetaEventName: 'Schedule' },
      { name: 'Serviço Realizado', color: '#22c55e', order: 3, statusGroup: 'WON', probability: 100, suggestedMetaEventName: 'Purchase' },
      { name: 'Não Compareceu', color: '#ef4444', order: 4, statusGroup: 'LOST', probability: 0 },
    ],
  },
  {
    name: 'Recuperação de Checkout',
    description: 'Focado em converter leads que iniciaram uma compra mas não finalizaram o pagamento.',
    category: 'E-commerce',
    icon: 'ShoppingBag',
    isPopular: true,
    isDefault: false,
    items: [
      { name: 'Checkout Iniciado', color: '#6366f1', order: 0, statusGroup: 'ACTIVE', probability: 20, suggestedMetaEventName: 'InitiateCheckout' },
      { name: 'Aguardando Pagamento', color: '#f59e0b', order: 1, statusGroup: 'ACTIVE', probability: 60 },
      { name: 'Pedido Pago', color: '#22c55e', order: 2, statusGroup: 'WON', probability: 100, suggestedMetaEventName: 'Purchase' },
      { name: 'Pagamento Expirado', color: '#ef4444', order: 3, statusGroup: 'LOST', probability: 0 },
    ],
  },
  {
    name: 'Trial e Demonstração',
    description: 'Para empresas de software que oferecem degustação gratuita ou demonstração assistida.',
    category: 'Software',
    icon: 'Monitor',
    isPopular: false,
    isDefault: false,
    items: [
      { name: 'Solicitação de Teste', color: '#6366f1', order: 0, statusGroup: 'ACTIVE', probability: 20, suggestedMetaEventName: 'Lead' },
      { name: 'Trial Ativo', color: '#8b5cf6', order: 1, statusGroup: 'ACTIVE', probability: 50, suggestedMetaEventName: 'StartTrial' },
      { name: 'Demo Realizada', color: '#0ea5e9', order: 2, statusGroup: 'ACTIVE', probability: 70 },
      { name: 'Assinatura Ativa', color: '#22c55e', order: 3, statusGroup: 'WON', probability: 100, suggestedMetaEventName: 'Purchase' },
      { name: 'Churn Trial', color: '#ef4444', order: 4, statusGroup: 'LOST', probability: 0 },
    ],
  },
]

export async function seedDealTemplates(prisma: PrismaClient) {
  console.log('Seeding deal stage templates...')

  for (const template of conversationTemplates) {
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
          isDefault: template.isDefault,
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
          isDefault: template.isDefault,
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
