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

  console.log('Lookup tables seeded.')
}
