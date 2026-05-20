import { BarChart3 } from 'lucide-react'
import { notFound } from 'next/navigation'
import { Suspense } from 'react'
import { FunnelChart } from '@/features/dashboard/components/charts/funnel-chart'
import { ExecutiveScorecard } from '@/features/dashboard/components/executive/executive-scorecard'
import { PageContent, PageHeader, PageShell } from '@/features/dashboard/components/layout'
import { MetaEntitiesTable } from '@/features/dashboard/components/tables/meta-entities-table'
import { OriginsTable } from '@/features/dashboard/components/tables/origins-table'
import { resolveRequiredFiltersDateRange } from '@/features/dashboard/services/build-filters'
import { buildFunnel } from '@/features/dashboard/services/build-funnel'
import { executiveScorecardService } from '@/features/dashboard/services/executive-scorecard.service'
import { metaEntityMetricsService } from '@/features/dashboard/services/meta-entity-metrics.service'
import { originsMetricsService } from '@/features/dashboard/services/origins-metrics.service'
import { prisma } from '@/lib/db/prisma'
import { getServerSession } from '@/server/auth/server'

interface PageProps {
  params: Promise<{
    organizationSlug: string
    projectSlug: string
  }>
  searchParams: Promise<{
    period?: string
  }>
}

async function ExecutiveScorecardSection({
  organizationId,
  projectId,
  period,
}: {
  organizationId: string
  projectId: string | null
  period: string
}) {
  const dateRange = resolveRequiredFiltersDateRange({ period })
  const metrics = await executiveScorecardService.getMetrics(
    organizationId,
    dateRange.gte,
    dateRange.lte,
    projectId
  )

  return <ExecutiveScorecard metrics={metrics} />
}

async function FunnelSection({
  organizationId,
  projectId,
  period,
}: {
  organizationId: string
  projectId: string | null
  period: string
}) {
  const dateRange = resolveRequiredFiltersDateRange({ period })
  const funnel = await buildFunnel(organizationId, dateRange, projectId)

  return (
    <FunnelChart
      className='h-[420px] min-h-0 rounded-lg p-5'
      title='Funil do Pipeline'
      description='Etapas reais configuradas no kanban comercial.'
      steps={funnel.steps}
    />
  )
}

async function OriginsMetricsSection({
  organizationId,
  projectId,
  period,
}: {
  organizationId: string
  projectId: string | null
  period: string
}) {
  const dateRange = resolveRequiredFiltersDateRange({ period })
  const metrics = await originsMetricsService.getMetrics(
    organizationId,
    dateRange.gte,
    dateRange.lte,
    projectId
  )

  return (
    <div className='space-y-4'>
      <div>
        <h2 className='font-semibold text-foreground text-sm'>Métricas por Origem</h2>
        <p className='text-muted-foreground text-xs'>Leads, vendas e receita por origem UTM</p>
      </div>
      <OriginsTable data={metrics} />
    </div>
  )
}

async function MetaEntityMetricsSection({
  organizationId,
  projectId,
  period,
}: {
  organizationId: string
  projectId: string | null
  period: string
}) {
  const dateRange = resolveRequiredFiltersDateRange({ period })
  const metrics = await metaEntityMetricsService.getMetrics(
    organizationId,
    dateRange.gte,
    dateRange.lte,
    projectId
  )

  return (
    <div className='space-y-4'>
      <div>
        <h2 className='font-semibold text-foreground text-sm'>Métricas Meta Ads</h2>
        <p className='text-muted-foreground text-xs'>
          Investimento, ROAS e leads por entidade Meta
        </p>
      </div>
      <MetaEntitiesTable data={metrics} />
    </div>
  )
}

function ExecutiveScorecardFallback() {
  return <div className='h-48 animate-pulse rounded-lg border bg-muted/40' />
}

function TableFallback() {
  return (
    <div className='space-y-4'>
      <div className='h-8 w-40 animate-pulse rounded bg-muted/40' />
      <div className='h-40 animate-pulse rounded-lg border bg-muted/40' />
    </div>
  )
}

function FunnelFallback() {
  return (
    <div className='space-y-4'>
      <div className='h-[420px] animate-pulse rounded-lg border bg-muted/40' />
    </div>
  )
}

export default async function DashboardPage({ params, searchParams }: PageProps) {
  const { organizationSlug, projectSlug } = await params
  const { period = '7d' } = await searchParams

  const session = await getServerSession()
  if (!session?.user?.id) {
    return notFound()
  }

  // Resolve organization and project
  const organization = await prisma.organization.findUnique({
    where: { slug: organizationSlug },
    select: { id: true, name: true },
  })

  if (!organization) {
    return notFound()
  }

  // Verify user has access to organization
  const member = await prisma.member.findFirst({
    where: {
      organizationId: organization.id,
      userId: session.user.id,
    },
  })

  if (!member) {
    return notFound()
  }

  // Resolve project
  let projectId: string | null = null
  if (projectSlug !== '__default__') {
    const project = await prisma.project.findUnique({
      where: {
        organizationId_slug: {
          slug: projectSlug,
          organizationId: organization.id,
        },
      },
      select: { id: true, name: true },
    })

    if (!project) {
      return notFound()
    }

    projectId = project.id
  }

  return (
    <PageShell className='scrollbar-thin min-h-0 overflow-y-auto'>
      <PageHeader
        title='Visão Geral'
        description='Receita, funil e aquisição do projeto.'
        icon={BarChart3}
      />

      <PageContent className='space-y-6'>
        <Suspense fallback={<ExecutiveScorecardFallback />}>
          <ExecutiveScorecardSection
            organizationId={organization.id}
            projectId={projectId}
            period={period}
          />
        </Suspense>

        <Suspense fallback={<FunnelFallback />}>
          <FunnelSection organizationId={organization.id} projectId={projectId} period={period} />
        </Suspense>

        <div className='grid gap-6 2xl:grid-cols-2'>
          <Suspense fallback={<TableFallback />}>
            <OriginsMetricsSection
              organizationId={organization.id}
              projectId={projectId}
              period={period}
            />
          </Suspense>

          <Suspense fallback={<TableFallback />}>
            <MetaEntityMetricsSection
              organizationId={organization.id}
              projectId={projectId}
              period={period}
            />
          </Suspense>
        </div>
      </PageContent>
    </PageShell>
  )
}
