'use client'

import { useQuery } from '@tanstack/react-query'
import {
  Activity,
  Clock,
  MessageSquare,
  TrendingUp,
  User,
  Megaphone,
} from 'lucide-react'
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion'
import { apiFetch } from '@/lib/http/api-client'
import type { ConversationIntelligenceDTO } from '../schemas/conversation-intelligence.schemas'

interface Props {
  conversationId: string
  organizationId: string
  projectId?: string
}

function formatSeconds(sec: number | null | undefined): string {
  if (sec === null || sec === undefined) return '—'
  const abs = Math.abs(sec)
  if (abs < 60) return `${sec}s`
  if (abs < 3600) {
    const m = Math.floor(abs / 60)
    const s = abs % 60
    return s > 0 ? `${Math.sign(sec) < 0 ? '-' : ''}${m}min ${s}s` : `${Math.sign(sec) < 0 ? '-' : ''}${m}min`
  }
  const h = Math.floor(abs / 3600)
  const m = Math.floor((abs % 3600) / 60)
  return m > 0
    ? `${Math.sign(sec) < 0 ? '-' : ''}${h}h ${m}min`
    : `${Math.sign(sec) < 0 ? '-' : ''}${h}h`
}

function formatDate(iso: string | null | undefined): string {
  if (!iso) return '—'
  return new Date(iso).toLocaleDateString('pt-BR', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  })
}

function formatCurrency(value: string | null | undefined): string {
  if (!value) return '—'
  const n = parseFloat(value)
  if (isNaN(n)) return '—'
  return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(n)
}

function Row({ label, value }: { label: string; value: string | number | null | undefined }) {
  if (value === null || value === undefined || value === '' || value === '—') return null
  return (
    <div className='flex items-start justify-between gap-2 border-border/10 border-b py-1.5 last:border-0'>
      <span className='font-medium text-[10px] text-muted-foreground uppercase tracking-wide shrink-0'>
        {label}
      </span>
      <span className='font-mono text-[11px] text-foreground/80 text-right break-all'>{value}</span>
    </div>
  )
}

export function ConversationIntelligencePanel({ conversationId, organizationId, projectId }: Props) {
  const { data, isLoading, error } = useQuery({
    queryKey: ['conversation-intelligence', conversationId, organizationId],
    queryFn: async () => {
      const res = await apiFetch(`/api/v1/conversations/${conversationId}/intelligence`, {
        orgId: organizationId,
        projectId,
      })
      return res as ConversationIntelligenceDTO
    },
    staleTime: 30_000,
    refetchOnWindowFocus: false,
    retry: 1,
  })

  if (isLoading) {
    return (
      <div className='space-y-2 pt-4 border-t border-border/40'>
        <div className='h-3 w-32 animate-pulse rounded bg-muted/50' />
        {[1, 2, 3].map((i) => (
          <div key={i} className='h-8 animate-pulse rounded bg-muted/30' />
        ))}
      </div>
    )
  }

  if (error || !data) return null

  const { timing, volume, pipeline, lead, attribution } = data

  const hasAttribution =
    attribution &&
    Object.values(attribution).some((v) => v !== null && v !== undefined && v !== '')

  const windowLabel = (() => {
    if (!pipeline) return null
    if (!pipeline.windowExpiresAt) return 'Sem janela'
    const rem = pipeline.windowSecondsRemaining
    if (rem === null) return '—'
    if (rem < 0) return `Expirada há ${formatSeconds(Math.abs(rem))}`
    return `Expira em ${formatSeconds(rem)}`
  })()

  return (
    <div className='pt-4 border-t border-border/40'>
      <h3 className='mb-3 font-bold text-muted-foreground text-[10px] uppercase tracking-wider px-1'>
        Dados da Conversa
      </h3>

      <Accordion type='multiple' className='rounded-lg border-border/40 text-xs'>

        {/* Atendimento */}
        <AccordionItem value='timing'>
          <AccordionTrigger className='px-3 py-2 text-[11px] font-semibold'>
            <div className='flex items-center gap-2'>
              <Clock className='h-3.5 w-3.5 text-muted-foreground' />
              Atendimento
            </div>
          </AccordionTrigger>
          <AccordionContent className='px-3 pb-3'>
            <Row label='1ª Resposta' value={formatSeconds(timing.firstResponseTimeSec)} />
            <Row label='Tempo médio resp.' value={formatSeconds(timing.avgResponseTimeSec)} />
            <Row label='Último msg do lead' value={formatSeconds(timing.secondsSinceLastInbound) + (timing.secondsSinceLastInbound !== null ? ' atrás' : '')} />
            <Row label='Último contato' value={formatSeconds(timing.secondsSinceLastOutbound) + (timing.secondsSinceLastOutbound !== null ? ' atrás' : '')} />
            <Row
              label='Quem falou por último'
              value={
                timing.lastMessageDirection === 'inbound'
                  ? 'Lead'
                  : timing.lastMessageDirection === 'outbound'
                    ? 'Você'
                    : null
              }
            />
          </AccordionContent>
        </AccordionItem>

        {/* Mensagens */}
        {volume && (
          <AccordionItem value='volume'>
            <AccordionTrigger className='px-3 py-2 text-[11px] font-semibold'>
              <div className='flex items-center gap-2'>
                <MessageSquare className='h-3.5 w-3.5 text-muted-foreground' />
                Mensagens
              </div>
            </AccordionTrigger>
            <AccordionContent className='px-3 pb-3'>
              <Row label='Recebidas' value={volume.inboundMessagesCount} />
              <Row label='Enviadas' value={volume.outboundMessagesCount} />
              <Row label='Total' value={volume.totalMessagesCount} />
              <Row
                label='Ratio in/out'
                value={
                  volume.inboundOutboundRatio !== null
                    ? volume.inboundOutboundRatio.toFixed(2)
                    : null
                }
              />
            </AccordionContent>
          </AccordionItem>
        )}

        {/* Pipeline */}
        {pipeline && (
          <AccordionItem value='pipeline'>
            <AccordionTrigger className='px-3 py-2 text-[11px] font-semibold'>
              <div className='flex items-center gap-2'>
                <TrendingUp className='h-3.5 w-3.5 text-muted-foreground' />
                Pipeline
              </div>
            </AccordionTrigger>
            <AccordionContent className='px-3 pb-3'>
              <Row label='Deal criado' value={formatSeconds(pipeline.dealAgeSec) + ' atrás'} />
              <Row
                label='Etapa atual há'
                value={pipeline.stageAgeSec !== null ? formatSeconds(pipeline.stageAgeSec) + ' atrás' : null}
              />
              <Row label='Janela WhatsApp' value={windowLabel} />
            </AccordionContent>
          </AccordionItem>
        )}

        {/* Lead */}
        {lead && (
          <AccordionItem value='lead'>
            <AccordionTrigger className='px-3 py-2 text-[11px] font-semibold'>
              <div className='flex items-center gap-2'>
                <User className='h-3.5 w-3.5 text-muted-foreground' />
                Lead
              </div>
            </AccordionTrigger>
            <AccordionContent className='px-3 pb-3'>
              <Row label='Negociações' value={lead.totalDeals} />
              <Row label='Valor gerado (LTV)' value={formatCurrency(lead.lifetimeValue)} />
              <Row label='Primeiro contato' value={formatDate(lead.firstMessageAt)} />
              <Row label='Cliente desde' value={formatDate(lead.leadCreatedAt)} />
            </AccordionContent>
          </AccordionItem>
        )}

        {/* Origem */}
        {hasAttribution && attribution && (
          <AccordionItem value='attribution'>
            <AccordionTrigger className='px-3 py-2 text-[11px] font-semibold'>
              <div className='flex items-center gap-2'>
                <Megaphone className='h-3.5 w-3.5 text-muted-foreground' />
                Origem
              </div>
            </AccordionTrigger>
            <AccordionContent className='px-3 pb-3'>
              <Row label='Tipo' value={attribution.sourceType} />
              <Row label='Fonte' value={attribution.utmSource} />
              <Row label='Meio' value={attribution.utmMedium} />
              <Row label='Campanha' value={attribution.utmCampaign ?? attribution.metaCampaignName} />
              <Row label='Conjunto' value={attribution.metaAdSetName} />
              <Row label='Anúncio' value={attribution.metaAdName} />
              <Row label='Conteúdo' value={attribution.utmContent} />
              <Row label='Termo' value={attribution.utmTerm} />
              <Row label='Landing page' value={attribution.landingPage} />
              <Row label='Referrer' value={attribution.referrerUrl} />
              <Row label='ID Meta' value={attribution.ctwaclid} />
              <Row label='ID Google' value={attribution.gclid} />
              <Row label='ID Facebook' value={attribution.fbclid} />
            </AccordionContent>
          </AccordionItem>
        )}

      </Accordion>
    </div>
  )
}
