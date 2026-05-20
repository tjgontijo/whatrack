'use client'

import { ArrowLeft, CheckCircle2, DollarSign, MessageSquare, Trash2 } from 'lucide-react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { HeaderPageShell } from '@/features/dashboard/components/layout'
import { useRequiredProjectRouteContext } from '@/features/projects/hooks/use-project-route-context'
import { formatCurrencyBRL } from '@/lib/mask/formatters'
import type { DealItem } from '../types'
import { useDealDetailsQuery } from '../queries/use-deal-details-query'
import { ItemPicker } from '../components/detail/item-picker'
import { useAddDealItemMutation } from '../mutations/use-add-deal-item-mutation'
import { useUpdateDealItemMutation } from '../mutations/use-update-deal-item-mutation'
import { useDeleteDealItemMutation } from '../mutations/use-delete-deal-item-mutation'
import { useCloseDealMutation } from '../mutations/use-close-deal-mutation'

interface DealDetailScreenProps {
  dealId: string
  initialData: DealItem
}

export function DealDetailScreen({ dealId, initialData }: DealDetailScreenProps) {
  const { organizationId, organizationSlug, projectSlug } = useRequiredProjectRouteContext()
  const router = useRouter()

  const { data: deal } = useDealDetailsQuery(dealId, organizationId, initialData)
  const addDealItemMutation = useAddDealItemMutation(dealId, organizationId)
  const updateDealItemMutation = useUpdateDealItemMutation(dealId, organizationId)
  const deleteDealItemMutation = useDeleteDealItemMutation(dealId, organizationId)
  const closeDealMutation = useCloseDealMutation(dealId, organizationId)

  const basePath = `/${organizationSlug}/${projectSlug}`
  const inboxPath = `${basePath}/whatsapp/inbox`

  const handleAddItem = (item: { itemId?: string; name: string; unitPrice: number }) => {
    addDealItemMutation.mutate({
      itemId: item.itemId,
      name: item.name,
      unitPrice: item.unitPrice,
      quantity: 1,
      total: item.unitPrice,
    })
  }

  const handleUpdateDiscount = (lineItemId: string, currentDiscount: number | null) => {
    const value = window.prompt('Valor do desconto (R$):', (currentDiscount || 0).toString())
    if (value !== null) {
      const discount = parseFloat(value)
      if (!Number.isNaN(discount)) {
        updateDealItemMutation.mutate({
          lineItemId,
          data: { discountAmount: discount },
        })
      }
    }
  }

  const handleCloseWon = () => {
    closeDealMutation.mutate({
      reason: 'won',
      dealValue: deal.dealValue || 0,
    })
  }

  const isClosed = deal.status !== 'open'

  return (
    <HeaderPageShell
      title={deal.name || deal.lead.name || 'Negociação'}
      actions={
        <div className='flex items-center gap-2'>
          <Button
            variant='outline'
            size='sm'
            className='h-8 text-xs'
            onClick={() => router.push(`${basePath}/deals`)}
          >
            <ArrowLeft className='mr-2 h-3.5 w-3.5' />
            Voltar
          </Button>
          <Button size='sm' className='h-8 text-xs' asChild>
            <Link href={inboxPath}>
              <MessageSquare className='mr-2 h-3.5 w-3.5' />
              Ir para Inbox
            </Link>
          </Button>
        </div>
      }
    >
      <div className='grid grid-cols-1 gap-6 lg:grid-cols-12'>
        {/* Coluna Principal */}
        <div className='space-y-6 lg:col-span-8'>
          {/* Card de Resumo de Conversa */}
          <div className='rounded-xl border bg-card p-6 shadow-sm'>
            <h3 className='mb-4 font-bold text-muted-foreground text-xs uppercase tracking-widest'>
              Resumo da Negociação
            </h3>
            <div className='flex items-start gap-4'>
              <div className='rounded-full bg-primary/10 p-3'>
                <MessageSquare className='h-5 w-5 text-primary' />
              </div>
              <div>
                <p className='text-muted-foreground text-sm leading-relaxed'>
                  Esta negociação foi iniciada via WhatsApp. 
                  {deal.lineItems && deal.lineItems.length > 0 
                    ? ` O cliente está interessado em ${deal.lineItems.length} item(s).` 
                    : " Adicione itens ao lado para compor a nota de atribuição."}
                </p>
              </div>
            </div>
          </div>

          {/* Seção de Itens */}
          <div className='rounded-xl border bg-card p-6 shadow-sm'>
            <div className='mb-6 flex items-center justify-between'>
              <div>
                <h3 className='font-bold text-muted-foreground text-xs uppercase tracking-widest'>
                  Itens da Negociação
                </h3>
                <p className='text-[10px] text-muted-foreground'>Estes itens serão enviados como 'contents' na Meta CAPI</p>
              </div>
              {!isClosed && <ItemPicker onSelect={handleAddItem} />}
            </div>
            
            {deal.lineItems && deal.lineItems.length > 0 ? (
              <div className='space-y-4'>
                <div className='overflow-hidden rounded-lg border'>
                  <table className='w-full text-left text-sm'>
                    <thead className='bg-muted/50 text-[10px] text-muted-foreground uppercase'>
                      <tr>
                        <th className='px-4 py-2 font-bold'>Produto/Serviço</th>
                        <th className='px-4 py-2 text-right font-bold'>Qtd</th>
                        <th className='px-4 py-2 text-right font-bold'>Unitário</th>
                        <th className='px-4 py-2 text-right font-bold text-primary/70'>Desc.</th>
                        <th className='px-4 py-2 text-right font-bold'>Subtotal</th>
                        {!isClosed && <th className='w-20 px-4 py-2'></th>}
                      </tr>
                    </thead>
                    <tbody className='divide-y'>
                      {deal.lineItems.map((item) => (
                        <tr key={item.id} className='group hover:bg-muted/30'>
                          <td className='px-4 py-3'>
                            <div className='flex flex-col'>
                              <span className='font-semibold'>{item.name}</span>
                              {item.itemId && <span className='text-[10px] text-muted-foreground'>ID: {item.itemId.split('-')[0]}</span>}
                            </div>
                          </td>
                          <td className='px-4 py-3 text-right'>{item.quantity}</td>
                          <td className='px-4 py-3 text-right'>{formatCurrencyBRL(item.unitPrice)}</td>
                          <td className='px-4 py-3 text-right text-destructive/80'>{item.discountAmount ? `-${formatCurrencyBRL(item.discountAmount)}` : '—'}</td>
                          <td className='px-4 py-3 text-right font-bold text-muted-foreground'>{formatCurrencyBRL(item.total)}</td>
                          {!isClosed && (
                            <td className='px-4 py-3 text-right'>
                              <div className='flex justify-end gap-1'>
                                <Button 
                                  variant='ghost' 
                                  size='icon-xs' 
                                  className='h-6 w-6 text-muted-foreground hover:text-primary'
                                  title='Editar desconto'
                                  onClick={() => handleUpdateDiscount(item.id, item.discountAmount)}
                                >
                                  <DollarSign className='h-3 w-3' />
                                </Button>
                                <Button 
                                  variant='ghost' 
                                  size='icon-xs' 
                                  className='h-6 w-6 text-muted-foreground hover:text-destructive'
                                  onClick={() => deleteDealItemMutation.mutate(item.id)}
                                  disabled={deleteDealItemMutation.isPending}
                                >
                                  <Trash2 className='h-3.5 w-3.5' />
                                </Button>
                              </div>
                            </td>
                          )}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                <div className='flex items-center justify-between px-4 py-2'>
                  <span className='font-bold text-muted-foreground text-xs uppercase'>Valor Final para Atribuição</span>
                  <div className='text-right'>
                    <span className='mr-2 text-muted-foreground text-xs uppercase'>{deal.currency}</span>
                    <span className='font-black text-2xl text-primary tracking-tight'>{formatCurrencyBRL(deal.dealValue)}</span>
                  </div>
                </div>
              </div>
            ) : (
              <div className='flex h-32 flex-col items-center justify-center rounded-xl border-2 border-dashed bg-muted/5'>
                <p className='mb-2 text-muted-foreground text-sm'>Nenhum item adicionado.</p>
                <p className='text-muted-foreground text-xs'>O valor total atual é {formatCurrencyBRL(deal.dealValue)}</p>
              </div>
            )}
          </div>
        </div>

        {/* Sidebar */}
        <div className='space-y-6 lg:col-span-4'>
          {/* Card de Fechamento */}
          <div className='rounded-xl border bg-primary/5 p-6 shadow-sm ring-1 ring-primary/10'>
            <div className='space-y-6'>
              <div>
                <span className='block font-bold text-[10px] text-muted-foreground uppercase tracking-[0.2em]'>Controle Comercial</span>
                <div className='mt-2 flex items-center justify-between'>
                  <Badge variant='outline' className='bg-background font-black text-[10px] uppercase'>
                    {deal.status}
                  </Badge>
                  <span className='font-bold text-[10px] text-muted-foreground uppercase'>{deal.stage.name}</span>
                </div>
              </div>

              {!isClosed ? (
                <div className='space-y-3'>
                   <Button 
                    className='w-full gap-2 font-bold uppercase tracking-wider' 
                    size='sm'
                    disabled={closeDealMutation.isPending}
                    onClick={handleCloseWon}
                   >
                    <CheckCircle2 className='h-4 w-4' />
                    {closeDealMutation.isPending ? 'Processando...' : 'Marcar como Ganho'}
                  </Button>
                  <p className='text-center text-[10px] text-muted-foreground leading-tight'>
                    Ao clicar em Ganho, enviaremos o evento de Purchase para a Meta Ads.
                  </p>
                </div>
              ) : (
                <div className='rounded-lg bg-green-500/10 p-4 text-center'>
                   <span className='font-bold text-green-700 text-sm'>Negociação Concluída</span>
                   <p className='mt-1 text-[10px] text-green-600/80 uppercase'>Evento Purchase enviado via CAPI</p>
                </div>
              )}
            </div>
          </div>

          {/* Dados do Cliente */}
          <div className='rounded-xl border bg-card p-6 shadow-sm'>
            <h3 className='mb-4 font-bold text-muted-foreground text-xs uppercase tracking-widest'>
              Dados do Cliente
            </h3>
            <div className='space-y-4'>
              <div className='flex items-center gap-3'>
                <div className='flex h-10 w-10 items-center justify-center rounded-full bg-muted font-bold text-muted-foreground text-xs uppercase'>
                  {deal.lead.name?.substring(0, 2) || 'LE'}
                </div>
                <div className='flex flex-col'>
                  <span className='font-bold text-sm'>{deal.lead.name || 'Sem nome'}</span>
                  <span className='text-muted-foreground text-xs'>{deal.lead.phone || 'Sem telefone'}</span>
                </div>
              </div>
              <Button variant='outline' size='xs' className='w-full text-[10px] uppercase tracking-wide' asChild>
                <Link href={`${basePath}/leads`}>Ver ficha do lead</Link>
              </Button>
            </div>
          </div>

           {/* Metadados de Tracking */}
           <div className='rounded-xl border bg-card p-6 shadow-sm'>
            <h3 className='mb-4 font-bold text-muted-foreground text-xs uppercase tracking-widest'>
              Atribuição Ads
            </h3>
            <div className='space-y-3'>
              <div className='flex flex-col gap-0.5'>
                <span className='text-[10px] text-muted-foreground uppercase'>Origem</span>
                <span className='font-semibold text-xs'>{deal.tracking?.sourceType?.toUpperCase() || 'ORGÂNICO'}</span>
              </div>
              {deal.tracking?.utmSource && (
                <div className='flex flex-col gap-0.5'>
                  <span className='text-[10px] text-muted-foreground uppercase'>Fonte (UTM)</span>
                  <span className='font-semibold text-primary text-xs'>{deal.tracking.utmSource}</span>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </HeaderPageShell>
  )
}
