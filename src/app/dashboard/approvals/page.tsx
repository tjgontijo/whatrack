'use client'

import React from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Check, X, Sparkles, MessageSquare, Megaphone, Inbox } from 'lucide-react'
import { toast } from 'sonner'
import { format } from 'date-fns'
import { ptBR } from 'date-fns/locale'

import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from '@/components/ui/card'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Badge } from '@/components/ui/badge'
import { RefreshCw } from 'lucide-react'

export default function ApprovalsPage() {
  const queryClient = useQueryClient()

  const { data: insights, isLoading } = useQuery({
    queryKey: ['ai-insights', 'SUGGESTION'],
    queryFn: async () => {
      const res = await fetch('/api/v1/ai-insights?status=SUGGESTION')
      if (!res.ok) throw new Error('Falha ao carregar as sugestões da IA.')
      const data = await res.json()
      return data.items || []
    },
  })

  const approveMutation = useMutation({
    mutationFn: async (id: string) => {
      const res = await fetch(`/api/v1/ai-insights/${id}/approve`, { method: 'PATCH' })
      if (!res.ok) throw new Error('Falha ao aprovar a venda.')
      return res.json()
    },
    onSuccess: () => {
      toast.success('Venda Aprovada! O Meta Ads foi notificado via CAPI.')
      queryClient.invalidateQueries({ queryKey: ['ai-insights'] })
    },
    onError: () => {
      toast.error('Erro ao aprovar a venda.')
    },
  })

  const rejectMutation = useMutation({
    mutationFn: async (id: string) => {
      const res = await fetch(`/api/v1/ai-insights/${id}/reject`, { method: 'PATCH' })
      if (!res.ok) throw new Error('Falha ao descartar a sugestão.')
      return res.json()
    },
    onSuccess: () => {
      toast.info('Sugestão da IA descartada.')
      queryClient.invalidateQueries({ queryKey: ['ai-insights'] })
    },
    onError: () => {
      toast.error('Erro ao descartar a sugestão.')
    },
  })

  const formatDealValue = (value: any): string => {
    if (!value) return 'Sem valor'
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
    }).format(Number(value))
  }

  if (isLoading) {
    return (
      <div className="flex min-h-[400px] flex-col items-center justify-center gap-3">
        <RefreshCw className="text-primary/40 h-8 w-8 animate-spin" />
        <p className="text-muted-foreground text-sm font-medium">Analizando sugestões da IA...</p>
      </div>
    )
  }

  return (
    <div className="mx-auto max-w-5xl space-y-6 p-6">
      <div>
        <h1 className="mb-2 flex items-center gap-2 text-2xl font-bold tracking-tight">
          <Sparkles className="text-primary h-6 w-6" /> Aprovações do Copilot IA
        </h1>
        <p className="text-muted-foreground">
          O Mastra AI lê as conversas, detecta as vendas e deixa pré-pronto aqui. Apenas clique em
          Aprovar para nutrir o Pixel do Meta Ads.
        </p>
      </div>

      {insights?.length === 0 ? (
        <div className="bg-muted/20 rounded-lg border border-dashed py-20 text-center">
          <Inbox className="text-muted-foreground mx-auto mb-4 h-10 w-10 opacity-50" />
          <h3 className="text-foreground text-lg font-medium">Nenhuma sugestão por enquanto</h3>
          <p className="text-muted-foreground mx-auto mt-2 max-w-sm">
            Sua IA está analisando conversas novas. Sugestões de aprovação vão aparecer aqui.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
          {insights?.map((approval: any) => {
            const lead = approval.ticket?.conversation?.lead
            const confidencePercent = (approval.confidence * 100).toFixed(0)

            return (
              <Card
                key={approval.id}
                className="border-primary/20 bg-primary/5 relative overflow-hidden border-2 shadow-sm"
              >
                <CardContent className="p-5">
                  <div className="mb-4 flex items-start justify-between gap-4">
                    <div className="flex items-center gap-3">
                      <Avatar className="bg-background h-12 w-12 border shadow-sm">
                        <AvatarImage src={lead?.profilePicUrl} />
                        <AvatarFallback className="text-primary font-semibold uppercase">
                          {lead?.name?.substring(0, 2) || 'CL'}
                        </AvatarFallback>
                      </Avatar>
                      <div>
                        <h3 className="font-bold">{lead?.name || 'Cliente'}</h3>
                        <p className="text-muted-foreground flex items-center gap-1 text-sm">
                          <MessageSquare className="h-3 w-3" />
                          Há {format(new Date(approval.createdAt), 'HH:mm', { locale: ptBR })}
                        </p>
                      </div>
                    </div>
                    <Badge className="bg-green-100 text-[10px] uppercase tracking-widest text-green-800 hover:bg-green-100">
                      {confidencePercent}% certeza
                    </Badge>
                  </div>

                  <div className="mb-5 space-y-3">
                    <div className="bg-background/80 flex items-center justify-between rounded-lg border p-3 shadow-sm">
                      <div>
                        <p className="text-muted-foreground mb-0.5 text-[10px] font-semibold uppercase">
                          Procedimento / Produto
                        </p>
                        <p className="text-sm font-medium">
                          {approval.productName || 'Não especificado'}
                        </p>
                      </div>
                      <div className="text-right">
                        <p className="text-muted-foreground mb-0.5 text-[10px] font-semibold uppercase">
                          Valor do Deal
                        </p>
                        <p className="text-sm font-bold text-green-600">
                          {formatDealValue(approval.dealValue)}
                        </p>
                      </div>
                    </div>

                    <div className="bg-background/50 border-border/50 text-muted-foreground rounded-lg border p-3 text-xs leading-relaxed">
                      <p className="text-muted-foreground bg-muted/30 mt-2 line-clamp-2 rounded p-2 text-sm italic">
                        "{(approval.payload as any)?.reasoning || 'Insight gerado...'}"
                      </p>
                    </div>
                  </div>
                </CardContent>
                <CardFooter className="flex items-center justify-between gap-2 border-t pt-4">
                  <Button
                    variant="outline"
                    size="sm"
                    className="text-destructive hover:text-destructive hover:bg-destructive/10 flex-1"
                    onClick={() => rejectMutation.mutate(approval.id)}
                    disabled={approveMutation.isPending || rejectMutation.isPending}
                  >
                    <X className="mr-2 h-4 w-4" /> Descartar
                  </Button>
                  <Button
                    size="sm"
                    className="flex-1"
                    onClick={() => approveMutation.mutate(approval.id)}
                    disabled={approveMutation.isPending || rejectMutation.isPending}
                  >
                    <Check className="mr-2 h-4 w-4" /> Aplicar
                  </Button>
                </CardFooter>
              </Card>
            )
          })}
        </div>
      )}
    </div>
  )
}
