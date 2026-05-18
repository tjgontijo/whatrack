'use client'

import { useQuery, useQueryClient } from '@tanstack/react-query'
import { MoreHorizontal, Tag as TagIcon } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { useRequiredProjectRouteContext } from '@/features/projects/hooks/use-project-route-context'
import { apiFetch } from '@/lib/http/api-client'

export function LeadTagsTab() {
  const { organizationId, projectId } = useRequiredProjectRouteContext()
  const _queryClient = useQueryClient()

  const { data: tags, isLoading } = useQuery<any[]>({
    queryKey: ['lead-tags', organizationId, projectId],
    queryFn: () => apiFetch(`/api/v1/whatsapp/tags`, { orgId: organizationId, projectId }),
    enabled: !!organizationId && !!projectId,
  })

  if (isLoading) {
    return (
      <div className='grid grid-cols-1 gap-4 md:grid-cols-3'>
        {[1, 2, 3].map((i) => (
          <Skeleton key={i} className='h-24 w-full' />
        ))}
      </div>
    )
  }

  if (!tags?.length) {
    return (
      <div className='flex flex-col items-center justify-center rounded-lg border border-dashed py-12'>
        <TagIcon className='mb-4 h-12 w-12 text-muted-foreground/50' />
        <h3 className='font-medium text-lg'>Nenhuma tag criada</h3>
        <p className='text-muted-foreground text-sm'>Crie tags para organizar seus leads no CRM.</p>
      </div>
    )
  }

  return (
    <div className='grid grid-cols-1 gap-4 md:grid-cols-3 xl:grid-cols-4'>
      {tags.map((tag) => (
        <Card
          key={tag.id}
          className='overflow-hidden transition-colors hover:border-sidebar-accent'
        >
          <CardContent className='flex items-center justify-between p-4'>
            <div className='flex items-center gap-3'>
              <div
                className='h-3 w-3 rounded-full'
                style={{ backgroundColor: tag.color || '#94a3b8' }}
              />
              <span className='font-medium text-sm'>{tag.name}</span>
            </div>
            <Button variant='ghost' size='icon-sm' className='h-8 w-8'>
              <MoreHorizontal className='h-4 w-4' />
            </Button>
          </CardContent>
        </Card>
      ))}
    </div>
  )
}
