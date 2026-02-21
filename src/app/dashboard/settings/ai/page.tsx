'use client'

import React, { useState, useEffect } from 'react'
import { Sparkles, Plus, Edit2, Trash2, Power, PowerOff, Bot } from 'lucide-react'
import { toast } from 'sonner'
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import Link from 'next/link'
import { Badge } from '@/components/ui/badge'

export default function AiAgentsPage() {
    const [agents, setAgents] = useState<any[]>([])
    const [isLoading, setIsLoading] = useState(true)

    useEffect(() => {
        fetchAgents()
    }, [])

    const fetchAgents = async () => {
        setIsLoading(true)
        try {
            const res = await fetch('/api/v1/ai-agents')
            if (!res.ok) throw new Error()
            const data = await res.json()
            setAgents(data.agents || [])
        } catch {
            toast.error('Erro ao carregar agentes de IA.')
        } finally {
            setIsLoading(false)
        }
    }

    const handleDelete = async (id: string, name: string) => {
        if (!confirm(`Tem certeza que deseja apagar o agente "${name}"?`)) return

        const toastId = toast.loading('Apagando agente...')
        try {
            const res = await fetch(`/api/v1/ai-agents/${id}`, { method: 'DELETE' })
            if (!res.ok) throw new Error()
            toast.success('Agente apagado com sucesso.', { id: toastId })
            fetchAgents()
        } catch {
            toast.error('Erro ao apagar agente.', { id: toastId })
        }
    }

    return (
        <div className="p-6 max-w-6xl mx-auto space-y-8">
            <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
                <div>
                    <h1 className="text-2xl font-bold tracking-tight mb-2 flex items-center gap-2">
                        <Sparkles className="h-6 w-6 text-primary" /> IA Copilot Studio
                    </h1>
                    <p className="text-muted-foreground">
                        Crie múltiplos agentes para interagir e auferir insights preciosos das suas conversas.
                    </p>
                </div>
                <Button asChild className="gap-2">
                    <Link href="/dashboard/settings/ai/new">
                        <Plus className="h-4 w-4" /> Novo Agente
                    </Link>
                </Button>
            </div>

            {isLoading ? (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 opacity-50">
                    <Card className="h-48 flex items-center justify-center">Carregando...</Card>
                </div>
            ) : agents.length === 0 ? (
                <Card className="flex flex-col items-center justify-center p-12 text-center border-dashed">
                    <Bot className="h-12 w-12 text-muted-foreground mb-4 opacity-50" />
                    <CardTitle className="mb-2">Nenhum Agente Criado</CardTitle>
                    <CardDescription className="mb-6 max-w-md mx-auto">
                        Você ainda não possui copilotos configurados. Que tal criar um Auditor de Vendas ou um Analista de Qualidade agora mesmo?
                    </CardDescription>
                    <Button asChild>
                        <Link href="/dashboard/settings/ai/new">Criar Meu Primeiro Agente</Link>
                    </Button>
                </Card>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {agents.map(agent => (
                        <Card key={agent.id} className="flex flex-col">
                            <CardHeader className="flex flex-row items-start justify-between pb-2 space-y-0">
                                <div className="space-y-1">
                                    <CardTitle className="flex items-center gap-2 text-lg">
                                        <Bot className="h-5 w-5 text-primary" />
                                        {agent.name}
                                    </CardTitle>
                                    <div className="flex items-center gap-2 mt-2">
                                        <Badge variant={agent.isActive ? 'default' : 'secondary'} className={agent.isActive ? "bg-green-600 hover:bg-green-700" : ""}>
                                            {agent.isActive ? 'Ativo' : 'Pausado'}
                                        </Badge>
                                        <span className="text-xs text-muted-foreground">{agent.model}</span>
                                    </div>
                                </div>
                            </CardHeader>
                            <CardContent className="flex-1 py-4">
                                <p className="text-sm text-muted-foreground line-clamp-3">
                                    {agent.systemPrompt}
                                </p>
                                <div className="mt-4 flex flex-wrap gap-2">
                                    <Badge variant="outline" className="text-[10px] uppercase">
                                        {agent.triggers?.length || 0} Triggers
                                    </Badge>
                                    <Badge variant="outline" className="text-[10px] uppercase">
                                        {agent.schemaFields?.length || 0} Campos
                                    </Badge>
                                </div>
                            </CardContent>
                            <CardFooter className="pt-4 border-t flex items-center justify-between gap-2">
                                <Button variant="ghost" size="sm" asChild className="flex-1">
                                    <Link href={`/dashboard/settings/ai/${agent.id}`}>
                                        <Edit2 className="h-4 w-4 mr-2" /> Editar
                                    </Link>
                                </Button>
                                <Button variant="ghost" size="sm" onClick={() => handleDelete(agent.id, agent.name)} className="text-destructive hover:text-destructive hover:bg-destructive/10 flex-1">
                                    <Trash2 className="h-4 w-4 mr-2" /> Apagar
                                </Button>
                            </CardFooter>
                        </Card>
                    ))}
                </div>
            )}
        </div>
    )
}
