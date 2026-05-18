'use client'

import { useQuery } from '@tanstack/react-query'
import { Calendar, Filter, MoreVertical, PieChart } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { useRequiredProjectRouteContext } from '@/features/projects/hooks/use-project-route-context'
import { apiFetch } from '@/lib/http/api-client'

export function AudienceSegmentsTab() {
  const { organizationId, projectId } = useRequiredProjectRouteContext()

  const { data: segments, isLoading } = useQuery<any[]>({
    queryKey: ['audience-segments', organizationId, projectId],
    queryFn: () =>
      apiFetch(`/api/v1/whatsapp/audiences/segments`, { orgId: organizationId, projectId }),
    enabled: !!organizationId && !!projectId,
  })

  if (isLoading) {
    return (
      <div className='grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3'>
        {[1, 2, 3].map((i) => (
          <Skeleton key={i} className='h-40 w-full' />
        ))}
      </div>
    )
  }

  if (!segments?.length) {
    return (
      <div className='flex flex-col items-center justify-center rounded-xl border border-dashed bg-muted/20 py-20'>
        <div className='mb-6 rounded-full bg-primary/10 p-4'>
          <Filter className='h-10 w-10 text-primary' />
        </div>
        <h3 className='mb-2 font-semibold text-xl'>Configure seu primeiro segmento dinâmico</h3>
        <p className='max-w-sm px-6 text-center text-muted-foreground text-sm'>
          Crie filtros automáticos de CRM baseados em tags, estágios do funil e tempo de permanência
          no funil.
        </p>
      </div>
    )
  }

  return (
    <div className='grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3'>
      {segments.map((segment) => (
        <Card
          key={segment.id}
          className='group relative overflow-hidden transition-all hover:border-primary/30 hover:ring-2 hover:ring-primary/20'
        >
          <CardHeader className='border-b bg-muted/5 pb-3'>
            <div className='flex items-start justify-between'>
              <div className='space-y-1'>
                <CardTitle className='max-w-[200px] truncate font-semibold text-base'>
                  {segment.name}
                </CardTitle>
                <div className='flex items-center gap-1.5 text-muted-foreground text-xs'>
                  <PieChart className='h-3 w-3' />
                  <span>Segmento Dinâmico</span>
                </div>
              </div>
              <Button variant='ghost' size='icon-sm' className='-mt-1 -mr-1 h-8 w-8'>
                <MoreVertical className='h-4 w-4' />
              </Button>
            </div>
          </CardHeader>
          <CardContent className='p-4'>
            <div className='mb-4 flex flex-wrap gap-1.5'>
              {Object.keys(segment.filters || {}).length > 0 ? (
                Object.keys(segment.filters).map((k) => (
                  <span
                    key={k}
                    className='rounded-full border bg-sidebar-accent px-2 py-0.5 font-medium text-[10px]'
                  >
                    {k}: {JSON.stringify(segment.filters[k])}
                  </span>
                ))
              ) : (
                <span className='text-muted-foreground text-xs italic'>
                  Sem filtros configurados
                </span>
              )}
            </div>
            <div className='flex items-center justify-between text-muted-foreground text-xs'>
              <div className='flex items-center gap-1.5'>
                <Calendar className='h-3.5 w-3.5' />
                <span>{new Intl.DateTimeFormat('pt-BR').format(new Date(segment.createdAt))}</span>
              </div>
              <div className='flex items-center gap-1.5'>
                <span className='rounded bg-green-500/10 px-1.5 py-0.5 text-green-600'>
                  Auto-sync
                </span>
              </div>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  )
}
