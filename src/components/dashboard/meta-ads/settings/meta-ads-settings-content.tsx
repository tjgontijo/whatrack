'use client'

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import axios from 'axios'
import { toast } from 'sonner'
import {
    Plus,
    Trash2,
    RefreshCw,
    Settings2,
    ShieldCheck,
    AlertCircle,
    ExternalLink,
    CheckCircle2,
    XCircle,
    Database
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Switch } from '@/components/ui/switch'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { MetaIcon } from '@/components/icons'
import Link from 'next/link'
import { TemplateMainShell, TemplateMainHeader } from '@/components/dashboard/leads'
import { useMetaAdsOnboarding } from '@/hooks/meta-ads/use-meta-ads-onboarding'
import { MetaPixelsConfigArea } from './meta-pixels-config-area'
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"

interface MetaAdsSettingsContentProps {
    organizationId: string | undefined
    initialConnections?: any[]
    initialAdAccounts?: any[]
    initialPixels?: any[]
}

export function MetaAdsSettingsContent({ organizationId, initialConnections, initialAdAccounts, initialPixels }: MetaAdsSettingsContentProps) {
    const queryClient = useQueryClient()

    const handleRefreshAll = () => {
        refetchConnections()
        refetchAccounts()
    }

    // 1. Fetch Connections
    const { data: connections, isLoading: loadingConnections, refetch: refetchConnections } = useQuery({
        queryKey: ['meta-ads', 'connections', organizationId],
        queryFn: async () => {
            const res = await axios.get(`/api/v1/meta-ads/connections?organizationId=${organizationId}`)
            return res.data
        },
        enabled: !!organizationId,
        initialData: initialConnections,
    })

    // 2. Fetch Ad Accounts
    const { data: adAccounts, isLoading: loadingAccounts, refetch: refetchAccounts } = useQuery({
        queryKey: ['meta-ads', 'ad-accounts', organizationId],
        queryFn: async () => {
            const res = await axios.get(`/api/v1/meta-ads/ad-accounts?organizationId=${organizationId}`)
            return res.data
        },
        enabled: !!organizationId,
        initialData: initialAdAccounts,
    })

    const { startOnboarding, isPending: isConnecting } = useMetaAdsOnboarding(organizationId, handleRefreshAll)

    // 3. Mutations
    const toggleMutation = useMutation({
        mutationFn: async ({ id, isActive }: { id: string, isActive: boolean }) => {
            return axios.patch(`/api/v1/meta-ads/ad-accounts/${id}`, { isActive })
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['meta-ads', 'ad-accounts'] })
            toast.success('Rastreamento de conta atualizado')
        },
        onError: (err: any) => {
            toast.error(err?.response?.data?.error || 'Erro ao atualizar rastreamento')
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

    return (
        <TemplateMainShell className="flex flex-col h-screen overflow-hidden">
            <TemplateMainHeader
                title="Meta Ads Attribution"
                subtitle="Gerencie suas conexões de anúncios e configure o rastreamento CAPI"
            />

            <div className="flex-1 overflow-y-auto p-6 lg:p-8 space-y-8 bg-muted/5">

                {/* Step 2: Tabs for Ad Accounts & Pixels */}
                <Tabs defaultValue="ad-accounts" className="max-w-5xl mx-auto">
                    <TabsList className="grid w-full grid-cols-2 mb-6 max-w-md">
                        <TabsTrigger value="ad-accounts" className="flex items-center gap-2">
                            <Settings2 className="h-4 w-4" />
                            Contas de Anúncios
                        </TabsTrigger>
                        <TabsTrigger value="pixels" className="flex items-center gap-2">
                            <Database className="h-4 w-4" />
                            Pixels (CAPI)
                        </TabsTrigger>
                    </TabsList>

                    <TabsContent value="ad-accounts" className="space-y-8">
                        {/* Step 1: Meta Connections (Now inside Ad Accounts tab) */}
                        <section className="space-y-4">
                            <div className="flex items-center justify-between">
                                <h2 className="text-lg font-semibold flex items-center gap-2">
                                    <ShieldCheck className="h-5 w-5 text-blue-500" />
                                    Perfis Conectados
                                </h2>
                                <Button
                                    onClick={() => startOnboarding()}
                                    disabled={isConnecting}
                                    size="sm"
                                    className="gap-2"
                                >
                                    {isConnecting ? (
                                        <RefreshCw className="h-4 w-4 animate-spin" />
                                    ) : (
                                        <Plus className="h-4 w-4" />
                                    )}
                                    Conectar Novo Perfil
                                </Button>
                            </div>

                            <div className="grid gap-4">
                                {loadingConnections && (!connections || connections.length === 0) ? (
                                    <div className="flex justify-center p-8 bg-muted/5 rounded-xl border border-dashed text-muted-foreground/30">
                                        <RefreshCw className="h-6 w-6 animate-spin" />
                                    </div>
                                ) : (connections?.length ?? 0) > 0 ? (
                                    connections?.map((conn: any) => (
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
                                        <Button
                                            onClick={() => startOnboarding()}
                                            disabled={isConnecting}
                                            variant="outline"
                                            size="sm"
                                        >
                                            {isConnecting ? 'Conectando...' : 'Conectar agora'}
                                        </Button>
                                    </Card>
                                )}
                            </div>
                        </section>

                        {/* Imported Ad Accounts List */}
                        {(connections?.length ?? 0) > 0 && (
                            <section className="space-y-4">
                                <div className="flex items-center justify-between">
                                    <h2 className="text-lg font-semibold flex items-center gap-2">
                                        Contas de Anúncios Importadas
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
                                                        <th className="px-6 py-4 font-semibold">Conta</th>
                                                        <th className="px-6 py-4 font-semibold text-right w-48">Extrair Dados (ROI)?</th>
                                                    </tr>
                                                </thead>
                                                <tbody className="divide-y">
                                                    {loadingAccounts && (!adAccounts || adAccounts.length === 0) ? (
                                                        <tr><td colSpan={2} className="px-6 py-8 text-center"><RefreshCw className="h-6 w-6 animate-spin mx-auto text-muted-foreground/20" /></td></tr>
                                                    ) : (adAccounts?.length ?? 0) > 0 ? (
                                                        adAccounts?.map((acc: any) => (
                                                            <tr key={acc.id} className={`hover:bg-muted/30 transition-colors ${acc.isActive ? 'bg-emerald-50/10' : ''}`}>
                                                                <td className="px-6 py-4">
                                                                    <div className="font-medium text-foreground">{acc.adAccountName}</div>
                                                                    <div className="text-[10px] text-muted-foreground flex items-center gap-2 mt-0.5">
                                                                        <span>{acc.adAccountId}</span>
                                                                        <Badge
                                                                            variant={acc.isActive ? "default" : "outline"}
                                                                            className={`font-normal text-[9px] h-4 px-1.5 ${acc.isActive ? 'bg-emerald-500 hover:bg-emerald-600' : ''}`}
                                                                        >
                                                                            {acc.isActive ? 'Ativa' : 'Inativa'}
                                                                        </Badge>
                                                                    </div>
                                                                </td>
                                                                <td className="px-6 py-4 text-right">
                                                                    <div className="flex items-center justify-end gap-3">
                                                                        <span className={`text-xs font-medium ${acc.isActive ? 'text-emerald-600' : 'text-muted-foreground'}`}>
                                                                            {acc.isActive ? 'ON' : 'OFF'}
                                                                        </span>
                                                                        <Switch
                                                                            checked={acc.isActive}
                                                                            onCheckedChange={(val) => toggleMutation.mutate({ id: acc.id, isActive: val })}
                                                                            className={acc.isActive ? "data-[state=checked]:bg-emerald-500" : ""}
                                                                        />
                                                                    </div>
                                                                </td>
                                                            </tr>
                                                        ))
                                                    ) : (
                                                        <tr>
                                                            <td colSpan={2} className="px-6 py-12 text-center text-muted-foreground italic">
                                                                Nenhuma conta encontrada. Clique em Sincronizar.
                                                            </td>
                                                        </tr>
                                                    )}
                                                </tbody>
                                            </table>
                                        </div>
                                    </CardContent>
                                </Card>
                            </section>
                        )}
                    </TabsContent>

                    <TabsContent value="pixels">
                        <MetaPixelsConfigArea organizationId={organizationId} initialPixels={initialPixels} />
                    </TabsContent>
                </Tabs>

            </div>
        </TemplateMainShell>
    )
}
