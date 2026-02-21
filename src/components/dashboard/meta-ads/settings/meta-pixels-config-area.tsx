'use client'

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import axios from 'axios'
import { toast } from 'sonner'
import { Plus, Trash2, Key, Database } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Switch } from '@/components/ui/switch'
import { Skeleton } from '@/components/ui/skeleton'

interface MetaPixelsConfigAreaProps {
    organizationId: string | undefined
}

export function MetaPixelsConfigArea({ organizationId }: MetaPixelsConfigAreaProps) {
    const queryClient = useQueryClient()

    const { data: pixels, isLoading } = useQuery({
        queryKey: ['meta-ads', 'pixels', organizationId],
        queryFn: async () => {
            const res = await axios.get(`/api/v1/meta-ads/pixels?organizationId=${organizationId}`)
            return res.data
        },
        enabled: !!organizationId
    })

    const createMutation = useMutation({
        mutationFn: async () => {
            return axios.post(`/api/v1/meta-ads/pixels`, {
                organizationId,
                name: 'Novo Pixel',
                pixelId: '',
                capiToken: ''
            })
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['meta-ads', 'pixels'] })
            toast.success('Pixel adicionado, preencha as informações.')
        }
    })

    const updateMutation = useMutation({
        mutationFn: async ({ id, data }: { id: string, data: any }) => {
            return axios.patch(`/api/v1/meta-ads/pixels/${id}`, data)
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['meta-ads', 'pixels'] })
            toast.success('Configurações salvas')
        }
    })

    const deleteMutation = useMutation({
        mutationFn: async (id: string) => {
            return axios.delete(`/api/v1/meta-ads/pixels/${id}`)
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['meta-ads', 'pixels'] })
            toast.success('Pixel removido')
        }
    })

    if (!organizationId) return null

    return (
        <section className="max-w-5xl mx-auto space-y-4">
            <div className="flex items-center justify-between">
                <h2 className="text-lg font-semibold flex items-center gap-2">
                    <Database className="h-5 w-5 text-indigo-500" />
                    Meta Datasets (Pixels) para Conversions API
                </h2>
                <Button
                    size="sm"
                    className="gap-2"
                    onClick={() => createMutation.mutate()}
                    disabled={createMutation.isPending}
                >
                    <Plus className="h-4 w-4" />
                    Adicionar Dataset
                </Button>
            </div>

            <Card>
                <CardContent className="p-0">
                    <div className="relative overflow-x-auto">
                        <table className="w-full text-sm text-left">
                            <thead className="text-xs uppercase bg-muted/50 border-b">
                                <tr>
                                    <th className="px-6 py-4 font-semibold w-64">Nome / ID do Pixel</th>
                                    <th className="px-6 py-4 font-semibold">Token de Acesso (CAPI)</th>
                                    <th className="px-6 py-4 font-semibold text-center w-24">Ativo?</th>
                                    <th className="px-6 py-4 font-semibold text-right w-16">Ações</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y">
                                {isLoading ? (
                                    [1, 2].map(i => (
                                        <tr key={i}><td colSpan={4} className="px-6 py-4"><Skeleton className="h-10 w-full" /></td></tr>
                                    ))
                                ) : (pixels?.length ?? 0) > 0 ? (
                                    pixels.map((pixel: any) => (
                                        <tr key={pixel.id} className="hover:bg-muted/20 transition-colors">
                                            <td className="px-6 py-4 space-y-2">
                                                <Input
                                                    placeholder="Nome de identificação"
                                                    defaultValue={pixel.name || ''}
                                                    className="h-8 text-xs font-semibold"
                                                    onBlur={(e) => {
                                                        if (e.target.value !== pixel.name) {
                                                            updateMutation.mutate({ id: pixel.id, data: { name: e.target.value } })
                                                        }
                                                    }}
                                                />
                                                <Input
                                                    placeholder="ID do Dataset (Ex: 123456789...)"
                                                    defaultValue={pixel.pixelId}
                                                    className="h-8 text-xs font-mono bg-muted/50"
                                                    onBlur={(e) => {
                                                        if (e.target.value !== pixel.pixelId) {
                                                            updateMutation.mutate({ id: pixel.id, data: { pixelId: e.target.value } })
                                                        }
                                                    }}
                                                />
                                            </td>
                                            <td className="px-6 py-4">
                                                <div className="relative">
                                                    <Key className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-muted-foreground" />
                                                    <Input
                                                        placeholder="Cole o longo Token de Acesso da Conversions API gerado no Facebook..."
                                                        defaultValue={pixel.capiToken}
                                                        type="password"
                                                        className="h-10 pl-8 text-xs font-mono"
                                                        onBlur={(e) => {
                                                            if (e.target.value !== pixel.capiToken) {
                                                                updateMutation.mutate({ id: pixel.id, data: { capiToken: e.target.value } })
                                                            }
                                                        }}
                                                    />
                                                </div>
                                            </td>
                                            <td className="px-6 py-4 text-center">
                                                <Switch
                                                    checked={pixel.isActive}
                                                    onCheckedChange={(val) => updateMutation.mutate({ id: pixel.id, data: { isActive: val } })}
                                                />
                                            </td>
                                            <td className="px-6 py-4 text-right">
                                                <Button
                                                    variant="ghost"
                                                    size="icon"
                                                    className="text-muted-foreground hover:text-destructive"
                                                    onClick={() => {
                                                        if (confirm("Deseja deletar este Pixel do WhaTrack? O rastreamento de CAPI será interrompido para ele.")) {
                                                            deleteMutation.mutate(pixel.id)
                                                        }
                                                    }}
                                                >
                                                    <Trash2 className="h-4 w-4" />
                                                </Button>
                                            </td>
                                        </tr>
                                    ))
                                ) : (
                                    <tr>
                                        <td colSpan={4} className="px-6 py-12 text-center text-muted-foreground italic">
                                            Nenhum Dataset/Pixel conectado. Adicione um novo para enviar eventos de conversão (CAPI).
                                        </td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                    </div>
                </CardContent>
            </Card>
        </section>
    )
}
