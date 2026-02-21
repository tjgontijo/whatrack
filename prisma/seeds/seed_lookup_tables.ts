import type { PrismaClient } from '../generated/prisma/client'

const userRoles = [
  { name: 'owner', description: 'Super admin com acesso total ao sistema.' },
  { name: 'admin', description: 'Administrador com permissões de gestão.' },
  { name: 'user', description: 'Usuário padrão com permissões limitadas.' },
]

const onboardingStatuses = [
  { name: 'pending', description: 'Onboarding iniciado e aguardando conclusão.' },
  { name: 'completed', description: 'Onboarding concluído com sucesso.' },
  { name: 'skipped', description: 'Onboarding pulado pelo usuário.' },
]

const saleStatuses = [
  { name: 'pending', description: 'Venda em aberto.' },
  { name: 'completed', description: 'Venda concluída.' },
  { name: 'cancelled', description: 'Venda cancelada.' },
]

const whatsappOnboardingStatuses = [
  { name: 'pending', description: 'Aguardando autorização do usuário.' },
  { name: 'authorized', description: 'Autorizado via OAuth.' },
  { name: 'completed', description: 'Onboarding finalizado.' },
  { name: 'expired', description: 'Onboarding expirado.' },
  { name: 'failed', description: 'Onboarding falhou.' },
]

const whatsappConnectionStatuses = [
  { name: 'pending', description: 'Conexão pendente de ativação.' },
  { name: 'active', description: 'Conexão ativa e operacional.' },
  { name: 'inactive', description: 'Conexão inativa ou desconectada.' },
  { name: 'error', description: 'Conexão em erro.' },
]

const whatsappHealthStatuses = [
  { name: 'unknown', description: 'Saúde desconhecida.' },
  { name: 'healthy', description: 'Saúde OK.' },
  { name: 'warning', description: 'Saúde com alerta.' },
  { name: 'error', description: 'Saúde com erro.' },
]

const whatsappAuditActions = [
  { name: 'ONBOARDING_STARTED', description: 'Onboarding iniciado.' },
  { name: 'ONBOARDING_COMPLETED', description: 'Onboarding concluído.' },
  { name: 'ONBOARDING_FAILED', description: 'Onboarding falhou.' },
  { name: 'ONBOARDING_EXPIRED', description: 'Onboarding expirou.' },
  { name: 'CONNECTION_ADDED', description: 'Conexão adicionada.' },
  { name: 'CONNECTION_REMOVED', description: 'Conexão removida.' },
  { name: 'CONNECTION_REINSTATED', description: 'Conexão reinstalada.' },
  { name: 'CONNECTION_DISCONNECTED', description: 'Conexão desconectada.' },
  { name: 'HEALTH_CHECK', description: 'Health check registrado.' },
  { name: 'TOKEN_EXPIRED', description: 'Token expirado.' },
  { name: 'TOKEN_RENEWED', description: 'Token renovado.' },
]

const aiTriggerEventTypes = [
  { name: 'TICKET_WON', description: 'Quando o ticket é movido para Ganho.' },
  { name: 'TICKET_LOST', description: 'Quando o ticket é movido para Perdido.' },
  { name: 'TICKET_CLOSED', description: 'Quando o ticket é fechado (qualquer motivo).' },
  { name: 'NEW_MESSAGE_RECEIVED', description: 'Sempre que uma nova mensagem inbound chega.' },
  { name: 'CONVERSATION_IDLE_3M', description: 'Quando a conversa esfria por 3 minutos.' },
  { name: 'CONVERSATION_IDLE_2H', description: 'Quando a conversa esfria por 2 horas.' },
  { name: 'MANUAL_TRIGGER', description: 'Acionado manualmente no front-end por botão.' },
]

const aiSchemaFieldTypes = [
  { name: 'STRING', description: 'Texto livre.' },
  { name: 'NUMBER', description: 'Número inteiro ou decimal.' },
  { name: 'BOOLEAN', description: 'Verdadeiro ou falso.' },
  { name: 'ENUM', description: 'Lista de opções pré-definidas.' },
  { name: 'ARRAY', description: 'Lista de múltiplos valores.' }
]

const aiInsightActionStatuses = [
  { name: 'SUGGESTION', description: 'Sugestão pendente de aprovação.' },
  { name: 'APPLIED', description: 'Ação executada com sucesso.' },
  { name: 'DISMISSED', description: 'Ação ignorada ou rejeitada.' },
]

async function upsertByName(
  model: { upsert: (args: { where: { name: string }; update: { description: string }; create: { name: string; description: string } }) => Promise<unknown> },
  items: { name: string; description: string }[]
) {
  for (const item of items) {
    await model.upsert({
      where: { name: item.name },
      update: { description: item.description },
      create: item,
    })
  }
}

export async function seedLookupTables(prisma: PrismaClient) {
  console.log('Seeding lookup tables (enum replacements)...')

  await upsertByName(prisma.userRole, userRoles)
  await upsertByName(prisma.onboardingStatus, onboardingStatuses)
  await upsertByName(prisma.saleStatus, saleStatuses)
  await upsertByName(prisma.whatsAppOnboardingStatus, whatsappOnboardingStatuses)
  await upsertByName(prisma.whatsAppConnectionStatus, whatsappConnectionStatuses)
  await upsertByName(prisma.whatsAppHealthStatus, whatsappHealthStatuses)
  await upsertByName(prisma.whatsAppAuditAction, whatsappAuditActions)

  // AI Platform Lookups
  await upsertByName(prisma.aiTriggerEventType as any, aiTriggerEventTypes)
  await upsertByName(prisma.aiSchemaFieldType as any, aiSchemaFieldTypes)
  await upsertByName(prisma.aiInsightActionStatus as any, aiInsightActionStatuses)

  console.log('Lookup tables seeded.')
}
