'use client'

import Link from 'next/link'
import type { ComponentType } from 'react'
import {
  Bot,
  FolderKanban,
  Megaphone,
  MessageCircleMore,
  Target,
  Ticket,
  ShoppingCart,
} from 'lucide-react'

import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import type { ProjectDetail } from '@/schemas/projects/project-schemas'

type ProjectDetailProps = {
  project: ProjectDetail
}

function SummaryCard(props: {
  title: string
  value: number
  description: string
  icon: ComponentType<{ className?: string }>
}) {
  const Icon = props.icon

  return (
    <Card>
      <CardHeader className="flex flex-row items-start justify-between space-y-0">
        <div>
          <CardDescription>{props.title}</CardDescription>
          <CardTitle className="mt-2 text-3xl">{props.value}</CardTitle>
        </div>
        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-500/10 text-emerald-600">
          <Icon className="h-5 w-5" />
        </div>
      </CardHeader>
      <CardContent>
        <p className="text-sm text-muted-foreground">{props.description}</p>
      </CardContent>
    </Card>
  )
}

export function ProjectDetailView({ project }: ProjectDetailProps) {
  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <div>
          <div className="flex items-center gap-2">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-500/10 text-emerald-600">
              <FolderKanban className="h-5 w-5" />
            </div>
            <div>
              <h1 className="text-2xl font-semibold tracking-tight">{project.name}</h1>
              <p className="text-sm text-muted-foreground">
                Workspace operacional do cliente com WhatsApp, Meta Ads e CRM isolados por projeto.
              </p>
            </div>
          </div>
        </div>

        <Button asChild variant="outline">
          <Link href="/dashboard/projects">Voltar para projetos</Link>
        </Button>
      </div>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-7">
        <SummaryCard
          title="WhatsApp"
          value={project.counts.whatsappCount}
          description="Números vinculados a este projeto."
          icon={MessageCircleMore}
        />
        <SummaryCard
          title="Meta Ads"
          value={project.counts.metaAdsCount}
          description="Contas de anúncio conectadas."
          icon={Megaphone}
        />
        <SummaryCard
          title="Leads"
          value={project.counts.leadCount}
          description="Leads operando neste cliente."
          icon={FolderKanban}
        />
        <SummaryCard
          title="Tickets"
          value={project.counts.ticketCount}
          description="Tickets e conversas comerciais."
          icon={Ticket}
        />
        <SummaryCard
          title="Vendas"
          value={project.counts.saleCount}
          description="Vendas associadas ao projeto."
          icon={ShoppingCart}
        />
        <SummaryCard
          title="Conversões"
          value={project.conversionCount}
          description="Eventos rastreados com sucesso para este cliente."
          icon={Target}
        />
        <SummaryCard
          title="Créditos IA"
          value={project.aiCreditsUsed}
          description="Tokens consumidos pelas automações e análises do projeto."
          icon={Bot}
        />
      </div>

      <div className="grid gap-6 xl:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Instâncias de WhatsApp</CardTitle>
            <CardDescription>
              Números vinculados a este cliente dentro da operação da agência.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {project.whatsappConfigs.length === 0 ? (
              <div className="rounded-xl border border-dashed border-border bg-muted/20 px-4 py-6 text-sm text-muted-foreground">
                Nenhuma instância vinculada a este projeto.
              </div>
            ) : (
              project.whatsappConfigs.map((config) => (
                <div
                  key={config.id}
                  className="flex items-center justify-between rounded-xl border border-border bg-muted/20 px-4 py-3"
                >
                  <div>
                    <p className="font-medium">{config.displayPhone ?? config.verifiedName ?? 'Número sem identificação'}</p>
                    <p className="text-sm text-muted-foreground">
                      {config.verifiedName ?? 'Nome não verificado'}
                    </p>
                  </div>
                  <Badge variant="outline">{config.status}</Badge>
                </div>
              ))
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Contas Meta Ads</CardTitle>
            <CardDescription>
              Contas de anúncio conectadas ao cliente e prontas para rastreio.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {project.metaAdAccounts.length === 0 ? (
              <div className="rounded-xl border border-dashed border-border bg-muted/20 px-4 py-6 text-sm text-muted-foreground">
                Nenhuma conta Meta Ads vinculada a este projeto.
              </div>
            ) : (
              project.metaAdAccounts.map((account) => (
                <div
                  key={account.id}
                  className="flex items-center justify-between rounded-xl border border-border bg-muted/20 px-4 py-3"
                >
                  <div>
                    <p className="font-medium">{account.adAccountName}</p>
                    <p className="text-sm text-muted-foreground">{account.adAccountId}</p>
                  </div>
                  <Badge variant={account.isActive ? 'default' : 'secondary'}>
                    {account.isActive ? 'Ativa' : 'Inativa'}
                  </Badge>
                </div>
              ))
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
