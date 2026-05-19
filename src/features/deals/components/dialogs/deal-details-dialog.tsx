'use client'

import { useQuery } from '@tanstack/react-query'
import {
  Activity,
  ArrowDownRight,
  ArrowUpRight,
  DollarSign,
  ExternalLink,
  MessageSquare,
  RefreshCw,
  ShieldAlert,
  Smartphone,
  Timer,
  X,
} from 'lucide-react'
import { toast } from 'sonner'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogDescription, DialogTitle } from '@/components/ui/dialog'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Separator } from '@/components/ui/separator'
import { ConversationIntelligencePanel } from '@/features/conversation-intelligence/components/conversation-intelligence-panel'
import { updateDealStageAction } from '@/features/deals/actions/update-deal-stage-action'
import { apiFetch } from '@/lib/http/api-client'
import { formatCurrencyBRL } from '@/lib/mask/formatters'

interface DealDetailsDialogProps {
  dealId: string | null
  open: boolean
  onOpenChange: (open: boolean) => void
  organizationId: string
  projectId?: string
}

interface DealDetailsResponse {
  id: string
  conversationId: string
  status: string | { id: string; name: string }
  dealValue: number | null
  createdAt: string
  updatedAt: string
  stage: {
    id: string
    name: string
    color: string
    order: number
    isClosed: boolean
  }
  assignee: {
    id: string
    name: string | null
    email: string
    image: string | null
  } | null
  tracking: {
    utmSource: string | null
    utmMedium: string | null
    utmCampaign: string | null
    sourceType: string | null
    ctwaclid: string | null
    referrerUrl: string | null
    landingPage: string | null
  } | null
  conversation?: {
    lead: {
      id: string
      name: string | null
      phone: string | null
      pushName: string | null
      profilePicUrl: string | null
    }
  }
  _count: {
    messages: number
    sales: number
  }
  inboundMessagesCount: number
  outboundMessagesCount: number
  firstResponseTimeSec: number | null
  resolutionTimeSec: number | null
}

interface DealStageOption {
  id: string
  name: string
  color: string
}

interface DealStagesResponse {
  items: DealStageOption[]
}

export function DealDetailsDialog({
  dealId,
  open,
  onOpenChange,
  organizationId,
  projectId,
}: DealDetailsDialogProps) {
  const {
    data: deal,
    isLoading,
    error,
    refetch,
  } = useQuery({
    queryKey: ['deal-details', dealId, organizationId],
    queryFn: async () => {
      if (!dealId) return null
      return apiFetch(`/api/v1/deals/${dealId}`, {
        orgId: organizationId,
      }) as Promise<DealDetailsResponse>
    },
    enabled: !!dealId && open,
  })

  const { data: stagesData } = useQuery<DealStagesResponse>({
    queryKey: ['deal-stages', organizationId, projectId],
    queryFn: async () => {
      const data = await apiFetch(`/api/v1/deal-stages`, {
        orgId: organizationId,
        projectId,
      })
      return (data as DealStagesResponse | null) || { items: [] }
    },
    enabled: !!organizationId && open,
  })
  const stages = stagesData?.items || []

  const handleUpdateStage = async (newStageId: string) => {
    try {
      if (!dealId) return

      const result = await updateDealStageAction({
        dealId,
        stageId: newStageId,
        organizationId,
      })

      if (result.success) {
        toast.success('Etapa atualizada!')
        refetch()
      }
    } catch {
      toast.error('Erro ao mover deal')
    }
  }

  const formatTimer = (seconds: number | null | undefined) => {
    if (seconds === null || seconds === undefined) return '--'
    if (seconds < 60) return `${Math.floor(seconds)}s`
    if (seconds < 3600) return `${Math.floor(seconds / 60)}m`
    return `${Math.floor(seconds / 3600)}h ${Math.floor((seconds % 3600) / 60)}m`
  }

  const lead = deal?.conversation?.lead

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        showCloseButton={false}
        className='flex h-[min(92vh,900px)] w-[92vw] max-w-6xl flex-col overflow-hidden border-none p-0 shadow-2xl sm:max-w-6xl'
      >
        <DialogTitle className='sr-only'>
          {isLoading
            ? 'Carregando detalhes...'
            : error || !deal
              ? 'Erro ao carregar'
              : lead?.name || 'Negociação'}
        </DialogTitle>
        <DialogDescription className='sr-only'>
          Visualização detalhada da negociação, histórico e inteligência.
        </DialogDescription>

        {isLoading ? (
          <div className='flex h-[500px] flex-col items-center justify-center gap-3'>
            <RefreshCw className='h-10 w-10 animate-spin text-primary/40' />
            <p className='font-medium text-base text-muted-foreground'>
              Buscando dossiê da negociação...
            </p>
          </div>
        ) : error || !deal ? (
          <div className='flex h-[500px] flex-col items-center justify-center p-6 text-center'>
            <div className='mb-4 rounded-full bg-muted/50 p-4'>
              <ShieldAlert className='h-8 w-8 text-muted-foreground' />
            </div>
            <h3 className='mb-1 font-semibold text-xl'>Algo deu errado</h3>
            <p className='text-muted-foreground'>
              Não foi possível carregar os detalhes desta negociação agora.
            </p>
          </div>
        ) : (
          <>
            {/* Header Sticky */}
            <div className='flex items-center justify-between border-b bg-muted/20 px-8 py-5 backdrop-blur-md'>
              <div className='flex items-center gap-4'>
                <div
                  className='h-4 w-4 rounded-full shadow-sm ring-4 ring-background'
                  style={{ backgroundColor: deal.stage.color }}
                />
                <div className='flex flex-col'>
                  <span className='font-bold text-lg leading-tight'>
                    {lead?.name || 'Lead sem nome'}
                  </span>
                  <div className='mt-0.5 flex items-center gap-2'>
                    <Badge
                      variant='outline'
                      className='h-5 px-1.5 font-black text-[10px] uppercase'
                    >
                      {typeof deal.status === 'string' ? deal.status : deal.status.name || 'Aberta'}
                    </Badge>
                    <span className='font-medium text-[10px] text-muted-foreground'>
                      ID: {deal.id.split('-')[0].toUpperCase()}
                    </span>
                  </div>
                </div>
              </div>
              <div className='flex items-center gap-3'>
                <button
                  type='button'
                  onClick={() => onOpenChange(false)}
                  className='rounded-full p-2 transition-all hover:bg-muted active:scale-95'
                >
                  <X className='h-5 w-5 text-muted-foreground' />
                </button>
              </div>
            </div>

            <div className='custom-scrollbar flex-1 overflow-y-auto bg-background'>
              <div className='grid h-full grid-cols-1 gap-0 lg:grid-cols-12'>
                {/* COLUNA ESQUERDA: INFORMAÇÕES DO LEAD E INTELIGÊNCIA */}
                <div className='min-w-0 space-y-10 border-border/40 border-r p-8 lg:col-span-7'>
                  {/* Perfil do Lead */}
                  <div className='flex items-start gap-6'>
                    <Avatar className='h-24 w-24 border-4 border-muted shadow-sm'>
                      <AvatarImage src={lead?.profilePicUrl || undefined} />
                      <AvatarFallback className='bg-primary/5 font-bold text-3xl text-primary uppercase'>
                        {lead?.name?.substring(0, 2) || 'LE'}
                      </AvatarFallback>
                    </Avatar>
                    <div className='flex-1 space-y-4'>
                      <div>
                        <h2 className='font-extrabold text-3xl text-foreground tracking-tight'>
                          {lead?.name || 'Lead'}
                        </h2>
                        <div className='mt-2 flex items-center gap-3 text-muted-foreground'>
                          <div className='flex items-center gap-1.5 rounded-full border bg-muted/50 px-2.5 py-1 font-medium text-xs'>
                            <Smartphone className='h-3.5 w-3.5' />
                            {lead?.phone || 'Sem telefone'}
                          </div>
                          {lead?.pushName && (
                            <span className='text-xs italic'>aka "{lead.pushName}"</span>
                          )}
                        </div>
                      </div>

                      <div className='flex items-center gap-2'>
                        <Button
                          variant='outline'
                          size='sm'
                          className='h-8 gap-2 font-semibold text-xs'
                        >
                          <ExternalLink className='h-3 w-3' />
                          Ver ficha do lead
                        </Button>
                      </div>
                    </div>
                  </div>

                  <Separator className='opacity-60' />

                  {/* Inteligência da Conversa - Ocupa o centro do palco */}
                  <div className='space-y-4'>
                    <div className='flex items-center gap-2'>
                      <Activity className='h-4 w-4 text-primary' />
                      <h3 className='font-bold text-muted-foreground/80 text-sm uppercase tracking-widest'>
                        Inteligência & Timeline
                      </h3>
                    </div>
                    <div className='rounded-2xl border bg-muted/5 p-1'>
                      <ConversationIntelligencePanel
                        conversationId={deal.conversationId}
                        organizationId={organizationId}
                        projectId={projectId}
                      />
                    </div>
                  </div>
                </div>

                {/* COLUNA DIREITA: STATUS, VALORES E MÉTRICAS DA NEGOCIAÇÃO */}
                <div className='flex min-w-0 flex-col space-y-8 bg-muted/5 p-8 lg:col-span-5'>
                  {/* Gestão de Etapa e Valor */}
                  <div className='grid grid-cols-1 gap-6 rounded-3xl border bg-card p-6 shadow-sm'>
                    <div className='space-y-3'>
                      <Label className='font-black text-[11px] text-primary uppercase tracking-[0.15em]'>
                        Etapa no Pipeline
                      </Label>
                      <Select value={deal.stage.id} onValueChange={handleUpdateStage}>
                        <SelectTrigger className='h-12 w-full border-2 border-border/50 bg-background shadow-sm transition-all hover:border-primary/30'>
                          <SelectValue>
                            <div className='flex items-center gap-3'>
                              <div
                                className='h-3 w-3 rounded-full shadow-inner'
                                style={{ backgroundColor: deal.stage.color }}
                              />
                              <span className='font-bold text-base'>{deal.stage.name}</span>
                            </div>
                          </SelectValue>
                        </SelectTrigger>
                        <SelectContent className='rounded-xl'>
                          {stages.map((stage) => (
                            <SelectItem key={stage.id} value={stage.id} className='py-3'>
                              <div className='flex items-center gap-3'>
                                <div
                                  className='h-2.5 w-2.5 rounded-full'
                                  style={{ backgroundColor: stage.color }}
                                />
                                <span className='font-semibold text-sm'>{stage.name}</span>
                              </div>
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    <div className='space-y-3 pt-2'>
                      <Label className='font-black text-[11px] text-primary uppercase tracking-[0.15em]'>
                        Valor Previsto
                      </Label>
                      <div className='group flex h-14 items-center rounded-2xl border-2 border-emerald-500/30 border-dashed bg-emerald-500/5 px-4 transition-all hover:bg-emerald-500/10'>
                        <DollarSign className='mr-3 h-6 w-6 text-emerald-600' />
                        <span className='font-black text-2xl text-emerald-700 tracking-tight'>
                          {formatCurrencyBRL(deal.dealValue)}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* KPIs de Atendimento Rápidos */}
                  <div className='space-y-4'>
                    <h3 className='px-2 font-bold text-muted-foreground/80 text-sm uppercase tracking-widest'>
                      Dossiê de Vendas
                    </h3>
                    <div className='grid grid-cols-2 gap-4'>
                      <div className='col-span-2 flex items-center justify-between rounded-2xl border bg-card p-5 shadow-sm'>
                        <div className='flex items-center gap-3'>
                          <div className='rounded-xl bg-primary/10 p-2'>
                            <MessageSquare className='h-5 w-5 text-primary' />
                          </div>
                          <span className='font-bold text-muted-foreground text-xs uppercase tracking-tight'>
                            Interações
                          </span>
                        </div>
                        <div className='flex items-center gap-4 font-black text-sm'>
                          <div
                            className='flex items-center gap-1 text-emerald-600'
                            title='Mensagens Enviadas'
                          >
                            <ArrowUpRight className='h-4 w-4' />
                            {deal.outboundMessagesCount}
                          </div>
                          <Separator orientation='vertical' className='h-4' />
                          <div
                            className='flex items-center gap-1 text-blue-600'
                            title='Mensagens Recebidas'
                          >
                            <ArrowDownRight className='h-4 w-4' />
                            {deal.inboundMessagesCount}
                          </div>
                        </div>
                      </div>

                      <div className='flex flex-col gap-2 rounded-2xl border bg-card p-5 shadow-sm'>
                        <div className='flex items-center gap-2'>
                          <Timer className='h-4 w-4 text-muted-foreground' />
                          <span className='font-black text-[10px] text-muted-foreground uppercase tracking-widest'>
                            Resposta
                          </span>
                        </div>
                        <span className='font-black text-foreground text-xl'>
                          {formatTimer(deal.firstResponseTimeSec)}
                        </span>
                      </div>

                      <div className='flex flex-col gap-2 rounded-2xl border bg-card p-5 shadow-sm'>
                        <div className='flex items-center gap-2'>
                          <Activity className='h-4 w-4 text-muted-foreground' />
                          <span className='font-black text-[10px] text-muted-foreground uppercase tracking-widest'>
                            Resolução
                          </span>
                        </div>
                        <span className='font-black text-foreground text-xl'>
                          {formatTimer(deal.resolutionTimeSec)}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Atribuição & Origem */}
                  <div className='space-y-4'>
                    <h3 className='px-2 font-bold text-muted-foreground/80 text-sm uppercase tracking-widest'>
                      Atribuição (Meta Ads)
                    </h3>
                    <div className='space-y-4 rounded-2xl border-2 border-muted bg-muted/10 p-6'>
                      <div className='flex flex-col gap-1'>
                        <span className='font-black text-[10px] text-muted-foreground uppercase tracking-widest'>
                          Origem Principal
                        </span>
                        <span className='font-bold text-foreground text-sm'>
                          {deal.tracking?.sourceType?.toUpperCase() || 'DIRETO / ORGÂNICO'}
                        </span>
                      </div>
                      {deal.tracking?.utmCampaign && (
                        <div className='flex flex-col gap-1'>
                          <span className='font-black text-[10px] text-muted-foreground uppercase tracking-widest'>
                            Campanha Ativa
                          </span>
                          <span className='font-semibold text-primary/90 text-sm'>
                            {deal.tracking.utmCampaign}
                          </span>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Responsável (Footer da Sidebar) */}
                  <div className='mt-auto border-t pt-6'>
                    <div className='flex flex-col gap-3'>
                      <Label className='font-black text-[10px] text-muted-foreground uppercase tracking-[0.2em]'>
                        Responsável pela Conta
                      </Label>
                      <div className='flex items-center gap-4 rounded-2xl border bg-card p-3 shadow-sm'>
                        <Avatar className='h-10 w-10 ring-2 ring-muted'>
                          <AvatarImage src={deal.assignee?.image || undefined} />
                          <AvatarFallback className='bg-primary/10 font-bold text-primary'>
                            {deal.assignee?.name?.substring(0, 2) || 'NA'}
                          </AvatarFallback>
                        </Avatar>
                        <div className='flex flex-col'>
                          <span className='font-black text-foreground text-sm'>
                            {deal.assignee?.name || 'Não atribuído'}
                          </span>
                          <span className='max-w-[200px] truncate text-[10px] text-muted-foreground'>
                            {deal.assignee?.email || 'Aguardando atribuição'}
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </>
        )}
      </DialogContent>
    </Dialog>
  )
}
