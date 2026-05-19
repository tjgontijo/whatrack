'use client'

import { useState } from 'react'
import { toast } from 'sonner'
import { Zap, Trash2, RefreshCw, AlertTriangle } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog'
import { apiFetch } from '@/lib/http/api-client'
import { useRouter } from 'next/navigation'

interface DemoDataSettingsContentProps {
  organizationId: string
  projectId: string
}

export function DemoDataSettingsContent({ organizationId, projectId }: DemoDataSettingsContentProps) {
  const [count, setCount] = useState(10)
  const [isGenerating, setIsGenerating] = useState(false)
  const [isClearing, setIsClearing] = useState(false)
  const router = useRouter()

  const handleGenerate = async () => {
    setIsGenerating(true)
    try {
      await apiFetch('/api/v1/demo-data', {
        method: 'POST',
        body: JSON.stringify({ projectId, count }),
        orgId: organizationId,
      })
      toast.success(`${count} leads e negócios gerados com sucesso!`)
      router.refresh()
    } catch (error) {
      const msg = error instanceof Error ? error.message : 'Erro ao gerar dados de demonstração'
      toast.error(msg)
      console.error(error)
    } finally {
      setIsGenerating(false)
    }
  }

  const handleClear = async () => {
    setIsClearing(true)
    try {
      await apiFetch(`/api/v1/demo-data?projectId=${projectId}`, {
        method: 'DELETE',
        orgId: organizationId,
      })
      toast.success('Dados de demonstração removidos com sucesso!')
      router.refresh()
    } catch (error) {
      toast.error('Erro ao limpar dados de demonstração')
      console.error(error)
    } finally {
      setIsClearing(false)
    }
  }

  return (
    <div className="max-w-4xl space-y-6">
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <Zap className="h-5 w-5 text-amber-500" />
            <CardTitle>Modo de Demonstração</CardTitle>
          </div>
          <CardDescription>
            Gere leads, conversas e negócios fictícios para visualizar como o sistema funciona. 
            Estes dados são marcados como demonstração e podem ser removidos a qualquer momento.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex flex-col gap-2">
            <Label htmlFor="count">Quantidade de Leads/Deals</Label>
            <div className="flex items-center gap-4">
              <Input
                id="count"
                type="number"
                min={1}
                max={50}
                value={count}
                onChange={(e) => setCount(Number(e.target.value))}
                className="w-32"
              />
              <span className="text-sm text-muted-foreground">Recomendado: 10 a 20 para um visual completo.</span>
            </div>
          </div>
        </CardContent>
        <CardFooter className="flex justify-between border-t p-6 mt-4">
          <Button 
            onClick={handleGenerate} 
            disabled={isGenerating || isClearing}
            className="gap-2"
          >
            {isGenerating ? <RefreshCw className="h-4 w-4 animate-spin" /> : <Zap className="h-4 w-4" />}
            Gerar Dados Demo
          </Button>

          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button variant="destructive" disabled={isGenerating || isClearing} className="gap-2">
                <Trash2 className="h-4 w-4" />
                Limpar Dados Demo
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle className="flex items-center gap-2 text-destructive">
                  <AlertTriangle className="h-5 w-5" />
                  Confirmar Limpeza
                </AlertDialogTitle>
                <AlertDialogDescription>
                  Isso removerá <strong>todos</strong> os leads, conversas, negócios e mensagens que foram gerados pelo modo de demonstração neste projeto.
                  Seus dados reais não serão afetados.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Cancelar</AlertDialogCancel>
                <AlertDialogAction onClick={handleClear} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
                  {isClearing ? <RefreshCw className="h-4 w-4 animate-spin mr-2" /> : null}
                  Sim, remover dados demo
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </CardFooter>
      </Card>

      <div className="rounded-lg border border-blue-500/20 bg-blue-500/5 p-4 text-sm text-blue-700 dark:text-blue-400">
        <p className="font-semibold mb-1">Dica de Visualização:</p>
        <ul className="list-disc list-inside space-y-1 opacity-90">
          <li>Após gerar os dados, vá para a <strong>Inbox</strong> para ver as conversas simuladas.</li>
          <li>Confira o <strong>Kanban (Negociações)</strong> para ver os cards distribuídos nas etapas.</li>
          <li>Os novos KPIs determinísticos aparecerão no painel lateral de cada chat.</li>
        </ul>
      </div>
    </div>
  )
}
