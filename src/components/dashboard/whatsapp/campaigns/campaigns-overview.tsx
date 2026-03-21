'use client'

import { CheckCircle2, Clock, Loader2, Send, FileText } from 'lucide-react'

interface CampaignCounters {
  total: number
  draft: number
  pendingApproval: number
  scheduled: number
  processing: number
  completed: number
  cancelled: number
}

interface CampaignsOverviewProps {
  counters?: CampaignCounters
  isLoading?: boolean
}

function StatCard({
  label,
  value,
  icon: Icon,
  muted,
}: {
  label: string
  value: number
  icon: React.ElementType
  muted?: boolean
}) {
  return (
    <div className="rounded-xl border p-4">
      <div className="flex items-center gap-2">
        <Icon className="text-muted-foreground h-4 w-4" />
        <p className="text-muted-foreground text-xs">{label}</p>
      </div>
      <p className={`mt-2 text-2xl font-bold ${muted ? 'text-muted-foreground' : ''}`}>{value}</p>
    </div>
  )
}

export function CampaignsOverview({ counters, isLoading }: CampaignsOverviewProps) {
  if (isLoading || !counters) {
    return (
      <div className="flex min-h-[calc(100svh-8rem)] items-center justify-center">
        <Loader2 className="text-muted-foreground/40 h-6 w-6 animate-spin" />
      </div>
    )
  }

  return (
    <div className="space-y-6 px-6 pt-6 pb-8">
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <StatCard label="Total" value={counters.total} icon={Send} />
        <StatCard
          label="Em andamento"
          value={counters.processing + counters.scheduled}
          icon={Loader2}
        />
        <StatCard
          label="Pendentes"
          value={counters.pendingApproval + counters.draft}
          icon={Clock}
        />
        <StatCard label="Concluídas" value={counters.completed} icon={CheckCircle2} />
      </div>

      {counters.cancelled > 0 && (
        <div className="flex items-center gap-2">
          <FileText className="text-muted-foreground h-3.5 w-3.5" />
          <p className="text-muted-foreground text-xs">
            {counters.cancelled} campanha{counters.cancelled !== 1 ? 's' : ''} cancelada{counters.cancelled !== 1 ? 's' : ''}
          </p>
        </div>
      )}
    </div>
  )
}
