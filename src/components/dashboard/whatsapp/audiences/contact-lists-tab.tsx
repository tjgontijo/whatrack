'use client'

import React from 'react'
import { useQuery } from '@tanstack/react-query'
import { apiFetch } from '@/lib/api-client'
import { useRequiredProjectRouteContext } from '@/hooks/project/project-route-context'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { Users, MoreVertical, Calendar } from 'lucide-react'
import { Button } from '@/components/ui/button'

export function ContactListsTab() {
  const { organizationId, projectId } = useRequiredProjectRouteContext()

  const { data: lists, isLoading } = useQuery<any[]>({
    queryKey: ['whatsapp-contact-lists', organizationId, projectId],
    queryFn: () => apiFetch(`/api/v1/whatsapp/audiences/lists`, { orgId: organizationId, projectId }),
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

  if (!lists?.length) {
    return (
      <div className="flex flex-col items-center justify-center py-20 border rounded-xl border-dashed bg-muted/20">
        <div className="bg-primary/10 p-4 rounded-full mb-6">
          <Users className="h-10 w-10 text-primary" />
        </div>
        <h3 className="text-xl font-semibold mb-2">Configure sua primeira lista</h3>
        <p className="text-sm text-muted-foreground text-center max-w-sm px-6">
          Importe contatos via CSV ou cadastre manualmente para criar públicos segmentados para suas campanhas.
        </p>
      </div>
    )
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
      {lists.map((list) => (
        <Card key={list.id} className="group relative overflow-hidden transition-all hover:ring-2 hover:ring-primary/20 hover:border-primary/30">
          <CardHeader className="pb-3">
            <div className="flex items-start justify-between">
              <div className="space-y-1">
                <CardTitle className="text-base font-semibold truncate max-w-[200px]">{list.name}</CardTitle>
                <CardDescription className="line-clamp-2 text-xs min-h-[2rem]">
                  {list.description || 'Sem descrição.'}
                </CardDescription>
              </div>
              <Button variant="ghost" size="icon-sm" className="h-8 w-8 -mt-1 -mr-1">
                <MoreVertical className="h-4 w-4" />
              </Button>
            </div>
          </CardHeader>
          <CardContent>
             <div className="flex items-center justify-between text-xs text-muted-foreground">
               <div className="flex items-center gap-1.5">
                  <Users className="h-3.5 w-3.5" />
                  <span className="font-medium text-foreground">{list._count?.members || 0} contatos</span>
               </div>
               <div className="flex items-center gap-1.5">
                  <Calendar className="h-3.5 w-3.5" />
                  <span>{new Intl.DateTimeFormat('pt-BR').format(new Date(list.createdAt))}</span>
               </div>
             </div>
          </CardContent>
        </Card>
      ))}
    </div>
  )
}
