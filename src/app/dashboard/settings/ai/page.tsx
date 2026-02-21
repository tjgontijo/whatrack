'use client'

import React, { useState, useEffect } from 'react'
import { Sparkles, Save, ShieldCheck } from 'lucide-react'
import { toast } from 'sonner'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'
import { Textarea } from '@/components/ui/textarea'
import { Button } from '@/components/ui/button'

const DEFAULT_PROMPT = `Você é um Supervisor de Vendas Especialista operando como uma IA Copilot dentro de um CRM.
Sua missão é classificar a intenção e os valores baseando-se no fim da negociação pelo WhatsApp.
`

export default function AiSettingsPage() {
    const [isActive, setIsActive] = useState(true)
    const [instructions, setInstructions] = useState('')
    const [isLoading, setIsLoading] = useState(true)
    const [isSaving, setIsSaving] = useState(false)

    useEffect(() => {
        async function fetchSettings() {
            try {
                const res = await fetch('/api/v1/organizations/ai-settings')
                if (!res.ok) throw new Error()
                const data = await res.json()
                setIsActive(data.aiCopilotActive ?? true)
                setInstructions(data.aiCopilotInstructions || '')
            } catch {
                toast.error('Erro ao carregar configurações do Copilot.')
            } finally {
                setIsLoading(false)
            }
        }
        fetchSettings()
    }, [])

    const handleSave = async () => {
        setIsSaving(true)
        const toastId = toast.loading('Salvando Configurações...')
        try {
            const res = await fetch('/api/v1/organizations/ai-settings', {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    aiCopilotActive: isActive,
                    aiCopilotInstructions: instructions
                })
            })

            if (!res.ok) throw new Error()
            toast.success('Configurações salvas com sucesso.', { id: toastId })
        } catch {
            toast.error('Ocorreu um erro ao salvar as configurações.', { id: toastId })
        } finally {
            setIsSaving(false)
        }
    }

    if (isLoading) {
        return <div className="p-6 space-y-4 max-w-4xl opacity-50"><p>Carregando Copilot Config...</p></div>
    }

    return (
        <div className="p-6 max-w-4xl mx-auto space-y-8">
            <div>
                <h1 className="text-2xl font-bold tracking-tight mb-2 flex items-center gap-2">
                    <Sparkles className="h-6 w-6 text-primary" /> IA Copilot (Mastra)
                </h1>
                <p className="text-muted-foreground">
                    Treine seu agente inteligente de aprovações. Ele monitora silenciosamente os chats dos seus atendentes buscando a confirmação de venda.
                </p>
            </div>

            <Card className="border-border/50 bg-card shadow-sm">
                <CardHeader>
                    <CardTitle className="flex items-center gap-2 text-lg">
                        <ShieldCheck className="h-5 w-5 text-green-600" /> Ativação do Agente
                    </CardTitle>
                    <CardDescription>
                        Ligue ou desligue o robô responsável pelas inferências de vendas da sua caixa de entrada.
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    <div className="flex items-center justify-between p-4 bg-muted/20 border rounded-lg">
                        <div className="space-y-0.5">
                            <Label className="font-semibold text-base">Ativar Copilot</Label>
                            <p className="text-sm text-muted-foreground">Se ativo, ele varrerá conversas que estejam sem resposta do atendente para descobrir intenção de fechamento.</p>
                        </div>
                        <Switch
                            checked={isActive}
                            onCheckedChange={setIsActive}
                            className="data-[state=checked]:bg-primary"
                        />
                    </div>
                </CardContent>
            </Card>

            <Card className="border-border/50 bg-card shadow-sm">
                <CardHeader>
                    <CardTitle className="text-lg">Instruções de Sistema (System Prompt)</CardTitle>
                    <CardDescription>
                        Descreva como o agente deve raciocinar e quais produtos da sua empresa ele deve prestar mais atenção. Ex: "Sou uma clínica focada em implantes".
                    </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                    <div className="space-y-2">
                        <Label>Prompt Customizado</Label>
                        <Textarea
                            placeholder={DEFAULT_PROMPT}
                            value={instructions}
                            onChange={(e) => setInstructions(e.target.value)}
                            className="min-h-[200px] font-mono text-sm leading-relaxed whitespace-pre-wrap resize-none focus-visible:ring-primary"
                        />
                        <p className="text-xs text-muted-foreground pt-1">
                            Deixe em branco para usar o raciocínio padrão. DICA: Peça à IA para focar especialmente nos seus produtos mais rentáveis (ex: "Se o cliente confirmar PIX do Curso VIP, retorne SALE").
                        </p>
                    </div>

                    <Button onClick={handleSave} disabled={isSaving} className="w-full sm:w-auto mt-4 px-8">
                        {isSaving ? 'Salvando...' : <><Save className="h-4 w-4 mr-2" /> Salvar Configurações</>}
                    </Button>
                </CardContent>
            </Card>
        </div>
    )
}
