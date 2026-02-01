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
import { authClient } from '@/lib/auth/auth-client'
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from '@/components/ui/dialog'
import { Eye, Smartphone, MessageSquare, Info, AlertTriangle } from 'lucide-react'

import { parsePhoneNumber, parsePhoneNumberFromString } from 'libphonenumber-js'

// Helper para traduzir o tipo de mensagem
function translateMessageType(type: string) {
    const types: Record<string, string> = {
        'text': 'Texto',
        'image': 'Imagem',
        'audio': 'Áudio',
        'video': 'Vídeo',
        'document': 'Documento',
        'sticker': 'Figurinha',
        'location': 'Localização',
        'contacts': 'Contatos',
        'button': 'Botão',
        'interactive': 'Interativo',
        'template': 'Template'
    }
    return types[type] || type.charAt(0).toUpperCase() + type.slice(1)
}

// Helper para formatar o número de telefone
function formatPhoneNumber(number: string) {
    if (!number) return 'N/A'
    try {
        const cleanNumber = number.startsWith('+') ? number : `+${number}`
        const phoneNumber = parsePhoneNumberFromString(cleanNumber)
        if (phoneNumber) return phoneNumber.formatInternational()
        return number
    } catch (e) {
        return number
    }
}

// Helper para formatar o payload de forma humana e estruturada
function formatPayloadHumanly(log: any) {
    const payload = log.payload
    const eventType = log.eventType

    try {
        if (eventType === 'messages') {
            const message = payload.entry?.[0]?.changes?.[0]?.value?.messages?.[0]
            const contact = payload.entry?.[0]?.changes?.[0]?.value?.contacts?.[0]
            if (message) {
                const name = contact?.profile?.name
                const from = message.from
                return (
                    <div className="flex flex-col gap-0.5 py-1">
                        <div className="flex items-center gap-1">
                            <span className="text-[10px] font-bold text-muted-foreground w-20 text-left shrink-0">Nome:</span>
                            <span className="text-xs font-semibold text-foreground truncate">
                                {name || 'N/A'}
                            </span>
                        </div>
                        <div className="flex items-center gap-1">
                            <span className="text-[10px] font-bold text-muted-foreground w-20 text-left shrink-0">WhatsApp:</span>
                            <span className="text-xs font-medium text-foreground">
                                {formatPhoneNumber(from)}
                            </span>
                        </div>
                        <div className="flex items-center gap-1">
                            <span className="text-[10px] font-bold text-muted-foreground w-20 text-left shrink-0">Tipo:</span>
                            <span className="text-xs font-medium text-primary">
                                {translateMessageType(message.type)}
                            </span>
                        </div>
                        {message.text?.body && (
                            <div className="flex items-start gap-1 max-w-md">
                                <span className="text-[10px] font-bold text-muted-foreground w-20 text-left shrink-0 mt-0.5">Mensagem:</span>
                                <span className="text-xs text-foreground/80 line-clamp-2">
                                    {message.text.body}
                                </span>
                            </div>
                        )}
                    </div>
                )
            }
        }

        if (eventType === 'statuses') {
            const status = payload.entry?.[0]?.changes?.[0]?.value?.statuses?.[0]
            if (status) {
                return (
                    <div className="flex flex-col gap-0.5 py-1">
                        <div className="flex items-center gap-1">
                            <span className="text-[10px] font-bold text-muted-foreground w-20 text-left shrink-0">Status:</span>
                            <Badge variant="outline" className={`text-[9px] h-3.5 px-1 font-black uppercase ${status.status === 'read' ? 'text-blue-600 bg-blue-50 border-blue-200' :
                                status.status === 'delivered' ? 'text-green-600 bg-green-50 border-green-200' : ''
                                }`}>
                                {status.status}
                            </Badge>
                        </div>
                        <div className="flex items-center gap-1">
                            <span className="text-[10px] font-bold text-muted-foreground w-20 text-left shrink-0">Para:</span>
                            <span className="text-xs font-medium text-foreground">{formatPhoneNumber(status.recipient_id)}</span>
                        </div>
                    </div>
                )
            }
        }

        if (eventType === 'account_update') {
            const value = payload.entry?.[0]?.changes?.[0]?.value
            return (
                <div className="flex flex-col gap-0.5 py-1 text-xs">
                    <span className="font-bold text-amber-600 flex items-center gap-1">
                        <AlertTriangle className="h-3 w-3" />
                        {value?.event}
                    </span>
                    <span className="text-[10px] text-muted-foreground">Número: {formatPhoneNumber(value?.phone_number)}</span>
                </div>
            )
        }

        if (eventType === 'message_template_status_update') {
            const value = payload.entry?.[0]?.changes?.[0]?.value
            return (
                <div className="flex flex-col gap-0.5 py-1">
                    <div className="flex items-center gap-1">
                        <span className="text-[10px] font-bold text-muted-foreground w-20 text-left shrink-0">Template ID:</span>
                        <span className="text-xs font-bold">{value?.message_template_id}</span>
                    </div>
                    <div className="flex items-center gap-1">
                        <span className="text-[10px] font-bold text-muted-foreground w-20 text-left shrink-0">Novo Status:</span>
                        <Badge variant="outline" className="text-[9px] h-3.5 px-1 font-black uppercase text-primary border-primary/20 bg-primary/5">
                            {value?.event}
                        </Badge>
                    </div>
                </div>
            )
        }

        return <span className="text-xs italic text-muted-foreground">Evento {eventType || 'genérico'} recebido</span>
    } catch (e) {
        return <span className="text-xs text-destructive">Erro na formatação dos dados</span>
    }
}

export function WebhooksView() {
    const { data: session } = authClient.useSession()
    const isSuperAdmin = session?.user?.role === 'owner'

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
                            {isSuperAdmin && (
                                <TabsTrigger
                                    value="logs"
                                    className="group relative rounded-none border-none bg-transparent data-[state=active]:bg-transparent px-3 py-1.5 text-xs font-medium text-muted-foreground transition-all hover:text-foreground data-[state=active]:text-foreground shadow-none"
                                >
                                    <Database className="h-3.5 w-3.5 mr-2" />
                                    Logs de Eventos
                                    <span className="absolute inset-x-0 -bottom-[1px] h-[2px] bg-transparent transition-colors group-hover:bg-muted-foreground/20 group-data-[state=active]:bg-primary group-data-[state=active]:shadow-[0_0_8px_0_var(--color-primary)]" />
                                </TabsTrigger>
                            )}
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
                                                        <Dialog>
                                                            <DialogTrigger asChild>
                                                                <Button variant="ghost" size="sm" className="h-7 px-3 text-[10px] font-bold gap-1.5 hover:bg-primary hover:text-white transition-all">
                                                                    <Eye className="h-3 w-3" />
                                                                    Explorar Dados
                                                                </Button>
                                                            </DialogTrigger>
                                                            <DialogContent className="sm:max-w-5xl max-h-[85vh] flex flex-col p-0 overflow-hidden">
                                                                <DialogHeader className="p-6 pb-2">
                                                                    <div className="flex items-center gap-2 mb-1">
                                                                        <Badge variant="outline" className="bg-primary/5 text-primary border-primary/20 text-[10px] h-5 font-black uppercase tracking-tighter">
                                                                            {log.eventType}
                                                                        </Badge>
                                                                        <span className="text-[10px] text-muted-foreground">
                                                                            {new Date(log.createdAt).toLocaleString('pt-BR')}
                                                                        </span>
                                                                    </div>
                                                                    <DialogTitle className="text-xl font-bold tracking-tight">Detalhes do Evento Webhook</DialogTitle>
                                                                </DialogHeader>
                                                                <div className="flex-1 overflow-y-auto p-6 pt-2">
                                                                    <div className="bg-muted/30 p-4 rounded-xl border font-mono text-xs overflow-x-auto">
                                                                        <pre className="text-foreground/80 leading-relaxed whitespace-pre-wrap">
                                                                            {JSON.stringify(log.payload, null, 2)}
                                                                        </pre>
                                                                    </div>
                                                                    <div className="mt-4 grid grid-cols-2 gap-4">
                                                                        <div className="p-3 rounded-lg border bg-background flex items-center gap-3">
                                                                            <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center text-primary">
                                                                                <Info className="h-4 w-4" />
                                                                            </div>
                                                                            <div>
                                                                                <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest leading-none mb-1">ID do Log</p>
                                                                                <p className="text-xs font-mono truncate max-w-[150px]">{log.id}</p>
                                                                            </div>
                                                                        </div>
                                                                        <div className="p-3 rounded-lg border bg-background flex items-center gap-3">
                                                                            <div className="h-8 w-8 rounded-full bg-blue-500/10 flex items-center justify-center text-blue-600">
                                                                                <MessageSquare className="h-4 w-4" />
                                                                            </div>
                                                                            <div>
                                                                                <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest leading-none mb-1">Origem</p>
                                                                                <p className="text-xs font-medium">WhatsApp Cloud API</p>
                                                                            </div>
                                                                        </div>
                                                                    </div>
                                                                </div>
                                                                <div className="p-4 bg-muted/20 border-t flex justify-end gap-2">
                                                                    <Button variant="outline" size="sm" className="h-8 text-[10px] font-bold px-4" onClick={() => {
                                                                        navigator.clipboard.writeText(JSON.stringify(log.payload, null, 2))
                                                                        toast.success("JSON copiado para a área de transferência!")
                                                                    }}>
                                                                        Copiar JSON
                                                                    </Button>
                                                                    <DialogTrigger asChild>
                                                                        <Button size="sm" className="h-8 text-[10px] font-black px-6">Fechar</Button>
                                                                    </DialogTrigger>
                                                                </div>
                                                            </DialogContent>
                                                        </Dialog>
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
