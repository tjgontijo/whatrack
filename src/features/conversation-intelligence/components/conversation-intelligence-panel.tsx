'use client'

import { useQuery } from '@tanstack/react-query'
import {
  Clock,
  Hash,
  Link2,
  Timer,
} from 'lucide-react'
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
      <div className='space-y-2'>
        {[1, 2, 3].map((i) => (
          <div key={i} className='h-8 animate-pulse rounded bg-muted/30' />
        ))}
      </div>
    )
  }

  if (error || !data) return null

  const { timing, volume, pipeline, attribution, computedAt } = data

  const windowLabel = (() => {
    if (!pipeline) return null
    if (!pipeline.windowExpiresAt) return 'Sem janela'
    const rem = pipeline.windowSecondsRemaining
    if (rem === null) return '—'
    if (rem < 0) return `Expirada há ${formatSeconds(Math.abs(rem))}`
    return `Expira em ${formatSeconds(rem)}`
  })()

  return (
    <div className='space-y-3'>
      <section className='rounded-md border border-border/40 bg-muted/10 p-2.5'>
        <div className='mb-2 flex items-center gap-2 text-[11px] font-semibold'>
          <Clock className='h-3.5 w-3.5 text-muted-foreground' />
          Determinístico
        </div>
        <Row label='Atualizado em' value={formatDate(computedAt)} />
        <Row label='Último msg do lead' value={formatSeconds(timing.secondsSinceLastInbound)} />
        <Row label='Último contato' value={formatSeconds(timing.secondsSinceLastOutbound)} />
        <Row label='Tempo médio resp.' value={formatSeconds(timing.avgResponseTimeSec)} />
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
      </section>

      {pipeline && (
        <section className='rounded-md border border-border/40 bg-muted/10 p-2.5'>
          <div className='mb-2 flex items-center gap-2 text-[11px] font-semibold'>
            <Timer className='h-3.5 w-3.5 text-muted-foreground' />
            Janela e Pipeline
          </div>
          <Row label='Deal criado' value={formatDate(pipeline.dealCreatedAt)} />
          <Row label='Deal aberto há' value={formatSeconds(pipeline.dealAgeSec)} />
          <Row label='Etapa atual há' value={formatSeconds(pipeline.stageAgeSec)} />
          <Row label='Janela WhatsApp' value={windowLabel} />
          <Row label='Janela aberta' value={pipeline.windowOpen ? 'Sim' : 'Não'} />
          <Row label='Expira em' value={formatDate(pipeline.windowExpiresAt)} />
        </section>
      )}

      {(attribution || volume) && (
        <section className='rounded-md border border-border/40 bg-muted/10 p-2.5'>
          <div className='mb-2 flex items-center gap-2 text-[11px] font-semibold'>
            <Hash className='h-3.5 w-3.5 text-muted-foreground' />
            IDs e Ratio
          </div>
          <Row label='Ratio in/out' value={volume?.inboundOutboundRatio?.toFixed(2)} />
          <Row label='ID Meta' value={attribution?.ctwaclid} />
          <Row label='ID Google' value={attribution?.gclid} />
          <Row label='ID Facebook' value={attribution?.fbclid} />
          <Row label='Landing page' value={attribution?.landingPage} />
          <Row label='Referrer' value={attribution?.referrerUrl} />
          <Row label='Campanha Meta' value={attribution?.metaCampaignName} />
          <Row label='Conjunto Meta' value={attribution?.metaAdSetName} />
          <Row label='Anúncio Meta' value={attribution?.metaAdName} />
          <Row label='Conteúdo UTM' value={attribution?.utmContent} />
          <Row label='Termo UTM' value={attribution?.utmTerm} />
        </section>
      )}

      <div className='flex items-center gap-2 px-1 text-[10px] text-muted-foreground'>
        <Link2 className='h-3 w-3' />
        Fonte: `/api/v1/conversations/{conversationId}/intelligence`
      </div>
    </div>
  )
}
