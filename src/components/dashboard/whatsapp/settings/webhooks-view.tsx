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

import { useOrganization } from '@/hooks/organization/use-organization'

export function WebhooksView() {
  const { data: session } = authClient.useSession()
  const { data: org } = useOrganization()
  const orgId = org?.id
  const isSuperAdmin = session?.user?.role === 'owner'
  const [showVerifyToken, setShowVerifyToken] = useState(false)

  const webhookUrl = 'https://whatrack.com/api/v1/whatsapp/webhook'

  const { data: verifyTokenData } = useQuery({
    queryKey: ['whatsapp', 'webhook', 'verify-token'],
    queryFn: async () => {
      const res = await fetch('/api/v1/system/webhook-verify-token')
      if (!res.ok) throw new Error('Failed')
      return res.json()
    },
    enabled: isSuperAdmin,
  })

  const verifyToken = verifyTokenData?.verifyToken || ''

  const {
    data: logData,
    isLoading: isLoadingLogs,
    refetch: refetchLogs,
  } = useQuery({
    queryKey: ['whatsapp', 'webhook', 'logs', orgId],
    queryFn: () => whatsappApi.getWebhookLogs(orgId),
  })


  const logs = Array.isArray(logData) ? logData : (logData as any)?.logs || []
  const activeEventTypes = (logData as any)?.eventTypes || []

  if (!isSuperAdmin) {
    return (
      <TemplateMainShell className="flex h-full flex-col items-center justify-center p-8 text-center">
        <Shield className="text-destructive mb-4 h-12 w-12 opacity-20" />
        <h2 className="text-xl font-bold">Acesso Restrito</h2>
        <p className="text-muted-foreground mt-2 max-w-xs text-sm">
          Apenas administradores do sistema podem visualizar configurações de Webhooks e Logs de
          eventos.
        </p>
        <Button variant="outline" className="mt-6" asChild>
          <Link href="/dashboard">Voltar ao Início</Link>
        </Button>
      </TemplateMainShell>
    )
  }

  const copyToClipboard = () => {
    navigator.clipboard.writeText(webhookUrl)
    toast.success('URL copiada!', {
      description: 'Cole esta URL no painel do Meta Developers.',
    })
  }

  return (
    <Tabs defaultValue="overview" className="flex h-full w-full flex-col">
      <TemplateMainShell className="flex h-full flex-col">
        <TemplateMainHeader
          title="Webhooks"
          subtitle="Configurações globais e histórico de eventos recebidos da Meta"
        >
          <div className="-ml-3 mt-2">
            <TabsList className="flex h-auto items-center gap-1 border-none bg-transparent p-0 shadow-none">
              <TabsTrigger
                value="overview"
                className="text-muted-foreground hover:text-foreground data-[state=active]:text-foreground group relative rounded-none border-none bg-transparent px-3 py-1.5 text-xs font-medium shadow-none transition-all data-[state=active]:bg-transparent"
              >
                <Zap className="mr-2 h-3.5 w-3.5" />
                Visão Geral
                <span className="group-hover:bg-muted-foreground/20 group-data-[state=active]:bg-primary absolute inset-x-0 -bottom-[1px] h-[2px] bg-transparent transition-colors group-data-[state=active]:shadow-[0_0_8px_0_var(--color-primary)]" />
              </TabsTrigger>
              <TabsTrigger
                value="logs"
                className="text-muted-foreground hover:text-foreground data-[state=active]:text-foreground group relative rounded-none border-none bg-transparent px-3 py-1.5 text-xs font-medium shadow-none transition-all data-[state=active]:bg-transparent"
              >
                <Database className="mr-2 h-3.5 w-3.5" />
                Logs de Eventos
                <span className="group-hover:bg-muted-foreground/20 group-data-[state=active]:bg-primary absolute inset-x-0 -bottom-[1px] h-[2px] bg-transparent transition-colors group-data-[state=active]:shadow-[0_0_8px_0_var(--color-primary)]" />
              </TabsTrigger>
            </TabsList>
          </div>
        </TemplateMainHeader>

        <div className="bg-muted/5 flex-1 overflow-y-auto p-8">
          <TabsContent
            value="overview"
            className="animate-in fade-in-50 m-0 outline-none duration-500"
          >
            <div className="w-full space-y-6">
              <Card className="border shadow-sm">
                <CardHeader className="pb-4">
                  <div className="flex items-center gap-3">
                    <div className="bg-primary/10 text-primary flex h-10 w-10 items-center justify-center rounded-xl">
                      <Webhook className="h-6 w-6" />
                    </div>
                    <div>
                      <CardTitle className="text-lg font-bold">Endpoint de Conexão</CardTitle>
                      <CardDescription className="text-xs">
                        Configure esta URL e o Verify Token no seu App da Meta (WhatsApp {'>'}{' '}
                        Configuração)
                      </CardDescription>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="space-y-6">
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <label className="text-muted-foreground ml-1 text-[10px] font-bold uppercase tracking-widest">
                        Webhook Callback URL
                      </label>
                      <Badge
                        variant="outline"
                        className="border-green-500/20 bg-green-500/5 text-[10px] text-green-600"
                      >
                        Produção
                      </Badge>
                    </div>
                    <div className="bg-muted/30 group flex items-center justify-between rounded-lg border p-3">
                      <code className="text-primary mr-4 truncate font-mono text-sm font-bold">
                        {webhookUrl}
                      </code>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="hover:bg-primary decoration-primary/30 h-8 shrink-0 gap-2 font-bold underline decoration-dotted underline-offset-4 transition-all hover:text-white"
                        onClick={copyToClipboard}
                      >
                        <Copy className="h-3.5 w-3.5" />
                        Copiar URL
                      </Button>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <label className="text-muted-foreground ml-1 text-[10px] font-bold uppercase tracking-widest">
                      Verify Token
                    </label>
                    <div className="bg-muted/30 flex items-center justify-between gap-3 rounded-lg border p-3">
                      <div className="flex flex-1 items-center gap-2 overflow-hidden">
                        <Shield className="h-4 w-4 shrink-0 text-blue-600" />
                        <code className="text-foreground/70 truncate font-mono text-sm">
                          {verifyToken
                            ? showVerifyToken
                              ? verifyToken
                              : `${verifyToken.substring(0, 8)}${'•'.repeat(24)}`
                            : 'Carregando...'}
                        </code>
                      </div>
                      <div className="flex shrink-0 items-center gap-1">
                        {verifyToken && (
                          <>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="hover:bg-primary/10 h-7 w-7"
                              onClick={() => setShowVerifyToken(!showVerifyToken)}
                            >
                              {showVerifyToken ? (
                                <EyeOff className="h-3.5 w-3.5" />
                              ) : (
                                <Eye className="h-3.5 w-3.5" />
                              )}
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="hover:bg-primary/10 h-7 w-7"
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
                  <CardTitle className="flex items-center gap-2 text-sm font-bold">
                    <Bell className="text-primary h-4 w-4" />
                    Eventos Capturados
                  </CardTitle>
                  <CardDescription className="text-xs">
                    Tipos de eventos processados pelo sistema (baseado nos logs)
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="flex flex-wrap gap-2 text-xs">
                    {activeEventTypes.length > 0 ? (
                      activeEventTypes.map((field: string) => (
                        <Badge
                          key={field}
                          variant="secondary"
                          className="bg-primary/5 text-primary border-primary/10 h-6 text-[10px] font-medium"
                        >
                          {field}
                        </Badge>
                      ))
                    ) : (
                      <span className="text-muted-foreground text-[10px] italic">
                        Nenhum evento registrado ainda.
                      </span>
                    )}
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          <TabsContent value="logs" className="animate-in fade-in-50 m-0 outline-none duration-500">
            <div className="space-y-4">
              <div className="flex items-center justify-between px-1">
                <div className="flex items-center gap-2">
                  <Database className="text-primary h-4 w-4" />
                  <h3 className="text-sm font-bold">Histórico Recente</h3>
                  <Badge className="h-5 text-[9px] font-black">{logs?.length || 0}</Badge>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-7 gap-2 text-[10px] font-bold"
                  onClick={() => refetchLogs()}
                >
                  <RefreshCw className={`h-3 w-3 ${isLoadingLogs ? 'animate-spin' : ''}`} />
                  {isLoadingLogs ? 'Atualizando...' : 'Atualizar'}
                </Button>
              </div>

              <div className="bg-card overflow-hidden rounded-xl border shadow-sm">
                <table className="w-full border-collapse text-left">
                  <thead>
                    <tr className="bg-muted/50 border-b">
                      <th className="text-muted-foreground px-4 py-3 text-[10px] font-black uppercase tracking-wider">
                        Timestamp
                      </th>
                      <th className="text-muted-foreground px-4 py-3 text-[10px] font-black uppercase tracking-wider">
                        Organização
                      </th>
                      <th className="text-muted-foreground px-4 py-3 text-[10px] font-black uppercase tracking-wider">
                        Tipo de Evento
                      </th>
                      <th className="text-muted-foreground px-4 py-3 text-[10px] font-black uppercase tracking-wider">
                        O que aconteceu?
                      </th>
                      <th className="text-muted-foreground px-4 py-3 text-right text-[10px] font-black uppercase tracking-wider">
                        Ações
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y">
                    {isLoadingLogs ? (
                      <tr>
                        <td
                          colSpan={5}
                          className="text-muted-foreground px-4 py-12 text-center text-xs"
                        >
                          <RefreshCw className="mx-auto mb-2 h-5 w-5 animate-spin opacity-20" />
                          Sincronizando logs...
                        </td>
                      </tr>
                    ) : !logs || logs.length === 0 ? (
                      <tr>
                        <td
                          colSpan={5}
                          className="text-muted-foreground px-4 py-12 text-center text-xs italic"
                        >
                          Nenhum evento registrado no histórico recente.
                        </td>
                      </tr>
                    ) : (
                      logs.map((log: any) => (
                        <tr key={log.id} className="hover:bg-muted/20 group transition-colors">
                          <td className="whitespace-nowrap px-4 py-3 text-xs font-medium">
                            <div className="flex flex-col">
                              <span className="font-bold">
                                {new Date(log.createdAt).toLocaleTimeString('pt-BR')}
                              </span>
                              <span className="text-muted-foreground text-[10px]">
                                {new Date(log.createdAt).toLocaleDateString('pt-BR')}
                              </span>
                            </div>
                          </td>
                          <td className="px-4 py-3">
                            <div className="flex flex-col gap-0.5">
                              <span className="text-foreground max-w-[120px] truncate text-xs font-bold">
                                {log.organization?.name || 'Desconhecida'}
                              </span>
                              <span className="text-muted-foreground font-mono text-[10px] font-medium">
                                {formatPhoneNumber(
                                  log.payload.entry?.[0]?.changes?.[0]?.value?.metadata
                                    ?.display_phone_number
                                ) || 'N/A'}
                              </span>
                            </div>
                          </td>
                          <td className="px-4 py-3">
                            <Badge
                              variant="outline"
                              className="border-primary/20 bg-primary/5 text-primary px-2 py-0 text-[9px] font-black uppercase"
                            >
                              {log.eventType}
                            </Badge>
                          </td>
                          <td className="px-4 py-3">
                            <div className="flex items-center gap-2">
                              <span className="text-foreground group-hover:text-primary max-w-sm truncate text-xs font-medium transition-colors">
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
      </TemplateMainShell>
    </Tabs>
  )
}
