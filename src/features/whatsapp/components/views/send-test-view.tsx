'use client'

import React from 'react'
import { Send, Smartphone, CheckCircle2, MessageSquare, Code } from 'lucide-react'
import { useMutation, useQuery } from '@tanstack/react-query'
import { whatsappApi } from '../../api/whatsapp'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Label } from '@/components/ui/label'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { toast } from 'sonner'
import type { WhatsAppPhoneNumber, WhatsAppTemplate } from '../../types'

interface SendTestViewProps {
    phone: WhatsAppPhoneNumber
}

export function SendTestView({ phone }: SendTestViewProps) {
    const [recipientPhone, setRecipientPhone] = React.useState('')
    const [selectedTemplateName, setSelectedTemplateName] = React.useState('')
    const [lastResponse, setLastResponse] = React.useState<any>(null)

    const { data: templates } = useQuery<WhatsAppTemplate[]>({
        queryKey: ['whatsapp', 'templates'],
        queryFn: () => whatsappApi.getTemplates(),
    })

    const approvedTemplates = templates?.filter(t => t.status === 'APPROVED') || []
    const selectedTemplate = approvedTemplates.find(t => t.name === selectedTemplateName)

    const sendMutation = useMutation({
        mutationFn: ({ to, template }: { to: string; template: string }) =>
            whatsappApi.sendTemplate(to, template),
        onSuccess: (data) => {
            setLastResponse(data)
            toast.success("Mensagem enviada com sucesso!", {
                description: `Template entregue para ${recipientPhone}`
            })
            setRecipientPhone('')
        },
        onError: (error: any) => {
            setLastResponse({ error: error.message || "Erro desconhecido" })
            toast.error("Falha no envio", {
                description: error.message || "Tente novamente mais tarde."
            })
        }
    })

    const handleSend = () => {
        if (!recipientPhone || !selectedTemplateName) {
            toast.error("Preencha todos os campos")
            return
        }
        sendMutation.mutate({ to: recipientPhone, template: selectedTemplateName })
    }

    return (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 animate-in fade-in slide-in-from-bottom-2 duration-500">
            {/* Formulário de Envio */}
            <div className="lg:col-span-2 space-y-6">
                <Card className="border-primary/20 shadow-sm">
                    <CardHeader>
                        <div className="flex items-center gap-2">
                            <Send className="h-5 w-5 text-primary" />
                            <CardTitle>Nova Mensagem</CardTitle>
                        </div>
                        <CardDescription>
                            Envie mensagens de teste para validar seus templates aprovados.
                        </CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-6 p-6">
                        <div className="space-y-2">
                            <Label htmlFor="template">Template Aprovado</Label>
                            <Select value={selectedTemplateName} onValueChange={setSelectedTemplateName}>
                                <SelectTrigger className="h-11">
                                    <SelectValue placeholder="Selecione um template..." />
                                </SelectTrigger>
                                <SelectContent>
                                    {approvedTemplates.map(t => (
                                        <SelectItem key={t.name} value={t.name}>
                                            <div className="flex items-center justify-between w-full gap-2">
                                                <span className="font-medium">{t.name}</span>
                                                <span className="text-xs text-muted-foreground uppercase">{t.language}</span>
                                            </div>
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                            <p className="text-[11px] text-muted-foreground font-medium flex items-center gap-1.5 mt-1">
                                <CheckCircle2 className="h-3 w-3 text-green-500" />
                                Mostrando apenas templates aprovados pela Meta
                            </p>
                        </div>

                        <div className="space-y-2">
                            <Label htmlFor="phone">Telefone do Destinatário</Label>
                            <div className="relative">
                                <Smartphone className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                                <Input
                                    id="phone"
                                    placeholder="+55 11 99999-9999"
                                    className="pl-9 h-11"
                                    value={recipientPhone}
                                    onChange={(e) => setRecipientPhone(e.target.value)}
                                />
                            </div>
                            <p className="text-xs text-muted-foreground">
                                Utilize o formato internacional (ex: +55...)
                            </p>
                        </div>

                        <div className="pt-4">
                            <Button
                                className="w-full h-11 text-base font-bold shadow-md hover:shadow-lg transition-all"
                                onClick={handleSend}
                                disabled={sendMutation.isPending || !recipientPhone || !selectedTemplateName}
                            >
                                {sendMutation.isPending ? "Enviando..." : "Enviar Mensagem de Teste"}
                            </Button>
                        </div>
                    </CardContent>
                </Card>

                {/* Resposta da API JSON */}
                {lastResponse && (
                    <Card className="border-muted bg-muted/10 overflow-hidden animate-in fade-in slide-in-from-top-2 duration-300">
                        <CardHeader className="py-3 px-4 border-b bg-muted/20">
                            <div className="flex items-center justify-between">
                                <div className="flex items-center gap-2">
                                    <Code className="h-4 w-4 text-muted-foreground" />
                                    <CardTitle className="text-sm font-bold">Resposta da API (Meta Cloud)</CardTitle>
                                </div>
                                <div className="flex items-center gap-1">
                                    <Button
                                        variant="ghost"
                                        size="sm"
                                        className="h-7 text-[10px] font-bold uppercase tracking-wider h-6 gap-1"
                                        onClick={() => {
                                            navigator.clipboard.writeText(JSON.stringify(lastResponse, null, 2));
                                            toast.success("JSON copiado!");
                                        }}
                                    >
                                        Copiar
                                    </Button>
                                    <Button
                                        variant="ghost"
                                        size="sm"
                                        className="h-7 text-[10px] font-bold uppercase tracking-wider h-6"
                                        onClick={() => setLastResponse(null)}
                                    >
                                        Limpar
                                    </Button>
                                </div>
                            </div>
                        </CardHeader>
                        <CardContent className="p-0">
                            <pre className="p-4 text-[11px] font-mono leading-relaxed overflow-x-auto bg-black/5 dark:bg-white/5 max-h-[300px] scrollbar-hide">
                                {JSON.stringify(lastResponse, null, 2)}
                            </pre>
                        </CardContent>
                    </Card>
                )}
            </div>

            {/* Preview do Dispositivo */}
            <div className="relative mx-auto w-[280px] lg:w-full max-w-[320px]">
                <div className="relative border-gray-800 bg-gray-800 border-[12px] rounded-[2.5rem] h-[580px] w-full shadow-xl">
                    <div className="h-[32px] w-[3px] bg-gray-800 absolute -start-[15px] top-[72px] rounded-s-lg border border-r-0 border-gray-600 opacity-40"></div>
                    <div className="h-[46px] w-[3px] bg-gray-800 absolute -start-[15px] top-[124px] rounded-s-lg border border-r-0 border-gray-600 opacity-40"></div>
                    <div className="h-[46px] w-[3px] bg-gray-800 absolute -start-[15px] top-[178px] rounded-s-lg border border-r-0 border-gray-600 opacity-40"></div>
                    <div className="h-[64px] w-[3px] bg-gray-800 absolute -end-[15px] top-[142px] rounded-e-lg border border-l-0 border-gray-600 opacity-40"></div>

                    <div className="rounded-[1.8rem] overflow-hidden w-full h-full bg-[#E5DDD5] relative flex flex-col">
                        {/* Header do WhatsApp Mock */}
                        <div className="bg-[#075E54] h-16 w-full flex items-center px-4 pt-4 gap-3 text-white shadow-sm z-10">
                            <div className="h-8 w-8 rounded-full bg-white/20 flex items-center justify-center text-xs font-bold">
                                {phone.display_phone_number.slice(-2)}
                            </div>
                            <div className="flex-1 overflow-hidden">
                                <p className="text-sm font-bold truncate">{phone.verified_name}</p>
                                <p className="text-[10px] opacity-80">Conta Comercial</p>
                            </div>
                        </div>

                        {/* Corpo da Mensagem Mock */}
                        <div className="flex-1 p-3 overflow-y-auto">
                            {selectedTemplate ? (
                                <div className="bg-white p-3 rounded-lg rounded-tl-none shadow-sm max-w-[90%] text-sm text-gray-800 relative">
                                    <div className="font-bold text-[#075E54] text-xs mb-1">
                                        {selectedTemplate.category.replace('_', ' ')}
                                    </div>
                                    <p className="whitespace-pre-wrap">
                                        {/* Tentativa de mostrar o corpo, fallback para um texto genérico */}
                                        {selectedTemplate.components?.find((c: any) => c.type === 'BODY')?.text || "Conteúdo do template será exibido aqui..."}
                                    </p>
                                    <span className="text-[10px] text-gray-400 block text-right mt-1">
                                        Agora
                                    </span>
                                </div>
                            ) : (
                                <div className="flex flex-col items-center justify-center h-full text-gray-400 gap-2 opacity-60">
                                    <MessageSquare className="h-8 w-8" />
                                    <p className="text-xs text-center px-4">
                                        Selecione um template para ver a prévia
                                    </p>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    )
}
