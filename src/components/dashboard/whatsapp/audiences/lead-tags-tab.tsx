'use client'

import React from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { apiFetch } from '@/lib/api-client'
import { useRequiredProjectRouteContext } from '@/hooks/project/project-route-context'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import { Tag as TagIcon, MoreHorizontal } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { toast } from 'sonner'

export function LeadTagsTab() {
  const { organizationId } = useRequiredProjectRouteContext()
  const queryClient = useQueryClient()

  const { data: tags, isLoading } = useQuery<any[]>({
    queryKey: ['lead-tags', organizationId],
    queryFn: () => apiFetch(`/api/v1/whatsapp/tags`, { orgId: organizationId }),
    enabled: !!organizationId,
  })

  if (isLoading) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {[1, 2, 3].map((i) => (
          <Skeleton key={i} className="h-24 w-full" />
        ))}
      </div>
    )
  }

  if (!tags?.length) {
    return (
      <div className="flex flex-col items-center justify-center py-12 border rounded-lg border-dashed">
        <TagIcon className="h-12 w-12 text-muted-foreground/50 mb-4" />
        <h3 className="text-lg font-medium">Nenhuma tag criada</h3>
        <p className="text-sm text-muted-foreground">Crie tags para organizar seus leads no CRM.</p>
      </div>
    )
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-3 xl:grid-cols-4 gap-4">
      {tags.map((tag) => (
        <Card key={tag.id} className="overflow-hidden hover:border-sidebar-accent transition-colors">
          <CardContent className="p-4 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div 
                className="h-3 w-3 rounded-full" 
                style={{ backgroundColor: tag.color || '#94a3b8' }} 
              />
              <span className="font-medium text-sm">{tag.name}</span>
            </div>
            <Button variant="ghost" size="icon-sm" className="h-8 w-8">
              <MoreHorizontal className="h-4 w-4" />
            </Button>
          </CardContent>
        </Card>
      ))}
    </div>
  )
}
