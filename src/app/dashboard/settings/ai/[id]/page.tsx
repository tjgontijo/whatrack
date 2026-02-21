'use client'

import React, { useState, useEffect } from 'react'
import { useRouter, useParams } from 'next/navigation'
import {
    ChevronLeft, Plus, Save, Trash2, Bot, Play, Pause, Search, Target, Tags, FileOutput
} from 'lucide-react'
import { toast } from 'sonner'

import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Switch } from '@/components/ui/switch'
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Checkbox } from '@/components/ui/checkbox'

export default function AiAgentBuilder() {
    const router = useRouter()
    const params = useParams()
    const id = Array.isArray(params.id) ? params.id[0] : params.id
    const isNew = id === 'new'

    // Form State
    const [name, setName] = useState('')
    const [systemPrompt, setSystemPrompt] = useState('')
    const [model, setModel] = useState('llama-3.3-70b-versatile')
    const [isActive, setIsActive] = useState(true)

    // Triggers State
    const [triggers, setTriggers] = useState<any[]>([])

    // Schema Fields State
    const [schemaFields, setSchemaFields] = useState<any[]>([])

    const [isLoading, setIsLoading] = useState(!isNew)
    const [isSaving, setIsSaving] = useState(false)

    useEffect(() => {
        if (!isNew) {
            fetchAgent()
        }
    }, [isNew])

    const fetchAgent = async () => {
        setIsLoading(true)
        try {
            const res = await fetch(`/api/v1/ai-agents/${id}`)
            if (!res.ok) throw new Error()
            const data = await res.json()
            const agent = data.agent

            setName(agent.name)
            setSystemPrompt(agent.systemPrompt)
            setModel(agent.model)
            setIsActive(agent.isActive)
            setTriggers(agent.triggers || [])
            setSchemaFields(agent.schemaFields || [])
        } catch {
            toast.error('Erro ao carregar o agente.')
            router.push('/dashboard/settings/ai')
        } finally {
            setIsLoading(false)
        }
    }

    const handleAddTrigger = () => {
        setTriggers([...triggers, { eventType: 'TICKET_WON', conditions: {} }])
    }

    const handleUpdateTrigger = (index: number, val: string) => {
        const t = [...triggers]
        t[index].eventType = val
        setTriggers(t)
    }

    const handleRemoveTrigger = (index: number) => {
        setTriggers(triggers.filter((_, i) => i !== index))
    }

    const handleAddField = () => {
        setSchemaFields([...schemaFields, { fieldName: '', fieldType: 'STRING', description: '', isRequired: true }])
    }

    const handleUpdateField = (index: number, key: string, val: any) => {
        const f = [...schemaFields]
        f[index][key] = val
        setSchemaFields(f)
    }

    const handleRemoveField = (index: number) => {
        setSchemaFields(schemaFields.filter((_, i) => i !== index))
    }

    const handleSave = async () => {
        // Validation
        if (!name.trim() || !systemPrompt.trim() || triggers.length === 0 || schemaFields.length === 0) {
            toast.error('Preencha Nome, Prompt, e adicione pelo menos um Trigger e um Schema Field.')
            return
        }

        setIsSaving(true)
        const toastId = toast.loading('Salvando agente...')

        const payload = {
            name,
            systemPrompt,
            model,
            isActive,
            triggers,
            schemaFields
        }

        try {
            const url = isNew ? '/api/v1/ai-agents' : `/api/v1/ai-agents/${id}`
            const method = isNew ? 'POST' : 'PATCH'

            const res = await fetch(url, {
                method,
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload)
            })

            if (!res.ok) throw new Error()
            toast.success('Agente salvo com sucesso!', { id: toastId })
            router.push('/dashboard/settings/ai')
        } catch {
            toast.error('Falha ao salvar agente.', { id: toastId })
        } finally {
            setIsSaving(false)
        }
    }

    if (isLoading) return <div className="p-8">Carregando Studio...</div>

    return (
        <div className="p-6 max-w-5xl mx-auto space-y-6">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                    <Button variant="ghost" size="icon" onClick={() => router.back()}>
                        <ChevronLeft className="h-4 w-4" />
                    </Button>
                    <div>
                        <h1 className="text-2xl font-bold tracking-tight flex items-center gap-2">
                            {isNew ? 'Criar Novo Copiloto' : 'Editar Copiloto'}
                        </h1>
                        <p className="text-sm text-muted-foreground">
                            Configure o papel da IA, quando ela deve acordar, e o que ela deve extrair.
                        </p>
                    </div>
                </div>
                <div className="flex items-center gap-4">
                    <div className="flex items-center gap-2 mr-4">
                        <Label>Agente Ativo?</Label>
                        <Switch checked={isActive} onCheckedChange={setIsActive} />
                    </div>
                    <Button onClick={handleSave} disabled={isSaving}>
                        <Save className="h-4 w-4 mr-2" /> {isSaving ? 'Salvando...' : 'Salvar Agent'}
                    </Button>
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">

                {/* 1. Nome e Cérebro */}
                <Card className="md:col-span-2">
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2 text-lg">
                            <Bot className="h-5 w-5 text-primary" /> Identidade e Cérebro
                        </CardTitle>
                        <CardDescription>Defina quem é o agente e como ele deve se comportar.</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <div className="space-y-2">
                            <Label>Nome do Agente</Label>
                            <Input
                                placeholder="Ex: Auditor de Tráfego CAPI"
                                value={name} onChange={(e) => setName(e.target.value)}
                            />
                        </div>
                        <div className="space-y-2">
                            <Label>System Prompt (Persona e Regras)</Label>
                            <Textarea
                                className="min-h-[160px] font-mono text-sm leading-relaxed whitespace-pre-wrap resize-none"
                                placeholder="Você é o inspetor de vendas. Analise o chat. Se o cliente falar que pagou via PIX ou boleto, classifique como SALE."
                                value={systemPrompt} onChange={(e) => setSystemPrompt(e.target.value)}
                            />
                        </div>
                        <div className="space-y-2">
                            <Label>Modelo LLM Base</Label>
                            <Select value={model} onValueChange={setModel}>
                                <SelectTrigger>
                                    <SelectValue placeholder="Escolha a inteligência" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="llama-3.3-70b-versatile">LLaMA 3.3 (70B) - Groq Rápido</SelectItem>
                                    <SelectItem value="gpt-4o-mini" disabled>GPT-4o Mini (Em breve)</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>
                    </CardContent>
                </Card>

                {/* 2. Triggers */}
                <Card>
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2 text-lg">
                            <Target className="h-5 w-5 text-destructive" /> Triggers (Gatilhos)
                        </CardTitle>
                        <CardDescription>Quando o agente deve analisar o CRM?</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        {triggers.length === 0 && (
                            <div className="text-sm text-center py-4 text-muted-foreground border border-dashed rounded-md">
                                Nenhum gatilho definido. O agente nunca vai acordar automático.
                            </div>
                        )}
                        {triggers.map((t, idx) => (
                            <div key={idx} className="flex flex-col gap-2 p-3 bg-muted/30 border rounded-md relative group">
                                <Label className="text-xs">Evento de Disparo</Label>
                                <Select value={t.eventType} onValueChange={(val) => handleUpdateTrigger(idx, val)}>
                                    <SelectTrigger className="h-8 text-xs">
                                        <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="TICKET_WON">Ticket Fechado (Ganhamos)</SelectItem>
                                        <SelectItem value="TICKET_LOST">Ticket Fechado (Perda/Lost)</SelectItem>
                                        <SelectItem value="TICKET_CLOSED">Sempre que um ticket for arquivado</SelectItem>
                                        <SelectItem value="CONVERSATION_IDLE_3M">3 Min sem Resposta na Caixa</SelectItem>
                                        <SelectItem value="NEW_MESSAGE_RECEIVED">Ao receber nova Mensagem Cliente</SelectItem>
                                    </SelectContent>
                                </Select>
                                <Button
                                    variant="ghost" size="icon"
                                    className="absolute -top-2 -right-2 h-6 w-6 opacity-0 group-hover:opacity-100 bg-destructive/10 text-destructive hover:bg-destructive hover:text-white rounded-full transition-all"
                                    onClick={() => handleRemoveTrigger(idx)}
                                >
                                    <Trash2 className="h-3 w-3" />
                                </Button>
                            </div>
                        ))}
                    </CardContent>
                    <CardFooter>
                        <Button variant="outline" size="sm" className="w-full border-dashed" onClick={handleAddTrigger}>
                            <Plus className="h-4 w-4 mr-2" /> Adicionar Gatilho
                        </Button>
                    </CardFooter>
                </Card>

                {/* 3. Output Schema (Zod) */}
                <Card className="md:col-span-3">
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2 text-lg">
                            <FileOutput className="h-5 w-5 text-indigo-500" /> Variáveis de Extração (Zod Dinâmico)
                        </CardTitle>
                        <CardDescription>O que o LLM deve garimpar dentro do histórico do WhatsApp e te entregar mastigado?</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <div className="grid grid-cols-12 gap-4 pb-2 border-b text-sm font-medium text-muted-foreground">
                            <div className="col-span-3">Propriedade (Inglês)</div>
                            <div className="col-span-3">Tipo do Dado</div>
                            <div className="col-span-4">Descrição (Guia pra IA achar isso)</div>
                            <div className="col-span-1 text-center">Obrig.</div>
                            <div className="col-span-1"></div>
                        </div>

                        {schemaFields.length === 0 && (
                            <div className="text-sm text-center py-8 text-muted-foreground border border-dashed rounded-md">
                                Você precisa adicionar pelo menos um campo que a IA vai preencher.
                            </div>
                        )}

                        {schemaFields.map((field, idx) => (
                            <div key={idx} className="grid grid-cols-12 gap-4 items-center">
                                <div className="col-span-3">
                                    <Input
                                        placeholder="Ex: dealValue"
                                        value={field.fieldName}
                                        onChange={(e) => handleUpdateField(idx, 'fieldName', e.target.value.replace(/[^a-zA-Z0-9_]/g, ''))}
                                    />
                                </div>
                                <div className="col-span-3">
                                    <Select value={field.fieldType} onValueChange={(val) => handleUpdateField(idx, 'fieldType', val)}>
                                        <SelectTrigger>
                                            <SelectValue />
                                        </SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="STRING">Texto Curto (String)</SelectItem>
                                            <SelectItem value="NUMBER">Número Decimal (Moeda)</SelectItem>
                                            <SelectItem value="BOOLEAN">Verdadeiro/Falso</SelectItem>
                                            <SelectItem value="ENUM">Lista Determinada (Ex: Níveis)</SelectItem>
                                        </SelectContent>
                                    </Select>
                                </div>
                                <div className="col-span-4">
                                    <Input
                                        placeholder="Descreva exatamente o que é isso para o Agente ler"
                                        value={field.description}
                                        onChange={(e) => handleUpdateField(idx, 'description', e.target.value)}
                                    />
                                </div>
                                <div className="col-span-1 text-center flex justify-center">
                                    <Checkbox
                                        checked={field.isRequired}
                                        onCheckedChange={(c) => handleUpdateField(idx, 'isRequired', c)}
                                    />
                                </div>
                                <div className="col-span-1 flex justify-end">
                                    <Button variant="ghost" size="icon" onClick={() => handleRemoveField(idx)} className="text-destructive">
                                        <Trash2 className="h-4 w-4" />
                                    </Button>
                                </div>
                            </div>
                        ))}
                    </CardContent>
                    <CardFooter>
                        <Button variant="outline" size="sm" onClick={handleAddField}>
                            <Plus className="h-4 w-4 mr-2" /> Adicionar Variável
                        </Button>
                    </CardFooter>
                </Card>

            </div>
        </div>
    )
}
