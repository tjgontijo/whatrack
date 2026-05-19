import { Suspense } from 'react'
import { BarChart3 } from 'lucide-react'
import { ExecutiveScorecard } from '@/features/dashboard/components/executive/executive-scorecard'
import { OriginsTable } from '@/features/dashboard/components/tables/origins-table'
import { MetaEntitiesTable } from '@/features/dashboard/components/tables/meta-entities-table'
import { PageContent, PageHeader, PageShell } from '@/features/dashboard/components/layout'
import { executiveScorecardService } from '@/features/dashboard/services/executive-scorecard.service'
import { originsMetricsService } from '@/features/dashboard/services/origins-metrics.service'
import { metaEntityMetricsService } from '@/features/dashboard/services/meta-entity-metrics.service'
import { resolveFiltersDateRange } from '@/features/dashboard/services/build-filters'
import { auth } from '@/lib/auth/auth'
import { prisma } from '@/lib/db/prisma'
import { notFound } from 'next/navigation'

interface PageProps {
  params: Promise<{
    organizationSlug: string
    projectSlug: string
  }>
  searchParams: Promise<{
    period?: string
  }>
}

async function ExecutiveScorecardSection({ organizationId, projectId, period }: {
  organizationId: string
  projectId: string | null
  period: string
}) {
  const dateRange = resolveFiltersDateRange({ period })
  const metrics = await executiveScorecardService.getMetrics(
    organizationId,
    dateRange.from,
    dateRange.to,
    projectId
  )

  return <ExecutiveScorecard metrics={metrics} />
}

async function OriginsMetricsSection({ organizationId, projectId, period }: {
  organizationId: string
  projectId: string | null
  period: string
}) {
  const dateRange = resolveFiltersDateRange({ period })
  const metrics = await originsMetricsService.getMetrics(
    organizationId,
    dateRange.from,
    dateRange.to,
    projectId
  )

  return (
    <div className='space-y-4'>
      <div>
        <h3 className='text-lg font-semibold text-slate-900'>Métricas por Origem</h3>
        <p className='text-sm text-slate-500'>Leads, vendas e receita por UTM origin</p>
      </div>
      <OriginsTable data={metrics} />
    </div>
  )
}

async function MetaEntityMetricsSection({ organizationId, projectId, period }: {
  organizationId: string
  projectId: string | null
  period: string
}) {
  const dateRange = resolveFiltersDateRange({ period })
  const metrics = await metaEntityMetricsService.getMetrics(
    organizationId,
    dateRange.from,
    dateRange.to,
    projectId
  )

  return (
    <div className='space-y-4'>
      <div>
        <h3 className='text-lg font-semibold text-slate-900'>Métricas Meta Ads</h3>
        <p className='text-sm text-slate-500'>Spend, ROAS e leads por entidade Meta</p>
      </div>
      <MetaEntitiesTable data={metrics} />
    </div>
  )
}

function ExecutiveScorecardFallback() {
  return (
    <div className='space-y-4'>
      <div className='h-48 animate-pulse rounded-lg bg-slate-100' />
    </div>
  )
}

function TableFallback() {
  return (
    <div className='space-y-4'>
      <div className='h-8 w-40 animate-pulse rounded bg-slate-100' />
      <div className='h-64 animate-pulse rounded-lg bg-slate-100' />
    </div>
  )
}

export default async function DashboardPage({ params, searchParams }: PageProps) {
  const { organizationSlug, projectSlug } = await params
  const { period = '7d' } = await searchParams

  const session = await auth()
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
  const member = await prisma.organizationMember.findFirst({
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
        slug_organizationId: {
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
    <PageShell>
      <PageHeader
        title='Scorecard Executivo'
        description='KPIs principais de receita e meta ads'
        icon={BarChart3}
      />

      <PageContent className='space-y-12'>
        <Suspense fallback={<ExecutiveScorecardFallback />}>
          <ExecutiveScorecardSection
            organizationId={organization.id}
            projectId={projectId}
            period={period}
          />
        </Suspense>

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
      </PageContent>
    </PageShell>
  )
}
