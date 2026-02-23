'use client'

import { useState } from 'react'
import Link from 'next/link'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Webhook, Shield, Copy, Bell, Zap, Database, RefreshCw, EyeOff, Eye } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { toast } from 'sonner'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { TemplateMainShell, TemplateMainHeader } from '@/components/dashboard/leads'
import { useQuery } from '@tanstack/react-query'
import { whatsappApi } from '@/lib/whatsapp/client'
import { Badge } from '@/components/ui/badge'
import { authClient } from '@/lib/auth/auth-client'
import { formatPayloadHumanly, formatPhoneNumber } from './webhook-payload-formatter'
import { WebhookLogDetailDialog } from './webhook-log-detail-dialog'

export function WebhooksView() {
    const { data: session } = authClient.useSession()
    const isSuperAdmin = session?.user?.role === 'owner'
    const [showVerifyToken, setShowVerifyToken] = useState(false)

    const webhookUrl = "https://whatrack.com/api/v1/whatsapp/webhook"

    const { data: verifyTokenData } = useQuery({
        queryKey: ['whatsapp', 'webhook', 'verify-token'],
        queryFn: async () => {
            const res = await fetch('/api/v1/system/webhook-verify-token')
            if (!res.ok) throw new Error('Failed')
            return res.json()
        },
        enabled: isSuperAdmin
    })

    const verifyToken = verifyTokenData?.verifyToken || ''

    const { data: logData, isLoading: isLoadingLogs, refetch: refetchLogs } = useQuery({
        queryKey: ['whatsapp', 'webhook', 'logs'],
        queryFn: () => whatsappApi.getWebhookLogs(),
    })

    const logs = Array.isArray(logData) ? logData : (logData as any)?.logs || []
    const activeEventTypes = (logData as any)?.eventTypes || []

    if (!isSuperAdmin) {
        return (
            <TemplateMainShell className="flex flex-col h-full items-center justify-center text-center p-8">
                <Shield className="h-12 w-12 text-destructive mb-4 opacity-20" />
                <h2 className="text-xl font-bold">Acesso Restrito</h2>
                <p className="text-sm text-muted-foreground max-w-xs mt-2">
                    Apenas administradores do sistema podem visualizar configurações de Webhooks e Logs de eventos.
                </p>
                <Button variant="outline" className="mt-6" asChild>
                    <Link href="/dashboard">Voltar ao Início</Link>
                </Button>
            </TemplateMainShell>
        )
    }

    const copyToClipboard = () => {
        navigator.clipboard.writeText(webhookUrl)
        toast.success("URL copiada!", {
            description: "Cole esta URL no painel do Meta Developers."
        })
    }

    return (
        <Tabs defaultValue="overview" className="flex flex-col h-full w-full">
            <TemplateMainShell className="flex flex-col h-full">
                <TemplateMainHeader
                    title="Webhooks"
                    subtitle="Configurações globais e histórico de eventos recebidos da Meta"
                >
                    <div className="mt-2 -ml-3">
                        <TabsList className="flex items-center gap-1 bg-transparent h-auto p-0 border-none shadow-none">
                            <TabsTrigger
                                value="overview"
                                className="group relative rounded-none border-none bg-transparent data-[state=active]:bg-transparent px-3 py-1.5 text-xs font-medium text-muted-foreground transition-all hover:text-foreground data-[state=active]:text-foreground shadow-none"
                            >
                                <Zap className="h-3.5 w-3.5 mr-2" />
                                Visão Geral
                                <span className="absolute inset-x-0 -bottom-[1px] h-[2px] bg-transparent transition-colors group-hover:bg-muted-foreground/20 group-data-[state=active]:bg-primary group-data-[state=active]:shadow-[0_0_8px_0_var(--color-primary)]" />
                            </TabsTrigger>
                            <TabsTrigger
                                value="logs"
                                className="group relative rounded-none border-none bg-transparent data-[state=active]:bg-transparent px-3 py-1.5 text-xs font-medium text-muted-foreground transition-all hover:text-foreground data-[state=active]:text-foreground shadow-none"
                            >
                                <Database className="h-3.5 w-3.5 mr-2" />
                                Logs de Eventos
                                <span className="absolute inset-x-0 -bottom-[1px] h-[2px] bg-transparent transition-colors group-hover:bg-muted-foreground/20 group-data-[state=active]:bg-primary group-data-[state=active]:shadow-[0_0_8px_0_var(--color-primary)]" />
                            </TabsTrigger>
                        </TabsList>
                    </div>
                </TemplateMainHeader>

                <div className="flex-1 overflow-y-auto bg-muted/5 p-8">
                    <TabsContent value="overview" className="animate-in fade-in-50 duration-500 m-0 outline-none">
                        <div className="space-y-6 w-full">
                            <Card className="border shadow-sm">
                                <CardHeader className="pb-4">
                                    <div className="flex items-center gap-3">
                                        <div className="h-10 w-10 rounded-xl bg-primary/10 flex items-center justify-center text-primary">
                                            <Webhook className="h-6 w-6" />
                                        </div>
                                        <div>
                                            <CardTitle className="text-lg font-bold">Endpoint de Conexão</CardTitle>
                                            <CardDescription className="text-xs">Configure esta URL e o Verify Token no seu App da Meta (WhatsApp {'>'} Configuração)</CardDescription>
                                        </div>
                                    </div>
                                </CardHeader>
                                <CardContent className="space-y-6">
                                    <div className="space-y-2">
                                        <div className="flex items-center justify-between">
                                            <label className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground ml-1">
                                                Webhook Callback URL
                                            </label>
                                            <Badge variant="outline" className="text-[10px] bg-green-500/5 text-green-600 border-green-500/20">
                                                Produção
                                            </Badge>
                                        </div>
                                        <div className="p-3 bg-muted/30 rounded-lg border flex items-center justify-between group">
                                            <code className="text-sm font-mono font-bold text-primary truncate mr-4">
                                                {webhookUrl}
                                            </code>
                                            <Button
                                                variant="ghost"
                                                size="sm"
                                                className="h-8 gap-2 font-bold shrink-0 hover:bg-primary hover:text-white transition-all underline decoration-primary/30 underline-offset-4 decoration-dotted"
                                                onClick={copyToClipboard}
                                            >
                                                <Copy className="h-3.5 w-3.5" />
                                                Copiar URL
                                            </Button>
                                        </div>
                                    </div>

                                    <div className="space-y-2">
                                        <label className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground ml-1">
                                            Verify Token
                                        </label>
                                        <div className="p-3 bg-muted/30 rounded-lg border flex items-center justify-between gap-3">
                                            <div className="flex items-center gap-2 flex-1 overflow-hidden">
                                                <Shield className="h-4 w-4 text-blue-600 shrink-0" />
                                                <code className="text-sm font-mono text-foreground/70 truncate">
                                                    {verifyToken
                                                        ? (showVerifyToken ? verifyToken : `${verifyToken.substring(0, 8)}${'•'.repeat(24)}`)
                                                        : 'Carregando...'
                                                    }
                                                </code>
                                            </div>
                                            <div className="flex items-center gap-1 shrink-0">
                                                {verifyToken && (
                                                    <>
                                                        <Button
                                                            variant="ghost"
                                                            size="icon"
                                                            className="h-7 w-7 hover:bg-primary/10"
                                                            onClick={() => setShowVerifyToken(!showVerifyToken)}
                                                        >
                                                            {showVerifyToken ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
                                                        </Button>
                                                        <Button
                                                            variant="ghost"
                                                            size="icon"
                                                            className="h-7 w-7 hover:bg-primary/10"
                                                            onClick={() => {
                                                                navigator.clipboard.writeText(verifyToken)
                                                                toast.success('Verify Token copiado!')
                                                            }}
                                                        >
                                                            <Copy className="h-3.5 w-3.5" />
                                                        </Button>
                                                    </>
                                                )}
                                            </div>
                                        </div>
                                    </div>

                                </CardContent>
                            </Card>

                            <Card>
                                <CardHeader className="pb-3">
                                    <CardTitle className="text-sm font-bold flex items-center gap-2">
                                        <Bell className="h-4 w-4 text-primary" />
                                        Eventos Capturados
                                    </CardTitle>
                                    <CardDescription className="text-xs">Tipos de eventos processados pelo sistema (baseado nos logs)</CardDescription>
                                </CardHeader>
                                <CardContent>
                                    <div className="flex flex-wrap gap-2 text-xs">
                                        {activeEventTypes.length > 0 ? (
                                            activeEventTypes.map((field: string) => (
                                                <Badge key={field} variant="secondary" className="text-[10px] h-6 font-medium bg-primary/5 text-primary border-primary/10">
                                                    {field}
                                                </Badge>
                                            ))
                                        ) : (
                                            <span className="text-[10px] text-muted-foreground italic">
                                                Nenhum evento registrado ainda.
                                            </span>
                                        )}
                                    </div>
                                </CardContent>
                            </Card>
                        </div>
                    </TabsContent>

                    <TabsContent value="logs" className="animate-in fade-in-50 duration-500 m-0 outline-none">
                        <div className="space-y-4">
                            <div className="flex items-center justify-between px-1">
                                <div className="flex items-center gap-2">
                                    <Database className="h-4 w-4 text-primary" />
                                    <h3 className="text-sm font-bold">Histórico Recente</h3>
                                    <Badge className="h-5 text-[9px] font-black">{logs?.length || 0}</Badge>
                                </div>
                                <Button
                                    variant="ghost"
                                    size="sm"
                                    className="h-7 text-[10px] font-bold gap-2"
                                    onClick={() => refetchLogs()}
                                >
                                    <RefreshCw className={`h-3 w-3 ${isLoadingLogs ? 'animate-spin' : ''}`} />
                                    {isLoadingLogs ? 'Atualizando...' : 'Atualizar'}
                                </Button>
                            </div>

                            <div className="rounded-xl border bg-card shadow-sm overflow-hidden">
                                <table className="w-full text-left border-collapse">
                                    <thead>
                                        <tr className="bg-muted/50 border-b">
                                            <th className="px-4 py-3 text-[10px] font-black uppercase tracking-wider text-muted-foreground">Timestamp</th>
                                            <th className="px-4 py-3 text-[10px] font-black uppercase tracking-wider text-muted-foreground">Organização</th>
                                            <th className="px-4 py-3 text-[10px] font-black uppercase tracking-wider text-muted-foreground">Tipo de Evento</th>
                                            <th className="px-4 py-3 text-[10px] font-black uppercase tracking-wider text-muted-foreground">O que aconteceu?</th>
                                            <th className="px-4 py-3 text-[10px] font-black uppercase tracking-wider text-muted-foreground text-right">Ações</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y">
                                        {isLoadingLogs ? (
                                            <tr>
                                                <td colSpan={5} className="px-4 py-12 text-center text-xs text-muted-foreground">
                                                    <RefreshCw className="h-5 w-5 animate-spin mx-auto mb-2 opacity-20" />
                                                    Sincronizando logs...
                                                </td>
                                            </tr>
                                        ) : !logs || logs.length === 0 ? (
                                            <tr>
                                                <td colSpan={5} className="px-4 py-12 text-center text-xs text-muted-foreground italic">
                                                    Nenhum evento registrado no histórico recente.
                                                </td>
                                            </tr>
                                        ) : (
                                            logs.map((log: any) => (
                                                <tr key={log.id} className="hover:bg-muted/20 transition-colors group">
                                                    <td className="px-4 py-3 text-xs font-medium whitespace-nowrap">
                                                        <div className="flex flex-col">
                                                            <span className="font-bold">{new Date(log.createdAt).toLocaleTimeString('pt-BR')}</span>
                                                            <span className="text-[10px] text-muted-foreground">
                                                                {new Date(log.createdAt).toLocaleDateString('pt-BR')}
                                                            </span>
                                                        </div>
                                                    </td>
                                                    <td className="px-4 py-3">
                                                        <div className="flex flex-col gap-0.5">
                                                            <span className="text-xs font-bold text-foreground truncate max-w-[120px]">
                                                                {log.organization?.name || 'Desconhecida'}
                                                            </span>
                                                            <span className="text-[10px] font-medium text-muted-foreground font-mono">
                                                                {formatPhoneNumber(log.payload.entry?.[0]?.changes?.[0]?.value?.metadata?.display_phone_number) || 'N/A'}
                                                            </span>
                                                        </div>
                                                    </td>
                                                    <td className="px-4 py-3">
                                                        <Badge variant="outline" className="text-[9px] font-black uppercase px-2 py-0 border-primary/20 bg-primary/5 text-primary">
                                                            {log.eventType}
                                                        </Badge>
                                                    </td>
                                                    <td className="px-4 py-3">
                                                        <div className="flex items-center gap-2">
                                                            <span className="text-xs font-medium text-foreground max-w-sm truncate group-hover:text-primary transition-colors">
                                                                {formatPayloadHumanly(log)}
                                                            </span>
                                                        </div>
                                                    </td>
                                                    <td className="px-4 py-3 text-right">
                                                        <WebhookLogDetailDialog log={log} />
                                                    </td>
                                                </tr>
                                            ))
                                        )}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    </TabsContent>
                </div>
            </TemplateMainShell >
        </Tabs >
    )
}
