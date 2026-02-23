'use client'

import React from 'react'
import { Sparkles, Plus, Edit2, Trash2, Bot } from 'lucide-react'
import { toast } from 'sonner'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  CardFooter,
} from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import Link from 'next/link'
import { Badge } from '@/components/ui/badge'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'

export default function AiAgentsPage() {
  const queryClient = useQueryClient()

  const { data: agents = [], isLoading } = useQuery({
    queryKey: ['ai-agents'],
    queryFn: async () => {
      const res = await fetch('/api/v1/ai-agents')
      if (!res.ok) throw new Error('Erro ao carregar agentes de IA.')
      const data = await res.json()
      return data.agents || []
    },
  })

  const deleteMutation = useMutation({
    mutationFn: async ({ id, name }: { id: string; name: string }) => {
      const res = await fetch(`/api/v1/ai-agents/${id}`, { method: 'DELETE' })
      if (!res.ok) throw new Error()
      return name
    },
    onSuccess: (name) => {
      toast.success(`Agente "${name}" apagado com sucesso.`)
      queryClient.invalidateQueries({ queryKey: ['ai-agents'] })
    },
    onError: () => {
      toast.error('Erro ao apagar agente.')
    },
  })

  const handleDelete = (id: string, name: string) => {
    if (!confirm(`Tem certeza que deseja apagar o agente "${name}"?`)) return
    deleteMutation.mutate({ id, name })
  }

  return (
    <div className="mx-auto max-w-6xl space-y-8 p-6">
      <div className="flex flex-col items-center justify-between gap-4 sm:flex-row">
        <div>
          <h1 className="mb-2 flex items-center gap-2 text-2xl font-bold tracking-tight">
            <Sparkles className="text-primary h-6 w-6" /> IA Copilot Studio
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
        <div className="grid grid-cols-1 gap-6 opacity-50 md:grid-cols-2 lg:grid-cols-3">
          <Card className="flex h-48 items-center justify-center">Carregando...</Card>
        </div>
      ) : agents.length === 0 ? (
        <Card className="flex flex-col items-center justify-center border-dashed p-12 text-center">
          <Bot className="text-muted-foreground mb-4 h-12 w-12 opacity-50" />
          <CardTitle className="mb-2">Nenhum Agente Criado</CardTitle>
          <CardDescription className="mx-auto mb-6 max-w-md">
            Você ainda não possui copilotos configurados. Que tal criar um Auditor de Vendas ou um
            Analista de Qualidade agora mesmo?
          </CardDescription>
          <Button asChild>
            <Link href="/dashboard/settings/ai/new">Criar Meu Primeiro Agente</Link>
          </Button>
        </Card>
      ) : (
        <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
          {agents.map((agent: any) => (
            <Card key={agent.id} className="flex flex-col">
              <CardHeader className="flex flex-row items-start justify-between space-y-0 pb-2">
                <div className="space-y-1">
                  <CardTitle className="flex items-center gap-2 text-lg">
                    <Bot className="text-primary h-5 w-5" />
                    {agent.name}
                  </CardTitle>
                  <div className="mt-2 flex items-center gap-2">
                    <Badge
                      variant={agent.isActive ? 'default' : 'secondary'}
                      className={agent.isActive ? 'bg-green-600 hover:bg-green-700' : ''}
                    >
                      {agent.isActive ? 'Ativo' : 'Pausado'}
                    </Badge>
                    <span className="text-muted-foreground text-xs">{agent.model}</span>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="flex-1 py-4">
                <p className="text-muted-foreground line-clamp-3 text-sm">{agent.systemPrompt}</p>
                <div className="mt-4 flex flex-wrap gap-2">
                  <Badge variant="outline" className="text-[10px] uppercase">
                    {agent.triggers?.length || 0} Triggers
                  </Badge>
                  <Badge variant="outline" className="text-[10px] uppercase">
                    {agent.schemaFields?.length || 0} Campos
                  </Badge>
                </div>
              </CardContent>
              <CardFooter className="flex items-center justify-between gap-2 border-t pt-4">
                <Button variant="ghost" size="sm" asChild className="flex-1">
                  <Link href={`/dashboard/settings/ai/${agent.id}`}>
                    <Edit2 className="mr-2 h-4 w-4" /> Editar
                  </Link>
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => handleDelete(agent.id, agent.name)}
                  className="text-destructive hover:text-destructive hover:bg-destructive/10 flex-1"
                >
                  <Trash2 className="mr-2 h-4 w-4" /> Apagar
                </Button>
              </CardFooter>
            </Card>
          ))}
        </div>
      )}
    </div>
  )
}
