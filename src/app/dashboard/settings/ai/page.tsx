'use client'

import React from 'react'
import { Sparkles, Plus, Edit2, Trash2, Bot, Puzzle } from 'lucide-react'
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
import { PageShell, PageHeader, PageContent } from '@/components/dashboard/layout'
import { LoadingCard, EmptyState } from '@/components/dashboard/states'

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
    <PageShell>
      <PageHeader
        title="IA Copilot Studio"
        description="Crie múltiplos agentes para interagir e auferir insights preciosos das suas conversas."
        icon={Sparkles}
        actions={
          <div className="flex items-center gap-2">
            <Button variant="outline" asChild className="gap-2">
              <Link href="/dashboard/settings/ai/skills">
                <Puzzle className="h-4 w-4" /> Skills
              </Link>
            </Button>
            <Button asChild className="gap-2">
              <Link href="/dashboard/settings/ai/new">
                <Plus className="h-4 w-4" /> Novo Agente
              </Link>
            </Button>
          </div>
        }
      />

      <PageContent>
        {isLoading && (
          <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
            <LoadingCard />
            <LoadingCard />
            <LoadingCard />
          </div>
        )}

        {!isLoading && agents.length === 0 && (
          <EmptyState
            icon={Bot}
            title="Nenhum Agente Criado"
            description="Você ainda não possui copilotos configurados. Que tal criar um Auditor de Vendas ou um Analista de Qualidade agora mesmo?"
            action={
              <Button asChild>
                <Link href="/dashboard/settings/ai/new">Criar Meu Primeiro Agente</Link>
              </Button>
            }
          />
        )}

        {!isLoading && agents.length > 0 && (
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
                <p className="text-muted-foreground line-clamp-3 text-sm">{agent.leanPrompt}</p>
                <div className="mt-4 flex flex-wrap gap-2">
                  <Badge variant="outline" className="text-[10px] uppercase">
                    {agent.triggers?.length || 0} Triggers
                  </Badge>
                  <Badge variant="outline" className="text-[10px] uppercase">
                    {agent.schemaFields?.length || 0} Campos
                  </Badge>
                  <Badge variant="outline" className="text-[10px] uppercase">
                    {agent.skillBindings?.length || 0} Skills
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
      </PageContent>
    </PageShell>
  )
}
