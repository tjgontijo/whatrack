'use client'

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Plus, Search, Trash2 } from 'lucide-react'
import React from 'react'
import { toast } from 'sonner'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'
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
import { Input } from '@/components/ui/input'
import { Skeleton } from '@/components/ui/skeleton'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { Textarea } from '@/components/ui/textarea'
import { apiFetch } from '@/lib/http/api-client'

interface OptOutItem {
  id: string
  phone: string
  source: string
  campaignId: string | null
  campaignName: string | null
  note: string | null
  createdAt: string
}

interface OptOutListResponse {
  items: OptOutItem[]
  total: number
  page: number
  pageSize: number
  totalPages: number
}

const SOURCE_BADGES: Record<string, 'default' | 'secondary' | 'outline'> = {
  MANUAL: 'secondary',
  CAMPAIGN_REPLY: 'outline',
  API: 'default',
}

const SOURCE_LABELS: Record<string, string> = {
  MANUAL: 'Manual',
  CAMPAIGN_REPLY: 'Resposta',
  API: 'API',
}

function formatDate(value: string) {
  return new Intl.DateTimeFormat('pt-BR', {
    dateStyle: 'short',
    timeStyle: 'short',
  }).format(new Date(value))
}

interface OptOutManagerProps {
  organizationId: string
}

export function OptOutManager({ organizationId }: OptOutManagerProps) {
  const queryClient = useQueryClient()
  const [page, setPage] = React.useState(1)
  const [phoneSearch, setPhoneSearch] = React.useState('')
  const [isAddOpen, setIsAddOpen] = React.useState(false)
  const [deleteId, setDeleteId] = React.useState<string | null>(null)
  const [formData, setFormData] = React.useState({ phone: '', note: '' })

  const { data, isLoading } = useQuery<OptOutListResponse>({
    queryKey: ['opt-outs', organizationId, page, phoneSearch],
    queryFn: async () => {
      const url = new URL('/api/v1/whatsapp/opt-outs', window.location.origin)
      url.searchParams.set('page', String(page))
      url.searchParams.set('pageSize', '20')
      if (phoneSearch) url.searchParams.set('phone', phoneSearch)
      const response = await apiFetch(url.toString(), { orgId: organizationId })
      return response as OptOutListResponse
    },
    enabled: !!organizationId,
  })

  const addMutation = useMutation({
    mutationFn: async () =>
      apiFetch('/api/v1/whatsapp/opt-outs', {
        method: 'POST',
        body: JSON.stringify({
          phone: formData.phone,
          source: 'MANUAL',
          note: formData.note || undefined,
        }),
        orgId: organizationId,
      }),
    onSuccess: () => {
      toast.success('Contato adicionado à blocklist')
      setFormData({ phone: '', note: '' })
      setIsAddOpen(false)
      setPage(1)
      queryClient.invalidateQueries({ queryKey: ['opt-outs'] })
    },
    onError: (err: any) => {
      if (err.message?.includes('409')) {
        toast.error('Este número já está na blocklist')
      } else {
        toast.error('Erro ao adicionar contato')
      }
    },
  })

  const deleteMutation = useMutation({
    mutationFn: async (optOutId: string) =>
      apiFetch(`/api/v1/whatsapp/opt-outs/${optOutId}`, {
        method: 'DELETE',
        orgId: organizationId,
      }),
    onSuccess: () => {
      toast.success('Contato removido da blocklist')
      setDeleteId(null)
      queryClient.invalidateQueries({ queryKey: ['opt-outs'] })
    },
    onError: () => {
      toast.error('Erro ao remover contato')
    },
  })

  const handlePhoneSearchChange = (value: string) => {
    setPhoneSearch(value)
    setPage(1)
  }

  const handleAddSubmit = () => {
    if (!formData.phone.trim()) {
      toast.error('Telefone é obrigatório')
      return
    }
    if (!formData.note.trim()) {
      toast.error('Motivo é obrigatório (mínimo 5 caracteres)')
      return
    }
    if (formData.note.length < 5) {
      toast.error('Motivo deve ter no mínimo 5 caracteres')
      return
    }
    addMutation.mutate()
  }

  return (
    <>
      <div className='space-y-4'>
        <div className='flex items-center justify-between'>
          <div className='flex flex-1 items-center gap-2'>
            <Search className='h-4 w-4 text-muted-foreground' />
            <Input
              placeholder='Buscar por telefone...'
              value={phoneSearch}
              onChange={(e) => handlePhoneSearchChange(e.target.value)}
              className='h-8 max-w-sm'
            />
          </div>
          <Button size='sm' onClick={() => setIsAddOpen(true)} disabled={addMutation.isPending}>
            <Plus className='h-4 w-4' />
            Adicionar
          </Button>
        </div>

        <Card>
          <CardHeader>
            <CardTitle className='text-base'>
              Blocklist {data && `(${data.total} contatos)`}
            </CardTitle>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className='space-y-2'>
                {Array(5)
                  .fill(0)
                  .map((_, i) => (
                    <Skeleton key={i} className='h-10 w-full' />
                  ))}
              </div>
            ) : (
              <div className='overflow-x-auto'>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Telefone</TableHead>
                      <TableHead>Fonte</TableHead>
                      <TableHead>Campanha</TableHead>
                      <TableHead>Motivo</TableHead>
                      <TableHead>Data</TableHead>
                      <TableHead className='w-10'>Ação</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {data?.items && data.items.length > 0 ? (
                      data.items.map((item) => (
                        <TableRow key={item.id}>
                          <TableCell className='font-medium'>{item.phone}</TableCell>
                          <TableCell>
                            <Badge variant={SOURCE_BADGES[item.source] || 'secondary'}>
                              {SOURCE_LABELS[item.source] || item.source}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            {item.campaignName ? (
                              <a href='#' className='text-blue-600 text-sm hover:underline'>
                                {item.campaignName}
                              </a>
                            ) : (
                              <span className='text-muted-foreground text-xs'>—</span>
                            )}
                          </TableCell>
                          <TableCell className='max-w-xs truncate text-muted-foreground text-sm'>
                            {item.note || '—'}
                          </TableCell>
                          <TableCell className='text-muted-foreground text-xs'>
                            {formatDate(item.createdAt)}
                          </TableCell>
                          <TableCell>
                            <Button
                              variant='ghost'
                              size='sm'
                              onClick={() => setDeleteId(item.id)}
                              disabled={deleteMutation.isPending}
                            >
                              <Trash2 className='h-4 w-4 text-red-500' />
                            </Button>
                          </TableCell>
                        </TableRow>
                      ))
                    ) : (
                      <TableRow>
                        <TableCell colSpan={6} className='py-8 text-center text-muted-foreground'>
                          Nenhum contato na blocklist
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </div>
            )}

            {data && data.totalPages > 1 && (
              <div className='flex items-center justify-between pt-4'>
                <p className='text-muted-foreground text-xs'>
                  Página {page} de {data.totalPages}
                </p>
                <div className='flex gap-2'>
                  <Button
                    variant='outline'
                    size='sm'
                    onClick={() => setPage(Math.max(1, page - 1))}
                    disabled={page === 1}
                  >
                    Anterior
                  </Button>
                  <Button
                    variant='outline'
                    size='sm'
                    onClick={() => setPage(Math.min(data.totalPages, page + 1))}
                    disabled={page === data.totalPages}
                  >
                    Próxima
                  </Button>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      <Dialog open={isAddOpen} onOpenChange={setIsAddOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Adicionar à Blocklist</DialogTitle>
            <DialogDescription>
              Adicione um número de telefone à blocklist para impedir que receba campanhas.
            </DialogDescription>
          </DialogHeader>
          <div className='space-y-4'>
            <div>
              <label className='font-medium text-sm'>Telefone *</label>
              <Input
                placeholder='+55 11 9999-9999'
                value={formData.phone}
                onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                disabled={addMutation.isPending}
              />
            </div>
            <div>
              <label className='font-medium text-sm'>Motivo *</label>
              <Textarea
                placeholder='Motivo da exclusão (mínimo 5 caracteres)'
                value={formData.note}
                onChange={(e) => setFormData({ ...formData, note: e.target.value })}
                disabled={addMutation.isPending}
                className='resize-none'
                rows={3}
              />
            </div>
            <div className='flex justify-end gap-2 pt-2'>
              <Button
                variant='outline'
                onClick={() => setIsAddOpen(false)}
                disabled={addMutation.isPending}
              >
                Cancelar
              </Button>
              <Button onClick={handleAddSubmit} disabled={addMutation.isPending}>
                Adicionar
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      <AlertDialog open={!!deleteId} onOpenChange={(open) => !open && setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Remover da Blocklist</AlertDialogTitle>
            <AlertDialogDescription>
              Ao remover, este número poderá receber campanhas futuras.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleteMutation.isPending}>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => deleteId && deleteMutation.mutate(deleteId)}
              disabled={deleteMutation.isPending}
              className='bg-red-600 hover:bg-red-700'
            >
              Remover
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  )
}
