'use client'

import { useState } from 'react'
import Link from 'next/link'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import {
    MetaIcon,
    WhatsAppIcon
} from '@/components/icons'
import {
    Plus,
    Trash2,
    RefreshCw,
    Settings2,
    ShieldCheck,
    AlertCircle,
    ExternalLink,
    CheckCircle2,
    XCircle
} from 'lucide-react'
import { toast } from 'sonner'
import axios from 'axios'

import {
    TemplateMainShell,
    TemplateMainHeader
} from '@/components/dashboard/leads'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card'
import { Switch } from '@/components/ui/switch'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { authClient } from '@/lib/auth/auth-client'
import { Skeleton } from '@/components/ui/skeleton'

export default function MetaAdsSettingsPage() {
    const queryClient = useQueryClient()
    const { data: organization } = authClient.useActiveOrganization()
    const organizationId = organization?.id

    // 1. Fetch Connections
    const { data: connections, isLoading: loadingConnections, refetch: refetchConnections } = useQuery({
        queryKey: ['meta-ads', 'connections', organizationId],
        queryFn: async () => {
            const res = await axios.get(`/api/v1/meta-ads/connections?organizationId=${organizationId}`)
            return res.data
        },
        enabled: !!organizationId
    })

    // 2. Fetch Ad Accounts
    const { data: adAccounts, isLoading: loadingAccounts, refetch: refetchAccounts } = useQuery({
        queryKey: ['meta-ads', 'ad-accounts', organizationId],
        queryFn: async () => {
            const res = await axios.get(`/api/v1/meta-ads/ad-accounts?organizationId=${organizationId}`)
            return res.data
        },
        enabled: !!organizationId
    })

    // 3. Mutations
    const toggleMutation = useMutation({
        mutationFn: async ({ id, isActive }: { id: string, isActive: boolean }) => {
            return axios.patch(`/api/v1/meta-ads/ad-accounts/${id}`, { isActive })
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['meta-ads', 'ad-accounts'] })
            toast.success('Configuração atualizada')
        }
    })

    const updatePixelMutation = useMutation({
        mutationFn: async ({ id, pixelId }: { id: string, pixelId: string }) => {
            return axios.patch(`/api/v1/meta-ads/ad-accounts/${id}`, { pixelId })
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['meta-ads', 'ad-accounts'] })
            toast.success('Pixel ID atualizado')
        }
    })

    const syncMutation = useMutation({
        mutationFn: async () => {
            return axios.get(`/api/v1/meta-ads/ad-accounts?organizationId=${organizationId}&sync=true`)
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['meta-ads', 'ad-accounts'] })
            toast.success('Contas sincronizadas')
        }
    })

    const disconnectMutation = useMutation({
        mutationFn: async (id: string) => {
            return axios.delete(`/api/v1/meta-ads/connections?id=${id}`)
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['meta-ads', 'connections'] })
            queryClient.invalidateQueries({ queryKey: ['meta-ads', 'ad-accounts'] })
            toast.success('Conexão removida')
        }
    })

    const handleConnect = () => {
        if (!organizationId) return
        window.location.href = `/api/v1/meta-ads/connect?organizationId=${organizationId}`
    }

    return (
        <TemplateMainShell className="flex flex-col h-screen overflow-hidden">
            <TemplateMainHeader
                title="Meta Ads Attribution"
                subtitle="Gerencie suas conexões de anúncios e configure o rastreamento CAPI"
            />

            <div className="flex-1 overflow-y-auto p-6 lg:p-8 space-y-8 bg-muted/5">

                {/* Step 1: Meta Connections */}
                <section className="max-w-5xl mx-auto space-y-4">
                    <div className="flex items-center justify-between">
                        <h2 className="text-lg font-semibold flex items-center gap-2">
                            <ShieldCheck className="h-5 w-5 text-blue-500" />
                            Perfis Conectados
                        </h2>
                        <Button onClick={handleConnect} size="sm" className="gap-2">
                            <Plus className="h-4 w-4" />
                            Conectar Novo Perfil
                        </Button>
                    </div>

                    <div className="grid gap-4">
                        {loadingConnections ? (
                            <Skeleton className="h-24 w-full" />
                        ) : connections?.length > 0 ? (
                            connections.map((conn: any) => (
                                <Card key={conn.id} className="overflow-hidden border-blue-100 bg-blue-50/20">
                                    <CardHeader className="flex flex-row items-center justify-between py-4">
                                        <div className="flex items-center gap-4">
                                            <div className="h-10 w-10 rounded-full bg-blue-500/10 flex items-center justify-center">
                                                <MetaIcon className="h-6 w-6 text-blue-600" />
                                            </div>
                                            <div>
                                                <CardTitle className="text-base">{conn.fbUserName}</CardTitle>
                                                <CardDescription className="text-xs">ID: {conn.fbUserId}</CardDescription>
                                            </div>
                                        </div>
                                        <div className="flex items-center gap-3">
                                            <Badge variant={conn.status === 'ACTIVE' ? 'default' : 'destructive'} className="h-5">
                                                {conn.status === 'ACTIVE' ? 'Ativo' : 'Erro'}
                                            </Badge>
                                            <Button
                                                variant="ghost"
                                                size="icon"
                                                className="text-muted-foreground hover:text-destructive"
                                                onClick={() => disconnectMutation.mutate(conn.id)}
                                            >
                                                <Trash2 className="h-4 w-4" />
                                            </Button>
                                        </div>
                                    </CardHeader>
                                </Card>
                            ))
                        ) : (
                            <Card className="border-dashed flex flex-col items-center justify-center p-8 text-center bg-transparent">
                                <div className="h-12 w-12 rounded-full bg-muted flex items-center justify-center mb-4">
                                    <MetaIcon className="h-6 w-6 text-muted-foreground" />
                                </div>
                                <h3 className="font-medium">Nenhum perfil conectado</h3>
                                <p className="text-sm text-muted-foreground mt-1 mb-4 max-w-xs">
                                    Conecte um perfil do Facebook para importar suas contas de anúncios e ativar o rastreamento.
                                </p>
                                <Button onClick={handleConnect} variant="outline" size="sm">
                                    Conectar agora
                                </Button>
                            </Card>
                        )}
                    </div>
                </section>

                {/* Step 2: Ad Accounts Config */}
                {connections?.length > 0 && (
                    <section className="max-w-5xl mx-auto space-y-4">
                        <div className="flex items-center justify-between">
                            <h2 className="text-lg font-semibold flex items-center gap-2">
                                <Settings2 className="h-5 w-5 text-primary" />
                                Configurar Contas de Anúncios
                            </h2>
                            <Button
                                variant="outline"
                                size="sm"
                                className="gap-2"
                                onClick={() => syncMutation.mutate()}
                                disabled={syncMutation.isPending}
                            >
                                <RefreshCw className={`h-4 w-4 ${syncMutation.isPending ? 'animate-spin' : ''}`} />
                                Sincronizar Contas
                            </Button>
                        </div>

                        <Card>
                            <CardContent className="p-0">
                                <div className="relative overflow-x-auto">
                                    <table className="w-full text-sm text-left">
                                        <thead className="text-xs uppercase bg-muted/50 border-b">
                                            <tr>
                                                <th className="px-6 py-4 font-semibold">Conta / Status</th>
                                                <th className="px-6 py-4 font-semibold">Dataset ID (Pixel)</th>
                                                <th className="px-6 py-4 font-semibold text-center w-32">Rastrear?</th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y">
                                            {loadingAccounts ? (
                                                [1, 2, 3].map(i => (
                                                    <tr key={i}><td colSpan={3} className="px-6 py-4"><Skeleton className="h-8 w-full" /></td></tr>
                                                ))
                                            ) : adAccounts?.length > 0 ? (
                                                adAccounts.map((acc: any) => (
                                                    <tr key={acc.id} className="hover:bg-muted/20 transition-colors">
                                                        <td className="px-6 py-4">
                                                            <div className="font-medium text-foreground">{acc.adAccountName}</div>
                                                            <div className="text-[10px] text-muted-foreground flex items-center gap-1 mt-0.5">
                                                                {acc.adAccountId}
                                                                {acc.isActive ? (
                                                                    <CheckCircle2 className="h-3 w-3 text-emerald-500" />
                                                                ) : (
                                                                    <XCircle className="h-3 w-3 text-muted-foreground/30" />
                                                                )}
                                                            </div>
                                                        </td>
                                                        <td className="px-6 py-4">
                                                            <div className="flex items-center gap-2 max-w-[200px]">
                                                                <Input
                                                                    placeholder="Ex: 123456789..."
                                                                    defaultValue={acc.pixelId || ''}
                                                                    className="h-8 text-xs font-mono"
                                                                    onBlur={(e) => {
                                                                        if (e.target.value !== acc.pixelId) {
                                                                            updatePixelMutation.mutate({ id: acc.id, pixelId: e.target.value })
                                                                        }
                                                                    }}
                                                                />
                                                            </div>
                                                        </td>
                                                        <td className="px-6 py-4 text-center">
                                                            <Switch
                                                                checked={acc.isActive}
                                                                onCheckedChange={(val) => toggleMutation.mutate({ id: acc.id, isActive: val })}
                                                            />
                                                        </td>
                                                    </tr>
                                                ))
                                            ) : (
                                                <tr>
                                                    <td colSpan={3} className="px-6 py-12 text-center text-muted-foreground italic">
                                                        Nenhuma conta encontrada. Clique em Sincronizar.
                                                    </td>
                                                </tr>
                                            )}
                                        </tbody>
                                    </table>
                                </div>
                            </CardContent>
                        </Card>

                        <div className="flex items-start gap-3 p-4 bg-amber-50 rounded-lg border border-amber-100">
                            <AlertCircle className="h-5 w-5 text-amber-500 mt-0.5" />
                            <div className="text-xs text-amber-800 space-y-1">
                                <p className="font-semibold">Requisito para Rastreamento:</p>
                                <p>O <b>Dataset ID (Pixel)</b> é obrigatório para enviarmos os eventos de conversão via <b>Meta Conversions API (CAPI)</b>.</p>
                                <Link href="#" className="underline flex items-center gap-1 mt-1">
                                    Onde encontro o ID do meu dataset? <ExternalLink className="h-3 w-3" />
                                </Link>
                            </div>
                        </div>
                    </section>
                )}

            </div>
        </TemplateMainShell>
    )
}
