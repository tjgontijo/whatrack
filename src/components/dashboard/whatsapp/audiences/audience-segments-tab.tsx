'use client'

import React from 'react'
import { useQuery } from '@tanstack/react-query'
import { apiFetch } from '@/lib/api-client'
import { useRequiredProjectRouteContext } from '@/hooks/project/project-route-context'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { Filter, MoreVertical, Calendar, PieChart } from 'lucide-react'
import { Button } from '@/components/ui/button'

export function AudienceSegmentsTab() {
  const { organizationId, projectId } = useRequiredProjectRouteContext()

  const { data: segments, isLoading } = useQuery<any[]>({
    queryKey: ['audience-segments', organizationId, projectId],
    queryFn: () => apiFetch(`/api/v1/whatsapp/audiences/segments`, { orgId: organizationId, projectId }),
    enabled: !!organizationId && !!projectId,
  })

  if (isLoading) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {[1, 2, 3].map((i) => (
          <Skeleton key={i} className="h-40 w-full" />
        ))}
      </div>
    )
  }

  if (!segments?.length) {
    return (
      <div className="flex flex-col items-center justify-center py-20 border rounded-xl border-dashed bg-muted/20">
        <div className="bg-primary/10 p-4 rounded-full mb-6">
          <Filter className="h-10 w-10 text-primary" />
        </div>
        <h3 className="text-xl font-semibold mb-2">Configure seu primeiro segmento dinâmico</h3>
        <p className="text-sm text-muted-foreground text-center max-w-sm px-6">
           Crie filtros automáticos de CRM baseados em tags, estágios do funil e tempo de permanência no funil.
        </p>
      </div>
    )
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
      {segments.map((segment) => (
        <Card key={segment.id} className="group relative overflow-hidden transition-all hover:ring-2 hover:ring-primary/20 hover:border-primary/30">
          <CardHeader className="pb-3 border-b bg-muted/5">
            <div className="flex items-start justify-between">
              <div className="space-y-1">
                <CardTitle className="text-base font-semibold truncate max-w-[200px]">{segment.name}</CardTitle>
                <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                   <PieChart className="h-3 w-3" />
                   <span>Segmento Dinâmico</span>
                </div>
              </div>
              <Button variant="ghost" size="icon-sm" className="h-8 w-8 -mt-1 -mr-1">
                 <MoreVertical className="h-4 w-4" />
              </Button>
            </div>
          </CardHeader>
          <CardContent className="p-4">
             <div className="flex flex-wrap gap-1.5 mb-4">
                {Object.keys(segment.filters || {}).length > 0 ? (
                  Object.keys(segment.filters).map((k) => (
                    <span key={k} className="px-2 py-0.5 rounded-full bg-sidebar-accent text-[10px] font-medium border">
                      {k}: {JSON.stringify(segment.filters[k])}
                    </span>
                  ))
                ) : (
                  <span className="text-xs text-muted-foreground italic">Sem filtros configurados</span>
                )}
             </div>
             <div className="flex items-center justify-between text-xs text-muted-foreground">
               <div className="flex items-center gap-1.5">
                  <Calendar className="h-3.5 w-3.5" />
                  <span>{new Intl.DateTimeFormat('pt-BR').format(new Date(segment.createdAt))}</span>
               </div>
               <div className="flex items-center gap-1.5">
                  <span className="px-1.5 py-0.5 bg-green-500/10 text-green-600 rounded">Auto-sync</span>
               </div>
             </div>
          </CardContent>
        </Card>
      ))}
    </div>
  )
}
