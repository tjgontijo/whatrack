'use client'

import React from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { ArrowLeft, CheckCircle, XCircle, Send, Ban, Clock } from 'lucide-react'
import Link from 'next/link'
import { toast } from 'sonner'

import { apiFetch } from '@/lib/api-client'
import { useRequiredProjectPath, useRequiredProjectRouteContext } from '@/hooks/project/project-route-context'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Skeleton } from '@/components/ui/skeleton'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'

const STATUS_LABELS: Record<string, string> = {
  DRAFT: 'Rascunho',
  PENDING_APPROVAL: 'Pendente',
  APPROVED: 'Aprovada',
  SCHEDULED: 'Agendada',
  PROCESSING: 'Em andamento',
  COMPLETED: 'Concluída',
  CANCELLED: 'Cancelada',
  PENDING: 'Pendente',
  SENT: 'Enviada',
  DELIVERED: 'Entregue',
  READ: 'Lida',
  FAILED: 'Falhou',
  EXCLUDED: 'Excluído',
  RESPONDED: 'Interação',
}

const STATUS_VARIANTS: Record<string, 'secondary' | 'default' | 'destructive' | 'outline'> = {
  DRAFT: 'secondary',
  PENDING_APPROVAL: 'outline',
  APPROVED: 'outline',
  SCHEDULED: 'default',
  PROCESSING: 'default',
  COMPLETED: 'secondary',
  CANCELLED: 'destructive',
  PENDING: 'secondary',
  SENT: 'outline',
  DELIVERED: 'outline',
  READ: 'secondary',
  FAILED: 'destructive',
  EXCLUDED: 'destructive',
  RESPONDED: 'default',
}

const TYPE_LABELS: Record<string, string> = {
  MARKETING: 'Marketing',
  OPERATIONAL: 'Operacional',
}

const ACTION_LABELS: Record<string, string> = {
  SUBMITTED: 'Submetida',
  APPROVED: 'Aprovada',
  DISPATCHED: 'Disparada',
  SCHEDULED: 'Agendada',
  CANCELLED: 'Cancelada',
}

interface DispatchGroup {
  id: string
  templateName: string
  templateLang: string
  status: string
  totalCount: number
  processedCount: number
  successCount: number
  failCount: number
  configDisplayPhone: string | null
  configVerifiedName: string | null
}

interface Approval {
  id: string
  action: string
  comment: string | null
  createdAt: string
  userName: string | null
  userEmail: string | null
}

interface CampaignDetail {
  id: string
  name: string
  type: string
  status: string
  scheduledAt: string | null
  startedAt: string | null
  completedAt: string | null
  templateName: string | null
  projectId: string
  projectName: string | null
  createdAt: string
  createdByName: string | null
  approvedByName: string | null
  approvedAt: string | null
  totalRecipients: number
  totalDispatchGroups: number
  dispatchGroups: DispatchGroup[]
  approvals: Approval[]
}

interface RecipientsResponse {
  items: Array<{
    id: string
    phone: string
    status: string
    sentAt: string | null
    deliveredAt: string | null
    readAt: string | null
    failedAt: string | null
    failureReason: string | null
    respondedAt: string | null
    exclusionReason: string | null
    metaWamid: string | null
    leadId: string | null
    dispatchGroupTemplateName: string | null
  }>
  total: number
  page: number
  pageSize: number
  totalPages: number
}

interface CampaignPageProps {
  params: Promise<{ campaignId: string }>
}

type CampaignRecipient = RecipientsResponse['items'][number]

function formatLifecycleTimestamp(value: string | null) {
  return value ? new Date(value).toLocaleString('pt-BR') : '—'
}

function parseFailureReason(reason: string | null) {
  if (!reason) return { code: null as string | null, message: null as string | null }

  const match = reason.match(/\(Meta\s+(\d+)\)\s*$/)
  if (!match) {
    return { code: null, message: reason }
  }

  return {
    code: match[1],
    message: reason.replace(/\s*\(Meta\s+\d+\)\s*$/, ''),
  }
}

export default function CampaignDetailPage({ params }: CampaignPageProps) {
  const [recipientPage, setRecipientPage] = React.useState(1)
  const [selectedFailureRecipient, setSelectedFailureRecipient] = React.useState<CampaignRecipient | null>(
    null
  )
  const queryClient = useQueryClient()
  const campaignsPath = useRequiredProjectPath('/whatsapp/campaigns')
  const { organizationId } = useRequiredProjectRouteContext()
  const { campaignId } = React.use(params)

  const { data: campaign, isLoading } = useQuery<CampaignDetail>({
    queryKey: ['whatsapp-campaign', organizationId, campaignId],
    queryFn: async () => {
      const data = await apiFetch(`/api/v1/whatsapp/campaigns/${campaignId}`, {
        orgId: organizationId,
      })
      return data as CampaignDetail
    },
    enabled: !!organizationId && !!campaignId,
  })

  const { data: recipients } = useQuery<RecipientsResponse>({
    queryKey: ['campaign-recipients', organizationId, campaignId, recipientPage],
    queryFn: async () => {
      const url = new URL(
        `/api/v1/whatsapp/campaigns/${campaignId}/recipients`,
        window.location.origin
      )
      url.searchParams.set('page', String(recipientPage))
      url.searchParams.set('pageSize', '20')
      const data = await apiFetch(url.toString(), { orgId: organizationId })
      return data as RecipientsResponse
    },
    enabled: !!organizationId && !!campaignId,
  })

  const dispatchMutation = useMutation({
    mutationFn: async () => {
      const isScheduled =
        !!campaign?.scheduledAt && new Date(campaign.scheduledAt).getTime() > Date.now()

      return apiFetch(`/api/v1/whatsapp/campaigns/${campaignId}/dispatch`, {
        method: 'POST',
        orgId: organizationId,
        body: JSON.stringify(
          isScheduled
            ? { immediate: false, scheduledAt: campaign.scheduledAt }
            : { immediate: true }
        ),
      })
    },
    onSuccess: () => {
      toast.success(
        campaign?.scheduledAt && new Date(campaign.scheduledAt).getTime() > Date.now()
          ? 'Campanha agendada!'
          : 'Campanha disparada!'
      )
      queryClient.invalidateQueries({ queryKey: ['whatsapp-campaign', organizationId, campaignId] })
    },
    onError: (error: Error) => {
      toast.error('Erro', { description: error.message })
    },
  })

  const cancelMutation = useMutation({
    mutationFn: async () => {
      return apiFetch(`/api/v1/whatsapp/campaigns/${campaignId}/cancel`, {
        method: 'POST',
        orgId: organizationId,
        body: JSON.stringify({}),
      })
    },
    onSuccess: () => {
      toast.success('Campanha cancelada')
      queryClient.invalidateQueries({ queryKey: ['whatsapp-campaign', organizationId, campaignId] })
    },
    onError: (error: Error) => {
      toast.error('Erro', { description: error.message })
    },
  })

  const retryFailedMutation = useMutation({
    mutationFn: async () => {
      return apiFetch(`/api/v1/whatsapp/campaigns/${campaignId}/retry-failed`, {
        method: 'POST',
        orgId: organizationId,
      })
    },
    onSuccess: (data: any) => {
      toast.success(data.message || 'Reenvio agendado!')
      queryClient.invalidateQueries({ queryKey: ['whatsapp-campaign', organizationId, campaignId] })
      queryClient.invalidateQueries({ queryKey: ['campaign-recipients', organizationId, campaignId, recipientPage] })
    },
    onError: (error: Error) => {
      toast.error('Erro ao reenviar', { description: error.message })
    },
  })

  if (!campaignId) {
    return (
      <div className="flex h-[calc(100vh-200px)] items-center justify-center">
        <p className="text-muted-foreground">Carregando...</p>
      </div>
    )
  }

  const selectedFailure = selectedFailureRecipient
    ? parseFailureReason(selectedFailureRecipient.failureReason)
    : { code: null, message: null }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" asChild>
          <Link href={campaignsPath}>
            <ArrowLeft className="h-4 w-4" />
          </Link>
        </Button>
        <div className="flex-1">
          {isLoading ? (
            <Skeleton className="h-8 w-64" />
          ) : (
            <div className="flex items-center gap-3">
              <h1 className="text-2xl font-bold">{campaign?.name}</h1>
              <Badge variant={STATUS_VARIANTS[campaign?.status || ''] || 'secondary'}>
                {STATUS_LABELS[campaign?.status || ''] || campaign?.status}
              </Badge>
              <Badge variant="outline">{TYPE_LABELS[campaign?.type || ''] || campaign?.type}</Badge>
            </div>
          )}
        </div>
        {!isLoading && campaign && (
          <div className="flex gap-2">
            {['DRAFT', 'APPROVED'].includes(campaign.status) && (
              <Button
                size="sm"
                onClick={() => dispatchMutation.mutate()}
                disabled={dispatchMutation.isPending}
              >
                <Send className="mr-2 h-4 w-4" />
                {campaign.scheduledAt && new Date(campaign.scheduledAt).getTime() > Date.now()
                  ? 'Agendar campanha'
                  : 'Enviar agora'}
              </Button>
            )}
            {['COMPLETED', 'FAILED', 'CANCELLED'].includes(campaign.status) && 
              (campaign.dispatchGroups.some(g => g.failCount > 0) || campaign.status === 'CANCELLED') && (
              <Button
                size="sm"
                variant="outline"
                onClick={() => retryFailedMutation.mutate()}
                disabled={retryFailedMutation.isPending}
              >
                <Send className="mr-2 h-4 w-4" />
                Retomar envio
              </Button>
            )}
            {['DRAFT', 'APPROVED', 'SCHEDULED', 'PROCESSING'].includes(
              campaign.status
            ) && (
              <Button
                variant="destructive"
                size="sm"
                onClick={() => cancelMutation.mutate()}
                disabled={cancelMutation.isPending}
              >
                <Ban className="mr-2 h-4 w-4" />
                Cancelar
              </Button>
            )}
          </div>
        )}
      </div>

      {isLoading ? (
        <Skeleton className="h-48" />
      ) : campaign ? (
        <>
          <div className="grid gap-4 lg:grid-cols-4">
            <Card>
              <CardContent className="pt-4">
                <p className="text-muted-foreground text-xs uppercase font-semibold">Total</p>
                <p className="text-2xl font-bold">{campaign.totalRecipients}</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-4">
                <p className="text-muted-foreground text-xs uppercase font-semibold text-green-600">Sucesso</p>
                <p className="text-2xl font-bold text-green-600">
                  {campaign.dispatchGroups.reduce((acc, g) => acc + g.successCount, 0)}
                </p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-4">
                <p className="text-muted-foreground text-xs uppercase font-semibold text-red-600">Falhas</p>
                <p className="text-2xl font-bold text-red-600">
                  {campaign.dispatchGroups.reduce((acc, g) => acc + g.failCount, 0)}
                </p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-4">
                <p className="text-muted-foreground text-xs uppercase font-semibold text-blue-600">Pendente</p>
                <p className="text-2xl font-bold text-blue-600">
                  {campaign.totalRecipients - 
                    campaign.dispatchGroups.reduce((acc, g) => acc + g.successCount + g.failCount, 0)}
                </p>
              </CardContent>
            </Card>
          </div>

          {campaign.dispatchGroups.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle>Grupos de Envio</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {campaign.dispatchGroups.map((group) => (
                    <div key={group.id} className="rounded-md border p-3">
                      <div className="mb-2 flex items-center justify-between">
                        <p className="font-medium">
                          {group.templateName} ({group.templateLang})
                        </p>
                        <Badge variant={STATUS_VARIANTS[group.status] || 'secondary'}>
                          {STATUS_LABELS[group.status] || group.status}
                        </Badge>
                      </div>
                      <div className="text-muted-foreground flex flex-wrap gap-4 text-xs font-medium">
                        <span>Instância: {group.configDisplayPhone || '—'}</span>
                        <span>Total: {group.totalCount}</span>
                        <span className="text-green-600">Sucesso: {group.successCount}</span>
                        <span className="text-red-600">Falhas: {group.failCount}</span>
                        <span className="text-blue-600">
                          Pendente: {group.totalCount - group.successCount - group.failCount}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          {campaign.approvals.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle>Histórico</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {campaign.approvals.map((approval) => (
                    <div key={approval.id} className="flex items-start gap-3 text-sm">
                      <div className="mt-0.5">
                        {approval.action === 'APPROVED' ? (
                          <CheckCircle className="h-4 w-4 text-green-600" />
                        ) : approval.action === 'CANCELLED' ? (
                          <XCircle className="h-4 w-4 text-red-600" />
                        ) : (
                          <Clock className="text-muted-foreground h-4 w-4" />
                        )}
                      </div>
                      <div>
                        <p>
                          <strong>{approval.userName || 'Sistema'}</strong>{' '}
                          {ACTION_LABELS[approval.action] || approval.action}
                        </p>
                        {approval.comment && (
                          <p className="text-muted-foreground text-xs">{approval.comment}</p>
                        )}
                        <p className="text-muted-foreground text-xs">
                          {new Date(approval.createdAt).toLocaleString('pt-BR')}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          {recipients && recipients.items.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle>Destinatários</CardTitle>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Telefone</TableHead>
                      <TableHead>Enviado</TableHead>
                      <TableHead>Entregue</TableHead>
                      <TableHead>Lido</TableHead>
                      <TableHead>Interação</TableHead>
                      <TableHead>Falha</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {recipients.items.map((r) => (
                      <TableRow key={r.id}>
                        <TableCell className="font-mono text-sm">{r.phone}</TableCell>
                        <TableCell className="text-xs">
                          {formatLifecycleTimestamp(r.sentAt)}
                        </TableCell>
                        <TableCell className="text-xs">
                          {formatLifecycleTimestamp(r.deliveredAt)}
                        </TableCell>
                        <TableCell className="text-xs">
                          {formatLifecycleTimestamp(r.readAt)}
                        </TableCell>
                        <TableCell className="text-xs">
                          {formatLifecycleTimestamp(r.respondedAt)}
                        </TableCell>
                        <TableCell className="text-xs">
                          {r.failureReason ? (
                            <Button
                              variant="link"
                              className="text-destructive h-auto p-0 text-xs"
                              onClick={() => setSelectedFailureRecipient(r)}
                            >
                              Ver erro
                            </Button>
                          ) : (
                            '—'
                          )}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
                {recipients.totalPages > 1 && (
                  <div className="mt-4 flex justify-center gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      disabled={recipientPage <= 1}
                      onClick={() => setRecipientPage((p) => p - 1)}
                    >
                      Anterior
                    </Button>
                    <span className="flex items-center text-sm">
                      {recipientPage} / {recipients.totalPages}
                    </span>
                    <Button
                      variant="outline"
                      size="sm"
                      disabled={recipientPage >= recipients.totalPages}
                      onClick={() => setRecipientPage((p) => p + 1)}
                    >
                      Próxima
                    </Button>
                  </div>
                )}
              </CardContent>
            </Card>
          )}

          <Dialog
            open={Boolean(selectedFailureRecipient)}
            onOpenChange={(open) => {
              if (!open) {
                setSelectedFailureRecipient(null)
              }
            }}
          >
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Falha no envio</DialogTitle>
                <DialogDescription>
                  {selectedFailureRecipient
                    ? `Telefone ${selectedFailureRecipient.phone}`
                    : 'Detalhes da falha reportada pela Meta.'}
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4 text-sm">
                <div className="rounded-2xl border p-4">
                  <p className="text-muted-foreground mb-1 text-xs uppercase tracking-wide">
                    Mensagem
                  </p>
                  <p>{selectedFailure.message || 'Falha informada pelo webhook da Meta.'}</p>
                </div>
                {selectedFailure.code ? (
                  <div className="rounded-2xl border p-4">
                    <p className="text-muted-foreground mb-1 text-xs uppercase tracking-wide">
                      Código Meta
                    </p>
                    <p className="font-mono">{selectedFailure.code}</p>
                  </div>
                ) : null}
                {selectedFailureRecipient?.metaWamid ? (
                  <div className="rounded-2xl border p-4">
                    <p className="text-muted-foreground mb-1 text-xs uppercase tracking-wide">
                      WAMID
                    </p>
                    <p className="font-mono break-all">{selectedFailureRecipient.metaWamid}</p>
                  </div>
                ) : null}
              </div>
            </DialogContent>
          </Dialog>
        </>
      ) : null}
    </div>
  )
}
