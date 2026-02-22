'use client'

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import axios from 'axios'
import { toast } from 'sonner'
import { useState } from 'react'
import { Plus, Trash2, Key, Database, Pencil } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Switch } from '@/components/ui/switch'
import { Skeleton } from '@/components/ui/skeleton'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog"
import { Label } from '@/components/ui/label'

interface MetaPixelsConfigAreaProps {
    organizationId: string | undefined
}

export function MetaPixelsConfigArea({ organizationId }: MetaPixelsConfigAreaProps) {
    const queryClient = useQueryClient()
    const [isDialogOpen, setIsDialogOpen] = useState(false)
    const [editingPixel, setEditingPixel] = useState<any>(null)
    const [formData, setFormData] = useState({ name: '', pixelId: '', capiToken: '' })

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
            if (!formData.name || !formData.pixelId || !formData.capiToken) {
                throw new Error("Preencha todos os campos")
            }
            return axios.post(`/api/v1/meta-ads/pixels`, {
                organizationId,
                ...formData
            })
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['meta-ads', 'pixels'] })
            toast.success('Pixel adicionado com sucesso!')
            setIsDialogOpen(false)
            setFormData({ name: '', pixelId: '', capiToken: '' })
        },
        onError: (err: any) => {
            toast.error(err?.response?.data?.error || err.message || 'Erro ao adicionar Pixel')
        }
    })

    const handleOpenCreate = () => {
        setEditingPixel(null)
        setFormData({ name: '', pixelId: '', capiToken: '' })
        setIsDialogOpen(true)
    }

    const handleOpenEdit = (pixel: any) => {
        setEditingPixel(pixel)
        setFormData({
            name: pixel.name || '',
            pixelId: pixel.pixelId || '',
            capiToken: pixel.capiToken || ''
        })
        setIsDialogOpen(true)
    }

    const handleSave = () => {
        if (editingPixel) {
            updateMutation.mutate({ id: editingPixel.id, data: formData })
        } else {
            createMutation.mutate()
        }
    }

    const updateMutation = useMutation({
        mutationFn: async ({ id, data }: { id: string, data: any }) => {
            return axios.patch(`/api/v1/meta-ads/pixels/${id}`, data)
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['meta-ads', 'pixels'] })
            toast.success('Configurações salvas')
            setIsDialogOpen(false)
        },
        onError: (err: any) => {
            toast.error(err?.response?.data?.error || 'Erro ao salvar configurações')
        }
    })

    const deleteMutation = useMutation({
        mutationFn: async (id: string) => {
            return axios.delete(`/api/v1/meta-ads/pixels/${id}`)
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['meta-ads', 'pixels'] })
            toast.success('Pixel removido')
        },
        onError: (err: any) => {
            toast.error(err?.response?.data?.error || 'Erro ao remover Pixel')
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
                <Button size="sm" className="gap-2" onClick={handleOpenCreate}>
                    <Plus className="h-4 w-4" />
                    Adicionar Dataset
                </Button>

                <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
                    <DialogContent>
                        <DialogHeader>
                            <DialogTitle>{editingPixel ? 'Editar Dataset (Pixel)' : 'Adicionar Novo Dataset (Pixel)'}</DialogTitle>
                        </DialogHeader>
                        <div className="space-y-4 py-4">
                            <div className="space-y-2">
                                <Label>Nome de Identificação</Label>
                                <Input
                                    placeholder="Ex: Pixel Principal"
                                    value={formData.name}
                                    onChange={e => setFormData({ ...formData, name: e.target.value })}
                                />
                            </div>
                            <div className="space-y-2">
                                <Label>ID do Dataset (Meta Pixel)</Label>
                                <Input
                                    placeholder="Ex: 123456789012345"
                                    value={formData.pixelId}
                                    onChange={e => setFormData({ ...formData, pixelId: e.target.value })}
                                />
                            </div>
                            <div className="space-y-2">
                                <Label>Token de Acesso (CAPI)</Label>
                                <Input
                                    placeholder="CAPI Access Token..."
                                    value={formData.capiToken}
                                    onChange={e => setFormData({ ...formData, capiToken: e.target.value })}
                                    type="password"
                                />
                            </div>
                        </div>
                        <DialogFooter>
                            <Button variant="outline" onClick={() => setIsDialogOpen(false)}>Cancelar</Button>
                            <Button
                                onClick={handleSave}
                                disabled={createMutation.isPending || updateMutation.isPending || !formData.name || !formData.pixelId || !formData.capiToken}
                            >
                                {createMutation.isPending || updateMutation.isPending ? 'Salvando...' : 'Salvar Dataset'}
                            </Button>
                        </DialogFooter>
                    </DialogContent>
                </Dialog>
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
                                                <div className="font-medium text-sm text-foreground mb-1">{pixel.name}</div>
                                                <div className="text-xs font-mono text-muted-foreground bg-muted/50 p-1 rounded inline-block">
                                                    ID: {pixel.pixelId.startsWith('temp_') ? 'Pendente' : pixel.pixelId}
                                                </div>
                                            </td>
                                            <td className="px-6 py-4">
                                                <div className="text-xs font-mono text-muted-foreground truncate max-w-[200px]" title={pixel.capiToken}>
                                                    {pixel.capiToken ? '••••••••••••••••••••' : 'Sem token'}
                                                </div>
                                            </td>
                                            <td className="px-6 py-4 text-center">
                                                <div className="flex items-center justify-center gap-3">
                                                    <span className={`text-[10px] font-medium ${pixel.isActive ? 'text-emerald-600' : 'text-muted-foreground'}`}>
                                                        {pixel.isActive ? 'ON' : 'OFF'}
                                                    </span>
                                                    <Switch
                                                        checked={pixel.isActive}
                                                        onCheckedChange={(val) => updateMutation.mutate({ id: pixel.id, data: { isActive: val } })}
                                                        className={pixel.isActive ? "data-[state=checked]:bg-emerald-500" : ""}
                                                    />
                                                </div>
                                            </td>
                                            <td className="px-6 py-4 text-right">
                                                <div className="flex items-center justify-end gap-1">
                                                    <Button
                                                        variant="ghost"
                                                        size="icon"
                                                        className="h-8 w-8 text-muted-foreground hover:text-primary"
                                                        onClick={() => handleOpenEdit(pixel)}
                                                    >
                                                        <Pencil className="h-4 w-4" />
                                                    </Button>
                                                    <Button
                                                        variant="ghost"
                                                        size="icon"
                                                        className="h-8 w-8 text-muted-foreground hover:text-destructive"
                                                        onClick={() => {
                                                            if (confirm("Deseja deletar este Pixel?")) {
                                                                deleteMutation.mutate(pixel.id)
                                                            }
                                                        }}
                                                    >
                                                        <Trash2 className="h-4 w-4" />
                                                    </Button>
                                                </div>
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
