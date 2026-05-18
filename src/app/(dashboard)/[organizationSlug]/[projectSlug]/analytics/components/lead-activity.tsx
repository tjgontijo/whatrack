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

  if (isLoading) return <div className='h-32 w-full animate-pulse rounded-xl border bg-card' />
  if (error || !data) return null

  return (
    <div className='grid grid-cols-1 gap-6 md:grid-cols-2'>
      {/* Waiting Leads */}
      <div className='flex w-full flex-col overflow-hidden rounded-xl border bg-card p-4 shadow-sm'>
        <div className='mb-4 flex items-center justify-between'>
          <h3 className='font-bold text-muted-foreground text-sm uppercase tracking-wider'>
            Leads Aguardando Resposta
          </h3>
          <Badge className='bg-amber-500/10 text-amber-600 hover:bg-amber-500/20'>
            {data.waitingLeads?.length || 0} Deals
          </Badge>
        </div>
        <div className='flex max-h-64 min-h-0 flex-1 flex-col gap-2 overflow-y-auto rounded-md bg-background/50 p-2'>
          {data.waitingLeads?.map((lead: any) => (
            <div
              key={lead.id}
              className='flex items-center justify-between rounded-lg border bg-card p-3 text-sm'
            >
              <div className='flex flex-col'>
                <span className='font-semibold'>{lead.push_name || lead.name || 'Sem Nome'}</span>
                <span className='text-muted-foreground text-xs'>{lead.phone || '-'}</span>
              </div>
              <div className='flex flex-col items-end'>
                <div className='flex items-center gap-2'>
                  <div className='h-2 w-2 animate-pulse rounded-full bg-green-500' />
                  <span className='font-bold'>{Math.floor(lead.seconds_waiting / 60)} min</span>
                </div>
                <span className='mt-1 rounded bg-secondary px-1 py-0.5 text-[10px] text-muted-foreground'>
                  {lead.stage_name}
                </span>
              </div>
            </div>
          ))}
          {data.waitingLeads?.length === 0 && (
            <p className='p-6 text-center text-muted-foreground text-sm'>
              Nenhum lead esperando :)
            </p>
          )}
        </div>
      </div>

      {/* Forgotten Leads */}
      <div className='flex w-full flex-col overflow-hidden rounded-xl border bg-card p-4 shadow-sm'>
        <div className='mb-4 flex items-center justify-between'>
          <h3 className='font-bold text-muted-foreground text-sm uppercase tracking-wider'>
            Leads Esquecidos (+24h)
          </h3>
          <Badge className='bg-red-500/10 text-red-600 hover:bg-red-500/20'>
            {data.forgottenLeads?.length || 0} Abandonados
          </Badge>
        </div>
        <div className='flex max-h-64 min-h-0 flex-1 flex-col gap-2 overflow-y-auto rounded-md bg-background/50 p-2'>
          {data.forgottenLeads?.map((lead: any) => (
            <div
              key={lead.id}
              className='flex items-center justify-between rounded-lg border border-red-100 bg-card p-3 text-sm'
            >
              <div className='flex flex-col'>
                <span className='font-semibold'>{lead.name || 'Sem Nome'}</span>
                <span className='text-muted-foreground text-xs'>{lead.phone || '-'}</span>
              </div>
              <div className='flex flex-col items-end'>
                <span className='font-bold text-red-600'>{lead.hours_since_outbound} horas</span>
                <span className='mt-1 rounded bg-secondary px-1 py-0.5 text-[10px] text-muted-foreground'>
                  Esquecido
                </span>
              </div>
            </div>
          ))}
          {data.forgottenLeads?.length === 0 && (
            <p className='p-6 text-center text-muted-foreground text-sm'>
              Nenhum lead esquecido! Ótimo trabalho.
            </p>
          )}
        </div>
      </div>
    </div>
  )
}
