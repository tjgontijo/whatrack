'use client'

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import axios from 'axios'
import { CheckCircle2, XCircle, Key } from 'lucide-react'
import { Switch } from '@/components/ui/switch'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Skeleton } from '@/components/ui/skeleton'
import { toast } from 'sonner'
import { useState } from 'react'

interface AdAccountConfigRowProps {
    acc: any
}

export function AdAccountConfigRow({ acc }: AdAccountConfigRowProps) {
    const queryClient = useQueryClient()
    const [localCapiToken, setLocalCapiToken] = useState(acc.capiToken || '')

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
                    <div className="space-y-3">
                        {loadingPixels ? (
                            <Skeleton className="h-8 w-full max-w-sm" />
                        ) : (
                            <div className="max-w-sm">
                                <Select
                                    value={acc.pixelId || undefined}
                                    onValueChange={(val) => updateAccountMutation.mutate({ pixelId: val })}
                                >
                                    <SelectTrigger className="h-8 text-xs font-mono w-full">
                                        <SelectValue placeholder="Selecione um Dataset/Pixel" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {(pixels?.length ?? 0) === 0 ? (
                                            <div className="p-2 text-xs text-muted-foreground">Nenhum pixel encontrado</div>
                                        ) : (
                                            pixels.map((pixel: any) => (
                                                <SelectItem key={pixel.id} value={pixel.id} className="text-xs">
                                                    {pixel.name} <span className="text-muted-foreground ml-1">({pixel.id})</span>
                                                </SelectItem>
                                            ))
                                        )}
                                    </SelectContent>
                                </Select>
                            </div>
                        )}
                        <div className="relative max-w-sm">
                            <Key className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-muted-foreground" />
                            <Input
                                placeholder="Token da API de Conversões (CAPI)"
                                value={localCapiToken}
                                type="password"
                                onChange={(e) => setLocalCapiToken(e.target.value)}
                                className="h-8 pl-8 text-xs font-mono"
                                onBlur={() => {
                                    if (localCapiToken !== acc.capiToken) {
                                        updateAccountMutation.mutate({ capiToken: localCapiToken })
                                    }
                                }}
                            />
                        </div>
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
