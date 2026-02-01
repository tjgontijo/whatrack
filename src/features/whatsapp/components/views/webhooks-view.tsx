'use client'

import React from 'react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Webhook, Shield, Copy, CheckCircle2, Bell, Zap, Database, Clock, RefreshCw } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { toast } from 'sonner'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { TemplateMainShell, TemplateMainHeader } from '@/components/dashboard/leads'
import { useQuery } from '@tanstack/react-query'
import { whatsappApi } from '../../api/whatsapp'
import { Badge } from '@/components/ui/badge'

export function WebhooksView() {
    // URL sem o subdomínio 'app' conforme solicitado
    const webhookUrl = "https://whatrack.com/api/v1/whatsapp/webhook"

    const { data: logs, isLoading: isLoadingLogs, refetch: refetchLogs } = useQuery({
        queryKey: ['whatsapp', 'webhook', 'logs'],
        queryFn: () => whatsappApi.getWebhookLogs(),
        refetchInterval: 10000 // Refresh a cada 10 segundos para logs vivos
    })

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
                        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                            <div className="lg:col-span-2 space-y-6">
                                <Card className="border shadow-sm">
                                    <CardHeader className="pb-4">
                                        <div className="flex items-center gap-3">
                                            <div className="h-10 w-10 rounded-xl bg-primary/10 flex items-center justify-center text-primary">
                                                <Webhook className="h-6 w-6" />
                                            </div>
                                            <div>
                                                <CardTitle className="text-lg font-bold">Endpoint de Conexão</CardTitle>
                                                <CardDescription className="text-xs">Configure esta URL no seu App da Meta (WhatsApp {'>'} Configuração)</CardDescription>
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

                                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                            <div className="flex items-center gap-3 p-3 rounded-lg bg-background border border-border/50 shadow-sm">
                                                <div className="h-8 w-8 rounded-full bg-green-500/10 flex items-center justify-center">
                                                    <CheckCircle2 className="h-4 w-4 text-green-600" />
                                                </div>
                                                <div>
                                                    <p className="text-xs font-bold">Status do Endpoint</p>
                                                    <p className="text-[10px] text-green-600">Ativo e operante</p>
                                                </div>
                                            </div>
                                            <div className="flex items-center gap-3 p-3 rounded-lg bg-background border border-border/50 shadow-sm">
                                                <div className="h-8 w-8 rounded-full bg-blue-500/10 flex items-center justify-center">
                                                    <Shield className="h-4 w-4 text-blue-600" />
                                                </div>
                                                <div>
                                                    <p className="text-xs font-bold">Verify Token</p>
                                                    <p className="text-[10px] text-muted-foreground">Configurado via ENV</p>
                                                </div>
                                            </div>
                                        </div>
                                    </CardContent>
                                </Card>

                                <Card>
                                    <CardHeader className="pb-3">
                                        <CardTitle className="text-sm font-bold flex items-center gap-2">
                                            <Bell className="h-4 w-4 text-primary" />
                                            Eventos Inscritos
                                        </CardTitle>
                                        <CardDescription className="text-xs">Campos monitorados automaticamente</CardDescription>
                                    </CardHeader>
                                    <CardContent>
                                        <div className="flex flex-wrap gap-2 text-xs">
                                            {['messages', 'message_deliveries', 'message_echoes', 'message_read', 'phone_number_name_update', 'template_category_update'].map((field) => (
                                                <Badge key={field} variant="secondary" className="text-[10px] h-6 font-medium">
                                                    {field}
                                                </Badge>
                                            ))}
                                        </div>
                                    </CardContent>
                                </Card>
                            </div>

                            <div className="space-y-6">
                                <Card className="bg-muted/5 border-dashed">
                                    <CardHeader>
                                        <CardTitle className="text-sm font-bold flex items-center gap-2 text-muted-foreground">
                                            <Database className="h-4 w-4" />
                                            Status Global
                                        </CardTitle>
                                    </CardHeader>
                                    <CardContent className="space-y-4">
                                        <div className="flex flex-col items-center justify-center py-6 text-center space-y-3">
                                            <div className="h-12 w-12 rounded-full bg-primary/10 flex items-center justify-center animate-pulse">
                                                <RefreshCw className="h-6 w-6 text-primary" />
                                            </div>
                                            <div>
                                                <p className="text-sm font-bold uppercase tracking-tighter">Escuta Ativa</p>
                                                <p className="text-[10px] text-muted-foreground">O sistema está pronto para processar novos eventos.</p>
                                            </div>
                                        </div>
                                    </CardContent>
                                </Card>
                            </div>
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
                                            <th className="px-4 py-3 text-[10px] font-black uppercase tracking-wider text-muted-foreground">Tipo de Evento</th>
                                            <th className="px-4 py-3 text-[10px] font-black uppercase tracking-wider text-muted-foreground">Resumo do Payload</th>
                                            <th className="px-4 py-3 text-[10px] font-black uppercase tracking-wider text-muted-foreground text-right">Ações</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y">
                                        {isLoadingLogs ? (
                                            <tr>
                                                <td colSpan={4} className="px-4 py-12 text-center text-xs text-muted-foreground">
                                                    <RefreshCw className="h-5 w-5 animate-spin mx-auto mb-2 opacity-20" />
                                                    Sincronizando logs...
                                                </td>
                                            </tr>
                                        ) : !logs || logs.length === 0 ? (
                                            <tr>
                                                <td colSpan={4} className="px-4 py-12 text-center text-xs text-muted-foreground italic">
                                                    Nenhum evento registrado no histórico recente.
                                                </td>
                                            </tr>
                                        ) : (
                                            logs.map((log: any) => (
                                                <tr key={log.id} className="hover:bg-muted/20 transition-colors group">
                                                    <td className="px-4 py-3 text-xs font-medium whitespace-nowrap">
                                                        {new Date(log.createdAt).toLocaleTimeString('pt-BR')}
                                                        <span className="text-[10px] text-muted-foreground ml-2">
                                                            {new Date(log.createdAt).toLocaleDateString('pt-BR')}
                                                        </span>
                                                    </td>
                                                    <td className="px-4 py-3">
                                                        <Badge variant="outline" className="text-[9px] font-black uppercase px-2 py-0 border-primary/20 bg-primary/5 text-primary">
                                                            {log.eventType}
                                                        </Badge>
                                                    </td>
                                                    <td className="px-4 py-3">
                                                        <div className="flex items-center gap-2">
                                                            <code className="text-[10px] font-mono text-muted-foreground block max-w-sm truncate group-hover:text-foreground transition-colors">
                                                                {JSON.stringify(log.payload)}
                                                            </code>
                                                        </div>
                                                    </td>
                                                    <td className="px-4 py-3 text-right">
                                                        <Button variant="ghost" size="sm" className="h-7 px-3 text-[10px] font-bold" onClick={() => {
                                                            console.log(log.payload);
                                                            toast.success("Payload disponível no Console do Navegador");
                                                        }}>
                                                            Ver JSON
                                                        </Button>
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
            </TemplateMainShell>
        </Tabs>
    )
}
