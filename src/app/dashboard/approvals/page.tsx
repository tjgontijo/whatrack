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
        }
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
        }
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
        }
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
            <div className="flex flex-col items-center justify-center min-h-[400px] gap-3">
                <RefreshCw className="h-8 w-8 animate-spin text-primary/40" />
                <p className="text-sm font-medium text-muted-foreground">Analizando sugestões da IA...</p>
            </div>
        )
    }

    return (
        <div className="p-6 max-w-5xl mx-auto space-y-6">
            <div>
                <h1 className="text-2xl font-bold tracking-tight mb-2 flex items-center gap-2">
                    <Sparkles className="h-6 w-6 text-primary" /> Aprovações do Copilot IA
                </h1>
                <p className="text-muted-foreground">
                    O Mastra AI lê as conversas, detecta as vendas e deixa pré-pronto aqui. Apenas clique em Aprovar para nutrir o Pixel do Meta Ads.
                </p>
            </div>

            {insights?.length === 0 ? (
                <div className="text-center py-20 border border-dashed rounded-lg bg-muted/20">
                    <Inbox className="h-10 w-10 text-muted-foreground mx-auto mb-4 opacity-50" />
                    <h3 className="text-lg font-medium text-foreground">Nenhuma sugestão por enquanto</h3>
                    <p className="text-muted-foreground mt-2 max-w-sm mx-auto">
                        Sua IA está analisando conversas novas. Sugestões de aprovação vão aparecer aqui.
                    </p>
                </div>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {insights?.map((approval: any) => {
                        const lead = approval.ticket?.conversation?.lead
                        const confidencePercent = (approval.confidence * 100).toFixed(0)

                        return (
                            <Card key={approval.id} className="relative overflow-hidden border-2 border-primary/20 bg-primary/5 shadow-sm">
                                <CardContent className="p-5">
                                    <div className="flex items-start justify-between mb-4 gap-4">
                                        <div className="flex items-center gap-3">
                                            <Avatar className="h-12 w-12 border bg-background shadow-sm">
                                                <AvatarImage src={lead?.profilePicUrl} />
                                                <AvatarFallback className="uppercase font-semibold text-primary">
                                                    {lead?.name?.substring(0, 2) || 'CL'}
                                                </AvatarFallback>
                                            </Avatar>
                                            <div>
                                                <h3 className="font-bold">{lead?.name || 'Cliente'}</h3>
                                                <p className="text-sm text-muted-foreground flex items-center gap-1">
                                                    <MessageSquare className="h-3 w-3" />
                                                    Há {format(new Date(approval.createdAt), "HH:mm", { locale: ptBR })}
                                                </p>
                                            </div>
                                        </div>
                                        <Badge className="bg-green-100 text-green-800 hover:bg-green-100 uppercase tracking-widest text-[10px]">
                                            {confidencePercent}% certeza
                                        </Badge>
                                    </div>

                                    <div className="space-y-3 mb-5">
                                        <div className="flex justify-between items-center bg-background/80 p-3 rounded-lg border shadow-sm">
                                            <div>
                                                <p className="text-[10px] uppercase text-muted-foreground font-semibold mb-0.5">Procedimento / Produto</p>
                                                <p className="font-medium text-sm">{approval.productName || 'Não especificado'}</p>
                                            </div>
                                            <div className="text-right">
                                                <p className="text-[10px] uppercase text-muted-foreground font-semibold mb-0.5">Valor do Deal</p>
                                                <p className="font-bold text-green-600 text-sm">{formatDealValue(approval.dealValue)}</p>
                                            </div>
                                        </div>

                                        <div className="bg-background/50 rounded-lg p-3 border border-border/50 text-xs text-muted-foreground leading-relaxed">
                                            <p className="text-sm italic text-muted-foreground mt-2 bg-muted/30 p-2 rounded line-clamp-2">
                                                "{(approval.payload as any)?.reasoning || 'Insight gerado...'}"
                                            </p>
                                        </div>
                                    </div>
                                </CardContent>
                                <CardFooter className="pt-4 border-t flex items-center justify-between gap-2">
                                    <Button
                                        variant="outline"
                                        size="sm"
                                        className="flex-1 text-destructive hover:text-destructive hover:bg-destructive/10"
                                        onClick={() => rejectMutation.mutate(approval.id)}
                                        disabled={approveMutation.isPending || rejectMutation.isPending}
                                    >
                                        <X className="w-4 h-4 mr-2" /> Descartar
                                    </Button>
                                    <Button
                                        size="sm"
                                        className="flex-1"
                                        onClick={() => approveMutation.mutate(approval.id)}
                                        disabled={approveMutation.isPending || rejectMutation.isPending}
                                    >
                                        <Check className="w-4 h-4 mr-2" /> Aplicar
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
