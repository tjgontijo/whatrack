'use client'

import { CheckCheck, ReceiptText } from 'lucide-react'
import { Virtuoso } from 'react-virtuoso'

import { formatCurrencyBRL, formatDateTime } from '@/lib/mask/formatters'

// Inline type definition (previously from @/schemas/lead-deals)
type LeadSale = {
  id: string
  amount: number | null
  createdAt: string
  updatedAt: string
  rawDescription?: unknown
  fbtraceId?: string | null
  services: Array<{
    name: string | null
    price: number | null
    quantity: number | null
  }>
  deal?: {
    stage?: { name: string } | null
    utmSource?: string | null
    utmMedium?: string | null
    utmCampaign?: string | null
    createdAt: string
  } | null
}

export type SalesListProps = {
  sales: LeadSale[]
}

export function SalesList({ sales }: SalesListProps) {
  if (!sales.length) {
    return (
      <div className='rounded-md border border-dashed p-4 text-muted-foreground text-sm'>
        Nenhuma venda registrada para este lead.
      </div>
    )
  }

  return (
    <Virtuoso
      data={sales}
      useWindowScroll
      overscan={200}
      itemContent={(_index, sale) => {
        const showFallback = sale.services.length === 0
        const fallbackDescription = showFallback ? formatRawDescription(sale.rawDescription) : ''
        const servicesTotal = sale.services.reduce((acc, service) => acc + (service.price ?? 0), 0)

        return (
          <div className='pb-3'>
            <div key={sale.id} className='rounded-md border bg-muted/20 p-4 text-sm'>
              <header className='flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between'>
                <div className='space-y-1'>
                  <p className='font-semibold text-base text-foreground'>
                    {formatCurrencyBRL(sale.amount)}
                  </p>
                  <p className='flex flex-wrap items-center gap-1 text-muted-foreground text-xs'>
                    <span>Registrada em {formatDateTime(sale.createdAt)}</span>
                    {sale.updatedAt !== sale.createdAt && (
                      <>
                        <span className='text-muted-foreground/60'>|</span>
                        <span>
                          <span className='font-medium text-foreground'>Atualizada em:</span>{' '}
                          {formatDateTime(sale.updatedAt)}
                        </span>
                      </>
                    )}
                  </p>
                </div>

                <div className='flex flex-wrap items-center gap-2 text-xs'>
                  {sale.fbtraceId && (
                    <span className='inline-flex items-center gap-1 rounded-full border border-emerald-500/50 bg-emerald-100 px-3 py-1 font-medium text-emerald-700'>
                      Conversion API (Meta) <CheckCheck className='h-4 w-4' />
                    </span>
                  )}
                </div>
              </header>

              {sale.deal && (
                <div className='mt-3 flex flex-wrap gap-2 text-xs'>
                  {renderTag('Estágio', sale.deal.stage?.name || 'Sem Estágio')}
                  {renderTag('Origem', sale.deal.utmSource)}
                  {renderTag('Meio', sale.deal.utmMedium)}
                  {renderTag('Campanha', sale.deal.utmCampaign)}
                  <span className='inline-flex items-center gap-1 rounded-full border border-muted-foreground/30 bg-muted/10 px-2 py-1'>
                    <span className='text-[10px] text-muted-foreground uppercase'>Criado</span>
                    <span className='font-medium text-foreground text-xs'>
                      {formatDateTime(sale.deal.createdAt)}
                    </span>
                  </span>
                </div>
              )}

              {sale.services.length > 0 && (
                <section className='mt-4 space-y-3'>
                  <div className='flex items-center gap-2 font-semibold text-muted-foreground text-xs uppercase tracking-wide'>
                    <ReceiptText className='h-4 w-4' aria-hidden='true' /> Serviços
                  </div>

                  <div className='overflow-hidden rounded-md border bg-background/80'>
                    <div className='hidden bg-muted/60 px-3 py-2 font-medium text-[11px] text-muted-foreground uppercase tracking-wide sm:grid sm:grid-cols-[minmax(0,2fr)_minmax(0,100px)]'>
                      <span>Serviço</span>
                      <span className='text-right'>Valor</span>
                    </div>

                    <ul className='divide-y divide-border text-xs'>
                      {sale.services.map((service, index) => (
                        <li
                          key={`${service.name ?? 'servico'}-${index}`}
                          className='grid gap-1 px-3 py-3 sm:grid-cols-[minmax(0,2fr)_minmax(0,100px)] sm:items-center'
                        >
                          <div className='space-y-1'>
                            <span className='font-medium text-foreground text-sm'>
                              {service.name ?? 'Serviço sem nome'}
                            </span>
                            {service.quantity !== null && (
                              <span className='text-[11px] text-muted-foreground uppercase tracking-wide'>
                                Quantidade:{' '}
                                <span className='font-semibold text-foreground'>
                                  {service.quantity}
                                </span>
                              </span>
                            )}
                          </div>
                          <span className='font-semibold text-foreground text-sm sm:text-right'>
                            {service.price !== null ? formatCurrencyBRL(service.price) : '—'}
                          </span>
                        </li>
                      ))}

                      <li className='grid gap-1 bg-muted/40 px-3 py-3 font-semibold text-foreground text-sm sm:grid-cols-[minmax(0,2fr)_minmax(0,100px)] sm:items-center'>
                        <span className='text-muted-foreground uppercase tracking-wide'>Total</span>
                        <span className='sm:text-right'>{formatCurrencyBRL(servicesTotal)}</span>
                      </li>
                    </ul>
                  </div>
                </section>
              )}

              {showFallback && fallbackDescription && (
                <details className='group mt-4'>
                  <summary className='cursor-pointer font-medium text-foreground text-xs underline'>
                    Ver descrição completa
                  </summary>
                  <pre className='mt-2 max-h-48 overflow-auto rounded bg-background/60 p-2 text-[11px] text-muted-foreground'>
                    {fallbackDescription}
                  </pre>
                </details>
              )}
            </div>
          </div>
        )
      }}
    />
  )
}

function renderTag(label: string, value: string | null | undefined) {
  if (!value) return null
  return (
    <span className='inline-flex items-center gap-1 rounded-full border border-muted-foreground/30 bg-muted/10 px-2 py-1'>
      <span className='text-[10px] text-muted-foreground uppercase'>{label}</span>
      <span className='font-medium text-foreground text-xs'>{value}</span>
    </span>
  )
}

function formatRawDescription(value: unknown): string {
  if (value === null || value === undefined) return ''

  if (typeof value === 'string') {
    const trimmed = value.trim()
    if (!trimmed) return ''
    try {
      const parsed = JSON.parse(trimmed)
      return formatRawDescription(parsed)
    } catch {
      return trimmed
    }
  }

  if (Array.isArray(value)) {
    const lines = value
      .map((item) => formatRawDescriptionItem(item))
      .filter((line): line is string => Boolean(line?.trim()))

    return lines.join('\n') || ''
  }

  if (typeof value === 'object') {
    const entries = Object.entries(value as Record<string, unknown>)
      .map(([key, val]) => {
        const formatted = formatRawDescription(val)
        if (!formatted) return null
        return `${key}: ${formatted}`
      })
      .filter((line): line is string => Boolean(line?.trim()))

    return entries.join('\n') || ''
  }

  return String(value)
}

function formatRawDescriptionItem(value: unknown): string | null {
  if (value === null || value === undefined) return null

  if (typeof value === 'string') {
    const trimmed = value.trim()
    return trimmed || null
  }

  if (typeof value === 'object') {
    const record = value as Record<string, unknown>
    const serviceName = firstNonEmpty(record, [
      'servico',
      'serviço',
      'serviço(s)',
      'descricao',
      'descrição',
      'name',
      'title',
    ])
    const serviceValue = firstNonEmpty(record, [
      'valor',
      'price',
      'preco',
      'preço',
      'value',
      'total',
    ])
    const serviceQty = firstNonEmpty(record, ['quantidade', 'quantity', 'qtde', 'qty'])

    const parts: string[] = []
    if (serviceName) parts.push(String(serviceName))
    if (serviceQty) parts.push(`Qtd: ${serviceQty}`)
    if (serviceValue) parts.push(`Valor: ${serviceValue}`)

    if (parts.length > 0) {
      return `• ${parts.join(' | ')}`
    }

    const formatted = Object.entries(record)
      .map(([key, val]) => {
        const normalized = formatRawDescription(val)
        if (!normalized) return null
        return `${key}: ${normalized}`
      })
      .filter((line): line is string => Boolean(line?.trim()))

    return formatted.length ? `• ${formatted.join(' | ')}` : null
  }

  return `• ${String(value)}`
}

function firstNonEmpty(record: Record<string, unknown>, candidates: string[]): string | null {
  for (const key of candidates) {
    const value = record[key]
    if (typeof value === 'string' && value.trim()) {
      return value.trim()
    }
  }
  return null
}
