'use client'

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import axios from 'axios'
import { CheckCircle2, XCircle, Key } from 'lucide-react'
import { Switch } from '@/components/ui/switch'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Skeleton } from '@/components/ui/skeleton'
import { toast } from 'sonner'
import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Trash2, Plus } from 'lucide-react'

interface AdAccountConfigRowProps {
    acc: any
}

export function AdAccountConfigRow({ acc }: AdAccountConfigRowProps) {
    const queryClient = useQueryClient()
    const [localPixels, setLocalPixels] = useState<any[]>(acc.pixels || [])

    useEffect(() => {
        setLocalPixels(acc.pixels || [])
    }, [acc.pixels])

    const { data: pixels, isLoading: loadingPixels } = useQuery({
        queryKey: ['meta-ads', 'pixels', acc.id],
        queryFn: async () => {
            const res = await axios.get(`/api/v1/meta-ads/ad-accounts/${acc.id}/pixels`)
            return res.data
        },
        enabled: acc.isActive
    })

    const updateAccountMutation = useMutation({
        mutationFn: async (data: any) => {
            return axios.patch(`/api/v1/meta-ads/ad-accounts/${acc.id}`, data)
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['meta-ads', 'ad-accounts'] })
            toast.success('Configuração salva')
        }
    })

    return (
        <tr className="hover:bg-muted/20 transition-colors">
            <td className="px-6 py-4">
                <div className="font-medium text-foreground">{acc.adAccountName}</div>
                <div className="text-[10px] text-muted-foreground flex items-center gap-1 mt-0.5">
                    {acc.adAccountId}
                    {acc.isActive ? (
                        <CheckCircle2 className="h-3 w-3 text-emerald-500" />
                    ) : (
                        <XCircle className="h-3 w-3 text-muted-foreground/30" />
                    )}
                </div>
            </td>
            <td className="px-6 py-4">
                {acc.isActive ? (
                    <div className="space-y-4">
                        {loadingPixels ? (
                            <Skeleton className="h-8 w-full max-w-sm" />
                        ) : (
                            localPixels.map((p, index) => (
                                <div key={index} className="flex items-start gap-2 border-l-2 border-primary/20 pl-3">
                                    <div className="space-y-3 flex-1 max-w-sm">
                                        <Select
                                            value={p.pixelId || undefined}
                                            onValueChange={(val) => {
                                                const newPixels = [...localPixels]
                                                newPixels[index].pixelId = val
                                                setLocalPixels(newPixels)
                                                updateAccountMutation.mutate({ pixels: newPixels })
                                            }}
                                        >
                                            <SelectTrigger className="h-8 text-xs font-mono w-full">
                                                <SelectValue placeholder="Selecione um Dataset/Pixel" />
                                            </SelectTrigger>
                                            <SelectContent>
                                                {(pixels?.length ?? 0) === 0 ? (
                                                    <div className="p-2 text-xs text-muted-foreground">Nenhum pixel encontrado</div>
                                                ) : (
                                                    pixels.map((apiPixel: any) => (
                                                        <SelectItem key={apiPixel.id} value={apiPixel.id} className="text-xs">
                                                            {apiPixel.name} <span className="text-muted-foreground ml-1">({apiPixel.id})</span>
                                                        </SelectItem>
                                                    ))
                                                )}
                                            </SelectContent>
                                        </Select>

                                        <div className="relative">
                                            <Key className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-muted-foreground" />
                                            <Input
                                                placeholder="Token da API de Conversões (CAPI)"
                                                value={p.capiToken || ''}
                                                type="password"
                                                onChange={(e) => {
                                                    const newPixels = [...localPixels]
                                                    newPixels[index].capiToken = e.target.value
                                                    setLocalPixels(newPixels)
                                                }}
                                                className="h-8 pl-8 text-xs font-mono"
                                                onBlur={(e) => {
                                                    updateAccountMutation.mutate({ pixels: localPixels })
                                                }}
                                            />
                                        </div>
                                    </div>
                                    <Button
                                        variant="ghost"
                                        size="icon"
                                        className="h-8 w-8 text-muted-foreground hover:text-destructive shrink-0"
                                        onClick={() => {
                                            const newPixels = localPixels.filter((_, i) => i !== index)
                                            setLocalPixels(newPixels)
                                            updateAccountMutation.mutate({ pixels: newPixels })
                                        }}
                                    >
                                        <Trash2 className="h-4 w-4" />
                                    </Button>
                                </div>
                            ))
                        )}

                        <Button
                            variant="outline"
                            size="sm"
                            className="h-7 text-xs gap-1 border-dashed"
                            onClick={() => {
                                const newPixels = [...localPixels, { pixelId: '', capiToken: '' }]
                                setLocalPixels(newPixels)
                            }}
                        >
                            <Plus className="h-3 w-3" />
                            Adicionar Dataset
                        </Button>
                    </div>
                ) : (
                    <span className="text-xs text-muted-foreground italic">Ative o rastreamento primeiro.</span>
                )}
            </td>
            <td className="px-6 py-4 text-center">
                <Switch
                    checked={acc.isActive}
                    onCheckedChange={(val) => updateAccountMutation.mutate({ isActive: val })}
                />
            </td>
        </tr>
    )
}
