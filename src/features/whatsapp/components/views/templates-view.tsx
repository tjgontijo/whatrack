'use client'

import React from 'react'
import { FileText, CheckCircle2, XCircle, AlertCircle, ExternalLink } from 'lucide-react'
import { useQuery } from '@tanstack/react-query'
import { whatsappApi } from '../../api/whatsapp'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import type { WhatsAppPhoneNumber, WhatsAppTemplate } from '../../types'

interface TemplatesViewProps {
    phone: WhatsAppPhoneNumber
}

export function TemplatesView({ phone }: TemplatesViewProps) {
    const { data: templates, isLoading } = useQuery<WhatsAppTemplate[]>({
        queryKey: ['whatsapp', 'templates'],
        queryFn: () => whatsappApi.getTemplates(),
    })

    const getStatusColor = (status: string) => {
        switch (status) {
            case 'APPROVED': return 'text-green-600 bg-green-50 border-green-200'
            case 'REJECTED': return 'text-red-600 bg-red-50 border-red-200'
            case 'PENDING': return 'text-yellow-600 bg-yellow-50 border-yellow-200'
            default: return 'text-slate-600 bg-slate-50 border-slate-200'
        }
    }

    const getStatusIcon = (status: string) => {
        switch (status) {
            case 'APPROVED': return <CheckCircle2 className="h-3.5 w-3.5" />
            case 'REJECTED': return <XCircle className="h-3.5 w-3.5" />
            case 'PENDING': return <AlertCircle className="h-3.5 w-3.5" />
            default: return <AlertCircle className="h-3.5 w-3.5" />
        }
    }

    const getCategoryLabel = (category: string) => {
        const map: Record<string, string> = {
            'MARKETING': 'Marketing',
            'UTILITY': 'Utilidade',
            'AUTHENTICATION': 'Autenticação'
        }
        return map[category] || category
    }

    return (
        <div className="space-y-6 animate-in fade-in slide-in-from-bottom-2 duration-500 w-full">
            <div className="flex justify-between items-center pb-4 border-b">
                <div>
                    <h3 className="text-lg font-bold">Meus Templates</h3>
                    <p className="text-sm text-muted-foreground">Sincronizados com o Gerenciador do WhatsApp</p>
                </div>
                <Button variant="outline" size="sm" className="gap-2" asChild>
                    <a
                        href={`https://business.facebook.com/wa/manage/message-templates/`}
                        target="_blank"
                        rel="noopener noreferrer"
                    >
                        Criar Template <ExternalLink className="h-3 w-3" />
                    </a>
                </Button>
            </div>

            {isLoading ? (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                    {[1, 2, 3, 4].map((i) => (
                        <div key={i} className="h-32 rounded-xl bg-muted/40 animate-pulse" />
                    ))}
                </div>
            ) : !templates || templates.length === 0 ? (
                <div className="text-center py-12 bg-muted/20 rounded-xl border border-dashed w-full">
                    <FileText className="h-10 w-10 text-muted-foreground/30 mx-auto mb-4" />
                    <h3 className="text-sm font-semibold text-muted-foreground">Nenhum template encontrado</h3>
                </div>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                    {templates.map((template) => (
                        <Card key={template.name} className="hover:shadow-sm transition-all h-full flex flex-col">
                            <CardHeader className="pb-2">
                                <div className="flex items-start justify-between mb-2">
                                    <Badge variant="secondary" className="text-[10px] uppercase font-bold tracking-wider bg-muted text-muted-foreground">
                                        {getCategoryLabel(template.category)}
                                    </Badge>
                                    <Badge variant="outline" className={`gap-1.5 font-semibold ${getStatusColor(template.status)}`}>
                                        {getStatusIcon(template.status)}
                                        {template.status === 'APPROVED' ? 'Aprovado' : template.status}
                                    </Badge>
                                </div>
                                <CardTitle className="text-sm font-bold truncate" title={template.name}>
                                    {template.name}
                                </CardTitle>
                            </CardHeader>
                            <CardContent className="flex-1">
                                <div className="text-xs text-muted-foreground bg-muted/30 p-3 rounded-md line-clamp-3 min-h-[3.5rem] italic">
                                    {template.components?.find((c: any) => c.type === 'BODY')?.text || "Prévia não disponível"}
                                </div>
                                <div className="mt-3 flex items-center justify-between">
                                    <span className="text-[10px] font-mono text-muted-foreground bg-muted px-1.5 py-0.5 rounded">
                                        {template.language}
                                    </span>
                                </div>
                            </CardContent>
                        </Card>
                    ))}
                </div>
            )}
        </div>
    )
}
