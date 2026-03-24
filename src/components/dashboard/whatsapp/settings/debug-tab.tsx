'use client'

import { useQuery } from '@tanstack/react-query'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Copy, Loader2 } from 'lucide-react'
import { useRequiredProjectRouteContext } from '@/hooks/project/project-route-context'
import { ORGANIZATION_HEADER } from '@/lib/constants/http-headers'
import { toast } from 'sonner'
import { ScrollArea } from '@/components/ui/scroll-area'

export function DebugTab() {
  const { organizationId, projectId } = useRequiredProjectRouteContext()

  const { data, isLoading, error } = useQuery({
    queryKey: ['whatsapp', 'debug', projectId],
    queryFn: async () => {
      const res = await fetch(`/api/v1/whatsapp/debug?projectId=${projectId}`, {
        headers: { [ORGANIZATION_HEADER]: organizationId },
      })
      if (!res.ok) throw new Error('Falha ao buscar dados de debug')
      return res.json()
    },
    enabled: !!projectId && !!organizationId,
  })

  const copyToClipboard = () => {
    if (!data) return
    navigator.clipboard.writeText(JSON.stringify(data, null, 2))
    toast.success('Dados copiados para a área de transferência')
  }

  if (isLoading) {
    return (
      <div className="flex justify-center p-8">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    )
  }

  if (error) {
    return (
      <div className="p-8 text-center text-red-500">
        Erro ao carregar os dados de debug.
      </div>
    )
  }

  return (
    <Card className="flex flex-col h-[calc(100vh-200px)]">
      <div className="flex items-center justify-between border-b px-4 py-3">
        <h3 className="font-semibold text-sm">WhatsApp DB State</h3>
        <Button size="sm" variant="outline" onClick={copyToClipboard} className="h-8 gap-2">
          <Copy className="h-3.5 w-3.5" />
          Copiar Tudo
        </Button>
      </div>
      <ScrollArea className="flex-1 overflow-auto bg-slate-950 p-4">
        <pre className="text-xs text-green-400 font-mono whitespace-pre-wrap break-all">
          {JSON.stringify(data, null, 2)}
        </pre>
      </ScrollArea>
    </Card>
  )
}
