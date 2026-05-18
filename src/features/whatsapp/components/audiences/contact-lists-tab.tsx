'use client'

import { useQuery } from '@tanstack/react-query'
import { Calendar, MoreVertical, Users } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { useRequiredProjectRouteContext } from '@/features/projects/hooks/use-project-route-context'
import { apiFetch } from '@/lib/http/api-client'

export function ContactListsTab() {
  const { organizationId, projectId } = useRequiredProjectRouteContext()

  const { data: lists, isLoading } = useQuery<any[]>({
    queryKey: ['whatsapp-contact-lists', organizationId, projectId],
    queryFn: () =>
      apiFetch(`/api/v1/whatsapp/audiences/lists`, { orgId: organizationId, projectId }),
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

  if (!lists?.length) {
    return (
      <div className='flex flex-col items-center justify-center rounded-xl border border-dashed bg-muted/20 py-20'>
        <div className='mb-6 rounded-full bg-primary/10 p-4'>
          <Users className='h-10 w-10 text-primary' />
        </div>
        <h3 className='mb-2 font-semibold text-xl'>Configure sua primeira lista</h3>
        <p className='max-w-sm px-6 text-center text-muted-foreground text-sm'>
          Importe contatos via CSV ou cadastre manualmente para criar públicos segmentados para suas
          campanhas.
        </p>
      </div>
    )
  }

  return (
    <div className='grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3'>
      {lists.map((list) => (
        <Card
          key={list.id}
          className='group relative overflow-hidden transition-all hover:border-primary/30 hover:ring-2 hover:ring-primary/20'
        >
          <CardHeader className='pb-3'>
            <div className='flex items-start justify-between'>
              <div className='space-y-1'>
                <CardTitle className='max-w-[200px] truncate font-semibold text-base'>
                  {list.name}
                </CardTitle>
                <CardDescription className='line-clamp-2 min-h-[2rem] text-xs'>
                  {list.description || 'Sem descrição.'}
                </CardDescription>
              </div>
              <Button variant='ghost' size='icon-sm' className='-mt-1 -mr-1 h-8 w-8'>
                <MoreVertical className='h-4 w-4' />
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            <div className='flex items-center justify-between text-muted-foreground text-xs'>
              <div className='flex items-center gap-1.5'>
                <Users className='h-3.5 w-3.5' />
                <span className='font-medium text-foreground'>
                  {list._count?.members || 0} contatos
                </span>
              </div>
              <div className='flex items-center gap-1.5'>
                <Calendar className='h-3.5 w-3.5' />
                <span>{new Intl.DateTimeFormat('pt-BR').format(new Date(list.createdAt))}</span>
              </div>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  )
}
