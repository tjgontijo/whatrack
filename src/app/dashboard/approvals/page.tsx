'use client'

import React from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Check, X, Sparkles, MessageSquare, Megaphone } from 'lucide-react'
import { toast } from 'sonner'
import { format } from 'date-fns'
import { ptBR } from 'date-fns/locale'

import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'

export default function ApprovalsPage() {
    const queryClient = useQueryClient()

    const { data: approvalsData, isLoading } = useQuery({
        queryKey: ['ai-approvals', 'PENDING'],
        queryFn: async () => {
            const res = await fetch('/api/v1/ai-approvals?status=PENDING')
            if (!res.ok) throw new Error('Falha ao carregar as aprovações pendentes.')
            return res.json()
        }
    })

    const approveMutation = useMutation({
        mutationFn: async (id: string) => {
            const res = await fetch(`/api/v1/ai-approvals/${id}/approve`, { method: 'PATCH' })
            if (!res.ok) throw new Error('Falha ao aprovar a venda.')
            return res.json()
        },
        onSuccess: () => {
            toast.success('Venda Aprovada! O Meta Ads foi notificado via CAPI.')
            queryClient.invalidateQueries({ queryKey: ['ai-approvals'] })
        },
        onError: () => {
            toast.error('Erro ao aprovar a venda.')
        }
    })

    const rejectMutation = useMutation({
        mutationFn: async (id: string) => {
            const res = await fetch(`/api/v1/ai-approvals/${id}/reject`, { method: 'PATCH' })
            if (!res.ok) throw new Error('Falha ao descartar a sugestão.')
            return res.json()
        },
        onSuccess: () => {
            toast.info('Sugestão da IA descartada.')
            queryClient.invalidateQueries({ queryKey: ['ai-approvals'] })
        },
        onError: () => {
            toast.error('Erro ao descartar a sugestão.')
        }
    })

    const approvals = approvalsData?.items || []

    const formatDealValue = (value: any): string => {
        if (!value) return 'Sem valor'
        return new Intl.NumberFormat('pt-BR', {
            style: 'currency',
            currency: 'BRL',
        }).format(Number(value))
    }

    if (isLoading) {
        return (
            <div className="p-6 max-w-5xl mx-auto space-y-6">
                <div>
                    <h1 className="text-2xl font-bold tracking-tight mb-2">Aprovações do Copilot IA</h1>
                    <p className="text-muted-foreground">O Mastra AI leu as conversas e detectou oportunidades de conversão pra sua aprovação.</p>
                </div>
                <div className="grid gap-4">
                    <Skeleton className="h-40 w-full rounded-xl" />
                    <Skeleton className="h-40 w-full rounded-xl" />
                </div>
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

            {approvals.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-20 bg-muted/20 border border-dashed rounded-xl">
                    <div className="bg-primary/5 p-4 rounded-full mb-4">
                        <Sparkles className="h-10 w-10 text-primary opacity-60" />
                    </div>
                    <h2 className="text-xl font-semibold mb-2">Caixa de Aprovação Limpa</h2>
                    <p className="text-muted-foreground max-w-md text-center">
                        Sua inteligência artificial está escutando. Novas vendas concluídas pelos vendedores no WhatsApp aparecerão aqui para sua revisão de Gestor.
                    </p>
                </div>
            ) : (
                <div className="grid gap-4 md:grid-cols-2">
                    {approvals.map((approval: any) => {
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
                                            <span className="font-bold text-foreground">Justificativa da IA:</span> "{approval.reasoning}"
                                        </div>
                                    </div>

                                    <div className="flex flex-col sm:flex-row gap-2 mt-auto">
                                        <Button
                                            className="w-full bg-primary hover:bg-primary/90 text-white font-semibold"
                                            disabled={approveMutation.isPending || rejectMutation.isPending}
                                            onClick={() => approveMutation.mutate(approval.id)}
                                        >
                                            {approveMutation.isPending ? 'Aprovando...' : <><Check className="h-4 w-4 mr-2" /> Aprovar Venda (CAPI)</>}
                                        </Button>
                                        <Button
                                            variant="outline"
                                            className="w-full sm:w-auto px-4"
                                            disabled={approveMutation.isPending || rejectMutation.isPending}
                                            onClick={() => rejectMutation.mutate(approval.id)}
                                        >
                                            {rejectMutation.isPending ? '...' : <><X className="h-4 w-4 mr-1 text-muted-foreground" /> Falso</>}
                                        </Button>
                                    </div>
                                </CardContent>
                            </Card>
                        )
                    })}
                </div>
            )}
        </div>
    )
}
