'use client'

import { useQuery } from '@tanstack/react-query'
import { Copy, Database, Eye, EyeOff, RefreshCw, Shield, Webhook } from 'lucide-react'
import Link from 'next/link'
import { useState } from 'react'
import { toast } from 'sonner'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import {
  useRequiredProjectPath,
  useRequiredProjectRouteContext,
} from '@/features/projects/hooks/use-project-route-context'
import { whatsappApi } from '@/features/whatsapp/lib/client'
import { authClient } from '@/lib/auth/auth-client'
import { WebhookLogDetailDialog } from './webhook-log-detail-dialog'
import { formatPayloadHumanly, formatPhoneNumber } from './webhook-payload-formatter'

type DatePreset = 'all' | 'today' | '7d' | '30d'

interface WebhooksViewProps {
  eventTypeFilter?: string
  datePreset?: DatePreset
}

export function WebhooksView({ eventTypeFilter = '', datePreset = 'all' }: WebhooksViewProps) {
  const { data: session } = authClient.useSession()
  const { organizationId: orgId } = useRequiredProjectRouteContext()
  const homePath = useRequiredProjectPath()
  const isAdminUser = session?.user?.role === 'owner' || session?.user?.role === 'admin'
  const [showVerifyToken, setShowVerifyToken] = useState(false)

  const webhookUrl = 'https://whatrack.com/api/v1/whatsapp/webhook'

  const { data: verifyTokenData } = useQuery({
    queryKey: ['whatsapp', 'webhook', 'verify-token'],
    queryFn: async () => {
      const res = await fetch('/api/v1/system/webhook-verify-token')
      if (!res.ok) throw new Error('Failed')
      return res.json()
    },
    enabled: isAdminUser,
  })

  const verifyToken = verifyTokenData?.verifyToken || ''

  const { data: logData, isLoading: isLoadingLogs } = useQuery({
    queryKey: ['whatsapp', 'webhook', 'logs', orgId],
    queryFn: () => whatsappApi.getWebhookLogs(orgId),
  })

  const allLogs = Array.isArray(logData) ? logData : (logData as any)?.logs || []

  const logs = allLogs.filter((log: any) => {
    if (eventTypeFilter && !log.eventType?.toLowerCase().includes(eventTypeFilter.toLowerCase())) {
      return false
    }
    if (datePreset !== 'all') {
      const created = new Date(log.createdAt)
      const now = new Date()
      if (datePreset === 'today') {
        if (created.toDateString() !== now.toDateString()) return false
      } else {
        const days = datePreset === '7d' ? 7 : 30
        const cutoff = new Date(now.getTime() - days * 24 * 60 * 60 * 1000)
        if (created < cutoff) return false
      }
    }
    return true
  })
  if (!isAdminUser) {
    return (
      <div className='flex h-full flex-col items-center justify-center p-8 text-center'>
        <Shield className='mb-4 h-12 w-12 text-destructive opacity-20' />
        <h2 className='font-bold text-xl'>Acesso Restrito</h2>
        <p className='mt-2 max-w-xs text-muted-foreground text-sm'>
          Apenas administradores do sistema podem visualizar configurações de Webhooks e Logs de
          eventos.
        </p>
        <Button variant='outline' className='mt-6' asChild>
          <Link href={homePath}>Voltar ao Início</Link>
        </Button>
      </div>
    )
  }

  const copyToClipboard = () => {
    navigator.clipboard.writeText(webhookUrl)
    toast.success('URL copiada!', {
      description: 'Cole esta URL no painel do Meta Developers.',
    })
  }

  return (
    <div className='space-y-6'>
      <Card className='border shadow-sm'>
        <CardHeader className='pb-4'>
          <div className='flex items-center gap-3'>
            <div className='flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10 text-primary'>
              <Webhook className='h-6 w-6' />
            </div>
            <div>
              <CardTitle className='font-bold text-lg'>Endpoint de Conexão</CardTitle>
              <CardDescription className='text-xs'>
                Configure esta URL e o Verify Token no seu App da Meta (WhatsApp {'>'} Configuração)
              </CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent className='space-y-6'>
          <div className='space-y-2'>
            <div className='flex items-center justify-between'>
              <label className='ml-1 font-bold text-[10px] text-muted-foreground uppercase tracking-widest'>
                Webhook Callback URL
              </label>
              <Badge
                variant='outline'
                className='border-green-500/20 bg-green-500/5 text-[10px] text-green-600'
              >
                Produção
              </Badge>
            </div>
            <div className='group flex items-center justify-between rounded-lg border bg-muted/30 p-3'>
              <code className='mr-4 truncate font-bold font-mono text-primary text-sm'>
                {webhookUrl}
              </code>
              <Button
                variant='ghost'
                size='icon'
                className='h-7 w-7 shrink-0 hover:bg-primary/10'
                onClick={copyToClipboard}
                title='Copiar URL'
              >
                <Copy className='h-3.5 w-3.5' />
              </Button>
            </div>
          </div>

          <div className='space-y-2'>
            <label className='ml-1 font-bold text-[10px] text-muted-foreground uppercase tracking-widest'>
              Verify Token
            </label>
            <div className='flex items-center justify-between gap-3 rounded-lg border bg-muted/30 p-3'>
              <div className='flex flex-1 items-center gap-2 overflow-hidden'>
                <Shield className='h-4 w-4 shrink-0 text-blue-600' />
                <code className='truncate font-mono text-foreground/70 text-sm'>
                  {verifyToken
                    ? showVerifyToken
                      ? verifyToken
                      : `${verifyToken.substring(0, 8)}${'•'.repeat(24)}`
                    : 'Carregando...'}
                </code>
              </div>
              <div className='flex shrink-0 items-center gap-1'>
                {verifyToken && (
                  <>
                    <Button
                      variant='ghost'
                      size='icon'
                      className='h-7 w-7 hover:bg-primary/10'
                      onClick={() => setShowVerifyToken(!showVerifyToken)}
                    >
                      {showVerifyToken ? (
                        <EyeOff className='h-3.5 w-3.5' />
                      ) : (
                        <Eye className='h-3.5 w-3.5' />
                      )}
                    </Button>
                    <Button
                      variant='ghost'
                      size='icon'
                      className='h-7 w-7 hover:bg-primary/10'
                      onClick={() => {
                        navigator.clipboard.writeText(verifyToken)
                        toast.success('Verify Token copiado!')
                      }}
                    >
                      <Copy className='h-3.5 w-3.5' />
                    </Button>
                  </>
                )}
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      <div className='space-y-4'>
        <div className='flex items-center gap-2 px-1'>
          <Database className='h-4 w-4 text-primary' />
          <h3 className='font-bold text-sm'>Histórico Recente</h3>
          <Badge className='h-5 font-black text-[9px]'>{logs?.length || 0}</Badge>
        </div>

        <div className='overflow-hidden rounded-xl border bg-card shadow-sm'>
          <table className='w-full border-collapse text-left'>
            <thead>
              <tr className='border-b bg-muted/50'>
                <th className='px-4 py-3 font-black text-[10px] text-muted-foreground uppercase tracking-wider'>
                  Timestamp
                </th>
                <th className='px-4 py-3 font-black text-[10px] text-muted-foreground uppercase tracking-wider'>
                  Organização
                </th>
                <th className='px-4 py-3 font-black text-[10px] text-muted-foreground uppercase tracking-wider'>
                  Tipo de Evento
                </th>
                <th className='px-4 py-3 font-black text-[10px] text-muted-foreground uppercase tracking-wider'>
                  O que aconteceu?
                </th>
                <th className='px-4 py-3 text-right font-black text-[10px] text-muted-foreground uppercase tracking-wider'>
                  Ações
                </th>
              </tr>
            </thead>
            <tbody className='divide-y'>
              {isLoadingLogs ? (
                <tr>
                  <td colSpan={5} className='px-4 py-12 text-center text-muted-foreground text-xs'>
                    <RefreshCw className='mx-auto mb-2 h-5 w-5 animate-spin opacity-20' />
                    Sincronizando logs...
                  </td>
                </tr>
              ) : !logs || logs.length === 0 ? (
                <tr>
                  <td
                    colSpan={5}
                    className='px-4 py-12 text-center text-muted-foreground text-xs italic'
                  >
                    Nenhum evento registrado no histórico recente.
                  </td>
                </tr>
              ) : (
                logs.map((log: any) => (
                  <tr key={log.id} className='group transition-colors hover:bg-muted/20'>
                    <td className='whitespace-nowrap px-4 py-3 font-medium text-xs'>
                      <div className='flex flex-col'>
                        <span className='font-bold'>
                          {new Date(log.createdAt).toLocaleTimeString('pt-BR')}
                        </span>
                        <span className='text-[10px] text-muted-foreground'>
                          {new Date(log.createdAt).toLocaleDateString('pt-BR')}
                        </span>
                      </div>
                    </td>
                    <td className='px-4 py-3'>
                      <div className='flex flex-col gap-0.5'>
                        <span className='max-w-[120px] truncate font-bold text-foreground text-xs'>
                          {log.organization?.name || 'Desconhecida'}
                        </span>
                        <span className='font-medium font-mono text-[10px] text-muted-foreground'>
                          {formatPhoneNumber(
                            log.payload.entry?.[0]?.changes?.[0]?.value?.metadata
                              ?.display_phone_number
                          ) || 'N/A'}
                        </span>
                      </div>
                    </td>
                    <td className='px-4 py-3'>
                      <Badge
                        variant='outline'
                        className='border-primary/20 bg-primary/5 px-2 py-0 font-black text-[9px] text-primary uppercase'
                      >
                        {log.eventType}
                      </Badge>
                    </td>
                    <td className='px-4 py-3'>
                      <div className='flex items-center gap-2'>
                        <span className='max-w-sm truncate font-medium text-foreground text-xs transition-colors group-hover:text-primary'>
                          {formatPayloadHumanly(log)}
                        </span>
                      </div>
                    </td>
                    <td className='px-4 py-3 text-right'>
                      <WebhookLogDetailDialog log={log} />
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
