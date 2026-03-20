'use client'

import { useQuery } from '@tanstack/react-query'
import { Badge } from '@/components/ui/badge'

export default function LeadActivity() {
  const { data, isLoading, error } = useQuery({
    queryKey: ['analytics', 'lead-activity'],
    queryFn: async () => {
      const res = await fetch(`/api/v1/analytics/lead-activity`)
      if (!res.ok) throw new Error('Falha ao buscar atividades')
      return res.json()
    },
  })

  if (isLoading) return <div className="bg-card h-32 w-full animate-pulse rounded-xl border" />
  if (error || !data) return null

  return (
    <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
      {/* Waiting Leads */}
      <div className="bg-card flex w-full flex-col overflow-hidden rounded-xl border p-4 shadow-sm">
        <div className="mb-4 flex items-center justify-between">
          <h3 className="text-muted-foreground text-sm font-bold uppercase tracking-wider">
            Leads Aguardando Resposta
          </h3>
          <Badge className="bg-amber-500/10 text-amber-600 hover:bg-amber-500/20">
            {data.waitingLeads?.length || 0} Tickets
          </Badge>
        </div>
        <div className="bg-background/50 flex max-h-64 min-h-0 flex-1 flex-col gap-2 overflow-y-auto rounded-md p-2">
          {data.waitingLeads?.map((lead: any) => (
            <div
              key={lead.id}
              className="bg-card flex items-center justify-between rounded-lg border p-3 text-sm"
            >
              <div className="flex flex-col">
                <span className="font-semibold">{lead.push_name || lead.name || 'Sem Nome'}</span>
                <span className="text-muted-foreground text-xs">{lead.phone || '-'}</span>
              </div>
              <div className="flex flex-col items-end">
                <div className="flex items-center gap-2">
                  <div className="h-2 w-2 animate-pulse rounded-full bg-green-500" />
                  <span className="font-bold">{Math.floor(lead.seconds_waiting / 60)} min</span>
                </div>
                <span className="text-muted-foreground bg-secondary mt-1 rounded px-1 py-0.5 text-[10px]">
                  {lead.stage_name}
                </span>
              </div>
            </div>
          ))}
          {data.waitingLeads?.length === 0 && (
            <p className="text-muted-foreground p-6 text-center text-sm">
              Nenhum lead esperando :)
            </p>
          )}
        </div>
      </div>

      {/* Forgotten Leads */}
      <div className="bg-card flex w-full flex-col overflow-hidden rounded-xl border p-4 shadow-sm">
        <div className="mb-4 flex items-center justify-between">
          <h3 className="text-muted-foreground text-sm font-bold uppercase tracking-wider">
            Leads Esquecidos (+24h)
          </h3>
          <Badge className="bg-red-500/10 text-red-600 hover:bg-red-500/20">
            {data.forgottenLeads?.length || 0} Abandonados
          </Badge>
        </div>
        <div className="bg-background/50 flex max-h-64 min-h-0 flex-1 flex-col gap-2 overflow-y-auto rounded-md p-2">
          {data.forgottenLeads?.map((lead: any) => (
            <div
              key={lead.id}
              className="bg-card flex items-center justify-between rounded-lg border border-red-100 p-3 text-sm"
            >
              <div className="flex flex-col">
                <span className="font-semibold">{lead.name || 'Sem Nome'}</span>
                <span className="text-muted-foreground text-xs">{lead.phone || '-'}</span>
              </div>
              <div className="flex flex-col items-end">
                <span className="font-bold text-red-600">{lead.hours_since_outbound} horas</span>
                <span className="text-muted-foreground bg-secondary mt-1 rounded px-1 py-0.5 text-[10px]">
                  Esquecido
                </span>
              </div>
            </div>
          ))}
          {data.forgottenLeads?.length === 0 && (
            <p className="text-muted-foreground p-6 text-center text-sm">
              Nenhum lead esquecido! Ótimo trabalho.
            </p>
          )}
        </div>
      </div>
    </div>
  )
}
