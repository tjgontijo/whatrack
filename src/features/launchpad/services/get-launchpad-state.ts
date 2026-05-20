import 'server-only'
import { prisma } from '@/lib/db/prisma'
import { getActiveSubscription } from '@/features/billing/services/billing-subscription.service'
import { logger } from '@/lib/utils/logger'

export interface LaunchpadItem {
  id: string
  title: string
  description: string
  completed: boolean
  href: string
  icon: string
}

export async function getLaunchpadState(
  organizationId: string,
  projectId: string
): Promise<LaunchpadItem[]> {
  const [
    org,
    project,
    hasFiscalData,
    hasWhatsApp,
    hasMetaAds,
    hasPipeline,
    subscription,
  ] = await Promise.all([
    prisma.organization.findUnique({
      where: { id: organizationId },
      select: { name: true },
    }),

    prisma.project.findUnique({
      where: { id: projectId },
      select: { name: true },
    }),
    prisma.organizationProfile
      .findUnique({
        where: { organizationId },
        select: { cpf: true },
      })
      .then((profile) => {
        if (profile?.cpf) return true
        return prisma.organizationCompany
          .findFirst({
            where: { organizationId },
            select: { cnpj: true },
          })
          .then((company) => !!company?.cnpj)
      }),

    prisma.whatsAppConfig
      .findFirst({
        where: { projectId, status: 'connected' },
        select: { id: true },
      })
      .then((config) => !!config),

    prisma.metaConnection
      .findFirst({
        where: { organizationId, status: 'ACTIVE' },
        select: { id: true },
      })
      .then((conn) => !!conn),

    prisma.dealStage
      .findFirst({
        where: { organizationId, projectId },
        select: { id: true },
      })
      .then((stage) => !!stage),

    getActiveSubscription(organizationId),
  ])

  const orgRenamed = Boolean(org?.name && org.name !== 'Minha Organização')
  logger.debug(
    {
      organizationId,
      projectId,
      orgName: org?.name,
      projectName: project?.name,
      orgRenamed,
    },
    '[launchpad] getLaunchpadState debug'
  )

  const items: LaunchpadItem[] = [
    {
      id: 'org-name',
      title: 'Organização',
      description: 'Escolha um nome para sua organização',
      completed: orgRenamed,
      href: '/settings/organization',
      icon: 'Building2',
    },
    {
      id: 'fiscal-data',
      title: 'Completar cadastro com dados fiscais',
      description: 'Adicione CPF ou CNPJ da sua empresa',
      completed: hasFiscalData,
      href: '/settings/organization',
      icon: 'Building2',
    },
    {
      id: 'whatsapp',
      title: 'Conectar WhatsApp',
      description: 'Integre seu WhatsApp Business para automação',
      completed: hasWhatsApp,
      href: '/settings/whatsapp',
      icon: 'MessageSquare',
    },
    {
      id: 'meta-ads',
      title: 'Conectar Meta Ads',
      description: 'Sincronize campanhas e métricas do Meta',
      completed: hasMetaAds,
      href: '/settings/meta-ads',
      icon: 'Meta',
    },
    {
      id: 'pipeline',
      title: 'Configurar pipeline de vendas',
      description: 'Configure os estágios do seu funil comercial',
      completed: hasPipeline,
      href: '/deals',
      icon: 'Kanban',
    },
    {
      id: 'billing',
      title: 'Escolher plano de assinatura',
      description: 'Selecione o plano que melhor se adequa',
      completed: !!subscription,
      href: '/settings/subscription',
      icon: 'CreditCard',
    },
  ]

  return items
}

export async function isLaunchpadComplete(
  organizationId: string,
  projectId: string
): Promise<boolean> {
  const items = await getLaunchpadState(organizationId, projectId)
  return items.every((item) => item.completed)
}
